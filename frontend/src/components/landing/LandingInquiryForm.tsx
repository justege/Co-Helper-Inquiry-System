import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import {
  Box,
  Button,
  Flex,
  Grid,
  RadioGroup,
  Text,
} from "@chakra-ui/react"
import { PasswordInput } from "@/components/ui/password-input"
import {
  FormInput,
  FormNativeSelect,
  FormTextarea,
  FORM_INPUT_PROPS_LG,
  formInvalidBorder,
} from "@/components/ui/form-controls"
import { useAuthContext } from "@/components/auth/AuthContext"
import { getPublicCategories, type Category } from "@/api/categories"
import { submitLandingInquiry } from "@/api/inquiries"
import type { BusinessType, CreateInquiryInput, Urgency } from "@/api/inquiries"
import { auth } from "@/lib/firebase"

import { AMBER, AMBER_HOVER, GREEN, INK, MUTED, RULE } from "@/components/marketing/tokens"
const G_LIGHT = "#F0FAF5"
const G_BORDER = "#A7D7C5"

type FormValues = CreateInquiryInput & {
  username: string
  email: string
  password: string
}

const TOTAL_STEPS = 3

const STEPS_META = [
  { n: 1, title: "About your project",  sub: "Tell us what you need built or managed." },
  { n: 2, title: "Timeline & priority", sub: "Set your schedule and urgency level." },
  { n: 3, title: "Create your account", sub: "We'll set you up instantly — no credit card." },
]

const URGENCY_OPTIONS: { value: Urgency; label: string; desc: string; color: string; activeBg: string }[] = [
  { value: "low",      label: "Low",      desc: "Flexible timeline",  color: "#52796F", activeBg: "#F0FAF5" },
  { value: "medium",   label: "Medium",   desc: "Within a few weeks", color: "#D97706", activeBg: "#FFFBEB" },
  { value: "high",     label: "High",     desc: "Within days",        color: "#DC2626", activeBg: "#FFF5F5" },
  { value: "critical", label: "Critical", desc: "Urgent / ASAP",      color: "#7F1D1D", activeBg: "#FEF2F2" },
]

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5} letterSpacing="-0.005em">
      {children}
      {required && <Text as="span" color="#DC2626" ml={0.5}>*</Text>}
    </Text>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <Text fontSize="0.75rem" color="#DC2626" mt={1}>{message}</Text>
}

export default function LandingInquiryForm() {
  const navigate = useNavigate()
  const { registerWithEmail } = useAuthContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [visible, setVisible] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    control,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: "onBlur",
    defaultValues: { type: "service", urgency: "medium" },
  })

  const businessType = watch("type") as BusinessType
  const targetStart  = watch("targetStartDate")
  const urgencyValue = watch("urgency")

  useEffect(() => {
    setCatLoading(true)
    getPublicCategories({ type: businessType })
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false))
  }, [businessType])

  function fadeToStep(next: number) {
    setVisible(false)
    setTimeout(() => { setStep(next); setVisible(true) }, 180)
  }

  async function handleContinue() {
    const fieldsPerStep: Record<number, (keyof FormValues)[]> = {
      1: ["type", "categoryId", "title", "description"],
      2: ["urgency", "targetEndDate"],
    }
    if (step === 2 && businessType === "tool_sourcing") {
      fieldsPerStep[2].push("estimatedQuantity")
    }
    const ok = await trigger(fieldsPerStep[step] ?? [])
    if (ok) fadeToStep(step + 1)
  }

  async function onSubmit(values: FormValues) {
    try {
      if (!auth) throw new Error("Firebase is not configured")

      if (!auth.currentUser) {
        await registerWithEmail(values.email, values.password)
      }

      if (!auth.currentUser) throw new Error("Account created but sign-in failed")

      const token = await auth.currentUser.getIdToken(true)
      const { inquiry } = await submitLandingInquiry(
        {
          username: values.username.trim(),
          title: values.title,
          description: values.description,
          categoryId: values.categoryId,
          type: values.type,
          urgency: values.urgency,
          targetStartDate: values.targetStartDate || null,
          targetEndDate: values.targetEndDate || null,
          estimatedQuantity:
            values.type === "tool_sourcing" && values.estimatedQuantity
              ? Number(values.estimatedQuantity)
              : null,
        },
        token
      )
      navigate(`/app/inquiries/${inquiry.id}`, { replace: true })
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Submission failed. Please try again.",
      })
    }
  }

  const meta = STEPS_META[step - 1]

  return (
    <Box
      as="form"
      onSubmit={handleSubmit(onSubmit)}
      borderRadius="16px"
      overflow="hidden"
      boxShadow="0 32px 80px rgba(0,0,0,0.32), 0 8px 24px rgba(0,0,0,0.16)"
      w="full"
    >
      {/* ── Dark header ────────────────────────────────────────── */}
      <Box bg={INK} px={{ base: 7, md: 9 }} pt={8} pb={7}>
        {/* Brand label */}
        <Flex align="center" gap={2} mb={6}>
          <Box w="6px" h="6px" borderRadius="full" bg={GREEN} />
          <Text fontSize="0.6875rem" fontWeight="700" color="rgba(255,255,255,0.4)"
            letterSpacing="0.12em" textTransform="uppercase">
            Co-Helper
          </Text>
        </Flex>

        {/* Step indicator */}
        <Box position="relative">
          <Box
            position="absolute" top="16px" left="16px" right="16px"
            h="1px" bg="rgba(255,255,255,0.1)" zIndex={0}
          />
          <Box
            position="absolute" top="16px" left="16px" h="1px"
            bg={GREEN} zIndex={1} transition="width 0.4s ease"
            style={{ width: `calc(${((step - 1) / (TOTAL_STEPS - 1)) * 100}% * ${(TOTAL_STEPS - 1) / TOTAL_STEPS * 1.0})` }}
          />
          <Flex justify="space-between" position="relative" zIndex={2}>
            {STEPS_META.map((s) => {
              const done    = step > s.n
              const current = step === s.n
              return (
                <Flex key={s.n} flexDir="column" alignItems="center" gap={2.5}>
                  <Box
                    w="32px" h="32px" borderRadius="full"
                    bg={done || current ? GREEN : "rgba(255,255,255,0.07)"}
                    border={`2px solid ${done || current ? GREEN : "rgba(255,255,255,0.15)"}`}
                    display="flex" alignItems="center" justifyContent="center"
                    transition="all 0.3s"
                    boxShadow={current ? `0 0 0 4px rgba(15,110,86,0.28)` : "none"}
                  >
                    {done ? (
                      <Text fontSize="0.8125rem" color="white" fontWeight="700">✓</Text>
                    ) : (
                      <Text fontSize="0.75rem" color={current ? "white" : "rgba(255,255,255,0.35)"}
                        fontWeight="700">{s.n}</Text>
                    )}
                  </Box>
                  <Text
                    fontSize="0.625rem" fontWeight="600"
                    color={current || done ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.28)"}
                    letterSpacing="0.06em" textTransform="uppercase"
                    transition="color 0.3s"
                    display={{ base: "none", sm: "block" }}
                  >
                    {s.n === 1 ? "Project" : s.n === 2 ? "Timeline" : "Account"}
                  </Text>
                </Flex>
              )
            })}
          </Flex>
        </Box>
      </Box>

      {/* ── Form body ──────────────────────────────────────────── */}
      <Box bg="white" px={{ base: 7, md: 9 }} pt={7} pb={8}>

        {/* Step heading */}
        <Box mb={6}>
          <Text fontSize="1.125rem" fontWeight="700" color={INK} letterSpacing="-0.02em" mb={1}
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.18s ease" }}>
            {meta.title}
          </Text>
          <Text fontSize="0.875rem" color={MUTED}
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.18s ease" }}>
            {meta.sub}
          </Text>
        </Box>

        {/* Root error */}
        {errors.root && (
          <Box bg="#FFF5F5" border="1.5px solid #FECACA" borderRadius="8px"
            px={4} py={3} mb={5} display="flex" gap={3} alignItems="flex-start">
            <Text color="#DC2626" mt="1px">⚠</Text>
            <Text fontSize="0.875rem" color="#C53030" lineHeight="1.6">{errors.root.message}</Text>
          </Box>
        )}

        {/* Step content */}
        <Box
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
          }}
        >

          {/* ── Step 1: Project ──────────────────────────────── */}
          {step === 1 && (
            <Box>
              <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={5} mb={5}>
                <Box>
                  <Label required>Engagement type</Label>
                  <FormNativeSelect
                    selectSize="lg"
                    {...register("type", { required: "Required" })}
                  >
                    <option value="service">Ongoing Service</option>
                    <option value="tool_sourcing">Fixed Project</option>
                  </FormNativeSelect>
                  <FieldError message={errors.type?.message} />
                </Box>
                <Box>
                  <Label required>Service category</Label>
                  <FormNativeSelect
                    selectSize="lg"
                    {...register("categoryId", { required: "Required" })}
                    rootProps={{
                      opacity: catLoading || categories.length === 0 ? 0.5 : 1,
                      pointerEvents: catLoading || categories.length === 0 ? "none" : undefined,
                    }}
                  >
                    {catLoading ? (
                      <option value="">Loading…</option>
                    ) : categories.length === 0 ? (
                      <option value="">No categories yet</option>
                    ) : (
                      <>
                        <option value="">Select a category…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </>
                    )}
                  </FormNativeSelect>
                  <FieldError message={errors.categoryId?.message} />
                </Box>
              </Grid>

              <Box mb={5}>
                <Label required>Project title</Label>
                <FormInput
                  size="lg"
                  placeholder="e.g., Shopify store redesign and checkout optimisation"
                  {...formInvalidBorder(!!errors.title)}
                  {...register("title", {
                    required: "Required",
                    minLength: { value: 3, message: "At least 3 characters" },
                  })}
                />
                <FieldError message={errors.title?.message} />
              </Box>

              <Box>
                <Label required>What do you need?</Label>
                <FormTextarea
                  size="lg"
                  placeholder="Describe your goals, audience, tech stack, references, and any constraints or deadlines…"
                  rows={5}
                  py={3}
                  lineHeight="1.7"
                  {...formInvalidBorder(!!errors.description)}
                  {...register("description", {
                    required: "Required",
                    minLength: { value: 10, message: "At least 10 characters" },
                  })}
                />
                <FieldError message={errors.description?.message} />
              </Box>
            </Box>
          )}

          {/* ── Step 2: Timeline ─────────────────────────────── */}
          {step === 2 && (
            <Box>
              <Box mb={6}>
                <Label required>Priority level</Label>
                <Text fontSize="0.8125rem" color={MUTED} mb={3}>
                  How urgently do you need this delivered?
                </Text>
                <Controller
                  name="urgency"
                  control={control}
                  rules={{ required: "Required" }}
                  render={({ field }) => (
                    <RadioGroup.Root value={field.value} onValueChange={({ value }) => field.onChange(value as Urgency)}>
                      <Grid templateColumns="repeat(2,1fr)" gap={3}>
                        {URGENCY_OPTIONS.map((opt) => {
                          const active = field.value === opt.value
                          return (
                            <RadioGroup.Item key={opt.value} value={opt.value}>
                              <RadioGroup.ItemHiddenInput />
                              <Box
                                w="full" px={4} py={3.5} borderRadius="10px"
                                border="1.5px solid"
                                borderColor={active ? opt.color : RULE}
                                bg={active ? opt.activeBg : "#F9FAFB"}
                                cursor="pointer"
                                transition="all 0.14s"
                                _hover={{ borderColor: opt.color + "80" }}
                              >
                                <Flex align="center" gap={2.5} mb={1}>
                                  <Box
                                    w="9px" h="9px" borderRadius="full" flexShrink={0}
                                    bg={active ? opt.color : "#D1D5DB"}
                                    transition="background 0.14s"
                                  />
                                  <RadioGroup.ItemText
                                    fontSize="0.875rem" fontWeight="700"
                                    color={active ? opt.color : "#6B7280"}
                                  >
                                    {opt.label}
                                  </RadioGroup.ItemText>
                                </Flex>
                                <Text fontSize="0.75rem" color={active ? opt.color + "CC" : "#9CA3AF"}
                                  pl="21px">{opt.desc}</Text>
                              </Box>
                            </RadioGroup.Item>
                          )
                        })}
                      </Grid>
                    </RadioGroup.Root>
                  )}
                />
                <FieldError message={errors.urgency?.message} />
              </Box>

              <Grid templateColumns="1fr 1fr" gap={5} mb={businessType === "tool_sourcing" ? 5 : 0}>
                <Box>
                  <Label>Target start date</Label>
                  <FormInput size="lg" type="date" {...register("targetStartDate")} />
                </Box>
                <Box>
                  <Label>Target end date</Label>
                  <FormInput
                    size="lg"
                    type="date"
                    {...formInvalidBorder(!!errors.targetEndDate)}
                    {...register("targetEndDate", {
                      validate: (val) => {
                        if (!val || !targetStart) return true
                        return val >= targetStart || "Must be after start date"
                      },
                    })}
                  />
                  <FieldError message={errors.targetEndDate?.message} />
                </Box>
              </Grid>

              {businessType === "tool_sourcing" && (
                <Box>
                  <Label required>Estimated scope</Label>
                  <Text fontSize="0.8125rem" color={MUTED} mb={2}>
                    Approximate hours, deliverables, or units for this project
                  </Text>
                  <FormInput
                    size="lg"
                    type="number"
                    min={1}
                    placeholder="e.g., 40 hours"
                    {...register("estimatedQuantity", {
                      required: "Required for fixed projects",
                      min: { value: 1, message: "At least 1" },
                      valueAsNumber: true,
                    })}
                  />
                  <FieldError message={errors.estimatedQuantity?.message} />
                </Box>
              )}

              {urgencyValue && (
                <Box
                  mt={5} p={4} borderRadius="8px"
                  bg={G_LIGHT} border={`1px solid ${G_BORDER}`}
                  display="flex" alignItems="center" gap={3}
                >
                  <Box w="6px" h="6px" borderRadius="full" bg={GREEN} flexShrink={0} />
                  <Text fontSize="0.8125rem" color="#155f44" lineHeight="1.5">
                    <Text as="span" fontWeight="700">
                      {urgencyValue === "critical" ? "Critical project" :
                       urgencyValue === "high" ? "High-priority project" :
                       urgencyValue === "medium" ? "Standard project" : "Flexible project"}
                    </Text>
                    {" "}— your project manager will be assigned within 24 hours of submission.
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* ── Step 3: Account ──────────────────────────────── */}
          {step === 3 && (
            <Box>
              <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={5} mb={5}>
                <Box>
                  <Label required>Full name or username</Label>
                  <FormInput
                    size="lg"
                    placeholder="e.g., johnsmith"
                    autoComplete="username"
                    {...formInvalidBorder(!!errors.username)}
                    {...register("username", {
                      required: "Required",
                      minLength: { value: 2, message: "At least 2 characters" },
                    })}
                  />
                  <FieldError message={errors.username?.message} />
                </Box>
                <Box>
                  <Label required>Work email</Label>
                  <FormInput
                    size="lg"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    {...formInvalidBorder(!!errors.email)}
                    {...register("email", {
                      required: "Required",
                      pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email" },
                    })}
                  />
                  <FieldError message={errors.email?.message} />
                </Box>
              </Grid>

              <Box mb={6}>
                <Label required>Password</Label>
                <PasswordInput
                  size="lg"
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  {...FORM_INPUT_PROPS_LG}
                  {...formInvalidBorder(!!errors.password)}
                  {...register("password", {
                    required: "Required",
                    minLength: { value: 6, message: "At least 6 characters" },
                  })}
                />
                <FieldError message={errors.password?.message} />
              </Box>

              {/* Project summary */}
              <Box
                p={5} mb={6} borderRadius="10px"
                bg="#F9FAFB" border={`1.5px solid ${RULE}`}
              >
                <Text fontSize="0.6875rem" fontWeight="700" color={MUTED}
                  letterSpacing="0.1em" textTransform="uppercase" mb={3}>
                  Your project summary
                </Text>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {[
                    watch("type") === "service" ? "Ongoing Service" : "Fixed Project",
                    watch("title") || "No title yet",
                    watch("urgency") ? `Priority: ${watch("urgency")}` : null,
                  ].filter(Boolean).map((tag) => (
                    <Box key={tag as string}
                      px={3} py={1} bg="white" border={`1px solid ${RULE}`}
                      borderRadius="6px" fontSize="0.8125rem" fontWeight="500" color={INK}>
                      {tag}
                    </Box>
                  ))}
                </Box>
              </Box>

              <Button
                type="submit"
                w="full" h="52px"
                bg={AMBER} color={INK}
                fontWeight="700" fontSize="1rem"
                borderRadius="10px"
                loading={isSubmitting}
                loadingText="Creating account & submitting…"
                _hover={{ bg: AMBER_HOVER }}
                _active={{ bg: "#c07a17" }}
                mb={4}
              >
                Submit project & create account →
              </Button>

              <Text fontSize="0.75rem" color={MUTED} textAlign="center">
                Already have an account?{" "}
                <Box as={Link} to="/login" color={GREEN} fontWeight="600"
                  _hover={{ textDecoration: "underline" }}>
                  Sign in
                </Box>
              </Text>
            </Box>
          )}
        </Box>

        {/* ── Navigation bar ─────────────────────────────────── */}
        <Flex align="center" justify="space-between" mt={7} pt={5}
          borderTop={`1px solid ${RULE}`}>
          {step > 1 ? (
            <Button
              variant="ghost"
              fontSize="0.875rem" fontWeight="600" color={MUTED}
              px={0} h="auto" py={0}
              _hover={{ color: INK }}
              onClick={() => fadeToStep(step - 1)}
            >
              ← Back
            </Button>
          ) : (
            <Box />
          )}

          <Text fontSize="0.8125rem" color="#9CA3AF" fontWeight="500">
            Step {step} of {TOTAL_STEPS}
          </Text>

          {step < TOTAL_STEPS ? (
            <Button
              fontSize="0.875rem" fontWeight="700"
              bg={INK} color="white"
              px={6} h="40px" borderRadius="8px"
              _hover={{ bg: "#1a3020" }}
              onClick={handleContinue}
            >
              Continue →
            </Button>
          ) : (
            <Box />
          )}
        </Flex>

        {/* Trust badges — step 1 only */}
        {step === 1 && (
          <Flex justify="center" gap={5} mt={5} flexWrap="wrap">
            {["Free for clients", "No credit card", "Cancel anytime"].map((t) => (
              <Flex key={t} align="center" gap={1.5}>
                <Box w="5px" h="5px" borderRadius="full" bg={G_BORDER} />
                <Text fontSize="0.6875rem" color={MUTED}>{t}</Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Box>
    </Box>
  )
}
