import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Box, Text } from "@chakra-ui/react"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_INK,
  APP_MUTED,
  APP_SURFACE,
} from "@/components/ui/appUi"
import { displayName } from "@/lib/people"
import { formatDate, formatHours, formatWhen, PROJECT_STATUS_LABEL } from "@/lib/hours"
import type { WorkProject } from "@/api/work"

function projectStatusColor(status?: string) {
  if (status === "in_progress") return APP_ACCENT
  if (status === "waiting_on_client") return "#B45309"
  if (status === "done") return APP_MUTED
  return APP_INK
}

export function ProjectStatusChip({ status }: { status?: string }) {
  const value = status || "backlog"
  const color = projectStatusColor(value)
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      h="24px"
      px={2.5}
      borderRadius="999px"
      border={`1px solid ${APP_BORDER}`}
      bg="white"
      color={color}
      fontSize="0.7rem"
      fontWeight="700"
    >
      {PROJECT_STATUS_LABEL[value] || value}
    </Box>
  )
}

export function ProjectGlance({
  project,
  actions,
}: {
  project: WorkProject
  actions?: ReactNode
}) {
  const openCount = project.openCount ?? project.todos.filter((todo) => todo.status !== "done" && todo.status !== "invoiced").length
  const waitingCount = project.waitingCount ?? project.todos.filter((todo) => todo.status === "waiting_on_client").length
  const nowTitle = project.nowTodo?.title
  const due = project.dueAt ? formatDate(project.dueAt) : null
  const activity = project.lastWorkedAt || project.updatedAt

  return (
    <Box
      bg={project.isNow ? "#F0FAF5" : APP_SURFACE}
      border={`1px solid ${project.isNow ? "rgba(15,110,86,0.22)" : APP_BORDER}`}
      borderRadius="16px"
      p={5}
      display="flex"
      gap={3}
      alignItems="flex-start"
      justifyContent="space-between"
    >
      <Link to={`/app/projects/${project.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
          <ProjectStatusChip status={project.status} />
          {project.isNow && (
            <Text fontSize="0.65rem" fontWeight="700" color={APP_ACCENT} letterSpacing="0.06em" textTransform="uppercase">
              Now
            </Text>
          )}
          {project.waitingOnClient && (
            <Text fontSize="0.65rem" fontWeight="700" color="#B45309" letterSpacing="0.06em" textTransform="uppercase">
              Waiting
            </Text>
          )}
          {due && (
            <Text fontSize="0.75rem" color={APP_MUTED}>
              Due {due}
            </Text>
          )}
        </Box>
        <Text fontSize="1.0625rem" fontWeight="700" color={APP_INK} letterSpacing="-0.02em" mb={1}>
          {project.name}
        </Text>
        <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
          {displayName(project.client)}
          {project.collaboratorCount ? ` · ${project.collaboratorCount} collaborator${project.collaboratorCount === 1 ? "" : "s"}` : ""}
        </Text>
        {nowTitle && (
          <Text fontSize="0.875rem" color={APP_INK} mb={1}>
            <Text as="span" color={APP_MUTED}>In progress · </Text>
            {nowTitle}
          </Text>
        )}
        {project.currentMilestoneTitle && (
          <Text fontSize="0.8125rem" color={APP_INK} mb={1}>
            <Text as="span" color={APP_MUTED}>Milestone · </Text>
            {project.currentMilestoneTitle}
          </Text>
        )}
        <Text fontSize="0.75rem" color={APP_MUTED} mt={2}>
          {formatHours(project.loggedHours)} logged
          {project.estimatedHours != null ? ` / ${formatHours(project.estimatedHours)}` : ""}
          {" · "}
          {openCount} open
          {waitingCount ? ` · ${waitingCount} waiting` : ""}
          {activity ? ` · ${formatWhen(activity)}` : ""}
        </Text>
      </Link>
      {actions ? (
        <Box flexShrink={0} display="flex" gap={2} alignItems="center" onClick={(event) => event.stopPropagation()}>
          {actions}
        </Box>
      ) : null}
    </Box>
  )
}

export function CockpitPanel({
  title,
  hint,
  empty,
  children,
  action,
}: {
  title: string
  hint?: string
  empty?: string
  children: ReactNode
  action?: ReactNode
}) {
  const hasChildren = Boolean(children)
  return (
    <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="16px" overflow="hidden" h="100%">
      <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE} display="flex" justifyContent="space-between" gap={3} alignItems="center">
        <Box>
          <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>{title}</Text>
          {hint && <Text fontSize="0.75rem" color={APP_MUTED} mt="2px">{hint}</Text>}
        </Box>
        {action}
      </Box>
      <Box px={5} py={2}>
        {hasChildren ? children : (
          <Text fontSize="0.8125rem" color={APP_MUTED} py={4} lineHeight="1.55">
            {empty || "Nothing here yet."}
          </Text>
        )}
      </Box>
    </Box>
  )
}
