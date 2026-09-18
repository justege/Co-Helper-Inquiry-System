import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { Box, Fieldset, Flex, Grid, RadioGroup, Stack, Text } from "@chakra-ui/react"
import { Field } from "@/components/ui/field"
import {
  FormInput,
  FormNativeSelect,
  FormTextarea,
  formInvalidBorder,
} from "@/components/ui/form-controls"
import { PageShell } from "@/components/ui/PageShell"
import { auth } from "../lib/firebase"
import { api } from "../lib/api"
import type { CreateInquiryInput, Inquiry, BusinessType, Urgency } from "../api/inquiries"
import { getCategories, type Category } from "../api/categories"
import { getMe } from "../api/users"
import { getMyWorkspace, getWorkspaceProjects, type FreelancerWorkspaceMe, type ClientWorkspaceMe, type WorkspaceProject } from "../api/workspace"
import {
  APP_BORDER,
  APP_BG_SUBTLE,
  APP_BTN_PRIMARY,
  APP_LABEL,
} from "@/components/ui/appUi"
import { StartWorkspaceEmptyState } from "@/components/ui/FeatureEmptyState"
import AiInquiryChat, { type AiChatResult } from "@/components/ai/AiInquiryChat"
import { draftToInquiryInput } from "@/lib/gemini"
import { INK, MUTED } from "@/components/marketing/tokens"
import avatarSrc from "@/assets/avatar.png"
import { Link as RouterLink } from "react-router-dom"
import { AppButton } from "@/components/ui/AppButton"


const URGENCY_OPTIONS: { value: Urgency; label: string; accent: string }[] = [
  { value: "low",      label: "Low",      accent: "#64748B" },
  { value: "medium",   label: "Medium",   accent: "#92400E" },
  { value: "high",     label: "High",     accent: "#B91C1C" },
  { value: "critical", label: "Critical", accent: "#7F1D1D" },
]

const AI_BLUE = "#185FA5"

// ─── Mode toggle (app variant) ────────────────────────────────────────────────

type FormMode = "standard" | "ai"

function AppModeToggle({ mode, onChange }: { mode: FormMode; onChange: (m: FormMode) => void }) {
  return (
    <Flex
      bg={APP_BG_SUBTLE} borderRadius="10px" p="3px" gap="3px"
      border={`1px solid ${APP_BORDER}`}
      display="inline-flex"
    >
      {(["standard", "ai"] as FormMode[]).map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: active ? "white" : "transparent",
              color: active ? INK : MUTED,
              fontSize: "0.8125rem",
              fontWeight: active ? 700 : 500,
              transition: "all 0.18s",
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {m === "ai" && (
              <span style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                background: active ? AI_BLUE : APP_BORDER,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.18s",
              }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="2" fill="white" />
                  <line x1="1.5" y1="3" x2="6" y2="6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="10.5" y1="3" x2="6" y2="6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="6" y1="10.5" x2="6" y2="6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
            )}
            {m === "standard" ? "Standard form" : "Edit with AI"}
          </button>
        )
      })}
    </Flex>
  )
}

// ─── AI mode panel ────────────────────────────────────────────────────────────

interface AiPanelProps {
  categories: Category[]
  onComplete: (result: AiChatResult) => void
}

function AiPanel({ categories, onComplete }: AiPanelProps) {
  return (
    <Box
      bg="white"
      border={`1px solid ${APP_BORDER}`}
      borderRadius="16px"
      overflow="hidden"
    >
      {/* Header */}
      <Box px={{ base: 5, md: 7 }} py={4} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={2.5}>
              <Box
                w="34px" h="34px" borderRadius="full" flexShrink={0}
                overflow="hidden" border={`2px solid ${APP_BORDER}`}
                boxShadow="0 2px 6px rgba(0,0,0,0.1)"
              >
                <img src={avatarSrc} alt="AI assistant"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
              </Box>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="700" color={INK}>AI assistant</Text>
                <Flex align="center" gap={1.5}>
                  <Box w="5px" h="5px" borderRadius="full" bg="#4ADE80"
                    style={{ animation: "pulse 2s infinite" }} />
                  <Text fontSize="0.6875rem" color={MUTED}>Clarify the job in conversation</Text>
                </Flex>
              </Box>
            </Flex>
          <Text fontSize="0.75rem" color={MUTED} maxW="280px" textAlign="right" lineHeight="1.5"
            display={{ base: "none", md: "block" }}>
            Describe the work in plain language — AI structures it as a job in this workspace.
          </Text>
        </Flex>
      </Box>

      {/* Chat */}
      <Box h={{ base: "460px", md: "520px" }}>
        <AiInquiryChat
          categories={categories}
          onComplete={onComplete}
          isAuthenticated
          variant="app"
        />
      </Box>
    </Box>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewInquiryPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [mode, setMode] = useState<FormMode>("ai")
  const [aiError, setAiError] = useState<string>()

  // Workspace context: who is this job for / whose workspace does it belong to.
  const [isFreelancer, setIsFreelancer] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [freelancerWs, setFreelancerWs] = useState<FreelancerWorkspaceMe | null>(null)
  const [clientWs, setClientWs] = useState<ClientWorkspaceMe | null>(null)
  const [clientId, setClientId] = useState("")
  const [workspaceId, setWorkspaceId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [myId, setMyId] = useState("")

  useEffect(() => {
    getMe()
      .then((me) => {
        const freelancer = me.role === "expert"
        setIsFreelancer(freelancer)
        setMyId(me.id)
        if (freelancer) setClientId(me.id)
        return getMyWorkspace()
      })
      .then((ws) => {
        if (ws.role === "owner") {
          setFreelancerWs(ws)
        } else {
          setClientWs(ws)
          if (ws.workspaces.length >= 1) setWorkspaceId(ws.workspaces[0].id)
        }
        return getWorkspaceProjects().catch(() => ({ projects: [] as WorkspaceProject[] }))
      })
      .then((data) => {
        if (data?.projects) setProjects(data.projects)
      })
      .catch(() => null)
      .finally(() => setWorkspaceLoading(false))
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateInquiryInput>({
    mode: "onBlur",
    defaultValues: { type: "service", urgency: "medium" },
  })

  const businessType = watch("type") as BusinessType
  const targetStart  = watch("targetStartDate")

  useEffect(() => {
    setCatLoading(true)
    getCategories({ type: businessType })
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false))
  }, [businessType])

  // All categories for AI mode
  const [allCategories, setAllCategories] = useState<Category[]>([])
  useEffect(() => {
    getCategories()
      .then(setAllCategories)
      .catch(() => setAllCategories([]))
  }, [])

  // AI complete → submit directly (user is already authenticated)
  async function handleAiComplete(result: AiChatResult) {
    if (!auth?.currentUser) {
      setAiError("Not signed in")
      return
    }
    if (isFreelancer && !clientId) {
      setAiError("Pick who this job is for")
      return
    }
    try {
      const payload = draftToInquiryInput(result.draft, result.categoryId)
      const created = await api.post<Inquiry>("/api/inquiries", {
        ...payload,
        estimatedQuantity: payload.estimatedQuantity ?? null,
        targetStartDate: payload.targetStartDate ?? null,
        targetEndDate: payload.targetEndDate ?? null,
        clientId: isFreelancer ? clientId : undefined,
        workspaceId: !isFreelancer && workspaceId ? workspaceId : undefined,
        projectId: projectId || undefined,
      })
      navigate(`/app/jobs/${created.id}`)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Submission failed")
    }
  }

  async function onSubmit(values: CreateInquiryInput) {
    if (!auth?.currentUser) {
      setError("root", { message: "Not signed in" })
      return
    }
    if (isFreelancer && !clientId) {
      setError("root", { message: "Pick who this job is for" })
      return
    }
    const payload = {
      ...values,
      estimatedQuantity:
        values.type === "tool_sourcing" && values.estimatedQuantity
          ? Number(values.estimatedQuantity)
          : null,
      targetStartDate: values.targetStartDate || null,
      targetEndDate:   values.targetEndDate || null,
      clientId: isFreelancer ? clientId : undefined,
      workspaceId: !isFreelancer && workspaceId ? workspaceId : undefined,
      projectId: projectId || undefined,
    }
    try {
      const created = await api.post<Inquiry>("/api/inquiries", payload)
      navigate(`/app/jobs/${created.id}`)
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Request failed" })
    }
  }

  if (!workspaceLoading && !isFreelancer && (clientWs?.workspaces.length ?? 0) === 0) {
    return (
      <PageShell
        eyebrow="Jobs"
        title="New job"
        subtitle="Start your own workspace, or join one you’ve been invited to."
        backHref="/app/inquiries"
        backLabel="My jobs"
      >
        <StartWorkspaceEmptyState />
      </PageShell>
    )
  }

  return (
    <PageShell
      eyebrow="Jobs"
      title="New job"
      subtitle={
        isFreelancer
          ? "Open a job for a company — or keep it on your workspace until you invite them."
          : "Describe the work so you and the one-person business have one shared brief."
      }
      backHref="/app/inquiries"
      backLabel="My jobs"
    >
      {/* Client / workspace picker */}
      {!workspaceLoading && isFreelancer && (
        <Box mb={5}>
          <Field label="Company" required>
            <FormNativeSelect value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {myId && <option value={myId}>Keep on my workspace (no client)</option>}
              {(freelancerWs?.clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
                </option>
              ))}
            </FormNativeSelect>
          </Field>
          {(freelancerWs?.clients.length ?? 0) === 0 && (
            <Text fontSize="0.75rem" color={MUTED} mt={2}>
              No clients yet.{" "}
              <RouterLink to="/app/clients" style={{ color: INK, fontWeight: 600 }}>Invite someone</RouterLink>
              {" "}so they can see this job.
            </Text>
          )}
        </Box>
      )}
      {!workspaceLoading && !isFreelancer && (clientWs?.workspaces.length ?? 0) > 1 && (
        <Box mb={5}>
          <Field label="Workspace">
            <FormNativeSelect value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
              {(clientWs?.workspaces ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.freelancer
                    ? [w.freelancer.firstName, w.freelancer.lastName].filter(Boolean).join(" ") || w.freelancer.companyName || w.freelancer.email
                    : w.name}
                </option>
              ))}
            </FormNativeSelect>
          </Field>
        </Box>
      )}
      {!workspaceLoading && (
        <Box mb={5}>
          <Field label="Project" optionalText="optional">
            <FormNativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </FormNativeSelect>
          </Field>
          {isFreelancer && (
            <Text fontSize="0.75rem" color={MUTED} mt={2}>
              Group this job with others.{" "}
              <RouterLink to="/app/projects" style={{ color: INK, fontWeight: 600 }}>Manage projects</RouterLink>
            </Text>
          )}
        </Box>
      )}

      {/* Mode toggle */}
      <Box mb={5}>
        <AppModeToggle mode={mode} onChange={(m) => { setMode(m); setAiError(undefined) }} />
      </Box>

      {/* AI mode */}
      {mode === "ai" && (
        <>
          {aiError && (
            <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px" px={4} py={3} mb={4}>
              <Text fontSize="sm" color="#991B1B">{aiError}</Text>
            </Box>
          )}
          <AiPanel
            categories={allCategories.length > 0 ? allCategories : categories}
            onComplete={handleAiComplete}
          />
        </>
      )}

      {/* Standard form */}
      {mode === "standard" && (
        <>
          {errors.root && (
            <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px" px={4} py={3} mb={4}>
              <Text fontSize="sm" color="#991B1B">{errors.root.message}</Text>
            </Box>
          )}

          <Box
            as="form"
            onSubmit={handleSubmit(onSubmit)}
            bg="white"
            border={`1px solid ${APP_BORDER}`}
            borderRadius="16px"
            overflow="hidden"
          >
            <Box px={{ base: 5, md: 7 }} py={4} mb={0} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
              <Text fontSize="0.6875rem" fontWeight="700" color={APP_LABEL} letterSpacing="0.09em" textTransform="uppercase">
                Job details
              </Text>
            </Box>

            <Box p={{ base: 5, md: 7 }}>
              <Fieldset.Root>
                <Fieldset.Content>
                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={5} mb={5}>
                    <Field label="Job type" invalid={!!errors.type} errorText={errors.type?.message} required>
                      <FormNativeSelect {...register("type", { required: "Type is required" })}>
                        <option value="service">Ongoing Service</option>
                        <option value="tool_sourcing">Fixed Project</option>
                      </FormNativeSelect>
                    </Field>

                    <Field label="Category" invalid={!!errors.categoryId} errorText={errors.categoryId?.message} required>
                      <FormNativeSelect
                        {...register("categoryId", { required: "Category is required" })}
                        rootProps={{
                          opacity: catLoading || categories.length === 0 ? 0.5 : 1,
                          pointerEvents: catLoading || categories.length === 0 ? "none" : undefined,
                        }}
                      >
                        {catLoading ? (
                          <option value="">Loading…</option>
                        ) : categories.length === 0 ? (
                          <option value="">No categories for this type</option>
                        ) : (
                          <>
                            <option value="">Select a category</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </>
                        )}
                      </FormNativeSelect>
                    </Field>
                  </Grid>

                  <Box mb={5}>
                    <Field label="Title" invalid={!!errors.title} errorText={errors.title?.message} required>
                      <FormInput
                        placeholder="e.g. Website redesign for Acme"
                        {...formInvalidBorder(!!errors.title)}
                        {...register("title", {
                          required: "Title is required",
                          minLength: { value: 3, message: "At least 3 characters" },
                          maxLength: { value: 255, message: "255 characters max" },
                        })}
                      />
                    </Field>
                  </Box>

                  <Box mb={5}>
                    <Field label="Description" invalid={!!errors.description} errorText={errors.description?.message} required>
                      <FormTextarea
                        placeholder="Goals, scope, deliverables, and anything the other party needs to know."
                        rows={5}
                        {...formInvalidBorder(!!errors.description)}
                        {...register("description", {
                          required: "Description is required",
                          minLength: { value: 10, message: "At least 10 characters" },
                        })}
                      />
                    </Field>
                  </Box>

                  <Stack direction={{ base: "column", lg: "row" }} gap={6} mb={5} alignItems="flex-start">
                    <Field label="Urgency" invalid={!!errors.urgency} errorText={errors.urgency?.message} required flex={1}>
                      <Controller
                        name="urgency"
                        control={control}
                        rules={{ required: "Urgency is required" }}
                        render={({ field }) => (
                          <RadioGroup.Root value={field.value} onValueChange={({ value }) => field.onChange(value as Urgency)}>
                            <Box display="flex" gap={2} flexWrap="wrap">
                              {URGENCY_OPTIONS.map((opt) => (
                                <RadioGroup.Item key={opt.value} value={opt.value}>
                                  <RadioGroup.ItemHiddenInput />
                                  <Box
                                    display="flex" alignItems="center" gap={2}
                                    px={3} py={2} borderRadius="8px"
                                    border="1.5px solid"
                                    borderColor={field.value === opt.value ? opt.accent : "#D8DCE8"}
                                    bg={field.value === opt.value ? opt.accent + "12" : "white"}
                                    cursor="pointer" transition="all 0.1s"
                                  >
                                    <RadioGroup.ItemIndicator />
                                    <RadioGroup.ItemText
                                      fontSize="0.85rem" fontWeight="600"
                                      color={field.value === opt.value ? opt.accent : "#64748B"}
                                    >
                                      {opt.label}
                                    </RadioGroup.ItemText>
                                  </Box>
                                </RadioGroup.Item>
                              ))}
                            </Box>
                          </RadioGroup.Root>
                        )}
                      />
                    </Field>

                    <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4} flex={1}>
                      <Field label="Target start date" invalid={!!errors.targetStartDate} errorText={errors.targetStartDate?.message}>
                        <FormInput type="date" {...register("targetStartDate")} />
                      </Field>
                      <Field label="Target end date" invalid={!!errors.targetEndDate} errorText={errors.targetEndDate?.message}>
                        <FormInput
                          type="date"
                          {...register("targetEndDate", {
                            validate: (val) => {
                              if (!val || !targetStart) return true
                              return val >= targetStart || "Must be on or after start date"
                            },
                          })}
                        />
                      </Field>
                    </Grid>
                  </Stack>

                  {businessType === "tool_sourcing" && (
                    <Box mb={5}>
                      <Field
                        label="Estimated scope"
                        helperText="Approximate hours, deliverables, or units for this project"
                        invalid={!!errors.estimatedQuantity}
                        errorText={errors.estimatedQuantity?.message}
                        required
                      >
                        <FormInput
                          type="number" min={1} placeholder="e.g., 40"
                          {...register("estimatedQuantity", {
                            required: "Scope estimate is required for fixed projects",
                            min: { value: 1, message: "At least 1" },
                            valueAsNumber: true,
                          })}
                        />
                      </Field>
                    </Box>
                  )}

                  <Box pt={2} borderTop={`1px solid ${APP_BORDER}`} display="flex" justifyContent="flex-end">
                    <AppButton
                      {...APP_BTN_PRIMARY}
                      type="submit" size="lg" px={10}
                      loading={isSubmitting} loadingText="Submitting…"
                      disabled={isFreelancer && !clientId}
                    >
                      {isFreelancer ? "Create Job" : "Open job"}
                    </AppButton>
                  </Box>
                </Fieldset.Content>
              </Fieldset.Root>
            </Box>
          </Box>
        </>
      )}
    </PageShell>
  )
}
