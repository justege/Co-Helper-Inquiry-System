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
import { LuGripVertical, LuLayoutGrid, LuList, LuLock, LuSearch } from "react-icons/lu"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_INK,
  APP_LABEL,
  APP_MINT,
  APP_MOTION,
  APP_MUTED,
  APP_PAPER,
  APP_PEACH,
  APP_PEACH_INK,
  APP_SHADOW_CARD,
  APP_SURFACE,
  AppFilterChip,
} from "@/components/ui/appUi"
import { FormInput } from "@/components/ui/form-controls"
import { formatHours, TODO_STATUS_LABEL } from "@/lib/hours"
import { formatPeopleList, peopleOnTodo } from "@/lib/people"
import { todoColor } from "@/lib/todoStyle"
import { reorderTodos, type TodoStatus, type WorkTodo } from "@/api/work"
import type { ProjectMilestone } from "@/api/workspace"
import { useTodoCard } from "./TodoCardContext"
import { AddTodo, CardCounts } from "./WorkPanels"
import { AvatarStack, DueChip } from "./todoUi"
import { RADIUS_CARD, RADIUS_CONTROL } from "@/theme/tokens"

const BOARD_STATUSES: TodoStatus[] = [
  "backlog",
  "in_progress",
  "waiting_on_client",
  "done",
  "invoiced",
]

const ACTIVE_BOARD_STATUSES: TodoStatus[] = [
  "backlog",
  "in_progress",
  "waiting_on_client",
]

type Columns = Record<TodoStatus, WorkTodo[]>
type BoardLayout = "board" | "list"

const BOARD_COLUMNS: {
  id: TodoStatus
  label: string
  hint: string
}[] = [
  { id: "backlog", label: "To do", hint: "Queued" },
  { id: "in_progress", label: "Now", hint: "One at a time" },
  { id: "waiting_on_client", label: "Waiting", hint: "On client" },
]

const COLUMN_WIDTH = "292px"
const COLUMN_MAX_H = "calc(100vh - 300px)"

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
  return ACTIVE_BOARD_STATUSES.flatMap((status) =>
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

function columnTheme(id: TodoStatus) {
  if (id === "in_progress") {
    return { dot: APP_ACCENT, headerBg: APP_MINT, label: APP_ACCENT, countBg: "rgba(15,110,86,0.12)" }
  }
  if (id === "waiting_on_client") {
    return { dot: APP_PEACH_INK, headerBg: APP_PEACH, label: APP_PEACH_INK, countBg: "rgba(194,65,12,0.1)" }
  }
  return { dot: APP_LABEL, headerBg: APP_PAPER, label: APP_INK, countBg: "rgba(14,27,23,0.06)" }
}

export function WorkBoard({
  projectId,
  todos,
  milestones = [],
  currentMilestoneId = null,
  canWork,
  canSetNow,
  onChanged,
  onOpenFinance,
}: {
  projectId: string
  todos: WorkTodo[]
  milestones?: ProjectMilestone[]
  currentMilestoneId?: string | null
  canWork: boolean
  canSetNow: boolean
  onChanged: () => void
  onOpenFinance?: () => void
}) {
  const [layout, setLayout] = useState<BoardLayout>("board")
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [columns, setColumns] = useState<Columns>(() => emptyColumns())
  const [activeId, setActiveId] = useState<string | null>(null)
  const originRef = useRef<Columns>(columns)
  const columnsRef = useRef<Columns>(columns)
  const suppressClick = useRef(false)
  const { openTodo } = useTodoCard()

  const milestoneName = useMemo(() => {
    const map = new Map(milestones.map((milestone) => [milestone.id, milestone.title]))
    return (id: string | null | undefined) => (id ? map.get(id) ?? null : null)
  }, [milestones])

  const filteredTodos = useMemo(() => {
    let next = todos.filter((todo) => todo.status !== "done" && todo.status !== "invoiced")
    if (filter !== "all") next = next.filter((todo) => todo.milestoneId === filter)
    const q = search.trim().toLowerCase()
    if (q) {
      next = next.filter((todo) =>
        todo.title.toLowerCase().includes(q)
        || (todo.tags || []).some((tag) => tag.toLowerCase().includes(q))
        || (milestoneName(todo.milestoneId) || "").toLowerCase().includes(q)
      )
    }
    return next
  }, [todos, filter, search, milestoneName])

  const financeCount = useMemo(
    () => todos.filter((todo) => todo.status === "done" || todo.status === "invoiced").length,
    [todos]
  )

  function putColumns(next: Columns | ((prev: Columns) => Columns)) {
    setColumns((prev) => {
      const value = typeof next === "function" ? next(prev) : next
      columnsRef.current = value
      return value
    })
  }

  useEffect(() => {
    const next = groupTodos(filteredTodos)
    columnsRef.current = next
    setColumns(next)
  }, [filteredTodos])

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

  const toolbar = (
    <Box
      bg={APP_SURFACE}
      border={`1px solid ${APP_BORDER}`}
      borderRadius={RADIUS_CARD}
      boxShadow={APP_SHADOW_CARD}
      p={{ base: 3, md: 4 }}
      mb={4}
    >
      <Box display="flex" flexWrap="wrap" gap={3} alignItems="center" justifyContent="space-between">
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" flex="1" minW={0}>
          <Box position="relative" flex="1" minW={{ base: "100%", sm: "240px" }} maxW="340px">
            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color={APP_LABEL} pointerEvents="none">
              <LuSearch size={15} />
            </Box>
            <FormInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search to-dos…"
              pl={9}
              h="38px"
              fontSize="0.8125rem"
              bg={APP_PAPER}
              borderColor={APP_BORDER}
            />
          </Box>
          <SegmentedControl
            value={layout}
            onChange={setLayout}
            options={[
              { value: "board" as const, label: "Board", icon: <LuLayoutGrid size={14} /> },
              { value: "list" as const, label: "List", icon: <LuList size={14} /> },
            ]}
          />
        </Box>
        <Box display="flex" gap={3} alignItems="center" flexShrink={0}>
          {financeCount > 0 && onOpenFinance ? (
            <Box
              as="button"
              type="button"
              fontSize="0.75rem"
              fontWeight="600"
              color={APP_ACCENT}
              onClick={onOpenFinance}
              _hover={{ textDecoration: "underline" }}
            >
              {financeCount} finished → Finance
            </Box>
          ) : null}
          <Text fontSize="0.75rem" color={APP_LABEL} fontWeight="500">
            {filteredTodos.length} active
          </Text>
        </Box>
      </Box>
      {milestones.length > 0 && (
        <Box display="flex" gap={2} flexWrap="wrap" mt={3} pt={3} borderTop={`1px solid ${APP_BORDER}`}>
          <AppFilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</AppFilterChip>
          {currentMilestoneId && (
            <AppFilterChip active={filter === currentMilestoneId} onClick={() => setFilter(currentMilestoneId)}>
              Current · {milestoneName(currentMilestoneId) || "milestone"}
            </AppFilterChip>
          )}
          {milestones.filter((milestone) => milestone.id !== currentMilestoneId).map((milestone) => (
            <AppFilterChip key={milestone.id} active={filter === milestone.id} onClick={() => setFilter(milestone.id)}>
              {milestone.title}
            </AppFilterChip>
          ))}
        </Box>
      )}
    </Box>
  )

  const boardBody = layout === "board" ? (
    <Box
      display="flex"
      gap={3}
      overflowX="auto"
      pb={1}
      alignItems="flex-start"
      css={{
        "&::-webkit-scrollbar": { height: "6px" },
        "&::-webkit-scrollbar-thumb": { background: "rgba(14,27,23,0.12)", borderRadius: "99px" },
      }}
    >
      {BOARD_COLUMNS.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          todos={columns[column.id]}
          canWork={canWork}
          onOpen={openCard}
          milestoneName={milestoneName}
          footer={
            column.id === "backlog" && canWork ? (
              <AddTodo
                projectId={projectId}
                milestoneId={filter !== "all" ? filter : currentMilestoneId}
                onCreated={onChanged}
              />
            ) : undefined
          }
        />
      ))}
    </Box>
  ) : (
    <Box
      bg={APP_SURFACE}
      border={`1px solid ${APP_BORDER}`}
      borderRadius={RADIUS_CARD}
      boxShadow={APP_SHADOW_CARD}
      overflow="hidden"
    >
      {BOARD_COLUMNS.map((column, index) => (
        <ListSection
          key={column.id}
          column={column}
          todos={columns[column.id]}
          canWork={canWork}
          onOpen={openCard}
          milestoneName={milestoneName}
          isLast={index === BOARD_COLUMNS.length - 1}
        />
      ))}
      {canWork && (
        <Box px={4} py={3} borderTop={`1px solid ${APP_BORDER}`} bg={APP_PAPER}>
          <AddTodo
            projectId={projectId}
            milestoneId={filter !== "all" ? filter : currentMilestoneId}
            onCreated={onChanged}
          />
        </Box>
      )}
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
      {toolbar}
      {boardBody}
      <DragOverlay>
        {activeTodo ? (
          <TodoCardFace todo={activeTodo} dragging milestoneName={milestoneName(activeTodo.milestoneId)} compact />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon: ReactNode }[]
}) {
  return (
    <Box display="flex" gap={0.5} p={0.5} bg={APP_PAPER} borderRadius={RADIUS_CONTROL} border={`1px solid ${APP_BORDER}`}>
      {options.map((option) => {
        const active = value === option.value
        return (
          <Box
            key={option.value}
            as="button"
            type="button"
            display="inline-flex"
            alignItems="center"
            gap={1.5}
            h="34px"
            px={3}
            borderRadius="8px"
            fontSize="0.75rem"
            fontWeight="600"
            color={active ? APP_INK : APP_MUTED}
            bg={active ? APP_SURFACE : "transparent"}
            boxShadow={active ? "0 1px 2px rgba(14,27,23,0.06)" : "none"}
            transition={`all ${APP_MOTION}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
          </Box>
        )
      })}
    </Box>
  )
}

function CountPill({ count, bg }: { count: number; bg: string }) {
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      minW="22px"
      h="22px"
      px={1.5}
      borderRadius="999px"
      bg={bg}
      fontSize="0.7rem"
      fontWeight="700"
      color={APP_INK}
    >
      {count}
    </Box>
  )
}

function KanbanColumn({
  column,
  todos,
  canWork,
  onOpen,
  milestoneName,
  footer,
}: {
  column: (typeof BOARD_COLUMNS)[number]
  todos: WorkTodo[]
  canWork: boolean
  onOpen: (id: string) => void
  milestoneName: (id: string | null | undefined) => string | null
  footer?: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled: !canWork })
  const logged = hoursIn(todos)
  const theme = columnTheme(column.id)

  return (
    <Box
      flex={`0 0 ${COLUMN_WIDTH}`}
      maxH={COLUMN_MAX_H}
      display="flex"
      flexDirection="column"
      bg={APP_PAPER}
      border={`1px solid ${isOver ? APP_ACCENT : APP_BORDER}`}
      borderRadius={RADIUS_CARD}
      overflow="hidden"
      transition={`border-color ${APP_MOTION}`}
    >
      <Box px={3.5} py={3} flexShrink={0} bg={theme.headerBg} borderBottom={`1px solid ${APP_BORDER}`}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={1}>
          <Box display="flex" alignItems="center" gap={2} minW={0}>
            <Box w="8px" h="8px" borderRadius="99px" bg={theme.dot} flexShrink={0} />
            <Text fontWeight="600" color={theme.label} fontSize="0.8125rem" letterSpacing="-0.01em">
              {column.label}
            </Text>
          </Box>
          <CountPill count={todos.length} bg={theme.countBg} />
        </Box>
        <Text fontSize="0.6875rem" color={APP_LABEL} fontWeight="500">
          {column.hint}
          {logged > 0 ? ` · ${formatHours(logged)}` : ""}
        </Text>
      </Box>
      <Box
        ref={setNodeRef}
        flex="1"
        overflowY="auto"
        px={2}
        py={2}
        bg={isOver ? "rgba(15,110,86,0.03)" : "transparent"}
        css={{
          "&::-webkit-scrollbar": { width: "5px" },
          "&::-webkit-scrollbar-thumb": { background: "rgba(14,27,23,0.1)", borderRadius: "99px" },
        }}
      >
        <SortableContext items={todos.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
          {todos.map((todo) => (
            <SortableTodoCard
              key={todo.id}
              todo={todo}
              canDrag={canWork}
              onOpen={() => onOpen(todo.id)}
              milestoneName={milestoneName(todo.milestoneId)}
              compact
            />
          ))}
        </SortableContext>
        {todos.length === 0 && (
          <Box py={8} px={2} textAlign="center">
            <Text fontSize="0.75rem" color={APP_LABEL} lineHeight="1.5">
              {column.id === "in_progress" ? "Drag work here when you start it" : "Drop a to-do here"}
            </Text>
          </Box>
        )}
      </Box>
      {footer ? (
        <Box px={2.5} py={2.5} flexShrink={0} borderTop={`1px solid ${APP_BORDER}`} bg={APP_SURFACE}>
          {footer}
        </Box>
      ) : null}
    </Box>
  )
}

function ListSection({
  column,
  todos,
  canWork,
  onOpen,
  milestoneName,
  isLast,
}: {
  column: (typeof BOARD_COLUMNS)[number]
  todos: WorkTodo[]
  canWork: boolean
  onOpen: (id: string) => void
  milestoneName: (id: string | null | undefined) => string | null
  isLast?: boolean
}) {
  const { setNodeRef } = useDroppable({ id: column.id, disabled: !canWork })
  const logged = hoursIn(todos)
  const theme = columnTheme(column.id)

  return (
    <Box ref={setNodeRef} borderBottom={isLast ? "none" : `1px solid ${APP_BORDER}`}>
      <Box
        px={4}
        py={3}
        bg={theme.headerBg}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        position="sticky"
        top={0}
        zIndex={1}
        borderBottom={`1px solid ${APP_BORDER}`}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box w="8px" h="8px" borderRadius="99px" bg={theme.dot} />
          <Text fontWeight="600" fontSize="0.8125rem" color={theme.label}>{column.label}</Text>
          <CountPill count={todos.length} bg={theme.countBg} />
        </Box>
        <Text fontSize="0.6875rem" color={APP_LABEL} fontWeight="500">
          {column.hint}
          {logged > 0 ? ` · ${formatHours(logged)}` : ""}
        </Text>
      </Box>
      <SortableContext items={todos.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
        {todos.length === 0 ? (
          <Text fontSize="0.75rem" color={APP_LABEL} px={4} py={4}>Nothing here yet.</Text>
        ) : (
          todos.map((todo, index) => (
            <SortableTodoRow
              key={todo.id}
              todo={todo}
              canDrag={canWork}
              onOpen={() => onOpen(todo.id)}
              milestoneName={milestoneName(todo.milestoneId)}
              isLast={index === todos.length - 1}
            />
          ))
        )}
      </SortableContext>
    </Box>
  )
}

function SortableTodoCard({
  todo,
  canDrag,
  onOpen,
  milestoneName,
  compact,
}: {
  todo: WorkTodo
  canDrag: boolean
  onOpen: () => void
  milestoneName: string | null
  compact?: boolean
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
        opacity: isDragging ? 0.35 : 1,
      }}
      mb={2}
      {...attributes}
      {...listeners}
    >
      <TodoCardFace todo={todo} onOpen={onOpen} canDrag={canDrag} milestoneName={milestoneName} compact={compact} />
    </Box>
  )
}

function SortableTodoRow({
  todo,
  canDrag,
  onOpen,
  milestoneName,
  isLast,
}: {
  todo: WorkTodo
  canDrag: boolean
  onOpen: () => void
  milestoneName: string | null
  isLast?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !canDrag,
  })
  const locked = todo.status === "invoiced"
  const people = peopleOnTodo(todo)

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      display="grid"
      gridTemplateColumns={{ base: "auto 1fr", md: "auto 1fr 120px 100px 80px 72px auto" }}
      gap={{ base: 2, md: 3 }}
      alignItems="center"
      px={4}
      py={3}
      borderBottom={isLast ? "none" : `1px solid ${APP_BORDER}`}
      bg={APP_SURFACE}
      transition={`background ${APP_MOTION}`}
      _hover={{ bg: APP_PAPER }}
      cursor="pointer"
      onClick={onOpen}
    >
      <Box
        color={APP_LABEL}
        flexShrink={0}
        cursor={canDrag ? "grab" : "default"}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        {locked ? <LuLock size={14} /> : <LuGripVertical size={14} />}
      </Box>
      <Box minW={0} display="flex" alignItems="center" gap={2}>
        <Box w="3px" alignSelf="stretch" borderRadius="99px" bg={todoColor(todo.color)} flexShrink={0} />
        <Box minW={0}>
          <Text fontWeight="600" fontSize="0.875rem" color={locked ? APP_MUTED : APP_INK} lineClamp={1} letterSpacing="-0.01em">
            {todo.title}
          </Text>
          {milestoneName && (
            <Text fontSize="0.65rem" fontWeight="600" color={APP_ACCENT} letterSpacing="0.04em" textTransform="uppercase" mt="2px">
              {milestoneName}
            </Text>
          )}
        </Box>
      </Box>
      <Text fontSize="0.75rem" color={APP_LABEL} display={{ base: "none", md: "block" }} lineClamp={1}>
        {formatPeopleList(people)}
      </Text>
      <Box display={{ base: "none", md: "block" }}>
        <DueChip dueAt={todo.dueAt} status={todo.status} />
      </Box>
      <Text fontSize="0.75rem" color={APP_LABEL} display={{ base: "none", md: "block" }} fontWeight="500">
        {formatHours(todo.loggedHours)}
        {todo.estimatedHours != null ? ` / ${formatHours(todo.estimatedHours)}` : ""}
      </Text>
      <Box display={{ base: "none", md: "flex" }} justifyContent="flex-end">
        <AvatarStack people={people} size={20} max={2} />
      </Box>
      <Text fontSize="0.7rem" color={APP_LABEL} display={{ base: "block", md: "none" }}>
        {TODO_STATUS_LABEL[todo.status] || todo.status}
      </Text>
    </Box>
  )
}

function TodoCardFace({
  todo,
  onOpen,
  canDrag,
  dragging = false,
  milestoneName,
  compact = false,
}: {
  todo: WorkTodo
  onOpen?: () => void
  canDrag?: boolean
  dragging?: boolean
  milestoneName?: string | null
  compact?: boolean
}) {
  const locked = todo.status === "invoiced"
  const people = peopleOnTodo(todo)

  if (compact) {
    return (
      <Box
        bg={APP_SURFACE}
        border={`1px solid ${dragging ? APP_ACCENT : APP_BORDER}`}
        borderRadius={RADIUS_CONTROL}
        overflow="hidden"
        boxShadow={dragging ? "0 12px 32px rgba(14,27,23,0.14)" : "0 1px 2px rgba(14,27,23,0.04)"}
        cursor={canDrag ? (dragging ? "grabbing" : "grab") : "pointer"}
        transition={`box-shadow ${APP_MOTION}, border-color ${APP_MOTION}`}
        _hover={canDrag && !dragging ? { boxShadow: "0 4px 12px rgba(14,27,23,0.08)", borderColor: "rgba(15,110,86,0.25)" } : undefined}
        onClick={onOpen}
      >
        <Box h="3px" bg={todoColor(todo.color)} />
        <Box px={3} py={2.5} display="flex" gap={2} alignItems="flex-start">
          {canDrag && (
            <Box color={APP_LABEL} mt="2px" flexShrink={0} opacity={0.7}>
              {locked ? <LuLock size={12} /> : <LuGripVertical size={12} />}
            </Box>
          )}
          <Box minW={0} flex="1">
            {milestoneName && (
              <Text fontSize="0.625rem" fontWeight="600" color={APP_ACCENT} letterSpacing="0.05em" textTransform="uppercase" mb={0.5} lineClamp={1}>
                {milestoneName}
              </Text>
            )}
            <Text fontWeight="600" fontSize="0.8125rem" color={locked ? APP_MUTED : APP_INK} lineHeight="1.4" lineClamp={2} letterSpacing="-0.01em">
              {todo.title}
            </Text>
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} mt={2}>
              <Box display="flex" alignItems="center" gap={2} minW={0}>
                <DueChip dueAt={todo.dueAt} status={todo.status} />
                <Text fontSize="0.6875rem" color={APP_LABEL} fontWeight="500" whiteSpace="nowrap">
                  {formatHours(todo.loggedHours)}
                  {todo.estimatedHours != null ? ` / ${formatHours(todo.estimatedHours)}` : ""}
                </Text>
              </Box>
              <AvatarStack people={people} size={18} max={2} />
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  const done = todo.itemDoneCount ?? 0
  const total = todo.itemCount ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <Box
      bg={APP_SURFACE}
      border={`1px solid ${APP_BORDER}`}
      borderRadius={RADIUS_CARD}
      overflow="hidden"
      boxShadow={dragging ? "0 12px 32px rgba(14,27,23,0.14)" : APP_SHADOW_CARD}
      cursor={canDrag ? (dragging ? "grabbing" : "grab") : "pointer"}
      onClick={onOpen}
    >
      <Box h="4px" bg={todoColor(todo.color)} />
      <Box p={3} display="flex" gap={2} alignItems="flex-start">
        {canDrag && (
          <Box color={APP_LABEL} mt="2px" flexShrink={0}>
            {locked ? <LuLock size={14} /> : <LuGripVertical size={14} />}
          </Box>
        )}
        <Box minW={0} flex="1">
          {milestoneName && (
            <Text fontSize="0.625rem" fontWeight="600" color={APP_ACCENT} letterSpacing="0.05em" textTransform="uppercase" mb={1}>
              {milestoneName}
            </Text>
          )}
          <Text fontWeight="600" fontSize="0.875rem" color={locked ? APP_MUTED : APP_INK} lineHeight="1.35" letterSpacing="-0.01em">
            {todo.title}
          </Text>
          {total > 0 && (
            <Box mt={2}>
              <Box h="3px" bg={APP_MINT} borderRadius="99px" overflow="hidden">
                <Box h="full" w={`${pct}%`} bg={APP_ACCENT} transition={`width ${APP_MOTION}`} />
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
          <Text fontSize="0.6875rem" color={APP_LABEL} fontWeight="500" mt={1.5}>
            {formatHours(todo.loggedHours)}
            {todo.estimatedHours != null ? ` / ${formatHours(todo.estimatedHours)}` : ""}
            {locked ? " · paid" : todo.status === "done" ? " · unpaid" : ""}
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
