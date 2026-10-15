import { useEffect, useRef, useState, type ReactNode } from "react"
import { Box, Flex, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import AvailabilityBanner from "@/components/landing/AvailabilityBanner"
import FilmBackdrop from "@/components/landing/FilmBackdrop"
import loginVideo from "@/assets/EOLogin.mp4"
import { submitProjectRequest } from "@/api/public"
import { BrandMark } from "@/components/brand/BrandMark"
import { GREEN, INK, MUTED } from "@/theme/tokens"

type RequestFields = {
  name: string
  email: string
  company: string
  role: string
  projectName: string
  projectType: string
  description: string
  timeline: string
  budget: string
  notes: string
}

const STEPS = [
  { label: "You", title: "Who should I reply to?", hint: "A name and an email are enough to start." },
  { label: "Project", title: "What are we building?", hint: "The name, the kind of work, and what success looks like." },
  { label: "Timing", title: "When, and at what scale?", hint: "A range is enough. “Not sure yet” is a valid answer." },
  { label: "Review", title: "Check the brief", hint: "This is what will be sent to info@egemenokur.com." },
] as const

const PROJECT_TYPES = ["Product", "Website", "Brand", "Internal tool", "Advisory", "Something else"]
const TIMELINES = ["As soon as possible", "This quarter", "This year", "Flexible"]
const BUDGETS = ["Under €10,000", "€10,000 – €25,000", "€25,000 – €50,000", "€50,000+", "Not sure yet"]

const STEP_FIELDS: (keyof RequestFields)[][] = [
  ["name", "email"],
  ["projectName", "projectType", "description"],
  ["timeline", "budget"],
  [],
]

export default function ProjectRequestPage() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [step, setStep] = useState(0)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RequestFields>({
    defaultValues: {
      name: "",
      email: "",
      company: "",
      role: "",
      projectName: "",
      projectType: "",
      description: "",
      timeline: "",
      budget: "",
      notes: "",
    },
    mode: "onSubmit",
  })
  const values = watch()

  useEffect(() => {
    headingRef.current?.focus()
  }, [step, sent])

  async function continueStep() {
    const ok = await trigger(STEP_FIELDS[step])
    if (ok) setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  async function onSubmit(data: RequestFields) {
    setError(null)
    setSubmitting(true)
    try {
      await submitProjectRequest(data)
      setSent(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not send the request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <AvailabilityBanner />
    <FilmBackdrop src={loginVideo} dim={0.62}>
      <Flex
        minH="100vh"
        align="flex-start"
        justify="center"
        px={{ base: 4, md: 6 }}
        pt={{ base: "calc(var(--availability-banner) + 1.5rem)", md: "calc(var(--availability-banner) + 2.5rem)" }}
        pb={{ base: 6, md: 10 }}
      >
        <Box w="full" maxW="720px">
          <Flex align="center" justify="space-between" mb={5} gap={4}>
            <BrandMark inverted to="/" />
            <Link to="/" style={{ textDecoration: "none" }}>
              <Text
                fontSize="0.6875rem"
                fontWeight="600"
                letterSpacing="0.16em"
                textTransform="uppercase"
                color="rgba(255,255,255,0.62)"
                _hover={{ color: "white" }}
              >
                Return
              </Text>
            </Link>
          </Flex>

          <Box className="atelier-brief" color={INK} px={{ base: 5, md: 10 }} py={{ base: 7, md: 9 }}>
            <Box position="relative" zIndex={1}>
            {sent ? (
              <Box>
                <Text
                  fontSize="0.625rem"
                  fontWeight="600"
                  letterSpacing="0.18em"
                  textTransform="uppercase"
                  color="rgba(14,27,23,0.42)"
                  mb={3}
                >
                  Received
                </Text>
                <Text as="h1" ref={headingRef} tabIndex={-1} outline="none" fontSize={{ base: "1.75rem", md: "2.125rem" }} fontWeight="600" letterSpacing="-0.035em" lineHeight="1.12" mb={3}>
                  Request received
                </Text>
                <Text color={MUTED} fontSize="0.9375rem" lineHeight="1.7" maxW="460px">
                  I’ll reply to {values.email}. If it’s urgent, you can also write directly to info@egemenokur.com.
                </Text>
              </Box>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Flex gap={3} mb={7} aria-label="Progress">
                  {STEPS.map((item, index) => {
                    const state = index < step ? "done" : index === step ? "current" : "upcoming"
                    return (
                      <Box key={item.label} flex="1" minW={0}>
                        <Box
                          h="2px"
                          borderRadius="99px"
                          bg={state === "upcoming" ? "rgba(14,27,23,0.1)" : GREEN}
                          mb={2}
                          transition="background-color 240ms ease"
                        />
                        <Text
                          fontSize="0.625rem"
                          letterSpacing="0.12em"
                          textTransform="uppercase"
                          color={state === "current" ? INK : "rgba(14,27,23,0.38)"}
                          fontWeight={state === "current" ? "600" : "500"}
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                        >
                          {item.label}
                        </Text>
                      </Box>
                    )
                  })}
                </Flex>

                <Box key={step} className="brief-step">
                <Text fontSize="0.625rem" fontWeight="600" letterSpacing="0.18em" textTransform="uppercase" color="rgba(14,27,23,0.4)" mb={2}>
                  Step {step + 1} of {STEPS.length}
                </Text>
                <Text as="h1" ref={headingRef} tabIndex={-1} outline="none" fontSize={{ base: "1.7rem", md: "2.125rem" }} fontWeight="600" letterSpacing="-0.035em" lineHeight="1.12" mb={2}>
                  {STEPS[step].title}
                </Text>
                <Text color={MUTED} fontSize="0.9375rem" lineHeight="1.6" mb={6}>
                  {STEPS[step].hint}
                </Text>

                {step === 0 && (
                  <Flex direction="column" gap={4}>
                    <Field label="Name" htmlFor="brief-name" error={errors.name?.message} required>
                      <input id="brief-name" className="brief-field" autoComplete="name" aria-invalid={!!errors.name} {...register("name", { required: "Enter your name", minLength: { value: 2, message: "Enter your name" } })} />
                    </Field>
                    <Field label="Email" htmlFor="brief-email" error={errors.email?.message} required>
                      <input id="brief-email" className="brief-field" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email", { required: "Enter a valid email", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" } })} />
                    </Field>
                    <Flex gap={4} direction={{ base: "column", sm: "row" }}>
                      <Field label="Company" htmlFor="brief-company">
                        <input id="brief-company" className="brief-field" autoComplete="organization" {...register("company")} />
                      </Field>
                      <Field label="Role" htmlFor="brief-role">
                        <input id="brief-role" className="brief-field" autoComplete="organization-title" placeholder="Founder, product lead…" {...register("role")} />
                      </Field>
                    </Flex>
                  </Flex>
                )}

                {step === 1 && (
                  <Flex direction="column" gap={4}>
                    <Field label="Project name" htmlFor="brief-project" error={errors.projectName?.message} required>
                      <input id="brief-project" className="brief-field" aria-invalid={!!errors.projectName} {...register("projectName", { required: "Give the project a name", minLength: { value: 2, message: "Give the project a name" } })} />
                    </Field>
                    <Field label="Type of work" error={errors.projectType?.message} required>
                      <input type="hidden" {...register("projectType", { required: "Choose a type of work" })} />
                      <ChoiceGroup
                        label="Type of work"
                        value={values.projectType}
                        options={PROJECT_TYPES}
                        onChange={(value) => setValue("projectType", value, { shouldValidate: true })}
                      />
                    </Field>
                    <Field label="What do you need" htmlFor="brief-description" error={errors.description?.message} required>
                      <textarea id="brief-description" className="brief-field" aria-invalid={!!errors.description} placeholder="The goal, who it’s for, and anything already decided." {...register("description", { required: "Describe the work in a sentence or two", minLength: { value: 20, message: "Add a little more detail — a sentence or two is enough" } })} />
                    </Field>
                  </Flex>
                )}

                {step === 2 && (
                  <Flex direction="column" gap={5}>
                    <Field label="Timeline" error={errors.timeline?.message} required>
                      <input type="hidden" {...register("timeline", { required: "Choose a timeline" })} />
                      <ChoiceGroup
                        label="Timeline"
                        value={values.timeline}
                        options={TIMELINES}
                        onChange={(value) => setValue("timeline", value, { shouldValidate: true })}
                      />
                    </Field>
                    <Field label="Budget" error={errors.budget?.message} required>
                      <input type="hidden" {...register("budget", { required: "Choose a budget range" })} />
                      <ChoiceGroup
                        label="Budget"
                        value={values.budget}
                        options={BUDGETS}
                        onChange={(value) => setValue("budget", value, { shouldValidate: true })}
                      />
                    </Field>
                    <Field label="Anything else" htmlFor="brief-notes">
                      <textarea id="brief-notes" className="brief-field" placeholder="Constraints, links, or a preferred way to talk." {...register("notes")} />
                    </Field>
                  </Flex>
                )}

                {step === 3 && (
                  <Flex direction="column">
                    <ReviewRow label="Name" value={values.name} onEdit={() => setStep(0)} />
                    <ReviewRow label="Email" value={values.email} onEdit={() => setStep(0)} />
                    <ReviewRow label="Company" value={values.company || "—"} onEdit={() => setStep(0)} />
                    <ReviewRow label="Role" value={values.role || "—"} onEdit={() => setStep(0)} />
                    <ReviewRow label="Project" value={values.projectName} onEdit={() => setStep(1)} />
                    <ReviewRow label="Type" value={values.projectType} onEdit={() => setStep(1)} />
                    <ReviewRow label="Brief" value={values.description} onEdit={() => setStep(1)} />
                    <ReviewRow label="Timeline" value={values.timeline} onEdit={() => setStep(2)} />
                    <ReviewRow label="Budget" value={values.budget} onEdit={() => setStep(2)} />
                    {values.notes ? <ReviewRow label="Notes" value={values.notes} onEdit={() => setStep(2)} /> : null}
                  </Flex>
                )}
                </Box>

                {error && <Text color="#B91C1C" fontSize="0.875rem" mt={4}>{error}</Text>}

                <Flex mt={7} justify="space-between" align="center" gap={3}>
                  {step > 0 ? (
                    <button type="button" onClick={() => setStep((current) => current - 1)} className="brief-ghost">
                      Back
                    </button>
                  ) : <span />}
                  {step < STEPS.length - 1 ? (
                    <button type="button" onClick={continueStep} className="brief-primary">
                      Continue
                    </button>
                  ) : (
                    <button type="submit" disabled={submitting} className="brief-primary">
                      {submitting ? "Sending" : "Send request"}
                    </button>
                  )}
                </Flex>
              </form>
            )}
            </Box>
          </Box>
        </Box>
      </Flex>
    </FilmBackdrop>
    </>
  )
}

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <Box flex="1">
      <Text as="label" htmlFor={htmlFor} display="block" fontSize="0.8125rem" fontWeight="600" letterSpacing="-0.011em" color={INK} mb="6px">
        {label}
        {required ? <Text as="span" color={GREEN}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text color="#B91C1C" fontSize="0.8125rem" mt={1.5}>{error}</Text> : null}
    </Box>
  )
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <Flex role="radiogroup" aria-label={label} wrap="wrap" gap={2}>
      {options.map((option) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className="brief-choice"
          >
            {option}
          </button>
        )
      })}
    </Flex>
  )
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <Flex gap={4} py={3.5} borderBottom="1px solid rgba(14,27,23,0.08)" align="flex-start" _last={{ borderBottom: "none" }}>
      <Text w="88px" flexShrink={0} fontSize="0.625rem" fontWeight="600" letterSpacing="0.14em" textTransform="uppercase" color="rgba(14,27,23,0.42)" pt="3px">
        {label}
      </Text>
      <Text flex="1" fontSize="0.9375rem" lineHeight="1.55" letterSpacing="-0.011em" whiteSpace="pre-wrap">{value}</Text>
      <button type="button" onClick={onEdit} className="brief-edit">
        Edit
      </button>
    </Flex>
  )
}
