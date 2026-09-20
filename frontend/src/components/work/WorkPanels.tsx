import { useState } from "react"
import { Link } from "react-router-dom"
import { Box, Text } from "@chakra-ui/react"
import { LuCheck, LuChevronDown, LuChevronRight, LuCirclePlay, LuListChecks, LuMessageCircle, LuPaperclip, LuPlus } from "react-icons/lu"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_INK,
  APP_MUTED,
  APP_SURFACE,
} from "@/components/ui/appUi"
import { AppButton } from "@/components/ui/AppButton"
import { HoursField } from "./HoursField"
import { displayName, formatPeopleList, peopleOnTodo } from "@/lib/people"
import { formatEta, formatHours, TODO_STATUS_LABEL } from "@/lib/hours"
import {
  logTime,
  startTodo,
  updateTodo,
  type WorkProject,
  type WorkTodo,
} from "@/api/work"
import { useTodoCard } from "./TodoCardContext"
import { AddTodoDialog, LogHoursDialog } from "./WorkDialogs"

function statusColor(status: string) {
  if (status === "in_progress") return APP_ACCENT
  if (status === "waiting_on_client") return "#B45309"
  if (status === "done" || status === "invoiced") return APP_MUTED
  return APP_INK
}

export function WeekBar({ logged, capacity }: { logged: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((logged / capacity) * 100)) : 0
  return (
    <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5} mb={5}>
      <Box display="flex" justifyContent="space-between" gap={3} mb={2}>
        <Text fontSize="0.75rem" fontWeight="700" color={APP_MUTED} letterSpacing="0.06em" textTransform="uppercase">
          This week
        </Text>
        <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>
          {formatHours(logged)} / {formatHours(capacity)}
        </Text>
      </Box>
      <Box h="8px" bg={APP_BG_SUBTLE} borderRadius="99px" overflow="hidden">
        <Box h="full" w={`${pct}%`} bg={APP_ACCENT} borderRadius="99px" />
      </Box>
    </Box>
  )
}

export function NowCard({
  todo,
  elsewhere,
  lastWorkedAt,
  suggested,
  canWork,
  onChanged,
}: {
  todo: WorkTodo | null
  elsewhere?: boolean
  lastWorkedAt?: string | null
  suggested?: (WorkTodo & { projectName?: string }) | null
  canWork: boolean
  onChanged: () => void
}) {
  const [hours, setHours] = useState("1")
  const [busy, setBusy] = useState(false)
  const { openTodo } = useTodoCard()

  async function log(done = false) {
    if (!todo) return
    const n = Number(hours)
    if (!Number.isFinite(n) || n <= 0) return
    setBusy(true)
    try {
      await logTime(todo.id, { hours: n })
      if (done) await updateTodo(todo.id, { status: "done" })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box bg={APP_INK} color="white" borderRadius="16px" p={{ base: 5, md: 6 }} mb={5}>
      <Text fontSize="0.7rem" fontWeight="700" letterSpacing="0.1em" textTransform="uppercase" color="rgba(255,255,255,0.45)" mb={2}>
        Now
      </Text>
      {todo ? (
        <>
          <Box as="button" textAlign="left" onClick={() => openTodo(todo.id)} color="inherit">
            <Text fontSize="1.25rem" fontWeight="700" letterSpacing="-0.02em" mb={1}>{todo.title}</Text>
            <Text fontSize="0.75rem" color="rgba(255,255,255,0.45)" mb={2}>Open card to describe, comment, and attach</Text>
          </Box>
          <Text fontSize="0.8125rem" color="rgba(255,255,255,0.55)" mb={1}>
            {todo.projectName}
            {todo.clientName ? ` · ${todo.clientName}` : ""}
            {" · "}
            {formatHours(todo.loggedHours)}
            {todo.estimatedHours != null ? ` / ${formatHours(todo.estimatedHours)}` : " logged"}
          </Text>
          <CardCounts todo={todo} light />
          {canWork && (
            <Box mt={3}>
              <HoursField value={hours} onChange={setHours} bg="white" color={APP_INK} />
              <Box display="flex" gap={2} mt={2}>
                <AppButton size="sm" loading={busy} onClick={() => void log(false)}>Log hours</AppButton>
                <AppButton size="sm" variant="secondary" loading={busy} onClick={() => void log(true)}>Done</AppButton>
              </Box>
            </Box>
          )}
        </>
      ) : elsewhere ? (
        <>
          <Text fontSize="1.125rem" fontWeight="700" mb={1}>Currently on other client work</Text>
          <Text fontSize="0.8125rem" color="rgba(255,255,255,0.55)">
            {lastWorkedAt
              ? `Last hours on your projects ${new Date(lastWorkedAt).toLocaleDateString()}`
              : "Nothing logged on your projects yet."}
          </Text>
        </>
      ) : (
        <>
          <Text fontSize="1.125rem" fontWeight="700" mb={1}>Nothing in progress</Text>
          {suggested && canWork ? (
            <Box mt={3}>
              <Text fontSize="0.8125rem" color="rgba(255,255,255,0.55)" mb={3}>
                Next up:{" "}
                <Box as="button" color="white" fontWeight="700" onClick={() => openTodo(suggested.id)}>
                  {suggested.title}
                </Box>
                {suggested.projectName ? ` · ${suggested.projectName}` : ""}
              </Text>
              <AppButton size="sm" onClick={() => startTodo(suggested.id).then(onChanged)}>
                <LuCirclePlay size={14} /> Start this
              </AppButton>
            </Box>
          ) : (
            <Text fontSize="0.8125rem" color="rgba(255,255,255,0.55)">
              Add a to-do on a project to start the week.
            </Text>
          )}
        </>
      )}
    </Box>
  )
}

export function PaceLine({ project }: { project: WorkProject }) {
  const eta = formatEta(project.remainingHours, project.weeklyPace)
  return (
    <Text fontSize="0.75rem" color={APP_MUTED} lineHeight="1.55">
      {formatHours(project.loggedHours)} logged
      {project.estimatedHours != null ? ` · ${formatHours(project.estimatedHours)} estimated` : ""}
      {project.remainingHours != null ? ` · ${formatHours(project.remainingHours)} left` : " · no estimate yet"}
      {" · "}
      {formatHours(project.thisWeekHours)} this week
      {project.weeklyPace != null ? ` · ~${formatHours(project.weeklyPace)}/week on this project` : ""}
      {eta ? ` · ${eta}` : ""}
    </Text>
  )
}

export function CardCounts({ todo, light = false }: { todo: WorkTodo; light?: boolean }) {
  const comments = todo.commentCount ?? 0
  const items = todo.itemCount ?? 0
  const done = todo.itemDoneCount ?? 0
  const files = todo.attachmentCount ?? 0
  const accepted = todo.acceptanceTestedCount ?? 0
  const criteria = todo.acceptanceCount ?? 0
  if (!comments && !items && !files && !criteria) return null
  const color = light ? "rgba(255,255,255,0.55)" : APP_MUTED
  return (
    <Box display="flex" gap={3} flexWrap="wrap" mt={1} color={color} fontSize="0.75rem">
      {criteria > 0 && (
        <Box display="inline-flex" alignItems="center" gap="4px">
          <LuCheck size={12} /> {accepted}/{criteria}
        </Box>
      )}
      {comments > 0 && (
        <Box display="inline-flex" alignItems="center" gap="4px">
          <LuMessageCircle size={12} /> {comments}
        </Box>
      )}
      {items > 0 && (
        <Box display="inline-flex" alignItems="center" gap="4px">
          <LuListChecks size={12} /> {done}/{items}
        </Box>
      )}
      {files > 0 && (
        <Box display="inline-flex" alignItems="center" gap="4px">
          <LuPaperclip size={12} /> {files}
        </Box>
      )}
    </Box>
  )
}

export function TodoRow({
  todo,
  canWork,
  canSetNow,
  onChanged,
}: {
  todo: WorkTodo
  canWork: boolean
  canSetNow: boolean
  onChanged: () => void
}) {
  const [logOpen, setLogOpen] = useState(false)
  const done = todo.status === "done" || todo.status === "invoiced"
  const { openTodo } = useTodoCard()

  return (
    <Box py={3} borderTop={`1px solid ${APP_BORDER}`}>
      <Box display="flex" justifyContent="space-between" gap={3} alignItems="flex-start">
        <Box
          as="button"
          textAlign="left"
          minW={0}
          flex="1"
          onClick={() => openTodo(todo.id)}
        >
          <Text fontWeight="600" color={done ? APP_MUTED : APP_INK} textDecoration={done ? "line-through" : "none"}>
            {todo.title}
          </Text>
          <Text fontSize="0.75rem" color={statusColor(todo.status)}>
            {TODO_STATUS_LABEL[todo.status] || todo.status}
            {formatPeopleList(peopleOnTodo(todo)) !== "Unassigned" ? ` · ${formatPeopleList(peopleOnTodo(todo))}` : ""}
            {" · "}
            {formatHours(todo.loggedHours)}
            {todo.estimatedHours != null ? ` / ${formatHours(todo.estimatedHours)}` : ""}
          </Text>
          <CardCounts todo={todo} />
        </Box>
        {canWork && todo.status !== "invoiced" && (
          <Box display="flex" gap={2} flexShrink={0}>
            {canSetNow && todo.status !== "in_progress" && todo.status !== "done" && (
              <Box as="button" fontSize="0.75rem" fontWeight="600" color={APP_ACCENT} onClick={() => startTodo(todo.id).then(onChanged)}>
                Start
              </Box>
            )}
            {todo.status === "in_progress" && (
              <Box as="button" fontSize="0.75rem" fontWeight="600" color={APP_ACCENT} onClick={() => updateTodo(todo.id, { status: "done" }).then(onChanged)}>
                Done
              </Box>
            )}
            {todo.status === "backlog" && (
              <Box as="button" fontSize="0.75rem" fontWeight="600" color="#B45309" onClick={() => updateTodo(todo.id, { status: "waiting_on_client" }).then(onChanged)}>
                Wait
              </Box>
            )}
            <Box as="button" fontSize="0.75rem" fontWeight="600" color={APP_INK} onClick={() => setLogOpen(true)}>
              Log
            </Box>
          </Box>
        )}
      </Box>
      <LogHoursDialog
        open={logOpen}
        todoId={todo.id}
        onClose={() => setLogOpen(false)}
        onLogged={onChanged}
      />
    </Box>
  )
}

export function AddTodo({
  projectId,
  milestoneId,
  onCreated,
}: {
  projectId: string
  milestoneId?: string | null
  onCreated: (todo?: WorkTodo) => void
}) {
  const [open, setOpen] = useState(false)
  const { openTodo } = useTodoCard()

  return (
    <Box mt={3}>
      <AppButton size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <LuPlus size={14} /> Add to-do
      </AppButton>
      <AddTodoDialog
        open={open}
        projectId={projectId}
        milestoneId={milestoneId}
        onClose={() => setOpen(false)}
        onCreated={(todo) => {
          onCreated(todo)
          openTodo(todo.id)
        }}
      />
    </Box>
  )
}

export function ProjectAccordion({
  project,
  defaultOpen,
  canWork,
  canSetNow,
  onChanged,
}: {
  project: WorkProject
  defaultOpen: boolean
  canWork: boolean
  canSetNow: boolean
  onChanged: () => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const openTodos = project.todos.filter((t) => t.status !== "done" && t.status !== "invoiced")
  const doneTodos = project.todos.filter((t) => t.status === "done" || t.status === "invoiced")

  return (
    <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden" mb={3}>
      <Box
        as="button"
        w="100%"
        textAlign="left"
        px={5}
        py={4}
        display="flex"
        alignItems="flex-start"
        gap={3}
        onClick={() => setOpen((v) => !v)}
        bg={project.isNow ? "#F0FAF5" : APP_SURFACE}
      >
        <Box mt="3px" color={APP_MUTED}>
          {open ? <LuChevronDown /> : <LuChevronRight />}
        </Box>
        <Box flex="1" minW={0}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={1}>
            <Link to={`/app/projects/${project.id}`} onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
              <Text fontWeight="700" color={APP_INK}>{project.name}</Text>
            </Link>
            {project.isNow && (
              <Text fontSize="0.65rem" fontWeight="700" color={APP_ACCENT} letterSpacing="0.06em" textTransform="uppercase">Now</Text>
            )}
            {project.waitingOnClient && (
              <Text fontSize="0.65rem" fontWeight="700" color="#B45309" letterSpacing="0.06em" textTransform="uppercase">Waiting</Text>
            )}
          </Box>
          <Text fontSize="0.75rem" color={APP_MUTED} mb={1}>{displayName(project.client)}</Text>
          <PaceLine project={project} />
        </Box>
      </Box>
      {open && (
        <Box px={5} pb={5}>
          {openTodos.map((todo) => (
            <TodoRow key={todo.id} todo={todo} canWork={canWork} canSetNow={canSetNow} onChanged={onChanged} />
          ))}
          {openTodos.length === 0 && (
            <Text fontSize="0.8125rem" color={APP_MUTED} py={3}>No open to-dos.</Text>
          )}
          {doneTodos.length > 0 && (
            <Text fontSize="0.75rem" color={APP_MUTED} mt={2}>
              {doneTodos.length} done
            </Text>
          )}
          {canWork && <AddTodo projectId={project.id} onCreated={onChanged} />}
        </Box>
      )}
    </Box>
  )
}
