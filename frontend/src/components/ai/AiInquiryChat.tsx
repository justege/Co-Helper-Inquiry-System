import { useState, useRef, useEffect, useCallback } from "react"
import { Box, Flex, Text, Spinner } from "@chakra-ui/react"
import { sendGeminiMessage, type GeminiMessage, type AiInquiryDraft } from "@/lib/gemini"
import type { Category } from "@/api/categories"
import { GREEN, INK, MUTED, RULE, BLUE } from "@/components/marketing/tokens"
import avatarSrc from "@/assets/avatar.png"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string
  from: "bot" | "user"
  text: string
}

export interface AiChatResult {
  draft: AiInquiryDraft
  categoryId: string
}

interface AiInquiryChatProps {
  categories: Category[]
  onComplete: (result: AiChatResult) => void
  /** For authenticated users the account step is skipped */
  isAuthenticated?: boolean
  /** Visual variant */
  variant?: "landing" | "app"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENING = `Hi! I'm your AI Project Manager. I'll help you put together a clear project brief so we can get you matched with the right specialists.

To start — what are you looking to get built or improved?`

const TYPING_DELAY_MS = 900

// ─── Avatar ───────────────────────────────────────────────────────────────────

function BotAvatar({ size = 30 }: { size?: number }) {
  return (
    <Box
      w={`${size}px`} h={`${size}px`} borderRadius="full" flexShrink={0}
      overflow="hidden"
      boxShadow="0 2px 8px rgba(0,0,0,0.18)"
      border="2px solid rgba(255,255,255,0.85)"
    >
      <img
        src={avatarSrc}
        alt="AI Project Manager"
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
      />
    </Box>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <Flex gap={2} align="start" mb={3}>
      <BotAvatar size={28} />
      <Box
        bg="white" border={`1px solid ${RULE}`}
        borderRadius="4px 14px 14px 14px"
        px={3} py={2.5}
        boxShadow="0 1px 3px rgba(0,0,0,0.05)"
      >
        <Flex gap={1.5} align="center">
          {[0, 1, 2].map((i) => (
            <Box
              key={i} w="5px" h="5px" borderRadius="full" bg="#CBD5E1"
              style={{
                animation: "aiBotDot 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </Flex>
      </Box>
    </Flex>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function BotBubble({ text }: { text: string }) {
  return (
    <Flex gap={2} align="start" mb={3}>
      <BotAvatar size={28} />
      <Box
        bg="white" border={`1px solid ${RULE}`}
        borderRadius="4px 14px 14px 14px"
        px={3} py={2.5} maxW="82%"
        boxShadow="0 1px 3px rgba(0,0,0,0.05)"
      >
        <Text fontSize="0.875rem" color={INK} lineHeight="1.7" whiteSpace="pre-wrap">
          {text}
        </Text>
      </Box>
    </Flex>
  )
}

function UserBubble({ text, accent }: { text: string; accent: string }) {
  return (
    <Flex justify="flex-end" mb={3}>
      <Box
        bg={accent} borderRadius="14px 4px 14px 14px"
        px={3} py={2.5} maxW="82%"
      >
        <Text fontSize="0.875rem" color="white" lineHeight="1.7" whiteSpace="pre-wrap">
          {text}
        </Text>
      </Box>
    </Flex>
  )
}

// ─── Draft summary card ───────────────────────────────────────────────────────

function DraftSummaryCard({ draft, categoryName }: { draft: AiInquiryDraft; categoryName: string }) {
  const rows = [
    { label: "Title",       value: draft.title },
    { label: "Category",    value: categoryName },
    { label: "Type",        value: draft.type === "service" ? "Ongoing Service" : "Fixed Project" },
    { label: "Urgency",     value: draft.urgency.charAt(0).toUpperCase() + draft.urgency.slice(1) },
    draft.targetEndDate ? { label: "Deadline", value: draft.targetEndDate } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <Box mx={0} mb={3} p={4} borderRadius="12px"
      bg="#F0FAF5" border={`1.5px solid ${GREEN}30`}>
      <Flex align="center" gap={2} mb={3}>
        <Box w="6px" h="6px" borderRadius="full" bg={GREEN} />
        <Text fontSize="0.6875rem" fontWeight="700" color={GREEN}
          letterSpacing="0.1em" textTransform="uppercase">
          Brief summary
        </Text>
      </Flex>
      {rows.map((r) => (
        <Flex key={r.label} justify="space-between" gap={3} mb={1.5}>
          <Text fontSize="0.75rem" color={MUTED} flexShrink={0}>{r.label}</Text>
          <Text fontSize="0.75rem" fontWeight="600" color={INK} textAlign="right"
            overflow="hidden" textOverflow="ellipsis" maxW="65%">
            {r.value}
          </Text>
        </Flex>
      ))}
      <Box mt={3} pt={3} borderTop={`1px solid ${GREEN}20`}>
        <Text fontSize="0.75rem" color="#155f44" lineHeight="1.6">
          {draft.description.length > 180 ? draft.description.slice(0, 180) + "…" : draft.description}
        </Text>
      </Box>
    </Box>
  )
}

// ─── Input bar ────────────────────────────────────────────────────────────────

function InputBar({
  value,
  onChange,
  onSend,
  disabled,
  accent,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled: boolean
  accent: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }, [value])

  const canSend = !disabled && value.trim().length > 0

  return (
    <Box
      px={4} py={3}
      borderTop={`1px solid ${RULE}`}
      bg="white"
    >
      <Flex gap={2} align="flex-end">
        <Box flex={1} position="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message…"
          rows={1}
          disabled={disabled}
          style={{
            width: "100%",
            resize: "none",
            outline: "none",
            border: `1.5px solid ${RULE}`,
            borderRadius: "12px",
            padding: "10px 14px",
            fontSize: "0.875rem",
            lineHeight: "1.55",
            color: INK,
            background: disabled ? "#F9FAFB" : "white",
            fontFamily: "inherit",
            transition: "border-color 0.15s",
            overflowY: "hidden",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = accent
          }}
          onBlur={(e) => {
            e.target.style.borderColor = RULE
          }}
        />
        </Box>

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          style={{
            width: 40, height: 40, borderRadius: 12, border: "none",
            background: canSend ? accent : "#E5E7EB",
            color: "white",
            cursor: canSend ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="white"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </Flex>
      <Text fontSize="0.6875rem" color={MUTED} mt={1.5}>
        Enter to send · Shift+Enter for new line
      </Text>
    </Box>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AiInquiryChat({
  categories,
  onComplete,
  isAuthenticated = false,
  variant = "landing",
}: AiInquiryChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [history, setHistory] = useState<GeminiMessage[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const [draft, setDraft] = useState<AiInquiryDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const accent = variant === "landing" ? INK : BLUE

  const categoriesHint = categories.map((c) => c.name).join(", ") || "Software Development, Design, Marketing"

  // Scroll to bottom
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isTyping, draft])

  // Opening message
  useEffect(() => {
    const t = setTimeout(() => {
      setIsTyping(false)
      setMessages([{ id: "bot-0", from: "bot", text: OPENING }])
    }, TYPING_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  const matchCategory = useCallback((categoryName: string): Category | undefined => {
    if (!categoryName) return undefined
    const lower = categoryName.toLowerCase()
    return (
      categories.find((c) => c.name.toLowerCase() === lower) ??
      categories.find((c) => c.name.toLowerCase().includes(lower)) ??
      categories.find((c) => lower.includes(c.name.toLowerCase())) ??
      categories[0]
    )
  }, [categories])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping || isDone) return
    const userText = input.trim()
    setInput("")

    const userMsg: ChatMsg = { id: `user-${Date.now()}`, from: "user", text: userText }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)
    setError(null)

    const newHistory: GeminiMessage[] = [
      ...history,
      { role: "user", text: userText },
    ]

    try {
      const result = await sendGeminiMessage(newHistory, userText, categoriesHint)

      setIsTyping(false)

      const botMsg: ChatMsg = { id: `bot-${Date.now()}`, from: "bot", text: result.text }
      setMessages((prev) => [...prev, botMsg])

      setHistory([
        ...newHistory,
        { role: "model", text: result.text },
      ])

      if (result.draft) {
        const matched = matchCategory(result.draft.categoryName)
        setDraft(result.draft)
        setIsDone(true)
        if (matched) {
          onComplete({ draft: result.draft, categoryId: matched.id })
        } else {
          setError("Couldn't match a category — please continue with the standard form.")
        }
      }
    } catch (err) {
      setIsTyping(false)
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, from: "bot", text: "Sorry, I hit a snag. Please try your message again." },
      ])
    }
  }, [input, isTyping, isDone, history, categoriesHint, matchCategory, onComplete])

  const matchedCategory = draft ? matchCategory(draft.categoryName) : undefined

  return (
    <Box display="flex" flexDir="column" h="100%" minH={0}>
      {/* Chat messages */}
      <Box
        ref={scrollRef}
        flex={1} minH={0} overflowY="auto"
        px={4} py={3}
        bg="#F8F9FB"
        css={{ overflowAnchor: "none" }}
      >
        {messages.map((msg) =>
          msg.from === "bot" ? (
            <BotBubble key={msg.id} text={msg.text} />
          ) : (
            <UserBubble key={msg.id} text={msg.text} accent={accent} />
          ),
        )}

        {isTyping && <TypingIndicator />}

        {draft && matchedCategory && (
          <DraftSummaryCard draft={draft} categoryName={matchedCategory.name} />
        )}

        {isDone && !error && (
          <Flex justify="center" mb={3}>
            <Flex
              align="center" gap={2}
              px={3} py={1.5} borderRadius="99px"
              bg="#F0FAF5" border={`1px solid ${GREEN}35`}
            >
              <Box w="6px" h="6px" borderRadius="full" bg={GREEN} />
              <Text fontSize="0.75rem" fontWeight="600" color={GREEN}>
                {isAuthenticated ? "Brief ready — submitting…" : "Brief ready — continue below"}
              </Text>
            </Flex>
          </Flex>
        )}

        {error && (
          <Box mx={0} mb={3} px={3} py={2.5} borderRadius="8px"
            bg="#FEF2F2" border="1px solid #FECACA">
            <Text fontSize="0.8125rem" color="#DC2626">{error}</Text>
          </Box>
        )}
      </Box>

      {/* Input */}
      {!isDone && (
        <InputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isTyping}
          accent={accent}
        />
      )}

      {isDone && isAuthenticated && (
        <Box px={4} py={3} borderTop={`1px solid ${RULE}`} bg="white">
          <Flex align="center" justify="center" gap={2}>
            <Spinner size="xs" color={GREEN} />
            <Text fontSize="0.875rem" color={MUTED}>Preparing your inquiry…</Text>
          </Flex>
        </Box>
      )}

      <style>{`
        @keyframes aiBotDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </Box>
  )
}
