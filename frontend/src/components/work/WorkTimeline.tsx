import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { Box, Text } from "@chakra-ui/react"
import {
  LuChevronLeft,
  LuChevronRight,
  LuMaximize2,
  LuPlus,
  LuSearch,
  LuTarget,
} from "react-icons/lu"
import { updateTodo, type WorkTodo } from "@/api/work"
import type { ProjectMilestone } from "@/api/workspace"
import {
  APP_BORDER,
  APP_INK,
  APP_MINT,
  APP_MUTED,
  APP_PAPER,
  APP_PEACH,
  APP_PEACH_INK,
  APP_SHADOW_CARD,
  APP_SURFACE,
} from "@/components/ui/appUi"
import { FormInput, FormNativeSelect } from "@/components/ui/form-controls"
import { RADIUS_CONTROL } from "@/theme/tokens"
import { formatDate, formatHours, TODO_STATUS_LABEL } from "@/lib/hours"
import { peopleOnTodo } from "@/lib/people"
import {
  addDaysIso,
  diffDays,
  isOverdue,
  isoToday,
  isoWeekLabel,
  startOfMonday,
  todoColor,
  todoStatusTone,
} from "@/lib/todoStyle"
import { AddTodoDialog } from "./WorkDialogs"
import { AvatarStack } from "./todoUi"

const BAR_H = 26
const ROW_H = 44
const HEAD_H = 58
const LABEL_W = 240
const HEADER_ROW_H = 30
const DEFAULT_SPAN = 3
const ZOOM_DAY_W = { compact: 32, normal: 44, wide: 60 } as const
type ZoomLevel = keyof typeof ZOOM_DAY_W

type Bar = {
  todo: WorkTodo
  start: string
  end: string
  startIdx: number
  span: number
  lane: number
}

type DragState = {
  todoId: string
  mode: "move" | "schedule" | "resize-start" | "resize-end"
  span: number
  origStartIdx: number
  origLane: number
  startX: number
  startY: number
  dx: number
  dy: number
  previewDayIdx?: number
  previewLane?: number
}

type VisualRow =
  | { kind: "milestone"; milestone: ProjectMilestone | null; label: string }
  | { kind: "lane"; lane: number; milestoneId: string | null }

function scheduledRange(todo: WorkTodo): { start: string; end: string } | null {
  const start = todo.startAt || todo.dueAt
  const end = todo.dueAt || todo.startAt
  if (!start || !end) return null
  return start <= end ? { start, end } : { start: end, end: start }
}

function assignUniqueLanes(items: Omit<Bar, "lane">[], overrides: Record<string, number> = {}): Bar[] {
  return items
    .slice()
    .sort((a, b) => {
      const la = overrides[a.todo.id]
      const lb = overrides[b.todo.id]
      if (la != null && lb != null && la !== lb) return la - lb
      if (la != null && lb == null) return -1
      if (lb != null && la == null) return 1
      return a.startIdx - b.startIdx || a.todo.title.localeCompare(b.todo.title)
    })
    .map((item, lane) => ({ ...item, lane }))
}

function barCoversCell(bar: Bar, lane: number, dayIdx: number) {
  return bar.lane === lane && dayIdx >= bar.startIdx && dayIdx < bar.startIdx + bar.span
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function TimelineLaneLabel({
  bar,
  indented,
  canEdit,
  onOpenTodo,
}: {
  bar: Bar | null
  indented?: boolean
  canEdit: boolean
  onOpenTodo: (id: string) => void
}) {
  if (!bar) {
    return (
      <Box
        h={`${ROW_H}px`}
        px={indented ? 5 : 3}
        display="flex"
        alignItems="center"
        borderBottom={`1px solid ${APP_BORDER}`}
      >
        {canEdit ? (
          <Text fontSize="0.75rem" color={APP_MUTED}>
            Click a day to add
          </Text>
        ) : null}
      </Box>
    )
  }

  const todo = bar.todo
  const tone = todoStatusTone(todo.status)
  return (
    <Box
      as="button"
      type="button"
      h={`${ROW_H}px`}
      w="100%"
      px={indented ? 5 : 3}
      display="flex"
      alignItems="center"
      gap={2}
      borderBottom={`1px solid ${APP_BORDER}`}
      textAlign="left"
      cursor="pointer"
      onClick={() => onOpenTodo(todo.id)}
      _hover={{ bg: "rgba(15,110,86,0.04)" }}
    >
      <Box w="8px" h="8px" borderRadius="999px" bg={todoColor(todo.color)} flexShrink={0} />
      <Box flex={1} minW={0}>
        <Text fontSize="0.8125rem" fontWeight="600" color={APP_INK} truncate>
          {todo.title}
        </Text>
        <Text fontSize="0.6875rem" color={tone.color} truncate>
          {TODO_STATUS_LABEL[todo.status] || todo.status}
        </Text>
      </Box>
    </Box>
  )
}

function ToolbarBtn({
  children,
  onClick,
  active,
  square,
}: {
  children: ReactNode
  onClick: () => void
  active?: boolean
  square?: boolean
}) {
  return (
    <Box
      as="button"
      type="button"
      h="34px"
      minW={square ? "34px" : undefined}
      px={square ? 0 : 3}
      borderRadius="8px"
      border={`1px solid ${active ? APP_MINT : APP_BORDER}`}
      bg={active ? "rgba(15,110,86,0.08)" : APP_SURFACE}
      color={active ? APP_INK : APP_MUTED}
      fontSize="0.8125rem"
      fontWeight="650"
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={1.5}
      onClick={onClick}
      _hover={{ borderColor: APP_MINT, color: APP_INK }}
    >
      {children}
    </Box>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
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
            h="30px"
            px={2.5}
            borderRadius="8px"
            fontSize="0.75rem"
            fontWeight="600"
            color={active ? APP_INK : APP_MUTED}
            bg={active ? APP_SURFACE : "transparent"}
            boxShadow={active ? "0 1px 2px rgba(14,27,23,0.06)" : "none"}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Box>
        )
      })}
    </Box>
  )
}

function weekdayLetter(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: "narrow" })
}

function todoProgress(todo: WorkTodo): number {
  if (todo.status === "done" || todo.status === "invoiced") return 1
  const est = todo.estimatedHours
  if (!est || est <= 0) return todo.loggedHours > 0 ? 0.35 : 0
  return clamp(todo.loggedHours / est, 0, 1)
}

function matchesStatusFilter(todo: WorkTodo, filter: "all" | "active" | "done") {
  if (filter === "all") return todo.status !== "invoiced"
  if (filter === "done") return todo.status === "done"
  return todo.status !== "done" && todo.status !== "invoiced"
}

export function WorkTimeline({
  todos,
  projectId,
  milestones,
  projectStartAt,
  projectDueAt,
  currentMilestoneId,
  canEdit,
  onOpen,
  onChanged,
}: {
  todos: WorkTodo[]
  projectId: string
  milestones: ProjectMilestone[]
  projectStartAt?: string | null
  projectDueAt?: string | null
  currentMilestoneId?: string | null
  canEdit: boolean
  onOpen: (id: string) => void
  onChanged: () => void
}) {
  const [weekShift, setWeekShift] = useState(0)
  const [rangeMode, setRangeMode] = useState<"auto" | "fit">("auto")
  const [zoom, setZoom] = useState<ZoomLevel>("normal")
  const [search, setSearch] = useState("")
  const [milestoneFilter, setMilestoneFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">("all")
  const [groupMilestones, setGroupMilestones] = useState(false)
  const [laneOverrides, setLaneOverrides] = useState<Record<string, number>>({})
  const [extraRows, setExtraRows] = useState(0)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addDates, setAddDates] = useState<{ startAt: string; dueAt: string; lane: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const movedRef = useRef(false)
  const today = isoToday()
  const dayW = ZOOM_DAY_W[zoom]

  const milestoneById = useMemo(
    () => Object.fromEntries(milestones.map((m) => [m.id, m])),
    [milestones]
  )

  const filteredTodos = useMemo(() => {
    const q = search.trim().toLowerCase()
    return todos.filter((todo) => {
      if (!matchesStatusFilter(todo, statusFilter)) return false
      if (milestoneFilter !== "all" && todo.milestoneId !== milestoneFilter) return false
      if (q && !todo.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [todos, search, milestoneFilter, statusFilter])

  const { days, packedBars, unscheduled, todayIdx, rangeLabel } = useMemo(() => {
    const dated = filteredTodos
      .map((todo) => ({ todo, range: scheduledRange(todo) }))
    const scheduled = dated.filter(
      (item): item is { todo: WorkTodo; range: { start: string; end: string } } => Boolean(item.range)
    )
    const unscheduled = dated.filter((item) => !item.range).map((item) => item.todo)

    const starts = scheduled.map((item) => item.range.start).sort()
    const ends = scheduled.map((item) => item.range.end).sort()
    const milestoneDates = milestones.map((m) => m.dueAt).filter(Boolean) as string[]
    const bounds = [
      ...starts,
      ...ends,
      ...milestoneDates,
      projectStartAt || "",
      projectDueAt || "",
      today,
    ].filter(Boolean)

    let from: string
    let to: string

    if (rangeMode === "fit" && bounds.length > 0) {
      const sorted = bounds.slice().sort()
      from = startOfMonday(sorted[0])
      to = addDaysIso(startOfMonday(sorted[sorted.length - 1]), 6)
      if (diffDays(from, to) < 13) to = addDaysIso(from, 13)
    } else {
      const focus = starts[0] || today
      const last = ends[ends.length - 1] || addDaysIso(focus, 13)
      from = startOfMonday(focus)
      to = addDaysIso(startOfMonday(last), 6)
      if (diffDays(from, to) < 20) to = addDaysIso(from, 20)
      if (diffDays(from, to) > 55) to = addDaysIso(from, 55)
      from = addDaysIso(from, weekShift * 7)
      to = addDaysIso(to, weekShift * 7)
    }

    const dayCount = diffDays(from, to) + 1
    const days = Array.from({ length: dayCount }, (_, i) => addDaysIso(from, i))
    const raw = scheduled
      .map(({ todo, range }) => {
        const startIdx = diffDays(from, range.start)
        const endIdx = diffDays(from, range.end)
        if (endIdx < 0 || startIdx > dayCount - 1) return null
        const clampedStart = Math.max(0, startIdx)
        const clampedEnd = Math.min(dayCount - 1, endIdx)
        return {
          todo,
          start: range.start,
          end: range.end,
          startIdx: clampedStart,
          span: Math.max(1, clampedEnd - clampedStart + 1),
        }
      })
      .filter((item): item is Omit<Bar, "lane"> => Boolean(item))

    const packedBars = assignUniqueLanes(raw)
    const rangeLabel =
      days.length > 0
        ? `${formatDate(days[0])} – ${formatDate(days[days.length - 1])}`
        : ""

    return { days, packedBars, unscheduled, todayIdx: days.indexOf(today), rangeLabel }
  }, [filteredTodos, weekShift, today, rangeMode, milestones, projectStartAt, projectDueAt])

  const bars = useMemo(
    () => assignUniqueLanes(packedBars, laneOverrides),
    [packedBars, laneOverrides]
  )

  const visualRows: VisualRow[] = useMemo(() => {
    if (!groupMilestones) {
      const occupied = bars.length
      const count = Math.max(occupied + extraRows, occupied > 0 ? occupied : 1)
      return Array.from({ length: count }, (_, lane) => ({
        kind: "lane" as const,
        lane,
        milestoneId: null,
      }))
    }

    const groups: { milestoneId: string | null; label: string; milestone: ProjectMilestone | null; items: Omit<Bar, "lane">[] }[] = []
    const byMilestone = new Map<string | null, Omit<Bar, "lane">[]>()

    for (const bar of packedBars) {
      const key = bar.todo.milestoneId ?? null
      if (!byMilestone.has(key)) byMilestone.set(key, [])
      byMilestone.get(key)!.push(bar)
    }

    const orderedIds = [
      ...milestones.map((m) => m.id),
      null,
    ].filter((id, index, arr) => arr.indexOf(id) === index)

    for (const milestoneId of orderedIds) {
      const items = byMilestone.get(milestoneId) || []
      if (!items.length && milestoneId !== null) continue
      const milestone = milestoneId ? milestoneById[milestoneId] ?? null : null
      groups.push({
        milestoneId,
        milestone,
        label: milestone?.title ?? "No milestone",
        items,
      })
    }

    const rows: VisualRow[] = []
    let laneBase = 0
    for (const group of groups) {
      rows.push({ kind: "milestone", milestone: group.milestone, label: group.label })
      const groupLaneCount = Math.max(group.items.length, 1)
      for (let i = 0; i < groupLaneCount; i++) {
        rows.push({ kind: "lane", lane: laneBase + i, milestoneId: group.milestoneId })
      }
      laneBase += groupLaneCount
    }
    for (let i = 0; i < extraRows; i++) {
      rows.push({ kind: "lane", lane: laneBase + i, milestoneId: null })
    }
    return rows
  }, [groupMilestones, bars, packedBars, milestones, milestoneById, extraRows])

  const groupedBars = useMemo(() => {
    if (!groupMilestones) return bars
    const remapped: Bar[] = []
    let laneBase = 0
    const byMilestone = new Map<string | null, Omit<Bar, "lane">[]>()
    for (const bar of packedBars) {
      const key = bar.todo.milestoneId ?? null
      if (!byMilestone.has(key)) byMilestone.set(key, [])
      byMilestone.get(key)!.push(bar)
    }
    const orderedIds = [...milestones.map((m) => m.id), null].filter(
      (id, index, arr) => arr.indexOf(id) === index
    )
    for (const milestoneId of orderedIds) {
      const items = byMilestone.get(milestoneId) || []
      if (!items.length && milestoneId !== null) continue
      const assigned = assignUniqueLanes(items, laneOverrides)
      for (const bar of assigned) {
        remapped.push({ ...bar, lane: laneBase + bar.lane })
      }
      laneBase += Math.max(assigned.length, 1)
    }
    return remapped
  }, [groupMilestones, bars, packedBars, milestones, laneOverrides])

  const displayBars = groupMilestones ? groupedBars : bars

  const rowLayout = useMemo(() => {
    const laneTop = new Map<number, number>()
    const laneHeightMap = new Map<number, number>()

    if (!groupMilestones) {
      const occupied = displayBars.reduce((max, bar) => Math.max(max, bar.lane + 1), 0)
      const rowCount = Math.max(occupied + extraRows, occupied > 0 ? occupied : 1)
      let y = HEAD_H
      for (let lane = 0; lane < rowCount; lane++) {
        laneTop.set(lane, y)
        laneHeightMap.set(lane, ROW_H)
        y += ROW_H
      }
      return {
        rowCount,
        rowTop: (lane: number) => laneTop.get(lane) ?? HEAD_H,
        rowHeight: (_lane: number) => ROW_H,
        totalHeight: y + 16,
      }
    }

    let y = HEAD_H
    for (const row of visualRows) {
      if (row.kind === "milestone") {
        y += HEADER_ROW_H
      } else {
        laneTop.set(row.lane, y)
        laneHeightMap.set(row.lane, ROW_H)
        y += ROW_H
      }
    }
    return {
      rowCount: visualRows.length,
      rowTop: (lane: number) => laneTop.get(lane) ?? HEAD_H,
      rowHeight: (_lane: number) => ROW_H,
      totalHeight: y + 16,
    }
  }, [groupMilestones, displayBars, extraRows, visualRows])

  const gridHeight = rowLayout.totalHeight

  const weeks: { key: string; label: string; span: number }[] = []
  for (const day of days) {
    const meta = isoWeekLabel(day)
    const key = `${meta.year}-W${meta.week}`
    const last = weeks[weeks.length - 1]
    if (last && last.key === key) last.span += 1
    else weeks.push({ key, label: `W${meta.week} ${meta.month}`, span: 1 })
  }

  const width = days.length * dayW
  const overdueCount = displayBars.filter((b) => isOverdue(b.todo.dueAt, b.todo.status)).length

  const pointerToCell = useCallback(
    (clientX: number, clientY: number) => {
      const grid = scrollRef.current
      if (!grid) return null
      const rect = grid.getBoundingClientRect()
      const x = clientX - rect.left + grid.scrollLeft
      const y = clientY - rect.top
      if (y < HEAD_H) return null
      const dayIdx = clamp(Math.floor(x / dayW), 0, days.length - 1)
      if (!groupMilestones) {
        for (let lane = 0; lane < rowLayout.rowCount; lane++) {
          const top = rowLayout.rowTop(lane)
          const h = rowLayout.rowHeight(lane)
          if (y >= top && y < top + h) return { dayIdx, lane }
        }
        return null
      }
      let cursor = HEAD_H
      for (const row of visualRows) {
        if (row.kind === "milestone") {
          cursor += HEADER_ROW_H
          continue
        }
        const h = rowLayout.rowHeight(row.lane)
        if (y >= cursor && y < cursor + h) {
          return { dayIdx, lane: row.lane }
        }
        cursor += h
      }
      return null
    },
    [dayW, days.length, groupMilestones, rowLayout, visualRows]
  )

  const applySchedule = useCallback(
    async (todoId: string, startIdx: number, span: number, lane: number) => {
      const startAt = days[startIdx]
      const dueAt = days[clamp(startIdx + span - 1, 0, days.length - 1)]
      setSavingId(todoId)
      try {
        await updateTodo(todoId, { startAt, dueAt })
        setLaneOverrides((prev) => ({ ...prev, [todoId]: lane }))
        onChanged()
      } finally {
        setSavingId(null)
      }
    },
    [days, onChanged]
  )

  const finishDrag = useCallback(
    async (clientX: number, clientY: number) => {
      if (!drag) return
      if (!movedRef.current) {
        if (drag.mode === "schedule") onOpen(drag.todoId)
        movedRef.current = false
        setDrag(null)
        return
      }
      const cell = pointerToCell(clientX, clientY)
      if (!cell && drag.mode !== "resize-end" && drag.mode !== "resize-start") {
        movedRef.current = false
        setDrag(null)
        return
      }
      if (drag.mode === "schedule" && cell) {
        const startIdx = clamp(cell.dayIdx, 0, days.length - drag.span)
        await applySchedule(drag.todoId, startIdx, drag.span, cell.lane)
      } else if (drag.mode === "move" && cell) {
        const dayDelta = Math.round(drag.dx / dayW)
        const laneDelta = groupMilestones ? 0 : Math.round(drag.dy / ROW_H)
        const startIdx = clamp(drag.origStartIdx + dayDelta, 0, days.length - drag.span)
        const lane = clamp(drag.origLane + laneDelta, 0, rowLayout.rowCount - 1)
        await applySchedule(drag.todoId, startIdx, drag.span, lane)
      } else if (drag.mode === "resize-start") {
        const dayDelta = Math.round(drag.dx / dayW)
        const newStart = clamp(drag.origStartIdx + dayDelta, 0, drag.origStartIdx + drag.span - 1)
        const newSpan = drag.span - (newStart - drag.origStartIdx)
        await applySchedule(drag.todoId, newStart, newSpan, drag.origLane)
      } else if (drag.mode === "resize-end") {
        const dayDelta = Math.round(drag.dx / dayW)
        const newSpan = clamp(drag.span + dayDelta, 1, days.length - drag.origStartIdx)
        await applySchedule(drag.todoId, drag.origStartIdx, newSpan, drag.origLane)
      }
      movedRef.current = false
      setDrag(null)
    },
    [applySchedule, dayW, days.length, drag, groupMilestones, onOpen, pointerToCell, rowLayout.rowCount]
  )

  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true
      const cell = pointerToCell(e.clientX, e.clientY)
      setDrag((prev) =>
        prev
          ? { ...prev, dx, dy, previewDayIdx: cell?.dayIdx, previewLane: cell?.lane }
          : null
      )
    }
    const onUp = (e: PointerEvent) => {
      void finishDrag(e.clientX, e.clientY)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [drag, finishDrag, pointerToCell])

  useEffect(() => {
    if (todayIdx < 0 || !scrollRef.current) return
    const el = scrollRef.current
    el.scrollLeft = Math.max(0, todayIdx * dayW - el.clientWidth / 2 + dayW / 2)
  }, [todayIdx, dayW, rangeMode])

  function startBarDrag(e: ReactPointerEvent, bar: Bar, mode: DragState["mode"]) {
    if (!canEdit || savingId) return
    e.preventDefault()
    e.stopPropagation()
    movedRef.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({
      todoId: bar.todo.id,
      mode,
      span: bar.span,
      origStartIdx: bar.startIdx,
      origLane: bar.lane,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
    })
  }

  function startUnscheduledDrag(e: ReactPointerEvent, todo: WorkTodo) {
    if (!canEdit || savingId) return
    e.preventDefault()
    movedRef.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({
      todoId: todo.id,
      mode: "schedule",
      span: DEFAULT_SPAN,
      origStartIdx: 0,
      origLane: 0,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
    })
  }

  function openAddAt(lane: number, dayIdx: number) {
    const startAt = days[dayIdx]
    const dueAt = days[clamp(dayIdx + DEFAULT_SPAN - 1, 0, days.length - 1)]
    setAddDates({ startAt, dueAt, lane })
    setAddOpen(true)
  }

  function handleCellClick(lane: number, dayIdx: number) {
    if (!canEdit || drag) return
    if (displayBars.some((bar) => barCoversCell(bar, lane, dayIdx))) return
    openAddAt(lane, dayIdx)
  }

  function handleBarClick(todoId: string) {
    if (movedRef.current) return
    onOpen(todoId)
  }

  function scrollToToday() {
    setRangeMode("auto")
    setWeekShift(0)
    if (todayIdx >= 0 && scrollRef.current) {
      const el = scrollRef.current
      el.scrollLeft = Math.max(0, todayIdx * dayW - el.clientWidth / 2 + dayW / 2)
    }
  }

  const dragPreview =
    drag && movedRef.current
      ? drag.mode === "resize-end"
        ? {
            startIdx: drag.origStartIdx,
            span: clamp(drag.span + Math.round(drag.dx / dayW), 1, days.length - drag.origStartIdx),
            lane: drag.origLane,
          }
        : drag.mode === "resize-start"
          ? (() => {
              const newStart = clamp(
                drag.origStartIdx + Math.round(drag.dx / dayW),
                0,
                drag.origStartIdx + drag.span - 1
              )
              return {
                startIdx: newStart,
                span: drag.span - (newStart - drag.origStartIdx),
                lane: drag.origLane,
              }
            })()
          : drag.mode === "schedule" && drag.previewDayIdx != null && drag.previewLane != null
            ? {
                startIdx: clamp(drag.previewDayIdx, 0, days.length - drag.span),
                lane: drag.previewLane,
                span: drag.span,
              }
            : {
                startIdx: clamp(
                  drag.origStartIdx + Math.round(drag.dx / dayW),
                  0,
                  days.length - drag.span
                ),
                lane: clamp(
                  drag.origLane + (groupMilestones ? 0 : Math.round(drag.dy / ROW_H)),
                  0,
                  rowLayout.rowCount - 1
                ),
                span: drag.span,
              }
      : null

  function barsInLane(lane: number) {
    return displayBars.filter((bar) => bar.lane === lane)
  }

  function renderLaneLabel(lane: number, indented = false) {
    const laneBars = barsInLane(lane)
    return (
      <TimelineLaneLabel
        key={`label-${lane}${indented ? "-g" : ""}`}
        bar={laneBars[0] ?? null}
        indented={indented}
        canEdit={canEdit}
        onOpenTodo={onOpen}
      />
    )
  }

  const milestoneMarkers = milestones.filter((m) => {
    if (!m.dueAt) return false
    const due = m.dueAt.slice(0, 10)
    return days.some((d) => d === due)
  })

  let projectWindow: { left: number; width: number } | null = null
  if (projectStartAt && projectDueAt && days[0]) {
    const startIdx = diffDays(days[0], projectStartAt.slice(0, 10))
    const endIdx = diffDays(days[0], projectDueAt.slice(0, 10))
    if (endIdx >= 0 && startIdx <= days.length - 1) {
      const left = clamp(startIdx, 0, days.length - 1) * dayW
      const right = clamp(endIdx, 0, days.length - 1) * dayW + dayW
      projectWindow = { left, width: right - left }
    }
  }

  function renderDayCell(lane: number, day: string, dayIdx: number, top: number, height: number) {
    const occupied = displayBars.some((bar) => barCoversCell(bar, lane, dayIdx))
    const isDropTarget =
      Boolean(dragPreview) &&
      dragPreview!.lane === lane &&
      dayIdx >= dragPreview!.startIdx &&
      dayIdx < dragPreview!.startIdx + dragPreview!.span
    const isWeekend = new Date(`${day}T12:00:00`).getDay() % 6 === 0
    return (
      <Box
        key={`cell-${lane}-${day}`}
        position="absolute"
        top={`${top}px`}
        left={`${dayIdx * dayW}px`}
        w={`${dayW}px`}
        h={`${height}px`}
        borderRight={`1px solid ${APP_BORDER}`}
        borderBottom={`1px solid ${APP_BORDER}`}
        bg={
          isDropTarget
            ? "rgba(15,110,86,0.12)"
            : isWeekend
              ? "rgba(15,110,86,0.03)"
              : "transparent"
        }
        cursor={canEdit && !occupied ? "cell" : "default"}
        onClick={() => handleCellClick(lane, dayIdx)}
        _hover={canEdit && !occupied ? { bg: "rgba(15,110,86,0.06)" } : undefined}
      />
    )
  }

  const gridCells = !groupMilestones
    ? Array.from({ length: rowLayout.rowCount }, (_, lane) =>
        days.map((day, dayIdx) =>
          renderDayCell(lane, day, dayIdx, rowLayout.rowTop(lane), rowLayout.rowHeight(lane))
        )
      )
    : visualRows.flatMap((row) => {
        if (row.kind === "milestone") return []
        const top = rowLayout.rowTop(row.lane)
        const height = rowLayout.rowHeight(row.lane)
        return days.map((day, dayIdx) => renderDayCell(row.lane, day, dayIdx, top, height))
      })

  return (
    <Box
      bg={APP_PAPER}
      border={`1px solid ${APP_BORDER}`}
      borderRadius="14px"
      overflow="hidden"
      boxShadow={APP_SHADOW_CARD}
    >
      {/* Toolbar */}
      <Box px={4} py={3} borderBottom={`1px solid ${APP_BORDER}`}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={3} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <ToolbarBtn onClick={scrollToToday}>
              <LuTarget size={14} /> Today
            </ToolbarBtn>
            <Box display="flex" alignItems="center" border={`1px solid ${APP_BORDER}`} borderRadius="8px" overflow="hidden" bg={APP_SURFACE}>
              <Box
                as="button"
                type="button"
                w="34px"
                h="34px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color={APP_MUTED}
                onClick={() => {
                  setRangeMode("auto")
                  setWeekShift((n) => n - 1)
                }}
                _hover={{ bg: APP_PAPER, color: APP_INK }}
              >
                <LuChevronLeft size={16} />
              </Box>
              <Text
                minW="168px"
                px={2}
                fontSize="0.8125rem"
                fontWeight="600"
                color={APP_INK}
                textAlign="center"
              >
                {rangeLabel}
              </Text>
              <Box
                as="button"
                type="button"
                w="34px"
                h="34px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color={APP_MUTED}
                onClick={() => {
                  setRangeMode("auto")
                  setWeekShift((n) => n + 1)
                }}
                _hover={{ bg: APP_PAPER, color: APP_INK }}
              >
                <LuChevronRight size={16} />
              </Box>
            </Box>
            <ToolbarBtn active={rangeMode === "fit"} onClick={() => setRangeMode("fit")}>
              <LuMaximize2 size={14} /> Fit
            </ToolbarBtn>
            {canEdit && (
              <ToolbarBtn onClick={() => setExtraRows((n) => n + 1)}>
                <LuPlus size={14} /> Add row
              </ToolbarBtn>
            )}
          </Box>
          <Text fontSize="0.75rem" color={APP_MUTED} fontWeight="600">
            {displayBars.length} scheduled
            {unscheduled.length ? ` · ${unscheduled.length} unscheduled` : ""}
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
          </Text>
        </Box>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mt={3}>
          <Box position="relative" w="220px">
            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color={APP_MUTED} pointerEvents="none">
              <LuSearch size={14} />
            </Box>
            <FormInput
              pl={8}
              h="34px"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Box>
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "done", label: "Done" },
            ]}
          />
          {milestones.length > 0 && (
            <FormNativeSelect
              h="34px"
              w="auto"
              minW="160px"
              value={milestoneFilter}
              onChange={(e) => setMilestoneFilter(e.target.value)}
              style={{ fontSize: "0.8125rem", fontWeight: 600 }}
            >
              <option value="all">All milestones</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </FormNativeSelect>
          )}
          {milestones.length > 0 && (
            <ToolbarBtn active={groupMilestones} onClick={() => setGroupMilestones((v) => !v)}>
              Group
            </ToolbarBtn>
          )}
          <Segmented
            value={zoom}
            onChange={setZoom}
            options={[
              { value: "compact", label: "Compact" },
              { value: "normal", label: "Comfort" },
              { value: "wide", label: "Wide" },
            ]}
          />
        </Box>
      </Box>

      {unscheduled.length > 0 && (
        <Box px={4} py={3} borderBottom={`1px solid ${APP_BORDER}`}>
          <Text fontSize="0.7rem" fontWeight="700" letterSpacing="0.06em" textTransform="uppercase" color={APP_MUTED} mb={2}>
            Needs dates — drag onto timeline
          </Text>
          <Box display="flex" gap={2} flexWrap="wrap">
            {unscheduled.map((todo) => {
              const isDragging = drag?.todoId === todo.id
              const ms = todo.milestoneId ? milestoneById[todo.milestoneId] : null
              return (
                <Box
                  key={todo.id}
                  as="button"
                  h="28px"
                  px={3}
                  borderRadius="999px"
                  bg={todoColor(todo.color)}
                  color="white"
                  fontSize="0.75rem"
                  fontWeight="700"
                  cursor={canEdit ? "grab" : "pointer"}
                  opacity={isDragging ? 0.45 : 1}
                  boxShadow="0 1px 2px rgba(14,27,23,0.12)"
                  onPointerDown={(e: ReactPointerEvent) => startUnscheduledDrag(e, todo)}
                  onClick={() => !canEdit && onOpen(todo.id)}
                  title={ms ? `${todo.title} · ${ms.title}` : todo.title}
                >
                  {todo.title}
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      {/* Gantt body */}
      <Box display="flex" minH="280px">
        {/* Sticky labels */}
        <Box
          w={`${LABEL_W}px`}
          flexShrink={0}
          borderRight={`1px solid ${APP_BORDER}`}
          bg={APP_SURFACE}
        >
          <Box h={`${HEAD_H}px`} px={3} display="flex" alignItems="flex-end" pb={2} borderBottom={`1px solid ${APP_BORDER}`}>
            <Text fontSize="0.65rem" fontWeight="800" letterSpacing="0.08em" textTransform="uppercase" color={APP_MUTED}>
              To-do
            </Text>
          </Box>
          {!groupMilestones
            ? Array.from({ length: rowLayout.rowCount }, (_, lane) => renderLaneLabel(lane))
            : visualRows.map((row, index) => {
                if (row.kind === "milestone") {
                  const isCurrent = row.milestone?.id === currentMilestoneId
                  return (
                    <Box
                      key={`mh-${index}`}
                      h={`${HEADER_ROW_H}px`}
                      px={3}
                      display="flex"
                      alignItems="center"
                      bg={isCurrent ? "rgba(15,110,86,0.08)" : "rgba(245,158,11,0.08)"}
                      borderBottom={`1px solid ${APP_BORDER}`}
                    >
                      <Text fontSize="0.6875rem" fontWeight="800" color={isCurrent ? APP_MINT : APP_PEACH_INK} truncate>
                        {row.label}
                        {row.milestone?.dueAt ? ` · ${formatDate(row.milestone.dueAt)}` : ""}
                      </Text>
                    </Box>
                  )
                }
                return renderLaneLabel(row.lane, true)
              })}
        </Box>

        {/* Scrollable grid */}
        <Box flex={1} overflow="auto" ref={scrollRef}>
          <Box position="relative" minW={`${width}px`} h={`${gridHeight}px`}>
            {/* Week row */}
            <Box display="flex" position="absolute" top={0} left={0} h="24px">
              {weeks.map((week) => (
                <Box
                  key={week.key}
                  w={`${week.span * dayW}px`}
                  h="24px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="0.65rem"
                  fontWeight="800"
                  letterSpacing="0.08em"
                  color={APP_MUTED}
                  borderRight={`1px solid ${APP_BORDER}`}
                  borderBottom={`1px solid ${APP_BORDER}`}
                >
                  {week.label}
                </Box>
              ))}
            </Box>

            {/* Day row */}
            <Box display="flex" position="absolute" top="24px" left={0} h="34px" borderBottom={`1px solid ${APP_BORDER}`}>
              {days.map((day) => {
                const n = Number(day.slice(8, 10))
                const isToday = day === today
                const isWeekend = new Date(`${day}T12:00:00`).getDay() % 6 === 0
                return (
                  <Box
                    key={day}
                    w={`${dayW}px`}
                    h="34px"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    gap={0}
                    fontSize="0.7rem"
                    fontWeight={isToday ? "800" : "600"}
                    color={isToday ? "#DC2626" : isWeekend ? APP_MUTED : APP_INK}
                    borderRight={`1px solid ${APP_BORDER}`}
                    bg={isToday ? "rgba(239,68,68,0.06)" : "transparent"}
                  >
                    <Text lineHeight="1">{n}</Text>
                    <Text fontSize="0.55rem" color={APP_MUTED} lineHeight="1">
                      {weekdayLetter(day)}
                    </Text>
                  </Box>
                )
              })}
            </Box>

            {projectWindow && (
              <Box
                position="absolute"
                top={HEAD_H}
                left={`${projectWindow.left}px`}
                w={`${projectWindow.width}px`}
                bottom={0}
                bg="rgba(15,110,86,0.04)"
                borderLeft="2px solid rgba(15,110,86,0.2)"
                borderRight="2px solid rgba(15,110,86,0.2)"
                pointerEvents="none"
                zIndex={1}
              />
            )}

            {gridCells}

            {/* Today line */}
            {todayIdx >= 0 && (
              <Box
                position="absolute"
                top={`${HEAD_H}px`}
                bottom={0}
                left={`${todayIdx * dayW + dayW / 2}px`}
                w="2px"
                bg="#EF4444"
                zIndex={2}
                pointerEvents="none"
              />
            )}

            {/* Milestone due markers */}
            {milestoneMarkers.map((milestone) => {
              const idx = days.indexOf(milestone.dueAt!.slice(0, 10))
              if (idx < 0) return null
              const isCurrent = milestone.id === currentMilestoneId
              return (
                <Box
                  key={milestone.id}
                  position="absolute"
                  top={`${HEAD_H - 4}px`}
                  bottom={0}
                  left={`${idx * dayW + dayW / 2}px`}
                  w="2px"
                  bg={isCurrent ? APP_MINT : APP_PEACH}
                  zIndex={2}
                  pointerEvents="none"
                >
                  <Box
                    position="absolute"
                    top={0}
                    left="50%"
                    transform="translateX(-50%)"
                    px={1.5}
                    py={0.5}
                    borderRadius="6px"
                    bg={isCurrent ? APP_MINT : APP_PEACH}
                    color="white"
                    fontSize="0.55rem"
                    fontWeight="800"
                    whiteSpace="nowrap"
                    maxW={`${dayW * 3}px`}
                    truncate
                  >
                    {milestone.title}
                  </Box>
                </Box>
              )
            })}

            {/* Dependencies */}
            <svg
              width={width}
              height={gridHeight}
              style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}
            >
              {displayBars.flatMap((bar) =>
                (bar.todo.dependsOnIds || []).map((id) => {
                  const parent = displayBars.find((item) => item.todo.id === id)
                  if (!parent) return null
                  const x1 = (parent.startIdx + parent.span) * dayW
                  const y1 = rowLayout.rowTop(parent.lane) + BAR_H / 2 + 2
                  const x2 = bar.startIdx * dayW
                  const y2 = rowLayout.rowTop(bar.lane) + BAR_H / 2 + 2
                  const mid = (x1 + x2) / 2
                  return (
                    <path
                      key={`${parent.todo.id}-${bar.todo.id}`}
                      d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="1.5"
                      strokeDasharray={hoveredId === bar.todo.id || hoveredId === parent.todo.id ? undefined : "4 3"}
                    />
                  )
                })
              )}
            </svg>

            {/* Drag preview */}
            {dragPreview && drag && (
              <Box
                position="absolute"
                zIndex={5}
                left={`${dragPreview.startIdx * dayW + 4}px`}
                top={`${rowLayout.rowTop(dragPreview.lane) + 7}px`}
                w={`${dragPreview.span * dayW - 8}px`}
                h={`${BAR_H}px`}
                borderRadius="999px"
                border={`2px dashed ${APP_MINT}`}
                bg="rgba(15,110,86,0.08)"
                pointerEvents="none"
              />
            )}

            {/* Bars */}
            {displayBars.map((bar) => {
              const people = peopleOnTodo(bar.todo)
              const isDragging = drag?.todoId === bar.todo.id
              const isSaving = savingId === bar.todo.id
              const isHovered = hoveredId === bar.todo.id
              const progress = todoProgress(bar.todo)
              const overdue = isOverdue(bar.todo.dueAt, bar.todo.status)
              const ms = bar.todo.milestoneId ? milestoneById[bar.todo.milestoneId] : null
              const top = rowLayout.rowTop(bar.lane) + 7

              return (
                <Box key={bar.todo.id} position="absolute" zIndex={isDragging ? 10 : isHovered ? 6 : 4} left={`${bar.startIdx * dayW + 4}px`} top={`${top}px`} w={`${bar.span * dayW - 8}px`} h={`${BAR_H}px`}>
                  <Box
                    position="relative"
                    h="100%"
                    borderRadius="999px"
                    overflow="hidden"
                    bg={todoColor(bar.todo.color)}
                    color="white"
                    boxShadow={isHovered ? "0 4px 14px rgba(14,27,23,0.22)" : "0 1px 2px rgba(14,27,23,0.12)"}
                    opacity={isDragging ? 0.55 : isSaving ? 0.7 : 1}
                    transform={isDragging ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined}
                    onMouseEnter={() => setHoveredId(bar.todo.id)}
                    onMouseLeave={() => setHoveredId((id) => (id === bar.todo.id ? null : id))}
                  >
                    {/* Progress fill */}
                    <Box
                      position="absolute"
                      inset={0}
                      w={`${Math.round(progress * 100)}%`}
                      bg="rgba(255,255,255,0.22)"
                      pointerEvents="none"
                    />
                    {overdue && (
                      <Box position="absolute" inset={0} border="2px solid #FCA5A5" borderRadius="999px" pointerEvents="none" />
                    )}

                    {/* Resize handles */}
                    {canEdit && (
                      <>
                        <Box
                          position="absolute"
                          left={0}
                          top={0}
                          bottom={0}
                          w="8px"
                          cursor="ew-resize"
                          zIndex={2}
                          onPointerDown={(e: ReactPointerEvent) => startBarDrag(e, bar, "resize-start")}
                        />
                        <Box
                          position="absolute"
                          right={0}
                          top={0}
                          bottom={0}
                          w="8px"
                          cursor="ew-resize"
                          zIndex={2}
                          onPointerDown={(e: ReactPointerEvent) => startBarDrag(e, bar, "resize-end")}
                        />
                      </>
                    )}

                    {/* Bar body */}
                    <Box
                      as="button"
                      position="relative"
                      zIndex={1}
                      w="100%"
                      h="100%"
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1}
                      px={2.5}
                      cursor={canEdit ? (isDragging ? "grabbing" : "grab") : "pointer"}
                      onPointerDown={(e: ReactPointerEvent) => startBarDrag(e, bar, "move")}
                      onClick={() => handleBarClick(bar.todo.id)}
                    >
                      <Text fontSize="0.7rem" fontWeight="700" truncate>
                        {bar.todo.title}
                      </Text>
                      <AvatarStack people={people} size={16} max={2} />
                    </Box>
                  </Box>

                  {/* Hover detail */}
                  {isHovered && !isDragging && (
                    <Box
                      position="absolute"
                      left={0}
                      bottom={`${BAR_H + 6}px`}
                      minW="200px"
                      maxW="280px"
                      p={2.5}
                      borderRadius="10px"
                      bg={APP_INK}
                      color="white"
                      boxShadow="0 8px 24px rgba(14,27,23,0.25)"
                      zIndex={20}
                      pointerEvents="none"
                    >
                      <Text fontSize="0.8125rem" fontWeight="700" mb={1}>
                        {bar.todo.title}
                      </Text>
                      <Text fontSize="0.6875rem" opacity={0.85}>
                        {formatDate(bar.start)} → {formatDate(bar.end)}
                      </Text>
                      <Text fontSize="0.6875rem" opacity={0.85} mt={0.5}>
                        {TODO_STATUS_LABEL[bar.todo.status]} · {formatHours(bar.todo.loggedHours)}
                        {bar.todo.estimatedHours ? ` / ${formatHours(bar.todo.estimatedHours)} est` : ""}
                      </Text>
                      {ms && (
                        <Text fontSize="0.6875rem" opacity={0.75} mt={0.5}>
                          {ms.title}
                        </Text>
                      )}
                      {canEdit && (
                        <Text fontSize="0.625rem" opacity={0.55} mt={1.5}>
                          Drag to move · edges to resize
                        </Text>
                      )}
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>

      {displayBars.length === 0 && unscheduled.length === 0 && (
        <Box px={4} py={8} borderTop={`1px solid ${APP_BORDER}`}>
          <Text fontSize="0.875rem" color={APP_MUTED}>
            {canEdit
              ? "Click any day cell to add a to-do, or drag unscheduled items onto the grid."
              : "Add dates on a to-do to see it on the timeline."}
          </Text>
        </Box>
      )}

      {canEdit && (
        <AddTodoDialog
          open={addOpen}
          projectId={projectId}
          defaultStartAt={addDates?.startAt}
          defaultDueAt={addDates?.dueAt}
          onClose={() => {
            setAddOpen(false)
            setAddDates(null)
          }}
          onCreated={(todo) => {
            if (addDates) {
              setLaneOverrides((prev) => ({ ...prev, [todo.id]: addDates.lane }))
            }
            onChanged()
            setAddOpen(false)
            setAddDates(null)
          }}
        />
      )}
    </Box>
  )
}
