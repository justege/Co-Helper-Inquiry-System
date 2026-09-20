import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Box, Text } from "@chakra-ui/react"
import { LuGripVertical, LuLock } from "react-icons/lu"
import {
  APP_ACCENT,
  APP_AMBER,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_INK,
  APP_MUTED,
  APP_SURFACE,
} from "@/components/ui/appUi"
import { formatHours } from "@/lib/hours"
import { peopleOnTodo } from "@/lib/people"
import { todoColor } from "@/lib/todoStyle"
import { reorderTodos, type TodoStatus, type WorkTodo } from "@/api/work"
import type { ProjectMilestone } from "@/api/workspace"
import { useTodoCard } from "./TodoCardContext"
import { AddTodo, CardCounts } from "./WorkPanels"
import { AvatarStack, DueChip } from "./todoUi"

const BOARD_STATUSES: TodoStatus[] = [
  "backlog",
  "in_progress",
  "waiting_on_client",
  "done",
  "invoiced",
]

type Columns = Record<TodoStatus, WorkTodo[]>

const ACTIVE_LANE: { id: TodoStatus; label: string; hint: string }[] = [
  { id: "backlog", label: "To do", hint: "Queued work" },
  { id: "in_progress", label: "Now", hint: "One at a time" },
  { id: "waiting_on_client", label: "Waiting", hint: "On the client" },
]

const ARCHIVE_LANE: { id: TodoStatus; label: string; hint: string }[] = [
  { id: "done", label: "Unpaid", hint: "Done, not invoiced" },
  { id: "invoiced", label: "Paid", hint: "Invoiced" },
]

function emptyColumns(): Columns {
  return {
    backlog: [],
    in_progress: [],
    waiting_on_client: [],
    done: [],
    invoiced: [],
  }
}

function groupTodos(todos: WorkTodo[]): Columns {
  const next = emptyColumns()
  const sorted = todos.slice().sort((a, b) => {
    const d = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    if (d !== 0) return d
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
  for (const todo of sorted) {
    const status = BOARD_STATUSES.includes(todo.status) ? todo.status : "backlog"
    next[status].push(todo)
  }
  return next
}

function flatten(columns: Columns) {
  return BOARD_STATUSES.flatMap((status) =>
    columns[status].map((todo, index) => ({
      id: todo.id,
      status,
      sortOrder: index,
    }))
  )
}

function findContainer(id: string, columns: Columns): TodoStatus | null {
  if ((BOARD_STATUSES as string[]).includes(id)) return id as TodoStatus
  for (const status of BOARD_STATUSES) {
    if (columns[status].some((todo) => todo.id === id)) return status
  }
  return null
}

function canDrop(
  from: TodoStatus,
  to: TodoStatus,
  { canWork, canSetNow }: { canWork: boolean; canSetNow: boolean }
) {
  if (!canWork) return false
  if (from === "invoiced" && to !== "invoiced") return false
  if (to === "invoiced" && from !== "invoiced") return false
  if (to === "in_progress" && !canSetNow) return false
  return true
}

function hoursIn(list: WorkTodo[]) {
  return list.reduce((sum, todo) => sum + (todo.loggedHours || 0), 0)
}

export function WorkBoard({
  projectId,
  todos,
  milestones = [],
  currentMilestoneId = null,
  canWork,
  canSetNow,
  onChanged,
}: {
  projectId: string
  todos: WorkTodo[]
  milestones?: ProjectMilestone[]
  currentMilestoneId?: string | null
  canWork: boolean
  canSetNow: boolean
  onChanged: () => void
}) {
  const [filter, setFilter] = useState<string>("all")
  const visibleTodos = useMemo(() => {
    if (filter === "all") return todos
    return todos.filter((todo) => todo.milestoneId === filter)
  }, [todos, filter])
  const [columns, setColumns] = useState<Columns>(() => groupTodos(visibleTodos))
  const [activeId, setActiveId] = useState<string | null>(null)
  const originRef = useRef<Columns>(columns)
  const columnsRef = useRef<Columns>(columns)
  const suppressClick = useRef(false)
  const { openTodo } = useTodoCard()
  const milestoneName = useMemo(() => {
    const map = new Map(milestones.map((milestone) => [milestone.id, milestone.title]))
    return (id: string | null | undefined) => (id ? map.get(id) ?? null : null)
  }, [milestones])

  function putColumns(next: Columns | ((prev: Columns) => Columns)) {
    setColumns((prev) => {
      const value = typeof next === "function" ? next(prev) : next
      columnsRef.current = value
      return value
    })
  }

  useEffect(() => {
    const next = groupTodos(visibleTodos)
    columnsRef.current = next
    setColumns(next)
  }, [visibleTodos])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  )

  const activeTodo = useMemo(() => {
    if (!activeId) return null
    return BOARD_STATUSES.flatMap((status) => columns[status]).find((todo) => todo.id === activeId) ?? null
  }, [activeId, columns])

  function handleDragStart(event: DragStartEvent) {
    originRef.current = columnsRef.current
    setActiveId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    putColumns((prev) => {
      const from = findContainer(String(active.id), prev)
      const to = findContainer(String(over.id), prev)
      if (!from || !to || from === to) return prev
      if (!canDrop(from, to, { canWork, canSetNow })) return prev
      const fromList = prev[from]
      const toList = prev[to]
      const fromIndex = fromList.findIndex((todo) => todo.id === active.id)
      if (fromIndex < 0) return prev
      const moving = { ...fromList[fromIndex], status: to }
      const overIndex = toList.findIndex((todo) => todo.id === over.id)
      const insertAt = overIndex >= 0 ? overIndex : toList.length
      const nextTo = [...toList.slice(0, insertAt), moving, ...toList.slice(insertAt)]
      if (to === "in_progress") {
        const extras = nextTo
          .filter((todo) => todo.id !== moving.id)
          .map((todo) => ({ ...todo, status: "backlog" as const }))
        const withoutMoving = {
          ...prev,
          [from]: fromList.filter((todo) => todo.id !== moving.id),
          in_progress: [moving],
        }
        if (!extras.length) return withoutMoving
        return {
          ...withoutMoving,
          backlog: [
            ...withoutMoving.backlog.filter((todo) => !extras.some((extra) => extra.id === todo.id)),
            ...extras,
          ],
        }
      }
      return {
        ...prev,
        [from]: fromList.filter((todo) => todo.id !== moving.id),
        [to]: nextTo,
      }
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over, delta } = event
    if (Math.abs(delta.x) > 8 || Math.abs(delta.y) > 8) suppressClick.current = true
    const current = columnsRef.current
    if (!over) {
      putColumns(originRef.current)
      return
    }
    const from = findContainer(String(active.id), originRef.current)
    const to = findContainer(String(over.id), current)
    if (!from || !to || !canDrop(from, to, { canWork, canSetNow })) {
      putColumns(originRef.current)
      return
    }

    let nextColumns = current
    const list = current[to]
    const oldIndex = list.findIndex((todo) => todo.id === active.id)
    const overIndex = list.findIndex((todo) => todo.id === over.id)
    if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
      nextColumns = { ...current, [to]: arrayMove(list, oldIndex, overIndex) }
      putColumns(nextColumns)
    }

    const next = flatten(nextColumns)
    const prev = flatten(originRef.current)
    const changed = next.some((item) => {
      const before = prev.find((row) => row.id === item.id)
      return !before || before.status !== item.status || before.sortOrder !== item.sortOrder
    })
    if (!changed) return
    try {
      await reorderTodos(projectId, next)
      onChanged()
    } catch {
      putColumns(originRef.current)
      onChanged()
    }
  }

  function openCard(id: string) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    openTodo(id)
  }

  const board = (
    <Box>
      {milestones.length > 0 && (
        <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All to-dos</FilterChip>
          {currentMilestoneId && (
            <FilterChip active={filter === currentMilestoneId} onClick={() => setFilter(currentMilestoneId)}>
              Current · {milestoneName(currentMilestoneId) || "milestone"}
            </FilterChip>
          )}
          {milestones.filter((milestone) => milestone.id !== currentMilestoneId).map((milestone) => (
            <FilterChip key={milestone.id} active={filter === milestone.id} onClick={() => setFilter(milestone.id)}>
              {milestone.title}
            </FilterChip>
          ))}
        </Box>
      )}
      <Lane
        title="Active"
        columns={ACTIVE_LANE}
        items={columns}
        canWork={canWork}
        onOpen={openCard}
        milestoneName={milestoneName}
        footer={
          canWork ? (
            <Box px={1} pt={1}>
              <AddTodo
                projectId={projectId}
                milestoneId={filter !== "all" ? filter : currentMilestoneId}
                onCreated={onChanged}
              />
            </Box>
          ) : null
        }
      />
      <Lane
        title="Archive"
        columns={ARCHIVE_LANE}
        items={columns}
        canWork={canWork}
        onOpen={openCard}
        milestoneName={milestoneName}
        archive
      />
    </Box>
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={canWork ? handleDragStart : undefined}
      onDragOver={canWork ? handleDragOver : undefined}
      onDragEnd={canWork ? (event) => void handleDragEnd(event) : undefined}
      onDragCancel={canWork ? () => {
        setActiveId(null)
        putColumns(originRef.current)
      } : undefined}
    >
      {board}
      <DragOverlay>
        {activeTodo ? (
          <TodoCardFace todo={activeTodo} dragging milestoneName={milestoneName(activeTodo.milestoneId)} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function Lane({
  title,
  columns,
  items,
  canWork,
  onOpen,
  archive = false,
  footer,
  milestoneName,
}: {
  title: string
  columns: { id: TodoStatus; label: string; hint: string }[]
  items: Columns
  canWork: boolean
  onOpen: (id: string) => void
  archive?: boolean
  footer?: ReactNode
  milestoneName: (id: string | null | undefined) => string | null
}) {
  return (
    <Box
      bg={archive ? APP_BG_SUBTLE : APP_SURFACE}
      border={`1px solid ${APP_BORDER}`}
      borderRadius="14px"
      p={4}
      mb={archive ? 0 : 4}
    >
      <Text fontSize="0.7rem" fontWeight="700" letterSpacing="0.08em" textTransform="uppercase" color={APP_MUTED} mb={3}>
        {title}
      </Text>
      <Box
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: `repeat(${columns.length}, minmax(0, 1fr))` }}
        gap={3}
      >
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            todos={items[column.id]}
            canWork={canWork}
            onOpen={onOpen}
            archive={archive}
            milestoneName={milestoneName}
          />
        ))}
      </Box>
      {footer}
    </Box>
  )
}

function BoardColumn({
  column,
  todos,
  canWork,
  onOpen,
  archive,
  milestoneName,
}: {
  column: { id: TodoStatus; label: string; hint: string }
  todos: WorkTodo[]
  canWork: boolean
  onOpen: (id: string) => void
  archive: boolean
  milestoneName: (id: string | null | undefined) => string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled: !canWork })
  const logged = hoursIn(todos)
  const accent =
    column.id === "in_progress" ? APP_ACCENT : column.id === "waiting_on_client" ? APP_AMBER : APP_MUTED

  return (
    <Box
      ref={setNodeRef}
      bg={isOver ? "rgba(15,110,86,0.06)" : archive ? APP_SURFACE : APP_BG_SUBTLE}
      border={`1px solid ${isOver ? APP_ACCENT : APP_BORDER}`}
      borderRadius="12px"
      p={3}
      minH="160px"
    >
      <Box display="flex" justifyContent="space-between" gap={2} mb={1}>
        <Text fontWeight="700" color={accent} fontSize="0.8125rem">{column.label}</Text>
        <Text fontSize="0.75rem" color={APP_MUTED}>{todos.length}</Text>
      </Box>
      <Text fontSize="0.7rem" color={APP_MUTED} mb={3}>
        {column.hint}
        {logged > 0 ? ` · ${formatHours(logged)}` : ""}
      </Text>
      <SortableContext items={todos.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
        {todos.map((todo) => (
          <SortableTodoCard
            key={todo.id}
            todo={todo}
            canDrag={canWork}
            onOpen={() => onOpen(todo.id)}
            milestoneName={milestoneName(todo.milestoneId)}
          />
        ))}
      </SortableContext>
      {todos.length === 0 && (
        <Text fontSize="0.75rem" color={APP_MUTED} py={4}>
          {column.id === "invoiced"
            ? "Paid work lands here after an invoice."
            : column.id === "done"
              ? "Drag finished work here until you invoice."
              : "Drop a to-do here."}
        </Text>
      )}
    </Box>
  )
}

function SortableTodoCard({
  todo,
  canDrag,
  onOpen,
  milestoneName,
}: {
  todo: WorkTodo
  canDrag: boolean
  onOpen: () => void
  milestoneName: string | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !canDrag,
  })
  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      mb={2}
      {...attributes}
      {...listeners}
    >
      <TodoCardFace todo={todo} onOpen={onOpen} canDrag={canDrag} milestoneName={milestoneName} />
    </Box>
  )
}

function TodoCardFace({
  todo,
  onOpen,
  canDrag,
  dragging = false,
  milestoneName,
}: {
  todo: WorkTodo
  onOpen?: () => void
  canDrag?: boolean
  dragging?: boolean
  milestoneName?: string | null
}) {
  const locked = todo.status === "invoiced"
  const people = peopleOnTodo(todo)
  const done = todo.itemDoneCount ?? 0
  const total = todo.itemCount ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <Box
      bg="white"
      border={`1px solid ${APP_BORDER}`}
      borderRadius="12px"
      overflow="hidden"
      boxShadow={dragging ? "0 10px 28px rgba(14,27,23,0.16)" : "0 1px 2px rgba(14,27,23,0.04)"}
      cursor={canDrag ? (dragging ? "grabbing" : "grab") : "pointer"}
      onClick={onOpen}
    >
      <Box h="4px" bg={todoColor(todo.color)} />
      <Box p={3} display="flex" gap={2} alignItems="flex-start">
        {canDrag && (
          <Box color={APP_MUTED} mt="2px" flexShrink={0}>
            {locked ? <LuLock size={14} /> : <LuGripVertical size={14} />}
          </Box>
        )}
        <Box minW={0} flex="1">
          {milestoneName && (
            <Text fontSize="0.65rem" fontWeight="700" color={APP_ACCENT} letterSpacing="0.04em" textTransform="uppercase" mb={1}>
              {milestoneName}
            </Text>
          )}
          <Text fontWeight="700" fontSize="0.875rem" color={locked ? APP_MUTED : APP_INK} lineHeight="1.35">
            {todo.title}
          </Text>
          {(todo.tags?.length || todo.priority === "high") && (
            <Box display="flex" gap={1} flexWrap="wrap" mt={1.5}>
              {todo.priority === "high" && (
                <Box h="18px" px={1.5} borderRadius="4px" bg="#FEF2F2" color="#B91C1C" fontSize="0.65rem" fontWeight="800">HIGH</Box>
              )}
              {(todo.tags || []).slice(0, 3).map((tag) => (
                <Box key={tag} h="18px" px={1.5} borderRadius="4px" bg="#EEF2FF" color="#3730A3" fontSize="0.65rem" fontWeight="700">{tag}</Box>
              ))}
            </Box>
          )}
          {total > 0 && (
            <Box mt={2}>
              <Box h="4px" bg="#EEF2FF" borderRadius="99px" overflow="hidden">
                <Box h="full" w={`${pct}%`} bg="#4F7CFF" />
              </Box>
            </Box>
          )}
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} mt={2}>
            <Box display="flex" alignItems="center" gap={2} minW={0}>
              <DueChip dueAt={todo.dueAt} status={todo.status} />
              <CardCounts todo={todo} />
            </Box>
            <AvatarStack people={people} size={20} max={3} />
          </Box>
          <Text fontSize="0.7rem" color={APP_MUTED} mt={1}>
            {formatHours(todo.loggedHours)}
            {todo.estimatedHours != null ? ` / ${formatHours(todo.estimatedHours)}` : ""}
            {locked ? " · paid" : todo.status === "done" ? " · unpaid" : ""}
          </Text>
        </Box>
      </Box>
    </Box>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Box
      as="button"
      h="28px"
      px={3}
      borderRadius="999px"
      fontSize="0.75rem"
      fontWeight="700"
      border={`1px solid ${active ? APP_ACCENT : APP_BORDER}`}
      bg={active ? "rgba(15,110,86,0.08)" : "white"}
      color={active ? APP_ACCENT : APP_MUTED}
      onClick={onClick}
    >
      {children}
    </Box>
  )
}
