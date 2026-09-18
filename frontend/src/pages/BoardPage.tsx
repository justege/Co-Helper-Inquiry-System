import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { LuFolderKanban, LuPlus, LuUsers } from "react-icons/lu"
import {
  createInquiry,
  getMyInquiries,
  updateInquiryStatus,
  type Inquiry,
  type Urgency,
} from "../api/inquiries"
import { getMe, type User } from "../api/users"
import { getMyWorkspace, getWorkspaceProjects, type FreelancerWorkspaceMe, type WorkspaceProject } from "../api/workspace"
import { PageShell } from "@/components/ui/PageShell"
import { StartWorkspaceEmptyState } from "@/components/ui/FeatureEmptyState"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
  APP_SURFACE,
  AppFilterChip,
} from "@/components/ui/appUi"
import { AppButton } from "@/components/ui/AppButton"
import {
  BOARD_COLUMNS,
  clientDisplayName,
  columnForStatus,
  writeStatusForColumn,
  type BoardColumn,
  type BoardColumnId,
} from "@/lib/boardStatus"

const URGENCY_TONE: Partial<Record<Urgency, { label: string; color: string }>> = {
  high: { label: "High", color: "#B91C1C" },
  critical: { label: "Critical", color: "#7F1D1D" },
}

type ClientFilter = "all" | "none" | string

export default function BoardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [me, setMe] = useState<User | null>(null)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [workspace, setWorkspace] = useState<FreelancerWorkspaceMe | null>(null)
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [clientWorkspaceCount, setClientWorkspaceCount] = useState(0)
  const [clientWorkspaceId, setClientWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ClientFilter>("all")
  const projectFilter = searchParams.get("project") ?? "all"
  const snapshotRef = useRef<Inquiry[] | null>(null)

  const isFreelancer = me?.role === "expert"
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function onDragEnd(event: DragEndEvent) {
    const overId = event.over?.id
    const activeId = String(event.active.id)
    if (typeof overId === "string" && BOARD_COLUMNS.some((c) => c.id === overId)) {
      void moveCard(activeId, overId as BoardColumnId)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [profile, jobs, ws, projectData] = await Promise.all([
        getMe(),
        getMyInquiries(),
        getMyWorkspace().catch(() => null),
        getWorkspaceProjects().catch(() => ({ projects: [] as WorkspaceProject[] })),
      ])
      setMe(profile)
      setInquiries(jobs)
      setProjects(projectData.projects)
      if (ws?.role === "owner") {
        setWorkspace(ws)
        setClientWorkspaceCount(0)
        setClientWorkspaceId(null)
      } else if (ws?.role === "client") {
        setWorkspace(null)
        setClientWorkspaceCount(ws.workspaces.length)
        setClientWorkspaceId(ws.workspaces[0]?.id ?? null)
      } else {
        setWorkspace(null)
        setClientWorkspaceCount(0)
        setClientWorkspaceId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the board")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const clients = workspace?.clients ?? []
  const visible = useMemo(() => {
    const boardJobs = inquiries.filter((job) => job.workspaceId)
    let next = boardJobs
    if (isFreelancer && filter === "none") next = next.filter((job) => job.clientId === me?.id)
    else if (isFreelancer && filter !== "all") next = next.filter((job) => job.clientId === filter)
    if (projectFilter === "none") next = next.filter((job) => !job.projectId)
    else if (projectFilter !== "all") next = next.filter((job) => job.projectId === projectFilter)
    return next
  }, [filter, inquiries, isFreelancer, me?.id, projectFilter])

  function setProjectFilter(id: string) {
    const next = new URLSearchParams(searchParams)
    if (id === "all") next.delete("project")
    else next.set("project", id)
    setSearchParams(next, { replace: true })
  }

  async function moveCard(id: string, columnId: BoardColumnId) {
    const job = inquiries.find((item) => item.id === id)
    if (!job || !job.workspaceId) return
    const nextStatus = writeStatusForColumn(columnId)
    if (columnForStatus(job.status) === columnId) return

    snapshotRef.current = inquiries
    setInquiries((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)))
    try {
      const updated = await updateInquiryStatus(id, nextStatus)
      setInquiries((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      if (snapshotRef.current) setInquiries(snapshotRef.current)
      setError(err instanceof Error ? err.message : "Could not move that card")
    }
  }

  if (loading) {
    return (
      <PageShell wide eyebrow="Workspace" title="Board" subtitle="Work you share with your clients">
        <Box display="flex" alignItems="center" gap={2} py={6}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading board…</Text>
        </Box>
      </PageShell>
    )
  }

  if (!isFreelancer && clientWorkspaceCount === 0) {
    return (
      <PageShell wide eyebrow="Workspace" title="Board" subtitle="Work you share with your partner">
        <StartWorkspaceEmptyState />
      </PageShell>
    )
  }

  return (
    <PageShell
      wide
      eyebrow="Workspace"
      title="Board"
      subtitle="Same columns for you and your client. Drag a card to update it."
      action={
        isFreelancer ? (
          <Box display="flex" gap={2}>
            <Link to="/app/projects" style={{ textDecoration: "none" }}>
              <AppButton
                size="sm" h="34px" px={4}
                bg="rgba(255,255,255,0.12)" color="white" fontWeight="600" fontSize="0.8125rem"
                borderRadius="8px" border="1px solid rgba(255,255,255,0.25)"
                _hover={{ bg: "rgba(255,255,255,0.2)" }}
              >
                <LuFolderKanban size={14} /> Projects
              </AppButton>
            </Link>
            <Link to="/app/clients" style={{ textDecoration: "none" }}>
              <AppButton
                size="sm" h="34px" px={4}
                bg="rgba(255,255,255,0.12)" color="white" fontWeight="600" fontSize="0.8125rem"
                borderRadius="8px" border="1px solid rgba(255,255,255,0.25)"
                _hover={{ bg: "rgba(255,255,255,0.2)" }}
              >
                <LuUsers size={14} /> Invite
              </AppButton>
            </Link>
          </Box>
        ) : undefined
      }
    >
      {error && (
        <Box mb={3} bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px" px={4} py={3}>
          <Text fontSize="0.8125rem" color="#991B1B">{error}</Text>
        </Box>
      )}

      {isFreelancer && (
        <Box display="flex" gap={2} overflowX="auto" pb={3} mb={1}>
          <AppFilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </AppFilterChip>
          {clients.map((client) => (
            <AppFilterChip key={client.id} active={filter === client.id} onClick={() => setFilter(client.id)}>
              {clientDisplayName(client)}
            </AppFilterChip>
          ))}
          <AppFilterChip active={filter === "none"} onClick={() => setFilter("none")}>
            No client
          </AppFilterChip>
        </Box>
      )}

      {projects.length > 0 && (
        <Box display="flex" gap={2} overflowX="auto" pb={3} mb={1}>
          <AppFilterChip active={projectFilter === "all"} onClick={() => setProjectFilter("all")}>
            All projects
          </AppFilterChip>
          {projects.map((project) => (
            <AppFilterChip key={project.id} active={projectFilter === project.id} onClick={() => setProjectFilter(project.id)}>
              {project.name}
            </AppFilterChip>
          ))}
          <AppFilterChip active={projectFilter === "none"} onClick={() => setProjectFilter("none")}>
            No project
          </AppFilterChip>
        </Box>
      )}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <Box
        display="flex"
        gap={3}
        overflowX="auto"
        pb={2}
        mx={{ base: -3, md: 0 }}
        px={{ base: 3, md: 0 }}
        alignItems="stretch"
        minH={{ base: "calc(100vh - 280px)", lg: "calc(100vh - 240px)" }}
      >
        {BOARD_COLUMNS.map((column) => (
          <BoardColumnView
            key={column.id}
            column={column}
            cards={visible.filter((job) => columnForStatus(job.status) === column.id)}
            showClient={Boolean(isFreelancer && filter === "all")}
            myId={me?.id ?? ""}
            canQuickAdd={column.id === "requested"}
            onQuickAdd={async (title) => {
              const created = await createInquiry({
                title,
                quickAdd: true,
                clientId: isFreelancer
                  ? (filter !== "all" && filter !== "none" ? filter : me?.id)
                  : undefined,
                workspaceId: !isFreelancer ? clientWorkspaceId ?? undefined : undefined,
                projectId: projectFilter !== "all" && projectFilter !== "none" ? projectFilter : undefined,
              })
              setInquiries((prev) => [created, ...prev])
              navigate(`/app/jobs/${created.id}`)
            }}
          />
        ))}
      </Box>
      </DndContext>
    </PageShell>
  )
}

function BoardColumnView({
  column,
  cards,
  showClient,
  myId,
  canQuickAdd,
  onQuickAdd,
}: {
  column: BoardColumn
  cards: Inquiry[]
  showClient: boolean
  myId: string
  canQuickAdd: boolean
  onQuickAdd: (title: string) => Promise<void>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  return (
    <Box
      ref={setNodeRef}
      flex="1 0 240px"
      maxW={{ lg: "none" }}
      minW="240px"
      bg={isOver ? "#F3FBF7" : APP_BG_SUBTLE}
      border={`1px solid ${isOver ? APP_ACCENT : APP_BORDER}`}
      borderRadius="14px"
      display="flex"
      flexDir="column"
      minH="360px"
    >
      <Box px={3.5} pt={3} pb={2} display="flex" alignItems="baseline" justifyContent="space-between" gap={2}>
        <Box>
          <Text fontSize="0.8125rem" fontWeight="700" color={APP_INK}>{column.label}</Text>
          <Text fontSize="0.6875rem" color={APP_LABEL}>{column.hint}</Text>
        </Box>
        <Text fontSize="0.75rem" fontWeight="600" color={APP_MUTED}>{cards.length}</Text>
      </Box>

      <Box flex="1" px={2} pb={2} display="flex" flexDir="column" gap={2}>
        {cards.map((job) => (
          <BoardCard key={job.id} job={job} showClient={showClient} myId={myId} />
        ))}
        {cards.length === 0 && (
          <Text px={2} py={6} fontSize="0.8125rem" color={APP_MUTED}>Nothing here yet.</Text>
        )}
        {canQuickAdd && <QuickAdd onAdd={onQuickAdd} />}
      </Box>
    </Box>
  )
}

function BoardCard({
  job,
  showClient,
  myId,
}: {
  job: Inquiry
  showClient: boolean
  myId: string
}) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    disabled: !job.workspaceId,
  })
  const clientName = job.clientId === myId ? "No client" : clientDisplayName(job.client)
  const urgency = URGENCY_TONE[job.urgency]
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => navigate(`/app/jobs/${job.id}`)}
      style={style}
      opacity={isDragging ? 0.45 : 1}
      bg={APP_SURFACE}
      border={`1px solid ${APP_BORDER}`}
      borderRadius="10px"
      p="12px"
      cursor={job.workspaceId ? "grab" : "pointer"}
      boxShadow="0 1px 2px rgba(14,27,23,0.04)"
    >
      <Text fontSize="0.875rem" fontWeight="600" color={APP_INK} lineHeight="1.35">
        {job.title}
      </Text>
      {(showClient || urgency || job.project?.name) && (
        <Box mt={2} display="flex" alignItems="center" justifyContent="space-between" gap={2}>
          <Text fontSize="0.6875rem" color={APP_MUTED} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {[showClient ? clientName : null, job.project?.name].filter(Boolean).join(" · ")}
          </Text>
          {urgency && (
            <Text fontSize="0.6875rem" fontWeight="600" color={urgency.color} flexShrink={0}>
              {urgency.label}
            </Text>
          )}
        </Box>
      )}
    </Box>
  )
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const next = title.trim()
    if (next.length < 3) {
      setError("Give it a short title (3+ characters)")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onAdd(next)
      setTitle("")
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that card")
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px",
          borderRadius: 8,
          color: APP_MUTED,
          fontSize: "0.8125rem",
          fontWeight: 600,
          cursor: "pointer",
          background: "transparent",
          border: "none",
          fontFamily: "inherit",
        }}
      >
        <LuPlus size={14} /> Add
      </button>
    )
  }

  return (
    <Box mt="auto" bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="10px" p={2}>
      <input
        autoFocus
        value={title}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault()
            void submit()
          }
          if (e.key === "Escape") {
            setOpen(false)
            setError(null)
          }
        }}
        placeholder="What needs doing?"
        style={{
          padding: "6px 8px",
          width: "100%",
          fontSize: "0.8125rem",
          border: "none",
          outline: "none",
          background: "transparent",
          color: APP_INK,
          fontFamily: "inherit",
        }}
      />
      {error && <Text fontSize="0.6875rem" color="#B91C1C" px={2} pb={1}>{error}</Text>}
      <Box display="flex" gap={2} px={1} pb={1} pt={1}>
        <AppButton size="sm" loading={busy} onClick={() => void submit()}>
          Add
        </AppButton>
        <AppButton size="sm" variant="ghost" onClick={() => { setOpen(false); setError(null) }}>
          Cancel
        </AppButton>
      </Box>
    </Box>
  )
}
