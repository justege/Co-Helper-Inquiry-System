import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Box, Flex, Text, Spinner } from "@chakra-ui/react"
import { getPublicCategories, type Category } from "@/api/categories"
import { submitLandingInquiry } from "@/api/inquiries"
import { auth } from "@/lib/firebase"
import { useAuthContext } from "@/components/auth/AuthContext"
import AiInquiryChat, { type AiChatResult } from "@/components/ai/AiInquiryChat"
import { draftToInquiryInput } from "@/lib/gemini"
import { GREEN, INK, MUTED, RULE, AMBER } from "@/components/marketing/tokens"
import avatarSrc from "@/assets/avatar.png"
import { FormInput, FORM_INPUT_PROPS_LG, formInvalidBorder } from "@/components/ui/form-controls"
import { PasswordInput } from "@/components/ui/password-input"

const AI_BLUE = "#185FA5"

type Phase = "chat" | "account" | "submitting" | "success"

// ─── Step states ─────────────────────────────────────────────────────────────

const SUBMIT_STEPS = [
  { title: "Sending your brief",   sub: "Encrypting and transmitting securely" },
  { title: "Setting up account",   sub: "Creating your personal workspace" },
  { title: "Matching specialists", sub: "Finding the right team for you" },
]

function StepRow({ title, sub, state }: { title: string; sub: string; state: "waiting" | "spinning" | "done" }) {
  return (
    <Flex gap={3} align="start" mb={4}>
      <Box w="20px" h="20px" borderRadius="full" flexShrink={0}
        display="flex" alignItems="center" justifyContent="center"
        bg={state === "done" ? GREEN : "transparent"}
        border={state === "waiting" ? `1.5px solid ${RULE}` : "none"}
        mt="1px"
      >
        {state === "done" && <Text fontSize="0.6rem" color="white" fontWeight="900">✓</Text>}
        {state === "spinning" && <Spinner size="xs" color={AI_BLUE} />}
      </Box>
      <Box>
        <Text fontSize="0.875rem" fontWeight="700"
          color={state !== "waiting" ? INK : MUTED}
          transition="color 0.3s">
          {title}
        </Text>
        <Text fontSize="0.75rem" color={MUTED}>{sub}</Text>
      </Box>
    </Flex>
  )
}

// ─── Account form ─────────────────────────────────────────────────────────────

interface AccountFormProps {
  aiResult: AiChatResult
  onSubmit: (v: { username: string; email: string; password: string }) => Promise<void>
  isSubmitting: boolean
  error?: string
}

function AccountForm({ aiResult, onSubmit, isSubmitting, error }: AccountFormProps) {
  const [username, setUsername] = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [errs, setErrs]         = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (username.trim().length < 2) e.username = "At least 2 characters"
    if (!/\S+@\S+\.\S+/.test(email))  e.email    = "Invalid email"
    if (password.length < 6)           e.password  = "At least 6 characters"
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (validate()) void onSubmit({ username: username.trim(), email, password })
  }

  return (
    <Box as="form" onSubmit={handleSubmit} px={5} py={4} flex={1} overflowY="auto">
      {/* Brief chip row */}
      <Box mb={5} p={3.5} borderRadius="10px" bg="#F0FAF5" border={`1px solid ${GREEN}25`}>
        <Text fontSize="0.6875rem" fontWeight="700" color={GREEN}
          letterSpacing="0.08em" textTransform="uppercase" mb={2}>
          AI-crafted brief
        </Text>
        <Flex wrap="wrap" gap={1.5}>
          {[
            aiResult.draft.type === "service" ? "Ongoing Service" : "Fixed Project",
            aiResult.draft.title.slice(0, 38) + (aiResult.draft.title.length > 38 ? "…" : ""),
            `Priority: ${aiResult.draft.urgency}`,
          ].map((tag) => (
            <Box key={tag} px={2.5} py={1} bg="white" border={`1px solid ${RULE}`}
              borderRadius="6px" fontSize="0.75rem" fontWeight="500" color={INK}>
              {tag}
            </Box>
          ))}
        </Flex>
      </Box>

      {error && (
        <Box mb={4} px={3} py={2.5} borderRadius="8px" bg="#FFF5F5" border="1px solid #FECACA">
          <Text fontSize="0.8125rem" color="#DC2626">{error}</Text>
        </Box>
      )}

      <Box mb={4}>
        <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>
          Full name or username <Text as="span" color="#DC2626">*</Text>
        </Text>
        <FormInput
          size="lg" placeholder="e.g., johnsmith" autoComplete="username"
          value={username} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          {...formInvalidBorder(!!errs.username)}
        />
        {errs.username && <Text fontSize="0.75rem" color="#DC2626" mt={1}>{errs.username}</Text>}
      </Box>

      <Box mb={4}>
        <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>
          Work email <Text as="span" color="#DC2626">*</Text>
        </Text>
        <FormInput
          size="lg" type="email" placeholder="you@company.com" autoComplete="email"
          value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          {...formInvalidBorder(!!errs.email)}
        />
        {errs.email && <Text fontSize="0.75rem" color="#DC2626" mt={1}>{errs.email}</Text>}
      </Box>

      <Box mb={6}>
        <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>
          Password <Text as="span" color="#DC2626">*</Text>
        </Text>
        <PasswordInput
          size="lg" placeholder="Min. 6 characters" autoComplete="new-password"
          {...FORM_INPUT_PROPS_LG}
          value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          {...formInvalidBorder(!!errs.password)}
        />
        {errs.password && <Text fontSize="0.75rem" color="#DC2626" mt={1}>{errs.password}</Text>}
      </Box>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%", height: 52, borderRadius: 12, border: "none",
          background: AMBER, color: INK, fontWeight: 700, fontSize: "1rem",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          fontFamily: "inherit", marginBottom: 12,
          opacity: isSubmitting ? 0.7 : 1,
          transition: "all 0.15s",
        }}
      >
        {isSubmitting ? "Creating account & submitting…" : "Submit project & create account →"}
      </button>

      <Text fontSize="0.75rem" color={MUTED} textAlign="center">
        Already have an account?{" "}
        <Link to="/login" style={{ color: GREEN, fontWeight: 600, textDecoration: "none" }}>
          Sign in
        </Link>
      </Text>
    </Box>
  )
}

// ─── Main mobile chat overlay ─────────────────────────────────────────────────

interface MobileLandingChatProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileLandingChat({ isOpen, onClose }: MobileLandingChatProps) {
  const navigate = useNavigate()
  const { registerWithEmail } = useAuthContext()

  const [categories, setCategories] = useState<Category[]>([])
  const [phase, setPhase] = useState<Phase>("chat")
  const [aiResult, setAiResult] = useState<AiChatResult | null>(null)
  const [submitError, setSubmitError] = useState<string>()
  const [submitStep, setSubmitStep] = useState(0)
  const [chatKey, setChatKey] = useState(0)

  useEffect(() => {
    getPublicCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
      // Reset on close for reuse
      setTimeout(() => {
        if (!isOpen) {
          setPhase("chat")
          setAiResult(null)
          setSubmitError(undefined)
          setSubmitStep(0)
          setChatKey((k) => k + 1)
        }
      }, 300)
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  function handleAiComplete(result: AiChatResult) {
    setAiResult(result)
    setTimeout(() => setPhase("account"), 600)
  }

  async function handleAccountSubmit(values: { username: string; email: string; password: string }) {
    if (!aiResult) return
    setPhase("submitting")
    setSubmitError(undefined)
    setSubmitStep(0)

    try {
      if (!auth) throw new Error("Firebase not configured")

      setTimeout(() => setSubmitStep(1), 700)

      if (!auth.currentUser) {
        await registerWithEmail(values.email, values.password)
      }
      if (!auth.currentUser) throw new Error("Account created but sign-in failed")

      setTimeout(() => setSubmitStep(2), 1800)

      const token = await auth.currentUser.getIdToken(true)
      const input = draftToInquiryInput(aiResult.draft, aiResult.categoryId)
      const { inquiry } = await submitLandingInquiry(
        { username: values.username, ...input },
        token,
      )

      setTimeout(() => setSubmitStep(3), 2600)
      setTimeout(() => {
        setPhase("success")
        setTimeout(() => navigate(`/app/inquiries/${inquiry.id}`, { replace: true }), 1600)
      }, 3200)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please try again.")
      setPhase("account")
    }
  }

  return (
    <>
      {/* Backdrop */}
      <Box
        display={{ base: "block", lg: "none" }}
        position="fixed" inset={0} zIndex={100}
        bg="rgba(0,0,0,0.55)"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.25s",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <Box
        display={{ base: "flex", lg: "none" }}
        position="fixed"
        left={0} right={0} bottom={0}
        zIndex={101}
        flexDir="column"
        bg="white"
        borderRadius="20px 20px 0 0"
        overflow="hidden"
        style={{
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
          maxHeight: "92dvh",
          height: phase === "chat" ? "85dvh" : phase === "account" ? "92dvh" : "auto",
        }}
      >
        {/* Handle bar */}
        <Box py={3} display="flex" justifyContent="center" flexShrink={0}>
          <Box w="36px" h="4px" borderRadius="full" bg={RULE} />
        </Box>

        {/* Header */}
        <Box
          px={5} pb={4} flexShrink={0}
          borderBottom={`1px solid ${RULE}`}
        >
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={2.5}>
              <Box
                w="40px" h="40px" borderRadius="full" flexShrink={0}
                overflow="hidden" border={`2px solid ${RULE}`}
                boxShadow="0 2px 8px rgba(0,0,0,0.12)"
              >
                <img src={avatarSrc} alt="AI Project Manager"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
              </Box>
              <Box>
                <Text fontSize="0.9375rem" fontWeight="700" color={INK} lineHeight="1.2">
                  AI Project Manager
                </Text>
                <Flex align="center" gap={1.5}>
                  <Box w="5px" h="5px" borderRadius="full" bg="#4ADE80"
                    style={{ animation: "pulse 2s infinite" }} />
                  <Text fontSize="0.6875rem" color={MUTED}>Gemini 2.5 Flash · Online</Text>
                </Flex>
              </Box>
            </Flex>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: "#F5F7FA", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="#6B7280" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </Flex>

          {/* Phase breadcrumb */}
          {phase !== "submitting" && phase !== "success" && (
            <Flex mt={3} gap={1.5} align="center">
              {["chat", "account"].map((p, i) => (
                <Flex key={p} align="center" gap={1.5}>
                  <Box
                    w="20px" h="20px" borderRadius="full"
                    bg={phase === p ? INK : (phase === "account" && p === "chat") ? GREEN : "#E5E7EB"}
                    display="flex" alignItems="center" justifyContent="center"
                  >
                    {phase === "account" && p === "chat" ? (
                      <Text fontSize="0.6rem" color="white" fontWeight="800">✓</Text>
                    ) : (
                      <Text fontSize="0.6875rem" color={phase === p ? "white" : "#9CA3AF"} fontWeight="700">
                        {i + 1}
                      </Text>
                    )}
                  </Box>
                  <Text fontSize="0.6875rem" fontWeight="600"
                    color={phase === p ? INK : "#9CA3AF"}>
                    {p === "chat" ? "Brief" : "Account"}
                  </Text>
                  {i === 0 && <Box w="20px" h="1px" bg={RULE} />}
                </Flex>
              ))}
            </Flex>
          )}
        </Box>

        {/* Body */}
        {phase === "chat" && (
          <Box flex={1} minH={0}>
            <AiInquiryChat
              key={chatKey}
              categories={categories}
              onComplete={handleAiComplete}
              variant="landing"
            />
          </Box>
        )}

        {phase === "account" && aiResult && (
          <Box flex={1} minH={0} overflowY="auto">
            <AccountForm
              aiResult={aiResult}
              onSubmit={handleAccountSubmit}
              isSubmitting={false}
              error={submitError}
            />
          </Box>
        )}

        {phase === "submitting" && (
          <Box px={5} py={8}>
            <Text fontSize="1.0625rem" fontWeight="800" color={INK} mb={6} lineHeight="1.3">
              Submitting your AI-crafted brief…
            </Text>
            {SUBMIT_STEPS.map((s, i) => {
              const state = submitStep > i + 1 ? "done" : submitStep === i + 1 ? "spinning" : "waiting"
              return <StepRow key={s.title} {...s} state={state} />
            })}
          </Box>
        )}

        {phase === "success" && (
          <Box px={5} py={8} textAlign="center">
            <Box
              w="64px" h="64px" borderRadius="full" mb={5} mx="auto"
              bg={GREEN} display="flex" alignItems="center" justifyContent="center"
              boxShadow="0 8px 24px rgba(15,110,86,0.3)"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 12L9 17L20 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Box>
            <Text fontSize="1.25rem" fontWeight="800" color={INK} mb={2}>Brief submitted!</Text>
            <Text fontSize="0.9rem" color={MUTED} mb={4} lineHeight="1.7">
              Taking you to your project dashboard…
            </Text>
            <Spinner size="sm" color={GREEN} />
          </Box>
        )}
      </Box>
    </>
  )
}
