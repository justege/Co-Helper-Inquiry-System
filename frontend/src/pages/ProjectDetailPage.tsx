import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import {
  getWorkspaceProject,
  inviteProjectCollaborator,
  removeProjectCollaborator,
  revokeInvitation,
  updateWorkspaceProject,
  type ProjectTicket,
} from "@/api/workspace"
import { createInvoice, getProjectWork, type ProjectWork } from "@/api/work"
import { PageShell } from "@/components/ui/PageShell"
import { APP_ACCENT, APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { AppButton } from "@/components/ui/AppButton"
import { AppTabs } from "@/components/ui/AppTabs"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Field } from "@/components/ui/field"
import { FormInput, FormNativeSelect } from "@/components/ui/form-controls"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DIALOG_PANEL_STYLE,
} from "@/components/ui/dialog"
import { displayName, formatPeopleList, peopleOnTodo } from "@/lib/people"
import { TODO_STATUS_LABEL } from "@/lib/hours"
import { WorkBoard } from "@/components/work/WorkBoard"
import { WorkTimeline } from "@/components/work/WorkTimeline"
import { useTodoCard } from "@/components/work/TodoCardContext"
import { AvatarStack, DueChip } from "@/components/work/todoUi"
import {
  DetailsSidebar,
  DiscussPanel,
  FilesPanel,
  OverviewPanel,
  PlanPanel,
  StatusChip,
} from "@/components/work/ProjectTicketPanels"
import { LuReceipt, LuTrash2, LuUsers } from "react-icons/lu"

const PROJECT_VIEWS = ["overview", "work", "timeline", "plan", "files", "discuss", "people", "pricing", "billing"] as const
type ProjectView = (typeof PROJECT_VIEWS)[number]

function parseView(value: string | null): ProjectView {
  if (value && (PROJECT_VIEWS as readonly string[]).includes(value)) return value as ProjectView
  return "overview"
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<ProjectTicket | null>(null)
  const [work, setWork] = useState<ProjectWork | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [invoiceBusy, setInvoiceBusy] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const tab = parseView(params.get("view"))
  const { openTodo } = useTodoCard()

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: "" } })

  function load() {
    if (!id) return
    Promise.all([getWorkspaceProject(id), getProjectWork(id)])
      .then(([meta, w]) => { setData(meta); setWork(w); setError(null) })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => { load() }, [id])
  useEffect(() => {
    const refresh = () => load()
    window.addEventListener("cohelper:work-refresh", refresh)
    return () => window.removeEventListener("cohelper:work-refresh", refresh)
  }, [id])

  function setTab(next: string) {
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      if (next === "overview") nextParams.delete("view")
      else nextParams.set("view", next)
      return nextParams
    }, { replace: true })
  }

  function setMilestone(id: string) {
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set("view", "plan")
      nextParams.set("milestone", id)
      return nextParams
    }, { replace: true })
  }

  async function onInvite(values: { email: string }) {
    if (!id) return
    setInviteError(null)
    try {
      await inviteProjectCollaborator(id, values.email.trim())
      reset()
      setInviteOpen(false)
      load()
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : "Could not invite")
    }
  }

  if (error) return <PageShell eyebrow="Workspace" title="Project" backHref="/app"><Text color="#B91C1C">{error}</Text></PageShell>
  if (!data || !work) return <PageShell eyebrow="Workspace" title="Project" backHref="/app"><Spinner /></PageShell>

  const canManage = data.role === "owner" || data.role === "admin"
  const canWork = data.role === "owner" || data.role === "admin" || data.role === "collaborator"
  const canEdit = canWork
  const openTodos = work.project.todos.filter((t) => t.status !== "done" && t.status !== "invoiced")
  const doneGoals = data.goals.filter((g) => g.done).length
  const activeView = !canManage && (tab === "pricing" || tab === "billing") ? "overview" : tab
  const selectedMilestone =
    params.get("milestone") ||
    data.project.currentMilestoneId ||
    data.milestones[0]?.id ||
    null

  return (
    <PageShell
      eyebrow="Project"
      title={data.project.name}
      backHref="/app"
      action={<StatusChip status={data.project.status} />}
    >
      <Box
        display="grid"
        gridTemplateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 300px" }}
        gap={5}
        alignItems="start"
      >
        <Box minW={0}>
          <Box mb={5}>
            <AppTabs
              value={activeView}
              onChange={setTab}
              items={[
                { value: "overview", label: "Overview" },
                { value: "work", label: "Board", badge: openTodos.length },
                { value: "timeline", label: "Timeline" },
                { value: "plan", label: "Plan", badge: data.milestones.length },
                { value: "files", label: "Files", badge: data.attachments.length },
                { value: "discuss", label: "Discussion", badge: data.comments.length },
                { value: "people", label: "People", badge: data.collaborators.length + data.pendingInvites.length },
                ...(canManage ? [
                  { value: "pricing", label: "Pricing" },
                  { value: "billing", label: "Billing" },
                ] : []),
              ]}
            />
          </Box>

          {activeView === "overview" && (
            <OverviewPanel
              data={data}
              canEdit={canEdit}
              onChanged={load}
              onOpenPlan={() => setTab("plan")}
            />
          )}

          {activeView === "work" && (
            <WorkBoard
              projectId={data.project.id}
              todos={work.project.todos}
              milestones={data.milestones}
              currentMilestoneId={data.project.currentMilestoneId ?? null}
              canWork={canWork}
              canSetNow={canManage}
              onChanged={load}
            />
          )}

          {activeView === "timeline" && (
            <WorkTimeline
              todos={work.project.todos}
              onOpen={(todoId) => openTodo(todoId)}
            />
          )}

          {activeView === "plan" && (
            <PlanPanel
              data={data}
              todos={work.project.todos}
              canEdit={canEdit}
              selectedId={selectedMilestone}
              onSelect={setMilestone}
              onChanged={load}
            />
          )}

          {activeView === "files" && (
            <FilesPanel data={data} canRemove={canEdit} onChanged={load} />
          )}

          {activeView === "discuss" && (
            <DiscussPanel data={data} onChanged={load} />
          )}

          {activeView === "people" && (
            <Box display="grid" gap={4}>
              <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
                <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`}>
                  <Text fontWeight="700" color={APP_INK}>Doing currently</Text>
                  <Text fontSize="0.75rem" color={APP_MUTED} mt="2px">Who is on what, right now</Text>
                </Box>
                <Box px={5} py={2}>
                  {work.project.todos.filter((todo) => todo.status !== "done" && todo.status !== "invoiced").length === 0 ? (
                    <Text fontSize="0.875rem" color={APP_MUTED} py={3}>No open to-dos on this project.</Text>
                  ) : (
                    work.project.todos
                      .filter((todo) => todo.status !== "done" && todo.status !== "invoiced")
                      .map((todo) => (
                        <Box
                          key={todo.id}
                          as="button"
                          w="100%"
                          textAlign="left"
                          py={3}
                          borderBottom={`1px solid ${APP_BORDER}`}
                          onClick={() => openTodo(todo.id)}
                        >
                          <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}>
                          <Box minW={0}>
                          <Text fontWeight="600" color={APP_INK} fontSize="0.875rem">{todo.title}</Text>
                          <Text fontSize="0.75rem" color={APP_MUTED} mt="2px">
                            {formatPeopleList(peopleOnTodo(todo))}
                            {" · "}
                            {TODO_STATUS_LABEL[todo.status] || todo.status}
                          </Text>
                          </Box>
                          <Box display="flex" alignItems="center" gap={2} flexShrink={0}>
                            <DueChip dueAt={todo.dueAt} status={todo.status} />
                            <AvatarStack people={peopleOnTodo(todo)} size={22} />
                          </Box>
                          </Box>
                        </Box>
                      ))
                  )}
                </Box>
              </Box>

              <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
                <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <LuUsers size={16} color={APP_ACCENT} />
                    <Text fontWeight="700" color={APP_INK}>People on this project</Text>
                  </Box>
                  {canManage && (
                    <AppButton size="sm" onClick={() => { setInviteError(null); setInviteOpen(true) }}>Invite</AppButton>
                  )}
                </Box>
                <Box p={5}>
                  {!(data.people ?? []).some((person) => person.role === "client" || person.email === data.client.email) && (
                    <Box py={3} borderBottom={`1px solid ${APP_BORDER}`}>
                      <Text fontWeight="600" color={APP_INK}>{displayName(data.client)}</Text>
                      <Text fontSize="0.75rem" color={APP_MUTED}>{data.client.email} · client</Text>
                    </Box>
                  )}
                  {(data.people?.length ? data.people : data.collaborators.map((person) => ({ ...person, role: "collaborator" as const }))).map((person) => (
                    <Box key={person.id} display="flex" justifyContent="space-between" alignItems="center" py={3} borderBottom={`1px solid ${APP_BORDER}`}>
                      <Box>
                        <Text fontWeight="600" color={APP_INK}>{displayName(person)}</Text>
                        <Text fontSize="0.75rem" color={APP_MUTED}>
                          {person.email}
                          {person.role ? ` · ${person.role}` : ""}
                        </Text>
                      </Box>
                      {canManage && person.role === "collaborator" && (
                        <Box as="button" color="#B91C1C" fontSize="0.75rem" fontWeight="600" onClick={() => setRemoveId(person.id)}>
                          <LuTrash2 size={12} /> Remove
                        </Box>
                      )}
                    </Box>
                  ))}
                  {data.pendingInvites.map((inv) => (
                    <Box key={inv.id} display="flex" justifyContent="space-between" alignItems="center" py={3} borderBottom={`1px solid ${APP_BORDER}`}>
                      <Box>
                        <Text fontWeight="600" color={APP_INK}>{inv.email}</Text>
                        <Text fontSize="0.75rem" color={APP_MUTED}>Invite pending</Text>
                      </Box>
                      {canManage && (
                        <Box as="button" color="#B91C1C" fontSize="0.75rem" fontWeight="600" onClick={() => revokeInvitation(inv.id).then(load)}>
                          Revoke
                        </Box>
                      )}
                    </Box>
                  ))}
                  {!data.people?.length && data.collaborators.length === 0 && data.pendingInvites.length === 0 && (
                    <Text fontSize="0.875rem" color={APP_MUTED} mt={2}>
                      Invite people who should work on this project with you.
                    </Text>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {activeView === "pricing" && canManage && (
            <PricingCard
              projectId={data.project.id}
              billingType={work.project.billingType}
              hourlyRate={work.project.hourlyRate}
              fixedPrice={work.project.fixedPrice}
              estimatedHours={work.project.estimatedHours}
              weeklyHoursTarget={work.project.weeklyHoursTarget}
              onSaved={load}
            />
          )}

          {activeView === "billing" && canManage && (
            <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5}>
              <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
                {work.project.unbilledHours
                  ? `${work.project.unbilledHours}h unbilled — invoice when the work is ready to bill.`
                  : "Hours on this project invoice from here when you want them billed."}
              </Text>
              {invoiceError && <Text fontSize="0.8125rem" color="#B91C1C" mb={2}>{invoiceError}</Text>}
              <AppButton
                size="sm"
                variant="secondary"
                disabled={!work.project.unbilledHours}
                onClick={() => setInvoiceOpen(true)}
              >
                <LuReceipt size={14} /> Create invoice
              </AppButton>
            </Box>
          )}
        </Box>

        <Box position={{ lg: "sticky" }} top={{ lg: "24px" }}>
          <DetailsSidebar
            data={data}
            work={work.project}
            canEdit={canEdit}
            canManage={canManage}
            onChanged={load}
          />
          {data.goals.length > 0 && (
            <Text fontSize="0.75rem" color={APP_MUTED} mt={3} px={1}>
              Goals {doneGoals}/{data.goals.length}
            </Text>
          )}
        </Box>
      </Box>

      <DialogRoot open={inviteOpen} onOpenChange={({ open }) => { setInviteOpen(open); if (!open) { reset(); setInviteError(null) } }} size="sm" placement="center">
        <DialogContent style={DIALOG_PANEL_STYLE}>
          <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
            <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>Invite collaborator</DialogTitle>
            <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
          </Box>
          <DialogHeader display="none" />
          <Box as="form" onSubmit={handleSubmit(onInvite)}>
            <DialogBody px={6} py={5}>
              <Field label="Invite by email" invalid={!!inviteError} errorText={inviteError ?? undefined}>
                <FormInput type="email" placeholder="alex@studio.com" {...register("email", { required: true })} />
              </Field>
            </DialogBody>
            <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
              <AppButton type="submit" loading={isSubmitting} flex={1}>Send invite</AppButton>
              <AppButton variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</AppButton>
            </DialogFooter>
          </Box>
        </DialogContent>
      </DialogRoot>

      <ConfirmDialog
        open={invoiceOpen}
        title="Create invoice"
        body={work.project.unbilledHours
          ? `${work.project.unbilledHours}h unbilled will be sent to ${displayName(data.client)}.`
          : "Nothing unbilled yet."}
        confirmLabel="Create and send"
        busy={invoiceBusy}
        onClose={() => setInvoiceOpen(false)}
        onConfirm={async () => {
          if (!id) return
          setInvoiceBusy(true)
          setInvoiceError(null)
          try {
            const created = await createInvoice(id, { send: true })
            setInvoiceOpen(false)
            navigate(`/app/invoices/${created.invoice.id}`)
          } catch (e: unknown) {
            setInvoiceError(e instanceof Error ? e.message : "Could not create invoice")
            setInvoiceOpen(false)
          } finally {
            setInvoiceBusy(false)
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(removeId)}
        title="Remove collaborator"
        body="They will lose access to this project."
        confirmLabel="Remove"
        danger
        onClose={() => setRemoveId(null)}
        onConfirm={() => {
          if (!id || !removeId) return
          removeProjectCollaborator(id, removeId).then(() => { setRemoveId(null); load() }).catch(() => setRemoveId(null))
        }}
      />
    </PageShell>
  )
}

function PricingCard({
  projectId,
  billingType,
  hourlyRate,
  fixedPrice,
  estimatedHours,
  weeklyHoursTarget,
  onSaved,
}: {
  projectId: string
  billingType: string
  hourlyRate: number | null
  fixedPrice: number | null
  estimatedHours: number | null
  weeklyHoursTarget: number | null
  onSaved: () => void
}) {
  const [type, setType] = useState(billingType || "hourly")
  const [rate, setRate] = useState(hourlyRate != null ? String(hourlyRate) : "")
  const [fixed, setFixed] = useState(fixedPrice != null ? String(fixedPrice) : "")
  const [estimate, setEstimate] = useState(estimatedHours != null ? String(estimatedHours) : "")
  const [weekly, setWeekly] = useState(weeklyHoursTarget != null ? String(weeklyHoursTarget) : "")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setType(billingType || "hourly")
    setRate(hourlyRate != null ? String(hourlyRate) : "")
    setFixed(fixedPrice != null ? String(fixedPrice) : "")
    setEstimate(estimatedHours != null ? String(estimatedHours) : "")
    setWeekly(weeklyHoursTarget != null ? String(weeklyHoursTarget) : "")
  }, [billingType, hourlyRate, fixedPrice, estimatedHours, weeklyHoursTarget])

  return (
    <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5} mb={5}>
      <Text fontWeight="700" color={APP_INK} mb={3}>Pricing & pace</Text>
      <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
        <Box>
          <Text fontSize="0.75rem" color={APP_MUTED} mb={1}>Billing</Text>
          <FormNativeSelect value={type} onChange={(e) => setType(e.target.value)}>
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed</option>
            <option value="hybrid">Hybrid</option>
          </FormNativeSelect>
        </Box>
        <Box>
          <Text fontSize="0.75rem" color={APP_MUTED} mb={1}>Hourly rate</Text>
          <FormInput value={rate} onChange={(e) => setRate(e.target.value)} type="number" step="1" />
        </Box>
        {(type === "fixed" || type === "hybrid") && (
          <Box>
            <Text fontSize="0.75rem" color={APP_MUTED} mb={1}>Fixed price</Text>
            <FormInput value={fixed} onChange={(e) => setFixed(e.target.value)} type="number" step="1" />
          </Box>
        )}
        <Box>
          <Text fontSize="0.75rem" color={APP_MUTED} mb={1}>Project estimate (hours)</Text>
          <FormInput value={estimate} onChange={(e) => setEstimate(e.target.value)} type="number" step="0.5" />
        </Box>
        <Box>
          <Text fontSize="0.75rem" color={APP_MUTED} mb={1}>Hours / week this project</Text>
          <FormInput value={weekly} onChange={(e) => setWeekly(e.target.value)} type="number" step="0.5" />
        </Box>
      </Box>
      <AppButton
        size="sm"
        mt={4}
        onClick={() => {
          updateWorkspaceProject(projectId, {
            billingType: type as "hourly" | "fixed" | "hybrid",
            hourlyRate: rate ? Number(rate) : null,
            fixedPrice: fixed ? Number(fixed) : null,
            estimatedHours: estimate ? Number(estimate) : null,
            weeklyHoursTarget: weekly ? Number(weekly) : null,
          }).then(() => { setSaved(true); onSaved(); setTimeout(() => setSaved(false), 2000) })
        }}
      >
        Save pricing
      </AppButton>
      {saved && <Text fontSize="sm" color="#047857" fontWeight="600" mt={2}>Saved</Text>}
    </Box>
  )
}
