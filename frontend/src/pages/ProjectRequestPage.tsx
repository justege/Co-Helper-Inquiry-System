import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Box, Flex, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import FilmBackdrop from "@/components/landing/FilmBackdrop"
import loginVideo from "@/assets/EOLogin.mp4"
import { submitProjectRequest } from "@/api/public"
import { AiWrite } from "@/components/assistant/AiWrite"

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
    <FilmBackdrop src={loginVideo} dim={0.72}>
      <style>{`
        .brief-field {
          width: 100%;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          background: #fff;
          color: #0E1B17;
          font: inherit;
          font-size: 0.9375rem;
          padding: 12px 14px;
          outline: none;
        }
        .brief-field:focus {
          border-color: #0F6E56;
          box-shadow: 0 0 0 3px rgba(15,110,86,0.14);
        }
        .brief-field[aria-invalid="true"] {
          border-color: #DC2626;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.12);
        }
        textarea.brief-field { min-height: 140px; resize: vertical; line-height: 1.55; }
      `}</style>
      <Flex minH="100vh" align="flex-start" justify="center" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        <Box w="full" maxW="680px">
          <Link to="/" style={{ textDecoration: "none", color: "rgba(255,255,255,0.78)" }}>
            <Text fontSize="0.75rem" letterSpacing="0.16em" textTransform="uppercase" mb={4}>
              ← Back
            </Text>
          </Link>

          <Box bg="white" color="#0E1B17" borderRadius="20px" boxShadow="0 30px 80px rgba(0,0,0,0.35)" px={{ base: 5, md: 10 }} py={{ base: 6, md: 8 }}>
            {sent ? (
              <Box>
                <Text fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="0.95rem" mb={3}>{"<EO/>"}</Text>
                <Text as="h1" ref={headingRef} tabIndex={-1} outline="none" fontSize="1.75rem" fontWeight="600" letterSpacing="-0.03em" mb={3}>
                  Request received
                </Text>
                <Text color="#4B5563" lineHeight="1.7">
                  I’ll reply to {values.email}. If it’s urgent, you can also write directly to info@egemenokur.com.
                </Text>
              </Box>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Flex gap={2} mb={6} aria-label="Progress">
                  {STEPS.map((item, index) => {
                    const state = index < step ? "done" : index === step ? "current" : "upcoming"
                    return (
                      <Box key={item.label} flex="1">
                        <Box h="3px" borderRadius="99px" bg={state === "upcoming" ? "#E5E7EB" : "#0F6E56"} mb={2} />
                        <Text fontSize="0.6875rem" letterSpacing="0.08em" textTransform="uppercase" color={state === "current" ? "#0E1B17" : "#9CA3AF"} fontWeight={state === "current" ? "700" : "500"}>
                          {index + 1} {item.label}
                        </Text>
                      </Box>
                    )
                  })}
                </Flex>

                <Text fontSize="0.75rem" letterSpacing="0.14em" textTransform="uppercase" color="#6B7280" mb={2}>
                  Step {step + 1} of {STEPS.length}
                </Text>
                <Text as="h1" ref={headingRef} tabIndex={-1} outline="none" fontSize={{ base: "1.6rem", md: "1.85rem" }} fontWeight="600" letterSpacing="-0.03em" lineHeight="1.15" mb={2}>
                  {STEPS[step].title}
                </Text>
                <Text color="#6B7280" fontSize="0.9375rem" mb={6}>
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
                      <AiWrite
                        scope="public"
                        kind="brief"
                        value={values.description}
                        hint={[values.projectName && `Project: ${values.projectName}`, values.projectType && `Type: ${values.projectType}`].filter(Boolean).join(". ")}
                        onText={(text) => setValue("description", text, { shouldValidate: true, shouldDirty: true })}
                      />
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
                      <AiWrite
                        scope="public"
                        kind="brief"
                        value={values.notes}
                        hint={[values.projectName && `Project: ${values.projectName}`, values.description && `Brief: ${values.description}`].filter(Boolean).join("\n")}
                        onText={(text) => setValue("notes", text, { shouldDirty: true })}
                      />
                    </Field>
                  </Flex>
                )}

                {step === 3 && (
                  <Flex direction="column" gap={3}>
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

                {error && <Text color="#B91C1C" fontSize="0.875rem" mt={4}>{error}</Text>}

                <Flex mt={7} justify="space-between" align="center" gap={3}>
                  {step > 0 ? (
                    <button type="button" onClick={() => setStep((current) => current - 1)} style={ghostButton}>
                      Back
                    </button>
                  ) : <span />}
                  {step < STEPS.length - 1 ? (
                    <button type="button" onClick={continueStep} style={primaryButton}>
                      Continue
                    </button>
                  ) : (
                    <button type="submit" disabled={submitting} style={{ ...primaryButton, cursor: submitting ? "wait" : "pointer" }}>
                      {submitting ? "Sending" : "Send request"}
                    </button>
                  )}
                </Flex>
              </form>
            )}
          </Box>
        </Box>
      </Flex>
    </FilmBackdrop>
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
      <Text as="label" htmlFor={htmlFor} display="block" fontSize="0.8125rem" fontWeight="600" mb={1.5}>
        {label}
        {required ? <Text as="span" color="#B91C1C"> *</Text> : null}
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
            style={{
              border: selected ? "1px solid #0F6E56" : "1px solid #E5E7EB",
              background: selected ? "#E8F5EF" : "#fff",
              color: "#0E1B17",
              borderRadius: "999px",
              padding: "10px 14px",
              fontSize: "0.875rem",
              fontWeight: selected ? 600 : 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
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
    <Flex gap={4} py={3} borderBottom="1px solid #E5E7EB" align="flex-start">
      <Text w="88px" flexShrink={0} fontSize="0.75rem" letterSpacing="0.08em" textTransform="uppercase" color="#6B7280" pt="2px">
        {label}
      </Text>
      <Text flex="1" fontSize="0.9375rem" lineHeight="1.5" whiteSpace="pre-wrap">{value}</Text>
      <button type="button" onClick={onEdit} style={{ background: "none", border: 0, color: "#0F6E56", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem" }}>
        Edit
      </button>
    </Flex>
  )
}

const primaryButton: CSSProperties = {
  background: "#0F6E56",
  color: "white",
  border: 0,
  borderRadius: "999px",
  padding: "12px 22px",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
}

const ghostButton: CSSProperties = {
  background: "transparent",
  color: "#0E1B17",
  border: "1px solid #E5E7EB",
  borderRadius: "999px",
  padding: "12px 18px",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
}
