import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Box, Grid, Spinner, Text } from "@chakra-ui/react"
import { LuPlus } from "react-icons/lu"
import { getMe, type User } from "@/api/users"
import { getMyWorkspace } from "@/api/workspace"
import { getWorkbench, type WorkDiscussion, type WorkTodo, type Workbench } from "@/api/work"
import { PageShell } from "@/components/ui/PageShell"
import { OnboardingChecklist } from "@/components/workspace/OnboardingChecklist"
import { WelcomeBannerAction } from "@/components/ui/WelcomeBanner"
import { NowCard, WeekBar } from "@/components/work/WorkPanels"
import { CockpitPanel, ProjectGlance } from "@/components/work/ProjectGlance"
import { useTodoCard } from "@/components/work/TodoCardContext"
import { AvatarStack, DueChip } from "@/components/work/todoUi"
import { APP_ACCENT, APP_BORDER, APP_INK, APP_MUTED } from "@/components/ui/appUi"
import { displayName, peopleOnTodo } from "@/lib/people"
import { formatHours, formatWhen, TODO_STATUS_LABEL } from "@/lib/hours"

export default function DashboardPage() {
  const [me, setMe] = useState<User | null>(null)
  const [bench, setBench] = useState<Workbench | null>(null)
  const [clientCount, setClientCount] = useState(0)
  const [hasWorkspace, setHasWorkspace] = useState(false)
  const [loading, setLoading] = useState(true)
  const { openTodo } = useTodoCard()
  const navigate = useNavigate()

  function load(quiet = false) {
    if (!quiet) setLoading(true)
    ;(async () => {
      const profile = await getMe()
      setMe(profile)
      const [ws, work] = await Promise.all([
        getMyWorkspace().catch(() => null),
        getWorkbench().catch(() => null),
      ])
      setBench(work)
      if (ws && "workspace" in ws) {
        setHasWorkspace(true)
        setClientCount(ws.clients.length)
      } else if (ws && "workspaces" in ws) {
        setHasWorkspace(ws.workspaces.length > 0)
      }
    })()
      .catch(() => null)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const refresh = () => load(true)
    window.addEventListener("cohelper:work-refresh", refresh)
    return () => window.removeEventListener("cohelper:work-refresh", refresh)
  }, [])

  const owner = me?.role === "expert"
  const greetName = me?.firstName || me?.username || me?.companyName || ""
  const role = bench?.role || (owner ? "owner" : "client")
  const title = role === "client" ? "Your work" : greetName ? `Today, ${greetName}` : "Today"
  const nowCanWork = Boolean(
    owner ||
    (bench?.now && bench.projects.some((project) => project.id === bench.now?.projectId && project.canWork))
  )

  if (loading && !bench) {
    return (
      <PageShell eyebrow="Home" title="Today">
        <Spinner />
      </PageShell>
    )
  }

  const myTodos = bench?.myTodos ?? []
  const waitingOnYou = bench?.waitingOnYou ?? []
  const discussions = bench?.discussions ?? []
  const projects = bench?.projects ?? []
  const stats = [
    { label: "Projects", value: String(bench?.projectCount ?? projects.length) },
    { label: "Waiting", value: String(waitingOnYou.length) },
    { label: "This week", value: formatHours(bench?.thisWeekHours || 0) },
    owner
      ? { label: "Unbilled", value: formatHours(bench?.unbilledHours || 0) }
      : { label: "To-dos", value: String(myTodos.length) },
  ]

  return (
    <PageShell
      eyebrow="Home"
      title={title}
      stats={stats}
      action={
        owner ? (
          <WelcomeBannerAction to="/app/projects?new=1">
            <LuPlus size={15} /> New project
          </WelcomeBannerAction>
        ) : undefined
      }
    >
      <OnboardingChecklist
        isOwner={Boolean(owner)}
        hasWorkspace={hasWorkspace}
        hasClients={clientCount > 0}
        hasProjects={(bench?.projectCount ?? 0) > 0}
      />

      {bench && (
        <>
          <NowCard
            todo={bench.now}
            elsewhere={bench.nowElsewhere}
            lastWorkedAt={bench.lastWorkedAt}
            suggested={bench.suggested}
            canWork={nowCanWork}
            onChanged={load}
          />

          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={4} mb={5}>
            <CockpitPanel
              title="Your to-dos"
              hint={role === "client" ? "Waiting on you, plus anything assigned to you" : "Assigned to you across projects"}
              empty={role === "client" ? "Nothing is waiting on you." : "Nothing is assigned to you right now."}
            >
              {waitingOnYou.length > 0 || myTodos.length > 0 ? (
                <>
                  {waitingOnYou.map((todo) => (
                    <CockpitTodoRow key={`wait-${todo.id}`} todo={todo} waiting onOpen={() => openTodo(todo.id)} />
                  ))}
                  {myTodos.map((todo) => (
                    <CockpitTodoRow key={todo.id} todo={todo} onOpen={() => openTodo(todo.id)} />
                  ))}
                </>
              ) : null}
            </CockpitPanel>

            <CockpitPanel
              title="Latest discussion"
              hint="Project and to-do comments"
              empty="No comments yet. Open a project or a to-do to start a thread."
            >
              {discussions.length > 0 ? discussions.map((entry) => (
                <DiscussionRow
                  key={entry.id}
                  entry={entry}
                  meId={bench.meId}
                  onOpen={() => {
                    if (entry.todoId) openTodo(entry.todoId, "discuss")
                    else navigate(`/app/projects/${entry.projectId}?view=discuss`)
                  }}
                />
              )) : null}
            </CockpitPanel>
          </Grid>

          <WeekBar logged={bench.thisWeekHours} capacity={bench.weeklyHours} />

          <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={3} gap={3}>
            <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>Projects</Text>
            <Link to="/app/projects" style={{ textDecoration: "none" }}>
              <Text fontSize="0.75rem" fontWeight="700" color={APP_ACCENT}>See all</Text>
            </Link>
          </Box>

          {projects.length === 0 ? (
            <Text color={APP_MUTED}>
              {owner ? "Add a client and a project, then the work will land here." : "No projects have been shared with you yet."}
            </Text>
          ) : (
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3} mb={4}>
              {projects.slice(0, 6).map((project) => (
                <ProjectGlance key={project.id} project={project} />
              ))}
            </Grid>
          )}

          {owner && bench.unbilledHours != null && bench.unbilledHours > 0 && (
            <Box mt={2}>
              <Link to="/app/invoices" style={{ textDecoration: "none" }}>
                <Text fontSize="0.75rem" color={APP_MUTED}>
                  {bench.unbilledHours}h unbilled — invoices when you're ready
                </Text>
              </Link>
            </Box>
          )}
        </>
      )}
    </PageShell>
  )
}

function CockpitTodoRow({
  todo,
  waiting = false,
  onOpen,
}: {
  todo: WorkTodo
  waiting?: boolean
  onOpen: () => void
}) {
  return (
    <Box as="button" w="100%" textAlign="left" py={3} borderBottom={`1px solid ${APP_BORDER}`} onClick={onOpen}>
      <Box display="flex" justifyContent="space-between" gap={3} alignItems="flex-start">
        <Box minW={0}>
          <Text fontWeight="600" color={APP_INK} fontSize="0.875rem">{todo.title}</Text>
          <Text fontSize="0.75rem" color={waiting ? "#B45309" : APP_MUTED} mt="2px">
            {waiting ? "Waiting on you" : TODO_STATUS_LABEL[todo.status] || todo.status}
            {todo.projectName ? ` · ${todo.projectName}` : ""}
          </Text>
        </Box>
        <Box display="flex" alignItems="center" gap={2} flexShrink={0}>
          <DueChip dueAt={todo.dueAt} status={todo.status} />
          <AvatarStack people={peopleOnTodo(todo)} size={20} />
        </Box>
      </Box>
    </Box>
  )
}

function DiscussionRow({
  entry,
  meId,
  onOpen,
}: {
  entry: WorkDiscussion
  meId?: string
  onOpen: () => void
}) {
  const mine = entry.author?.id === meId
  return (
    <Box as="button" w="100%" textAlign="left" py={3} borderBottom={`1px solid ${APP_BORDER}`} onClick={onOpen}>
      <Box display="flex" justifyContent="space-between" gap={3} mb="2px">
        <Text fontSize="0.75rem" fontWeight="700" color={APP_INK}>
          {mine ? "You" : displayName(entry.author)}
          <Text as="span" fontWeight="600" color={APP_MUTED}>
            {" · "}
            {entry.todoTitle || entry.projectName}
          </Text>
        </Text>
        <Text fontSize="0.7rem" color={APP_MUTED} flexShrink={0}>{formatWhen(entry.createdAt)}</Text>
      </Box>
      <Text fontSize="0.8125rem" color={APP_INK} lineClamp={2}>{entry.body}</Text>
    </Box>
  )
}
