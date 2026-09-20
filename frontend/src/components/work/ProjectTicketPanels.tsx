import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Box, Text } from "@chakra-ui/react"
import { LuCircleAlert, LuCheck, LuPaperclip, LuPlus, LuTrash2, LuX } from "react-icons/lu"
import { AppButton } from "@/components/ui/AppButton"
import { AppTabs } from "@/components/ui/AppTabs"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { FormInput, FormNativeSelect, FormTextarea } from "@/components/ui/form-controls"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_CARD,
  APP_INK,
  APP_MUTED,
  APP_SHADOW_CARD,
  APP_SURFACE,
  AppCard,
} from "@/components/ui/appUi"
import { displayName, formatPeopleList, peopleOnTodo } from "@/lib/people"
import { isOverdue } from "@/lib/todoStyle"
import { AvatarStack, DueChip } from "./todoUi"
import {
  BLOCKER_KIND_LABEL,
  formatDate,
  formatEta,
  formatHours,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  TODO_STATUS_LABEL,
} from "@/lib/hours"
import {
  addProjectBlocker,
  addProjectComment,
  addProjectGoal,
  addProjectMilestone,
  deleteProjectAttachment,
  deleteProjectBlocker,
  deleteProjectComment,
  deleteProjectGoal,
  deleteProjectMilestone,
  getProjectMilestone,
  updateProjectBlocker,
  updateProjectGoal,
  updateProjectMilestone,
  updateWorkspaceProject,
  uploadProjectAttachment,
  type MilestoneDetail,
  type ProjectAttachment,
  type ProjectBlocker,
  type ProjectBlockerKind,
  type ProjectComment,
  type ProjectGoal,
  type ProjectMilestone,
  type ProjectTicket,
  type WorkspaceProject,
} from "@/api/workspace"
import { updateTodo, type WorkProject, type WorkTodo } from "@/api/work"
import { useTodoCard } from "./TodoCardContext"
import { AddTodo, CardCounts } from "./WorkPanels"

export function projectStatusColor(status?: string) {
  if (status === "in_progress") return APP_ACCENT
  if (status === "waiting_on_client") return "#B45309"
  if (status === "done") return APP_MUTED
  return APP_INK
}

export function StatusChip({ status }: { status?: string }) {
  const value = status || "backlog"
  const tone =
    value === "in_progress"
      ? { bg: "rgba(232,245,239,0.95)", color: APP_ACCENT, border: "rgba(15,110,86,0.2)" }
      : value === "waiting_on_client"
        ? { bg: "rgba(255,247,237,0.95)", color: "#C2410C", border: "rgba(194,65,12,0.18)" }
        : value === "done"
          ? { bg: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)", border: "rgba(255,255,255,0.2)" }
          : { bg: "rgba(255,255,255,0.1)", color: "white", border: "rgba(255,255,255,0.15)" }
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      h="30px"
      px={3}
      borderRadius="999px"
      bg={tone.bg}
      color={tone.color}
      border={`1px solid ${tone.border}`}
      fontSize="0.75rem"
      fontWeight="600"
      letterSpacing="-0.01em"
    >
      {PROJECT_STATUS_LABEL[value] || value}
    </Box>
  )
}

function CheckButton({
  done,
  onToggle,
}: {
  done: boolean
  onToggle: () => void
}) {
  return (
    <Box
      as="button"
      w="20px"
      h="20px"
      borderRadius="6px"
      border={`1.5px solid ${done ? APP_ACCENT : APP_BORDER}`}
      bg={done ? APP_ACCENT : "white"}
      color="white"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      onClick={onToggle}
    >
      {done ? <LuCheck size={12} /> : null}
    </Box>
  )
}

function SidebarField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Box>
      <Text fontSize="0.6875rem" fontWeight="600" color={APP_MUTED} letterSpacing="0.04em" textTransform="uppercase" mb={1.5}>
        {label}
      </Text>
      {children}
    </Box>
  )
}

export function ProjectDetailsPanel({
  data,
  work,
  canEdit,
  canManage,
  onChanged,
  onOpenView,
  unbilledHours,
  onCreateInvoice,
}: {
  data: ProjectTicket
  work: WorkProject
  canEdit: boolean
  canManage: boolean
  onChanged: () => void
  onOpenView?: (view: string) => void
  unbilledHours?: number | null
  onCreateInvoice?: () => void
}) {
  const project = data.project
  const eta = formatEta(work.remainingHours, work.weeklyPace)
  const [name, setName] = useState(project.name)
  const current = data.milestones.find((milestone) => milestone.id === project.currentMilestoneId)
  const teamCount = data.collaborators.length + data.pendingInvites.length + 1

  useEffect(() => {
    setName(project.name)
  }, [project.name])

  function patch(fields: Parameters<typeof updateWorkspaceProject>[1]) {
    return updateWorkspaceProject(project.id, fields).then(onChanged)
  }

  function saveName() {
    const next = name.trim()
    if (!next || next === project.name) return
    void patch({ name: next })
  }

  return (
    <Box display="grid" gridTemplateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={4} alignItems="start">
      <Box display="grid" gap={4}>
      <AppCard label="Project">
        <Box display="grid" gap={4}>
          {canEdit ? (
            <SidebarField label="Name">
              <FormInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => saveName()}
                fontWeight="600"
              />
            </SidebarField>
          ) : null}
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
            <SidebarField label="Status">
              {canEdit ? (
                <FormNativeSelect
                  value={project.status || "backlog"}
                  onChange={(e) => void patch({ status: e.target.value as WorkspaceProject["status"] })}
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In progress</option>
                  <option value="waiting_on_client">Waiting on client</option>
                  <option value="done">Done</option>
                </FormNativeSelect>
              ) : (
                <Text fontWeight="600" color={projectStatusColor(project.status)}>
                  {PROJECT_STATUS_LABEL[project.status || "backlog"]}
                </Text>
              )}
            </SidebarField>
            <SidebarField label="Priority">
              {canEdit ? (
                <FormNativeSelect
                  value={project.priority || "medium"}
                  onChange={(e) => void patch({ priority: e.target.value as WorkspaceProject["priority"] })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </FormNativeSelect>
              ) : (
                <Text fontWeight="600" color={APP_INK}>{PROJECT_PRIORITY_LABEL[project.priority || "medium"]}</Text>
              )}
            </SidebarField>
          </Box>
          <SidebarField label="Client">
            {canManage ? (
              <Link to={`/app/clients/${data.client.id}`} style={{ textDecoration: "none" }}>
                <Text fontWeight="600" color={APP_INK}>{displayName(data.client)}</Text>
                <Text fontSize="0.8125rem" color={APP_MUTED} mt="2px">{data.client.email}</Text>
              </Link>
            ) : (
              <>
                <Text fontWeight="600" color={APP_INK}>{displayName(data.client)}</Text>
                <Text fontSize="0.8125rem" color={APP_MUTED} mt="2px">{data.client.email}</Text>
              </>
            )}
          </SidebarField>
        </Box>
      </AppCard>

      <AppCard label="Time & team">
        <Box display="grid" gap={4}>
          <Box>
            <Text fontSize="0.875rem" color={APP_INK} fontWeight="600" lineHeight="1.55">
              {formatHours(work.loggedHours)} logged
              {work.estimatedHours != null ? ` · ${formatHours(work.estimatedHours)} estimated` : ""}
            </Text>
            <Text fontSize="0.75rem" color={APP_MUTED} mt={1}>
              {formatHours(work.thisWeekHours)} this week
              {work.weeklyPace != null ? ` · ~${formatHours(work.weeklyPace)}/week` : ""}
              {work.remainingHours != null ? ` · ${formatHours(work.remainingHours)} left` : ""}
              {eta ? ` · ${eta}` : ""}
            </Text>
          </Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>
                {teamCount} {teamCount === 1 ? "person" : "people"}
              </Text>
              <Text fontSize="0.75rem" color={APP_MUTED} mt="2px">
                {data.collaborators.length
                  ? `${data.collaborators.length} collaborator${data.collaborators.length === 1 ? "" : "s"}`
                  : "Just you and the client"}
                {data.pendingInvites.length > 0
                  ? ` · ${data.pendingInvites.length} pending invite${data.pendingInvites.length === 1 ? "" : "s"}`
                  : ""}
              </Text>
            </Box>
            {onOpenView ? (
              <AppButton size="sm" variant="secondary" onClick={() => onOpenView("people")}>
                View team
              </AppButton>
            ) : null}
          </Box>
        </Box>
      </AppCard>
      </Box>

      <Box display="grid" gap={4}>
      <AppCard
        label="Schedule"
        action={
          onOpenView ? (
            <Box as="button" fontSize="0.75rem" fontWeight="600" color={APP_ACCENT} onClick={() => onOpenView("plan")}>
              Open plan
            </Box>
          ) : undefined
        }
      >
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3} mb={current || data.milestones.length ? 4 : 0}>
          <SidebarField label="Start">
            {canEdit ? (
              <FormInput
                type="date"
                value={project.startAt ?? ""}
                onChange={(e) => void patch({ startAt: e.target.value || null })}
              />
            ) : (
              <Text fontWeight="600" color={APP_INK}>{formatDate(project.startAt)}</Text>
            )}
          </SidebarField>
          <SidebarField label="Due">
            {canEdit ? (
              <FormInput
                type="date"
                value={project.dueAt ?? ""}
                onChange={(e) => void patch({ dueAt: e.target.value || null })}
              />
            ) : (
              <Text fontWeight="600" color={APP_INK}>{formatDate(project.dueAt)}</Text>
            )}
          </SidebarField>
        </Box>
        {data.milestones.length > 0 ? (
          <SidebarField label="Current milestone">
            {current ? (
              <Link
                to={`/app/projects/${project.id}?view=plan&milestone=${current.id}`}
                style={{ textDecoration: "none" }}
              >
                <Text fontWeight="600" color={APP_INK}>{current.title}</Text>
                <Text fontSize="0.75rem" color={current.late ? "#B91C1C" : APP_MUTED} mt="2px">
                  {current.late && current.delayedDays != null ? `${current.delayedDays}d late · ` : ""}
                  Due {formatDate(current.dueAt)}
                </Text>
              </Link>
            ) : (
              <Text fontSize="0.875rem" color={APP_MUTED}>Pick a milestone on Plan</Text>
            )}
          </SidebarField>
        ) : (
          <Text fontSize="0.8125rem" color={APP_MUTED}>
            No milestones yet — break the work into slices on Plan.
          </Text>
        )}
      </AppCard>

      {canManage ? (
        <AppCard label="Business">
          <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
            Pricing, pace, and invoicing for this project.
          </Text>
          <Box display="grid" gap={2}>
            <AppButton size="sm" variant="secondary" onClick={() => onOpenView?.("pricing")}>
              Pricing & pace
            </AppButton>
            <AppButton size="sm" variant="secondary" onClick={() => onOpenView?.("finance")}>
              Open finance
            </AppButton>
            {unbilledHours ? (
              <AppButton size="sm" variant="secondary" onClick={() => onCreateInvoice?.()}>
                Invoice {formatHours(unbilledHours)} unbilled
              </AppButton>
            ) : null}
          </Box>
        </AppCard>
      ) : null}
      </Box>
    </Box>
  )
}

/** @deprecated Use ProjectDetailsPanel in the Details tab */
export const DetailsSidebar = ProjectDetailsPanel

type OverviewAction = {
  id: string
  tone: "danger" | "amber" | "accent"
  title: string
  detail?: string
  actionLabel: string
  onAction: () => void
}

function scrollToProjectSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
}

function overviewActionTone(tone: OverviewAction["tone"]) {
  if (tone === "danger") return { bg: "rgba(185,28,28,0.06)", border: "rgba(185,28,28,0.2)", icon: "#B91C1C" }
  if (tone === "amber") return { bg: "rgba(180,83,9,0.08)", border: "rgba(180,83,9,0.22)", icon: "#B45309" }
  return { bg: "rgba(15,110,86,0.06)", border: "rgba(15,110,86,0.18)", icon: APP_ACCENT }
}

function buildOverviewNarrative({
  data,
  work,
  openTodos,
  inProgressTodos,
  waitingTodos,
  currentMilestone,
}: {
  data: ProjectTicket
  work: WorkProject
  openTodos: WorkTodo[]
  inProgressTodos: WorkTodo[]
  waitingTodos: WorkTodo[]
  currentMilestone: ProjectMilestone | undefined
}) {
  const status = data.project.status || "backlog"
  const lateMilestones = data.milestones.filter((m) => m.late && !m.done)

  if (status === "done") {
    return "This project is marked done. Review goals and billing before archiving."
  }
  if (waitingTodos.length > 0 && inProgressTodos.length === 0) {
    return `${waitingTodos.length} item${waitingTodos.length === 1 ? "" : "s"} waiting on ${displayName(data.client)} — follow up or unblock on the board.`
  }
  if (lateMilestones.length > 0) {
    const first = lateMilestones[0]
    return `"${first.title}" is late${first.delayedDays != null ? ` by ${first.delayedDays}d` : ""} — log why and adjust the plan.`
  }
  if (currentMilestone && inProgressTodos.length > 0) {
    return `Working on "${currentMilestone.title}" with ${inProgressTodos.length} active to-do${inProgressTodos.length === 1 ? "" : "s"}.`
  }
  if (currentMilestone) {
    return `Focused on "${currentMilestone.title}" — pick up or add to-dos on the board.`
  }
  if (status === "in_progress" && openTodos.length > 0) {
    return `${openTodos.length} open to-do${openTodos.length === 1 ? "" : "s"} — nothing marked in progress yet.`
  }
  if (status === "backlog" && openTodos.length === 0 && data.milestones.length === 0) {
    return "Project is in backlog. Set dates, break it into milestones, and add the first to-do."
  }
  if (status === "backlog" && openTodos.length > 0) {
    return `${openTodos.length} to-do${openTodos.length === 1 ? "" : "s"} ready — move the project to In progress when work starts.`
  }
  if (openTodos.length === 0 && data.milestones.length > 0) {
    return "Plan is set but there is no open work — add to-dos on the board."
  }
  if (work.loggedHours > 0) {
    return `${formatHours(work.loggedHours)} logged so far${work.remainingHours != null ? ` · ${formatHours(work.remainingHours)} estimated left` : ""}.`
  }
  return "Set up the plan, define goals, and add work on the board to get moving."
}

function buildOverviewActions({
  data,
  work,
  canEdit,
  canManage,
  openTodos,
  overdueTodos,
  waitingTodos,
  currentMilestone,
  onOpenPlan,
  onOpenBoard,
  onOpenPeople,
  onOpenPricing,
  onOpenFinance,
  onStartProject,
  onOpenDetails,
}: {
  data: ProjectTicket
  work: WorkProject
  canEdit: boolean
  canManage: boolean
  openTodos: WorkTodo[]
  overdueTodos: WorkTodo[]
  waitingTodos: WorkTodo[]
  currentMilestone: ProjectMilestone | undefined
  onOpenPlan: () => void
  onOpenBoard: () => void
  onOpenPeople: () => void
  onOpenPricing: () => void
  onOpenFinance: () => void
  onStartProject: () => void
  onOpenDetails: () => void
}): OverviewAction[] {
  const actions: OverviewAction[] = []
  const openBlockers = (data.blockers ?? []).filter((b) => b.status === "open")
  const lateMilestones = data.milestones.filter((m) => m.late && !m.done)
  const doneGoals = data.goals.filter((g) => g.done).length
  const hasDates = Boolean(data.project.startAt && data.project.dueAt)

  for (const milestone of lateMilestones) {
    const blockers = openBlockers.filter((b) => b.milestoneId === milestone.id)
    actions.push({
      id: `late-${milestone.id}`,
      tone: "danger",
      title: `"${milestone.title}" is late`,
      detail: milestone.delayedDays != null ? `${milestone.delayedDays} days past due` : "Past due date",
      actionLabel: blockers.length ? "Review blockers" : "Log why late",
      onAction: onOpenPlan,
    })
  }

  for (const todo of overdueTodos.slice(0, 3)) {
    actions.push({
      id: `overdue-${todo.id}`,
      tone: "danger",
      title: `Overdue: ${todo.title}`,
      detail: todo.dueAt ? `Due ${formatDate(todo.dueAt)}` : undefined,
      actionLabel: "Open to-do",
      onAction: () => {},
    })
  }

  if (waitingTodos.length > 0) {
    actions.push({
      id: "waiting-client",
      tone: "amber",
      title: `${waitingTodos.length} waiting on ${displayName(data.client)}`,
      detail: waitingTodos.slice(0, 2).map((t) => t.title).join(" · "),
      actionLabel: "View on board",
      onAction: onOpenBoard,
    })
  }

  if (openBlockers.length > 0 && lateMilestones.length === 0) {
    actions.push({
      id: "blockers",
      tone: "amber",
      title: `${openBlockers.length} open blocker${openBlockers.length === 1 ? "" : "s"}`,
      detail: openBlockers[0]?.title,
      actionLabel: "Review on plan",
      onAction: onOpenPlan,
    })
  }

  if (canEdit && !hasDates) {
    actions.push({
      id: "set-dates",
      tone: "accent",
      title: "Set project start and due dates",
      detail: "Dates drive the timeline and milestone planning",
      actionLabel: "Set dates",
      onAction: onOpenDetails,
    })
  }

  if (canEdit && data.milestones.length === 0) {
    actions.push({
      id: "add-milestones",
      tone: "accent",
      title: "Break the project into milestones",
      detail: "Slice the work into due dates with to-dos and blockers",
      actionLabel: "Create plan",
      onAction: onOpenPlan,
    })
  }

  if (canEdit && data.milestones.length > 0 && !currentMilestone) {
    actions.push({
      id: "pick-milestone",
      tone: "accent",
      title: "Choose what you are working on now",
      detail: "Pick a current milestone so the team knows the focus",
      actionLabel: "Open plan",
      onAction: onOpenPlan,
    })
  }

  if (canEdit && data.goals.length === 0) {
    actions.push({
      id: "add-goals",
      tone: "accent",
      title: "Define what done looks like",
      detail: "Add goals — outcomes this project should hit",
      actionLabel: "Add goals",
      onAction: () => scrollToProjectSection("project-goals"),
    })
  }

  if (canEdit && data.goals.length > 0 && doneGoals < data.goals.length) {
    actions.push({
      id: "open-goals",
      tone: "accent",
      title: `${data.goals.length - doneGoals} goal${data.goals.length - doneGoals === 1 ? "" : "s"} still open`,
      detail: `${doneGoals}/${data.goals.length} complete`,
      actionLabel: "Review goals",
      onAction: () => scrollToProjectSection("project-goals"),
    })
  }

  if (canEdit && !data.project.description?.trim()) {
    actions.push({
      id: "add-description",
      tone: "accent",
      title: "Add a project description",
      detail: "Scope, constraints, and context the client should see",
      actionLabel: "Add description",
      onAction: () => scrollToProjectSection("project-about"),
    })
  }

  if (canEdit && openTodos.length === 0) {
    actions.push({
      id: "add-todos",
      tone: "accent",
      title: "No open to-dos yet",
      detail: "Add work on the board to track progress and time",
      actionLabel: "Open board",
      onAction: onOpenBoard,
    })
  }

  if (canEdit && data.project.status === "backlog" && openTodos.length > 0) {
    actions.push({
      id: "start-project",
      tone: "accent",
      title: "Ready to start — move project to In progress",
      detail: `${openTodos.length} to-do${openTodos.length === 1 ? "" : "s"} waiting to be picked up`,
      actionLabel: "Start project",
      onAction: onStartProject,
    })
  }

  if (canManage && data.pendingInvites.length > 0) {
    actions.push({
      id: "pending-invites",
      tone: "amber",
      title: `${data.pendingInvites.length} invite${data.pendingInvites.length === 1 ? "" : "s"} pending`,
      actionLabel: "View people",
      onAction: onOpenPeople,
    })
  }

  if (canManage && work.unbilledHours) {
    actions.push({
      id: "invoice",
      tone: "accent",
      title: `${formatHours(work.unbilledHours)} ready to invoice`,
      detail: `Send to ${displayName(data.client)}`,
      actionLabel: "Open finance",
      onAction: onOpenFinance,
    })
  }

  if (canManage && !work.hourlyRate && !work.fixedPrice) {
    actions.push({
      id: "pricing",
      tone: "accent",
      title: "Set pricing and pace",
      detail: "Hourly rate, fixed price, or weekly hours target",
      actionLabel: "Open details",
      onAction: onOpenPricing,
    })
  }

  return actions
}

function OverviewActionRow({
  item,
  onOpenTodo,
}: {
  item: OverviewAction
  onOpenTodo?: (id: string) => void
}) {
  const tone = overviewActionTone(item.tone)
  const handleClick = () => {
    if (item.id.startsWith("overdue-") && onOpenTodo) {
      onOpenTodo(item.id.replace("overdue-", ""))
      return
    }
    item.onAction()
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={3}
      p={3}
      borderRadius="12px"
      bg={tone.bg}
      border={`1px solid ${tone.border}`}
    >
      <Box display="flex" alignItems="flex-start" gap={2.5} minW={0}>
        <Box mt="2px" color={tone.icon} flexShrink={0}>
          <LuCircleAlert size={16} />
        </Box>
        <Box minW={0}>
          <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>{item.title}</Text>
          {item.detail ? (
            <Text fontSize="0.75rem" color={APP_MUTED} mt="2px" lineClamp={2}>{item.detail}</Text>
          ) : null}
        </Box>
      </Box>
      <AppButton size="sm" variant="secondary" flexShrink={0} onClick={handleClick}>
        {item.actionLabel}
      </AppButton>
    </Box>
  )
}

function OverviewTodoRow({
  todo,
  onOpen,
  first,
}: {
  todo: WorkTodo
  onOpen: () => void
  first?: boolean
}) {
  return (
    <Box
      as="button"
      w="100%"
      textAlign="left"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={3}
      py={3}
      borderTop={first ? "none" : `1px solid ${APP_BORDER}`}
      onClick={onOpen}
    >
      <Box minW={0}>
        <Text fontWeight="600" fontSize="0.875rem" color={APP_INK}>{todo.title}</Text>
        <Text fontSize="0.75rem" color={APP_MUTED} mt="2px">
          {TODO_STATUS_LABEL[todo.status] || todo.status}
          {" · "}
          {formatPeopleList(peopleOnTodo(todo))}
        </Text>
      </Box>
      <Box display="flex" alignItems="center" gap={2} flexShrink={0}>
        <DueChip dueAt={todo.dueAt} status={todo.status} />
        <AvatarStack people={peopleOnTodo(todo)} size={22} />
      </Box>
    </Box>
  )
}

function OverviewMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box>
      <Text fontSize="0.6875rem" fontWeight="600" color="rgba(255,255,255,0.55)" letterSpacing="0.04em" textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="1rem" fontWeight="700" color="white" mt={1}>{value}</Text>
      {hint ? <Text fontSize="0.75rem" color="rgba(255,255,255,0.5)" mt="2px">{hint}</Text> : null}
    </Box>
  )
}

export function OverviewPanel({
  data,
  work,
  todos,
  canEdit,
  canManage,
  onChanged,
  onOpenPlan,
  onOpenView,
  onOpenTodo,
  unbilledHours,
  onCreateInvoice,
}: {
  data: ProjectTicket
  work: WorkProject
  todos: WorkTodo[]
  canEdit: boolean
  canManage: boolean
  onChanged: () => void
  onOpenPlan: () => void
  onOpenView: (view: string) => void
  onOpenTodo: (id: string) => void
  unbilledHours?: number | null
  onCreateInvoice?: () => void
}) {
  const [description, setDescription] = useState(data.project.description ?? "")
  const [goalTitle, setGoalTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(!data.project.description?.trim())

  const doneGoals = data.goals.filter((g) => g.done).length
  const currentMilestone = data.milestones.find((m) => m.id === data.project.currentMilestoneId)
  const openTodos = todos.filter((t) => t.status !== "done" && t.status !== "invoiced")
  const inProgressTodos = openTodos.filter((t) => t.status === "in_progress")
  const waitingTodos = openTodos.filter((t) => t.status === "waiting_on_client")
  const overdueTodos = openTodos.filter((t) => isOverdue(t.dueAt, t.status))
  const backlogTodos = openTodos.filter((t) => t.status === "backlog").slice(0, 5)
  const hasDates = Boolean(data.project.startAt || data.project.dueAt)
  const eta = formatEta(work.remainingHours, work.weeklyPace)

  const narrative = buildOverviewNarrative({
    data,
    work,
    openTodos,
    inProgressTodos,
    waitingTodos,
    currentMilestone,
  })

  const actions = buildOverviewActions({
    data,
    work,
    canEdit,
    canManage,
    openTodos,
    overdueTodos,
    waitingTodos,
    currentMilestone,
    onOpenPlan,
    onOpenBoard: () => onOpenView("work"),
    onOpenPeople: () => onOpenView("people"),
    onOpenPricing: () => onOpenView("details"),
    onOpenFinance: () => onOpenView("finance"),
    onOpenDetails: () => onOpenView("details"),
    onStartProject: () => {
      void updateWorkspaceProject(data.project.id, { status: "in_progress" }).then(onChanged)
    },
  })

  useEffect(() => {
    setDescription(data.project.description ?? "")
  }, [data.project.description])

  async function saveDescription() {
    setBusy(true)
    try {
      await updateWorkspaceProject(data.project.id, { description: description.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box display="grid" gap={4} minW={0}>
        <Box
          position="relative"
          overflow="hidden"
          bg={APP_INK}
          borderRadius="18px"
          boxShadow={APP_SHADOW_CARD}
          p={{ base: 4, md: 5 }}
        >
          <Box
            position="absolute"
            inset="0"
            background="radial-gradient(ellipse at 85% 40%, rgba(15,110,86,0.45) 0%, transparent 55%)"
            pointerEvents="none"
          />
          <Box position="relative">
          <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mb={3}>
            <StatusChip status={data.project.status} />
            <Text fontSize="0.8125rem" color="rgba(255,255,255,0.6)" fontWeight="500">
              {PROJECT_PRIORITY_LABEL[data.project.priority || "medium"]} priority
            </Text>
            <Text fontSize="0.8125rem" color="rgba(255,255,255,0.35)">·</Text>
            <Text fontSize="0.8125rem" color="rgba(255,255,255,0.6)" fontWeight="500">
              {displayName(data.client)}
            </Text>
          </Box>
          <Text fontSize={{ base: "1rem", md: "1.0625rem" }} fontWeight="500" color="white" lineHeight="1.55" mb={4} letterSpacing="-0.01em">
            {narrative}
          </Text>
          <Box display="grid" gridTemplateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap={4}>
            <OverviewMetric
              label="Schedule"
              value={hasDates ? `${formatDate(data.project.startAt)} → ${formatDate(data.project.dueAt)}` : "Not set"}
              hint={currentMilestone ? `Now: ${currentMilestone.title}` : data.milestones.length ? `${data.milestones.length} milestone${data.milestones.length === 1 ? "" : "s"}` : "No plan yet"}
            />
            <OverviewMetric
              label="Work"
              value={`${openTodos.length} open`}
              hint={inProgressTodos.length ? `${inProgressTodos.length} in progress` : waitingTodos.length ? `${waitingTodos.length} waiting on client` : "Nothing active"}
            />
            <OverviewMetric
              label="Time"
              value={formatHours(work.loggedHours)}
              hint={`${formatHours(work.thisWeekHours)} this week${work.weeklyPace != null ? ` · ~${formatHours(work.weeklyPace)}/wk` : ""}${eta ? ` · ${eta}` : ""}`}
            />
            <OverviewMetric
              label="Goals"
              value={data.goals.length ? `${doneGoals}/${data.goals.length}` : "None yet"}
              hint={data.goals.length ? (doneGoals === data.goals.length ? "All complete" : `${data.goals.length - doneGoals} open`) : "Define done"}
            />
          </Box>
          </Box>
        </Box>

        {actions.length > 0 && (
          <AppCard label="Needs attention">
            <Box display="grid" gap={2}>
              {actions.slice(0, 6).map((item) => (
                <OverviewActionRow key={item.id} item={item} onOpenTodo={onOpenTodo} />
              ))}
            </Box>
          </AppCard>
        )}

        <AppCard
          label="In progress now"
          action={
            openTodos.length > 0 ? (
              <Box as="button" fontSize="0.75rem" fontWeight="600" color={APP_ACCENT} onClick={() => onOpenView("work")}>
                Open board
              </Box>
            ) : undefined
          }
        >
          {inProgressTodos.length === 0 ? (
            <Text fontSize="0.875rem" color={APP_MUTED}>
              {openTodos.length
                ? "Nothing marked in progress — open the board and start a to-do."
                : "No open work yet — add the first to-do on the board."}
            </Text>
          ) : (
            inProgressTodos.map((todo, index) => (
              <OverviewTodoRow key={todo.id} todo={todo} first={index === 0} onOpen={() => onOpenTodo(todo.id)} />
            ))
          )}
        </AppCard>

        {(waitingTodos.length > 0 || backlogTodos.length > 0) && (
          <AppCard label={waitingTodos.length ? "Waiting & up next" : "Up next"}>
            {[...waitingTodos, ...backlogTodos.filter((t) => !waitingTodos.some((w) => w.id === t.id))].map((todo, index) => (
              <OverviewTodoRow key={todo.id} todo={todo} first={index === 0} onOpen={() => onOpenTodo(todo.id)} />
            ))}
          </AppCard>
        )}

        <Box id="project-goals" scrollMarginTop="80px">
        <AppCard
          label="Goals"
          action={data.goals.length > 0 ? (
            <Text fontSize="0.75rem" fontWeight="600" color={APP_MUTED}>
              {doneGoals}/{data.goals.length} done
            </Text>
          ) : undefined}
        >
          {data.goals.length === 0 ? (
            <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
              Outcomes this project should hit — like a definition of done.
            </Text>
          ) : null}
          {data.goals.map((goal, index) => (
            <GoalRow
              key={goal.id}
              projectId={data.project.id}
              goal={goal}
              canEdit={canEdit}
              onChanged={onChanged}
              first={index === 0}
            />
          ))}
          {canEdit && (
            <Box display="flex" gap={2} mt={data.goals.length ? 3 : 0}>
              <FormInput
                placeholder="Add a goal"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  e.preventDefault()
                  const next = goalTitle.trim()
                  if (!next) return
                  addProjectGoal(data.project.id, next).then(() => { setGoalTitle(""); onChanged() })
                }}
              />
              <AppButton
                size="sm"
                onClick={() => {
                  const next = goalTitle.trim()
                  if (!next) return
                  addProjectGoal(data.project.id, next).then(() => { setGoalTitle(""); onChanged() })
                }}
              >
                Add
              </AppButton>
            </Box>
          )}
        </AppCard>
        </Box>

        <Box id="project-about" scrollMarginTop="80px">
        <AppCard
          label="About"
          action={
            data.project.description ? (
              <Box as="button" fontSize="0.75rem" fontWeight="600" color={APP_MUTED} onClick={() => setAboutOpen((v) => !v)}>
                {aboutOpen ? "Hide" : "Show"}
              </Box>
            ) : undefined
          }
        >
          {(aboutOpen || !data.project.description) && (
            canEdit ? (
              <>
                <FormTextarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this project is, who it is for, and what done looks like."
                  minH="100px"
                />
                <Box display="flex" alignItems="center" gap={3} mt={3}>
                  <AppButton size="sm" loading={busy} onClick={() => void saveDescription()}>Save</AppButton>
                  {saved && <Text fontSize="0.8125rem" color="#047857" fontWeight="600">Saved</Text>}
                </Box>
              </>
            ) : (
              <Text fontSize="0.875rem" color={data.project.description ? APP_INK : APP_MUTED} whiteSpace="pre-wrap">
                {data.project.description || "No description yet."}
              </Text>
            )
          )}
          {!aboutOpen && data.project.description ? (
            <Text fontSize="0.875rem" color={APP_INK} whiteSpace="pre-wrap" lineClamp={2}>
              {data.project.description}
            </Text>
          ) : null}
        </AppCard>
        </Box>
    </Box>
  )
}

function GoalRow({
  projectId,
  goal,
  canEdit,
  onChanged,
  first,
}: {
  projectId: string
  goal: ProjectGoal
  canEdit: boolean
  onChanged: () => void
  first?: boolean
}) {
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      py={2}
      borderTop={first ? "none" : `1px solid ${APP_BORDER}`}
    >
      <CheckButton
        done={goal.done}
        onToggle={() => {
          if (!canEdit) return
          updateProjectGoal(projectId, goal.id, { done: !goal.done }).then(onChanged)
        }}
      />
      <Text
        flex="1"
        minW={0}
        fontSize="0.875rem"
        color={goal.done ? APP_MUTED : APP_INK}
        textDecoration={goal.done ? "line-through" : "none"}
      >
        {goal.title}
      </Text>
      {canEdit && (
        <Box as="button" color={APP_MUTED} onClick={() => deleteProjectGoal(projectId, goal.id).then(onChanged)}>
          <LuTrash2 size={14} />
        </Box>
      )}
    </Box>
  )
}

function TimelineLine() {
  return <Box w="28px" h="2px" bg={APP_BORDER} flexShrink={0} alignSelf="center" />
}

function TimelineTick({ label, date }: { label: string; date: string | null }) {
  return (
    <Box minW="72px" textAlign="center" flexShrink={0}>
      <Text fontSize="0.65rem" fontWeight="700" color={APP_MUTED} letterSpacing="0.04em" textTransform="uppercase" mb={2}>
        {label}
      </Text>
      <Box w="10px" h="10px" borderRadius="99px" bg={APP_BORDER} mx="auto" />
      <Text fontSize="0.7rem" color={APP_MUTED} mt={2}>{formatDate(date)}</Text>
    </Box>
  )
}

function Pill({
  children,
  tone = "muted",
}: {
  children: string
  tone?: "accent" | "danger" | "amber" | "muted"
}) {
  const color = tone === "accent" ? APP_ACCENT : tone === "danger" ? "#B91C1C" : tone === "amber" ? "#B45309" : APP_MUTED
  const bg = tone === "accent" ? "rgba(15,110,86,0.1)" : tone === "danger" ? "rgba(185,28,28,0.08)" : tone === "amber" ? "rgba(180,83,9,0.1)" : APP_BG_SUBTLE
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      h="22px"
      px={2}
      borderRadius="999px"
      bg={bg}
      color={color}
      fontSize="0.65rem"
      fontWeight="700"
      letterSpacing="0.04em"
      textTransform="uppercase"
    >
      {children}
    </Box>
  )
}

export function PlanPanel({
  data,
  todos,
  canEdit,
  selectedId,
  onSelect,
  onChanged,
}: {
  data: ProjectTicket
  todos: WorkTodo[]
  canEdit: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onChanged: () => void
}) {
  const [title, setTitle] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [adding, setAdding] = useState(data.milestones.length === 0)
  const [detail, setDetail] = useState<MilestoneDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const currentId = data.project.currentMilestoneId ?? null
  const selected = data.milestones.find((milestone) => milestone.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setDetailError(null)
      return
    }
    let cancelled = false
    getProjectMilestone(data.project.id, selectedId)
      .then((next) => {
        if (cancelled) return
        setDetail(next)
        setDetailError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setDetail(null)
        setDetailError(err.message)
      })
    return () => { cancelled = true }
  }, [data.project.id, selectedId, data.milestones, data.comments, data.blockers, todos])

  function createMilestone() {
    const next = title.trim()
    if (!next) return
    addProjectMilestone(data.project.id, { title: next, dueAt: dueAt || null }).then((created) => {
      setTitle("")
      setDueAt("")
      setAdding(false)
      onChanged()
      onSelect(created.id)
    })
  }

  return (
    <Box>
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={4} mb={4}>
        <Box display="flex" justifyContent="space-between" gap={3} alignItems="center" mb={3}>
          <Box>
            <Text fontWeight="700" color={APP_INK}>Plan</Text>
            <Text fontSize="0.8125rem" color={APP_MUTED}>
              Click a milestone to see its to-dos, why it slipped, and the conversation.
            </Text>
          </Box>
          {canEdit && data.milestones.length > 0 && (
            <AppButton size="sm" variant="secondary" onClick={() => setAdding((value) => !value)}>
              <LuPlus size={14} /> Milestone
            </AppButton>
          )}
        </Box>

        {data.milestones.length === 0 ? (
          <Box bg={APP_BG_SUBTLE} borderRadius="12px" p={5}>
            <Text fontWeight="700" color={APP_INK} mb={1}>Break the project into slices</Text>
            <Text fontSize="0.875rem" color={APP_MUTED} mb={4}>
              A milestone is a due date with the to-dos, blockers, and comments that belong to it.
            </Text>
            {canEdit && (
              <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "1fr 160px auto" }} gap={2}>
                <FormInput placeholder="e.g. First draft to the client" value={title} onChange={(e) => setTitle(e.target.value)} />
                <FormInput type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                <AppButton size="sm" onClick={createMilestone}>Create milestone</AppButton>
              </Box>
            )}
          </Box>
        ) : (
          <Box overflowX="auto" pb={1}>
            <Box display="flex" alignItems="flex-start" minW="max-content" px={1} py={2}>
              <TimelineTick label="Start" date={data.project.startAt ?? null} />
              {data.milestones.map((milestone) => {
                const active = milestone.id === selectedId
                const isCurrent = milestone.id === currentId
                return (
                  <Box key={milestone.id} display="flex" alignItems="flex-start">
                    <TimelineLine />
                    <Box
                      as="button"
                      minW="148px"
                      maxW="180px"
                      textAlign="left"
                      p={3}
                      borderRadius="12px"
                      border={`1.5px solid ${active ? APP_ACCENT : APP_BORDER}`}
                      bg={active ? "rgba(15,110,86,0.06)" : "white"}
                      onClick={() => onSelect(milestone.id)}
                    >
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Box
                          w="10px"
                          h="10px"
                          borderRadius="99px"
                          bg={milestone.done ? APP_ACCENT : milestone.late ? "#B91C1C" : isCurrent ? APP_ACCENT : APP_BORDER}
                          flexShrink={0}
                        />
                        {isCurrent && <Pill tone="accent">Now</Pill>}
                        {milestone.done && !isCurrent && <Pill>Done</Pill>}
                        {milestone.late && !milestone.done && <Pill tone="danger">Late</Pill>}
                      </Box>
                      <Text fontWeight="700" fontSize="0.8125rem" color={milestone.done ? APP_MUTED : APP_INK} lineHeight="1.3" lineClamp={2}>
                        {milestone.title}
                      </Text>
                      <Text fontSize="0.7rem" color={milestone.late ? "#B91C1C" : APP_MUTED} mt={1}>
                        {formatDate(milestone.dueAt)}
                      </Text>
                    </Box>
                  </Box>
                )
              })}
              <Box display="flex" alignItems="flex-start">
                <TimelineLine />
                <TimelineTick label="Due" date={data.project.dueAt ?? null} />
              </Box>
            </Box>
          </Box>
        )}

        {adding && data.milestones.length > 0 && canEdit && (
          <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "1fr 160px auto auto" }} gap={2} mt={3} pt={3} borderTop={`1px solid ${APP_BORDER}`}>
            <FormInput placeholder="Milestone title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <FormInput type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            <AppButton size="sm" onClick={createMilestone}>Add</AppButton>
            <AppButton size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</AppButton>
          </Box>
        )}
      </Box>

      {selected && (
        <MilestoneWorkspace
          data={data}
          milestone={detail?.milestone ?? selected}
          todos={detail?.todos ?? todos.filter((todo) => todo.milestoneId === selected.id)}
          allTodos={todos}
          conversations={detail?.conversations ?? []}
          blockers={detail?.blockers ?? (data.blockers ?? []).filter((blocker) => blocker.milestoneId === selected.id)}
          error={detailError}
          canEdit={canEdit}
          isCurrent={selected.id === currentId}
          onChanged={onChanged}
        />
      )}
    </Box>
  )
}

function MilestoneWorkspace({
  data,
  milestone,
  todos,
  allTodos,
  conversations,
  blockers,
  error,
  canEdit,
  isCurrent,
  onChanged,
}: {
  data: ProjectTicket
  milestone: ProjectMilestone
  todos: WorkTodo[]
  allTodos: WorkTodo[]
  conversations: MilestoneDetail["conversations"]
  blockers: ProjectBlocker[]
  error: string | null
  canEdit: boolean
  isCurrent: boolean
  onChanged: () => void
}) {
  const { openTodo } = useTodoCard()
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pane, setPane] = useState<"work" | "blockers" | "discuss">("work")
  const available = allTodos.filter((todo) => todo.milestoneId !== milestone.id)
  const unassigned = available.filter((todo) => !todo.milestoneId)
  const elsewhere = available.filter((todo) => todo.milestoneId && todo.milestoneId !== milestone.id)
  const openBlockers = blockers.filter((blocker) => blocker.status === "open")

  useEffect(() => {
    if (milestone.late && openBlockers.length === 0) setPane("blockers")
    else setPane("work")
  }, [milestone.id])

  const names = new Map(data.milestones.map((item) => [item.id, item.title]))

  return (
    <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
      <Box px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`}>
        {error && <Text color="#B91C1C" mb={3}>{error}</Text>}
        <Box display="flex" justifyContent="space-between" gap={3} alignItems="flex-start">
          <Box minW={0}>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={1}>
              <Text fontWeight="700" fontSize="1.125rem" color={APP_INK}>{milestone.title}</Text>
              {isCurrent && <Pill tone="accent">Working on this</Pill>}
              {milestone.done && <Pill>Done</Pill>}
              {milestone.late && !milestone.done && (
                <Pill tone="danger">
                  {milestone.delayedDays != null ? `${milestone.delayedDays}d late` : "Late"}
                </Pill>
              )}
            </Box>
            <Text fontSize="0.8125rem" color={milestone.late ? "#B91C1C" : APP_MUTED}>
              Due {formatDate(milestone.dueAt)}
              {milestone.completedAt ? ` · finished ${formatDate(milestone.completedAt)}` : ""}
            </Text>
          </Box>
          {canEdit && (
            <Box display="flex" gap={2} flexShrink={0} flexWrap="wrap" justifyContent="flex-end">
              {!milestone.done && !isCurrent && (
                <AppButton
                  size="sm"
                  onClick={() => updateWorkspaceProject(data.project.id, { currentMilestoneId: milestone.id }).then(onChanged)}
                >
                  Work on this now
                </AppButton>
              )}
              <AppButton
                size="sm"
                variant="secondary"
                onClick={() => updateProjectMilestone(data.project.id, milestone.id, { done: !milestone.done }).then(onChanged)}
              >
                {milestone.done ? "Reopen" : "Mark done"}
              </AppButton>
              <AppButton size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                <LuTrash2 size={14} />
              </AppButton>
            </Box>
          )}
        </Box>
        {milestone.late && !milestone.done && openBlockers.length === 0 && (
          <Box mt={3} p={3} borderRadius="10px" bg="rgba(185,28,28,0.06)" border="1px solid rgba(185,28,28,0.18)">
            <Text fontSize="0.8125rem" color="#B91C1C" fontWeight="600">
              This date has passed. Log why it slipped so the client can see it.
            </Text>
          </Box>
        )}
      </Box>

      <Box px={2}>
        <AppTabs
          value={pane}
          onChange={(value) => setPane(value as "work" | "blockers" | "discuss")}
          items={[
            { value: "work", label: "To-dos", badge: todos.length },
            { value: "blockers", label: milestone.late ? "Why late" : "Blockers", badge: openBlockers.length },
            { value: "discuss", label: "Discussion", badge: conversations.length },
          ]}
        />
      </Box>

      <Box p={5}>
        {pane === "work" && (
          <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={5}>
            <Box>
              <Text fontWeight="700" color={APP_INK} mb={1}>In this milestone</Text>
              <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
                {todos.length === 0 ? "Nothing here yet." : "Open a card, or remove it from this slice."}
              </Text>
              {todos.map((todo) => (
                <PlanTodoRow
                  key={todo.id}
                  todo={todo}
                  action={canEdit ? "remove" : undefined}
                  onOpen={() => openTodo(todo.id)}
                  onAction={() => updateTodo(todo.id, { milestoneId: null }).then(onChanged)}
                />
              ))}
              {canEdit && (
                <AddTodo projectId={data.project.id} milestoneId={milestone.id} onCreated={onChanged} />
              )}
            </Box>
            <Box>
              <Text fontWeight="700" color={APP_INK} mb={1}>Add work</Text>
              <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
                {available.length === 0
                  ? "Every to-do is already in this milestone."
                  : "Click to put a to-do in this milestone."}
              </Text>
              {unassigned.length > 0 && (
                <>
                  <Text fontSize="0.7rem" fontWeight="700" color={APP_MUTED} letterSpacing="0.04em" textTransform="uppercase" mb={2}>
                    Not on a milestone
                  </Text>
                  {unassigned.map((todo) => (
                    <PlanTodoRow
                      key={todo.id}
                      todo={todo}
                      action={canEdit ? "add" : undefined}
                      onOpen={() => openTodo(todo.id)}
                      onAction={() => updateTodo(todo.id, { milestoneId: milestone.id }).then(onChanged)}
                    />
                  ))}
                </>
              )}
              {elsewhere.length > 0 && (
                <Box mt={unassigned.length ? 4 : 0}>
                  <Text fontSize="0.7rem" fontWeight="700" color={APP_MUTED} letterSpacing="0.04em" textTransform="uppercase" mb={2}>
                    On another milestone
                  </Text>
                  {elsewhere.map((todo) => (
                    <PlanTodoRow
                      key={todo.id}
                      todo={todo}
                      hint={names.get(todo.milestoneId || "") || undefined}
                      action={canEdit ? "add" : undefined}
                      onOpen={() => openTodo(todo.id)}
                      onAction={() => updateTodo(todo.id, { milestoneId: milestone.id }).then(onChanged)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}

        {pane === "blockers" && (
          <Box>
            <Text fontSize="0.875rem" color={APP_MUTED} mb={4}>
              {milestone.late
                ? "What stopped this landing on time — waiting on the client, extra scope, or something else."
                : "Risks that could slip this date. Log them before they become late."}
            </Text>
            {blockers.length === 0 && (
              <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>Nothing logged yet.</Text>
            )}
            {blockers.map((blocker) => (
              <BlockerRow
                key={blocker.id}
                projectId={data.project.id}
                blocker={blocker}
                canEdit={canEdit}
                onChanged={onChanged}
              />
            ))}
            {canEdit && (
              <AddBlockerForm
                projectId={data.project.id}
                milestoneId={milestone.id}
                todos={todos}
                suggestedDays={milestone.late ? milestone.delayedDays ?? null : null}
                onChanged={onChanged}
              />
            )}
          </Box>
        )}

        {pane === "discuss" && (
          <Box>
            <Text fontSize="0.875rem" color={APP_MUTED} mb={4}>
              Comments on this milestone and on every to-do inside it.
            </Text>
            {conversations.length === 0 && (
              <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>No conversation here yet.</Text>
            )}
            {conversations.map((entry) => {
              const mine = entry.author?.id === data.meId
              return (
                <Box key={entry.id} py={3} borderTop={`1px solid ${APP_BORDER}`}>
                  <Box display="flex" justifyContent="space-between" gap={3} mb={1}>
                    <Text fontSize="0.75rem" fontWeight="700" color={APP_INK}>
                      {mine ? "You" : displayName(entry.author)}
                      {entry.source === "todo" && entry.todoTitle ? (
                        <Box
                          as="button"
                          ml={2}
                          fontWeight="600"
                          color={APP_ACCENT}
                          onClick={() => entry.todoId && openTodo(entry.todoId)}
                        >
                          on {entry.todoTitle}
                        </Box>
                      ) : (
                        <Text as="span" fontWeight="600" color={APP_MUTED}> · this milestone</Text>
                      )}
                    </Text>
                    <Text fontSize="0.7rem" color={APP_MUTED}>{new Date(entry.createdAt).toLocaleString()}</Text>
                  </Box>
                  <Text fontSize="0.875rem" color={APP_INK} whiteSpace="pre-wrap">{entry.body}</Text>
                </Box>
              )
            })}
            <FormTextarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment on this milestone"
              minH="88px"
              mt={3}
            />
            <AppButton
              size="sm"
              mt={3}
              loading={busy}
              onClick={() => {
                const body = comment.trim()
                if (!body) return
                setBusy(true)
                addProjectComment(data.project.id, body, milestone.id)
                  .then(() => { setComment(""); onChanged() })
                  .finally(() => setBusy(false))
              }}
            >
              Post comment
            </AppButton>
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={confirmDelete}
        title="Remove this milestone"
        body="To-dos stay on the project. Comments and blockers on this milestone are removed."
        confirmLabel="Remove milestone"
        danger
        onConfirm={() => {
          deleteProjectMilestone(data.project.id, milestone.id).then(() => {
            setConfirmDelete(false)
            onChanged()
          })
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </Box>
  )
}

function PlanTodoRow({
  todo,
  hint,
  action,
  onOpen,
  onAction,
}: {
  todo: WorkTodo
  hint?: string
  action?: "add" | "remove"
  onOpen: () => void
  onAction?: () => void
}) {
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      p={3}
      mb={2}
      border={`1px solid ${APP_BORDER}`}
      borderRadius="12px"
      bg="white"
    >
      <Box as="button" flex="1" minW={0} textAlign="left" onClick={onOpen}>
        <Text fontWeight="600" fontSize="0.875rem" color={APP_INK}>{todo.title}</Text>
        <Text fontSize="0.75rem" color={APP_MUTED} mt="2px">
          {TODO_STATUS_LABEL[todo.status] || todo.status}
          {formatPeopleList(peopleOnTodo(todo)) !== "Unassigned" ? ` · ${formatPeopleList(peopleOnTodo(todo))}` : ""}
          {hint ? ` · ${hint}` : ""}
          {" · "}
          {formatHours(todo.loggedHours)}
        </Text>
        <CardCounts todo={todo} />
      </Box>
      {action && onAction && (
        <AppButton size="sm" variant={action === "add" ? "secondary" : "ghost"} onClick={onAction}>
          {action === "add" ? <><LuPlus size={14} /> Add</> : <><LuX size={14} /> Remove</>}
        </AppButton>
      )}
    </Box>
  )
}

function BlockerRow({
  projectId,
  blocker,
  canEdit,
  onChanged,
}: {
  projectId: string
  blocker: ProjectBlocker
  canEdit: boolean
  onChanged: () => void
}) {
  const open = blocker.status === "open"
  return (
    <Box p={3} mb={2} border={`1px solid ${APP_BORDER}`} borderRadius="12px" bg={open ? "white" : APP_BG_SUBTLE}>
      <Box display="flex" justifyContent="space-between" gap={3} alignItems="flex-start">
        <Box minW={0}>
          <Box display="flex" alignItems="center" gap={2} mb={1} flexWrap="wrap">
            <Text fontWeight="600" fontSize="0.875rem" color={open ? APP_INK : APP_MUTED} textDecoration={open ? "none" : "line-through"}>
              {blocker.title}
            </Text>
            <Pill tone={open ? "amber" : "muted"}>{BLOCKER_KIND_LABEL[blocker.kind] || blocker.kind}</Pill>
          </Box>
          <Text fontSize="0.75rem" color={APP_MUTED}>
            {blocker.delayedDays != null ? `${blocker.delayedDays}d delay` : ""}
            {blocker.todoTitle ? `${blocker.delayedDays != null ? " · " : ""}${blocker.todoTitle}` : ""}
            {!blocker.delayedDays && !blocker.todoTitle ? (open ? "Open" : "Resolved") : ""}
          </Text>
          {blocker.body && (
            <Text fontSize="0.8125rem" color={APP_INK} mt={1} whiteSpace="pre-wrap">{blocker.body}</Text>
          )}
        </Box>
        {canEdit && (
          <Box display="flex" gap={2} flexShrink={0}>
            <AppButton
              size="sm"
              variant="secondary"
              onClick={() => updateProjectBlocker(projectId, blocker.id, { status: open ? "resolved" : "open" }).then(onChanged)}
            >
              {open ? "Resolve" : "Reopen"}
            </AppButton>
            <AppButton size="sm" variant="ghost" onClick={() => deleteProjectBlocker(projectId, blocker.id).then(onChanged)}>
              <LuTrash2 size={14} />
            </AppButton>
          </Box>
        )}
      </Box>
    </Box>
  )
}

const BLOCKER_KIND_OPTIONS: { id: ProjectBlockerKind; label: string }[] = [
  { id: "client", label: "Waiting on client" },
  { id: "scope", label: "Scope change" },
  { id: "dependency", label: "Someone else" },
  { id: "internal", label: "On us" },
  { id: "other", label: "Other" },
]

function AddBlockerForm({
  projectId,
  milestoneId,
  todos,
  suggestedDays,
  onChanged,
}: {
  projectId: string
  milestoneId: string
  todos: WorkTodo[]
  suggestedDays: number | null
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [kind, setKind] = useState<ProjectBlockerKind>("client")
  const [days, setDays] = useState(suggestedDays != null ? String(suggestedDays) : "")
  const [todoId, setTodoId] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open && suggestedDays != null) setDays(String(suggestedDays))
  }, [suggestedDays, open])

  if (!open) {
    return (
      <AppButton size="sm" mt={2} onClick={() => setOpen(true)}>
        {suggestedDays ? "Log why it was late" : "Log a blocker"}
      </AppButton>
    )
  }

  return (
    <Box mt={3} p={4} border={`1px solid ${APP_BORDER}`} borderRadius="12px" bg={APP_BG_SUBTLE}>
      <Text fontWeight="700" fontSize="0.875rem" color={APP_INK} mb={3}>What got in the way?</Text>
      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        {BLOCKER_KIND_OPTIONS.map((option) => (
          <Box
            key={option.id}
            as="button"
            h="32px"
            px={3}
            borderRadius="999px"
            fontSize="0.75rem"
            fontWeight="700"
            border={`1px solid ${kind === option.id ? APP_ACCENT : APP_BORDER}`}
            bg={kind === option.id ? "rgba(15,110,86,0.08)" : "white"}
            color={kind === option.id ? APP_ACCENT : APP_MUTED}
            onClick={() => setKind(option.id)}
          >
            {option.label}
          </Box>
        ))}
      </Box>
      <FormInput placeholder="e.g. Waiting on copy from the client" value={title} onChange={(e) => setTitle(e.target.value)} mb={2} />
      <FormTextarea placeholder="What unblocks it? (optional)" value={body} onChange={(e) => setBody(e.target.value)} minH="72px" mb={2} />
      <Box display="grid" gridTemplateColumns={{ base: "1fr", md: todos.length ? "110px 1fr" : "110px" }} gap={2} mb={3}>
        <FormInput type="number" min="0" max="3650" placeholder="Days late" value={days} onChange={(e) => setDays(e.target.value)} />
        {todos.length > 0 && (
          <FormNativeSelect value={todoId} onChange={(e) => setTodoId(e.target.value)}>
            <option value="">Tied to a to-do (optional)</option>
            {todos.map((todo) => (
              <option key={todo.id} value={todo.id}>{todo.title}</option>
            ))}
          </FormNativeSelect>
        )}
      </Box>
      <Box display="flex" gap={2}>
        <AppButton
          size="sm"
          loading={busy}
          onClick={() => {
            const next = title.trim()
            if (!next) return
            const n = days ? Number(days) : null
            setBusy(true)
            addProjectBlocker(projectId, {
              title: next,
              body: body.trim() || null,
              kind,
              delayedDays: n != null && Number.isFinite(n) ? n : null,
              milestoneId,
              todoId: todoId || null,
            })
              .then(() => {
                setTitle("")
                setBody("")
                setDays(suggestedDays != null ? String(suggestedDays) : "")
                setTodoId("")
                setOpen(false)
                onChanged()
              })
              .finally(() => setBusy(false))
          }}
        >
          Save
        </AppButton>
        <AppButton size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</AppButton>
      </Box>
    </Box>
  )
}

export function FilesPanel({
  data,
  canRemove,
  onChanged,
}: {
  data: ProjectTicket
  canRemove: boolean
  onChanged: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5}>
      {error && <Text color="#B91C1C" mb={3}>{error}</Text>}
      {data.attachments.length === 0 && (
        <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
          Briefs, contracts, mockups, signed-off files — keep them on the project.
        </Text>
      )}
      {data.attachments.map((file) => (
        <FileRow key={file.id} projectId={data.project.id} file={file} canRemove={canRemove} onChanged={onChanged} />
      ))}
      <Box mt={3}>
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (!file) return
            setBusy(true)
            setError(null)
            uploadProjectAttachment(data.project.id, file)
              .then(onChanged)
              .catch((err: Error) => setError(err.message))
              .finally(() => setBusy(false))
          }}
        />
        <AppButton size="sm" variant="secondary" loading={busy} onClick={() => fileRef.current?.click()}>
          <LuPaperclip size={14} /> Attach file
        </AppButton>
      </Box>
    </Box>
  )
}

function FileRow({
  projectId,
  file,
  canRemove,
  onChanged,
}: {
  projectId: string
  file: ProjectAttachment
  canRemove: boolean
  onChanged: () => void
}) {
  return (
    <Box display="flex" justifyContent="space-between" gap={3} py={2} borderTop={`1px solid ${APP_BORDER}`}>
      <a href={file.downloadUrl ?? undefined} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
        <Text fontSize="0.875rem" fontWeight="600" color={APP_ACCENT}>{file.fileName}</Text>
        <Text fontSize="0.75rem" color={APP_MUTED}>
          {file.byteSize != null ? `${Math.max(1, Math.round(file.byteSize / 1024))} KB` : "File"}
          {" · "}
          {formatDate(file.createdAt)}
        </Text>
      </a>
      {canRemove && (
        <Box as="button" color={APP_MUTED} onClick={() => deleteProjectAttachment(projectId, file.id).then(onChanged)}>
          <LuTrash2 size={14} />
        </Box>
      )}
    </Box>
  )
}

export function DiscussPanel({
  data,
  onChanged,
}: {
  data: ProjectTicket
  onChanged: () => void
}) {
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const canModerate = data.role === "owner" || data.role === "admin"

  return (
    <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5}>
      <Text fontSize="0.8125rem" color={APP_MUTED} mb={4}>
        Everyone on this project can join this thread. Milestone comments also show on Plan.
      </Text>
      {data.comments.length === 0 && (
        <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>No comments yet.</Text>
      )}
      {data.comments.map((entry: ProjectComment) => {
        const mine = entry.author?.id === data.meId
        const milestone = entry.milestoneId
          ? data.milestones.find((item) => item.id === entry.milestoneId)
          : null
        return (
          <Box key={entry.id} py={3} borderTop={`1px solid ${APP_BORDER}`}>
            <Box display="flex" justifyContent="space-between" gap={3} mb={1}>
              <Text fontSize="0.75rem" fontWeight="700" color={APP_INK}>
                {mine ? "You" : displayName(entry.author)}
                {milestone ? (
                  <Text as="span" fontWeight="600" color={APP_MUTED}> · {milestone.title}</Text>
                ) : null}
              </Text>
              <Box display="flex" gap={2} alignItems="center">
                <Text fontSize="0.7rem" color={APP_MUTED}>
                  {new Date(entry.createdAt).toLocaleString()}
                </Text>
                {(mine || canModerate) && (
                  <Box
                    as="button"
                    color={APP_MUTED}
                    onClick={() => deleteProjectComment(data.project.id, entry.id).then(onChanged)}
                  >
                    <LuTrash2 size={12} />
                  </Box>
                )}
              </Box>
            </Box>
            <Text fontSize="0.875rem" color={APP_INK} whiteSpace="pre-wrap">{entry.body}</Text>
          </Box>
        )
      })}
      <FormTextarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a comment on this project"
        minH="96px"
        mt={3}
      />
      <AppButton
        size="sm"
        mt={3}
        loading={busy}
        onClick={() => {
          const body = comment.trim()
          if (!body) return
          setBusy(true)
          addProjectComment(data.project.id, body)
            .then(() => { setComment(""); onChanged() })
            .finally(() => setBusy(false))
        }}
      >
        Post comment
      </AppButton>
    </Box>
  )
}
