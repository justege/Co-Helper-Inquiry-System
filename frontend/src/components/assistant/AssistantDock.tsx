import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { Box, Text } from "@chakra-ui/react"
import { LuSparkles, LuX } from "react-icons/lu"
import { useAuthContext } from "@/components/auth/AuthContext"
import { AppButton } from "@/components/ui/AppButton"
import { AppTextarea } from "@/components/ui/AppTextarea"
import { GREEN, INK, MUTED, PAPER, RULE, SURFACE } from "@/theme/tokens"
import {
  askAssistant,
  draftPlain,
  type AssistantContextInput,
  type AssistantDraft,
  type AssistantMessage,
} from "@/api/assistant"
import { findAssistantClaim, useAssistantClaimsVersion } from "./assistantClaims"

type ChatEntry = AssistantMessage & { suggestion?: AssistantDraft | null }

const AssistantContext = createContext<{ open: (prompt?: string) => void } | null>(null)

export function useAssistant() {
  return useContext(AssistantContext)
}

function routeContext(pathname: string, todoId: string | null): AssistantContextInput {
  const project = pathname.match(/^\/app\/projects\/([^/]+)/)
  const client = pathname.match(/^\/app\/clients\/([^/]+)/)
  const invoice = pathname.match(/^\/app\/invoices\/([^/]+)/)
  let surface = "home"
  if (todoId) surface = "todo"
  else if (project) surface = "project"
  else if (pathname.startsWith("/app/projects")) surface = "projects"
  else if (client) surface = "client"
  else if (pathname.startsWith("/app/clients")) surface = "clients"
  else if (invoice) surface = "invoice"
  else if (pathname.startsWith("/app/invoices")) surface = "invoices"
  else if (pathname.startsWith("/app/hours")) surface = "hours"
  else if (pathname.startsWith("/app/settings")) surface = "settings"
  else if (pathname.startsWith("/app/profile")) surface = "profile"
  else if (!pathname.startsWith("/app")) surface = "site"
  return {
    surface,
    projectId: project?.[1],
    clientId: client?.[1],
    invoiceId: invoice?.[1],
    todoId: todoId || undefined,
  }
}

function starters(surface: string): { label: string; text: string }[] {
  if (surface === "todo") {
    return [
      { label: "Rewrite this to-do", text: "Rewrite this to-do so the description is clear and specific. Keep every fact." },
      { label: "Acceptance criterion", text: "Write one acceptance criterion the client can actually test for this to-do." },
      { label: "Status comment", text: "Draft a short comment about where this to-do stands." },
    ]
  }
  if (surface === "project") {
    return [
      { label: "Project description", text: "Write a clear project description: what it is, who it is for, and what done looks like." },
      { label: "Draft a to-do", text: "Draft the next useful to-do for this project, with a description and one acceptance criterion." },
      { label: "Add a goal", text: "Suggest one concrete goal for this project." },
    ]
  }
  if (surface === "projects") {
    return [
      { label: "New project", text: "Draft a new project with a short name and a description of the work." },
      { label: "What next", text: "Looking at this workspace, what should I pick up next?" },
    ]
  }
  if (surface === "client") {
    return [{ label: "Client notes", text: "Turn what you know about this client into short notes for the record." }]
  }
  if (surface === "invoice") {
    return [{ label: "Explain this invoice", text: "Summarize this invoice in plain language. Do not change any amounts." }]
  }
  if (surface === "hours") {
    return [{ label: "What to focus on", text: "Given this week, what should I focus on next?" }]
  }
  return [
    { label: "What next", text: "What should I focus on next in this workspace?" },
    { label: "Draft a to-do", text: "Help me draft a to-do. Ask which project if it is not clear." },
  ]
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [seed, setSeed] = useState<string | null>(null)
  const api = useMemo(() => ({
    open(prompt?: string) {
      setSeed(prompt ?? "")
      setOpen(true)
    },
  }), [])
  const show = useCallback(() => setOpen(true), [])
  const hide = useCallback(() => setOpen(false), [])
  const consumeSeed = useCallback(() => setSeed(null), [])

  return (
    <AssistantContext.Provider value={api}>
      {children}
      <AssistantDock
        open={open}
        seed={seed}
        onOpen={show}
        onClose={hide}
        onSeedConsumed={consumeSeed}
      />
    </AssistantContext.Provider>
  )
}

function AssistantDock({
  open,
  seed,
  onOpen,
  onClose,
  onSeedConsumed,
}: {
  open: boolean
  seed: string | null
  onOpen: () => void
  onClose: () => void
  onSeedConsumed: () => void
}) {
  const { user, loading } = useAuthContext()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const context = routeContext(pathname, params.get("todo"))
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  useAssistantClaimsVersion()

  useEffect(() => {
    if (!open || seed === null) return
    if (seed) setInput(seed)
    onSeedConsumed()
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open, seed, onSeedConsumed])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages, busy, open])

  if (loading || !user) return null

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    const history: AssistantMessage[] = [...messages.map(({ role, content: prior }) => ({ role, content: prior })), { role: "user", content }]
    setMessages((current) => [...current, { role: "user", content }])
    setInput("")
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await askAssistant({ messages: history, context })
      setMessages((current) => [...current, { role: "assistant", content: result.reply, suggestion: result.suggestion }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant is unavailable")
    } finally {
      setBusy(false)
    }
  }

  async function apply(draft: AssistantDraft) {
    const claim = findAssistantClaim(draft)
    if (!claim) return
    setNotice(null)
    setError(null)
    try {
      const result = await claim.apply(draft)
      setNotice(typeof result === "string" ? result : "Applied")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply that")
    }
  }

  async function copy(draft: AssistantDraft) {
    try {
      await navigator.clipboard.writeText(draftPlain(draft))
      setNotice("Copied")
    } catch {
      setError("Could not copy that")
    }
  }

  const prompts = starters(context.surface || "home")

  return (
    <>
      {open ? (
        <Box
          role="dialog"
          aria-label="Assistant"
          position="fixed"
          zIndex={1600}
          right={{ base: 3, lg: 6 }}
          bottom={{ base: "84px", lg: 6 }}
          w={{ base: "calc(100vw - 24px)", sm: "400px" }}
          h={{ base: "min(640px, calc(100vh - 120px))", lg: "min(640px, calc(100vh - 48px))" }}
          display="flex"
          flexDirection="column"
          bg={SURFACE}
          border={`1px solid ${RULE}`}
          borderRadius="16px"
          boxShadow="0 24px 60px rgba(14,27,23,0.18)"
          overflow="hidden"
        >
          <Box bg="#0B1A15" px={4} py={3} display="flex" alignItems="center" justifyContent="space-between" flexShrink={0}>
            <Box display="flex" alignItems="center" gap={2} color="white">
              <LuSparkles size={16} />
              <Text fontWeight="700" fontSize="0.9375rem">Assistant</Text>
            </Box>
            <Box as="button" type="button" color="rgba(255,255,255,0.7)" aria-label="Close assistant" onClick={onClose}>
              <LuX size={16} />
            </Box>
          </Box>
          <Box flex="1" overflowY="auto" px={4} py={4}>
            {messages.length === 0 && (
              <Box>
                <Text fontSize="0.875rem" color={MUTED} lineHeight="1.6" mb={3}>
                  I can draft a project, a to-do, or rewrite the field you’re working on. I only use this workspace.
                </Text>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {prompts.map((prompt) => (
                    <Box
                      key={prompt.label}
                      as="button"
                      type="button"
                      px={3}
                      py={1.5}
                      borderRadius="999px"
                      border={`1px solid ${RULE}`}
                      bg={PAPER}
                      color={INK}
                      fontSize="0.75rem"
                      fontWeight="600"
                      onClick={() => void send(prompt.text)}
                    >
                      {prompt.label}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            {messages.map((message, index) => (
              <Box key={`${message.role}-${index}`} mb={3} display="flex" flexDirection="column" alignItems={message.role === "user" ? "flex-end" : "flex-start"}>
                <Box
                  maxW="92%"
                  px={3}
                  py={2}
                  borderRadius="12px"
                  bg={message.role === "user" ? "#E8F5EF" : PAPER}
                  border={message.role === "assistant" ? `1px solid ${RULE}` : "none"}
                >
                  <Text fontSize="0.875rem" color={INK} whiteSpace="pre-wrap" lineHeight="1.55">{message.content}</Text>
                </Box>
                {message.suggestion && (
                  <Box mt={2} maxW="92%" w="100%" p={3} border={`1px solid ${RULE}`} borderRadius="12px" bg={SURFACE}>
                    <Text fontSize="0.8125rem" color={INK} whiteSpace="pre-wrap" lineHeight="1.5" maxH="140px" overflowY="auto">
                      {draftPlain(message.suggestion)}
                    </Text>
                    <Box display="flex" gap={2} mt={3}>
                      {findAssistantClaim(message.suggestion) && (
                        <AppButton size="sm" onClick={() => void apply(message.suggestion as AssistantDraft)}>
                          {message.suggestion.label || "Use this"}
                        </AppButton>
                      )}
                      <AppButton size="sm" variant="secondary" onClick={() => void copy(message.suggestion as AssistantDraft)}>Copy</AppButton>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
            {busy && <Text fontSize="0.8125rem" color={MUTED}>Writing…</Text>}
            {error && <Text fontSize="0.8125rem" color="#B91C1C" mt={2}>{error}</Text>}
            {notice && <Text fontSize="0.8125rem" color="#047857" fontWeight="600" mt={2}>{notice}</Text>}
            <Box ref={endRef} />
          </Box>
          <Box px={3} py={3} borderTop={`1px solid ${RULE}`} display="flex" gap={2} alignItems="flex-end" flexShrink={0}>
            <AppTextarea
              ref={inputRef}
              value={input}
              rows={2}
              minH="64px"
              placeholder="Ask, or describe what to write"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void send(input)
                }
              }}
              flex="1"
            />
            <AppButton size="sm" disabled={!input.trim()} loading={busy} onClick={() => void send(input)}>Send</AppButton>
          </Box>
        </Box>
      ) : (
        <Box
          as="button"
          type="button"
          aria-label="Open assistant"
          position="fixed"
          zIndex={1600}
          right={{ base: 4, lg: 6 }}
          bottom={{ base: "88px", lg: 6 }}
          w="52px"
          h="52px"
          borderRadius="999px"
          bg={GREEN}
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          boxShadow="0 10px 24px rgba(15,110,86,0.35)"
          onClick={onOpen}
        >
          <LuSparkles size={20} />
        </Box>
      )}
    </>
  )
}
