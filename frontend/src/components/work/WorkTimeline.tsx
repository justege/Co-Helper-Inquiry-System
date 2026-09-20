import { useMemo, useState } from "react"
import { Box, Text } from "@chakra-ui/react"
import { LuChevronLeft, LuChevronRight } from "react-icons/lu"
import { APP_BORDER, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { peopleOnTodo } from "@/lib/people"
import {
  addDaysIso,
  diffDays,
  isoToday,
  isoWeekLabel,
  startOfMonday,
  todoColor,
} from "@/lib/todoStyle"
import type { WorkTodo } from "@/api/work"
import { AvatarStack } from "./todoUi"

const DAY_W = 44
const BAR_H = 28
const ROW_H = 38
const HEAD_H = 54

type Bar = {
  todo: WorkTodo
  start: string
  end: string
  startIdx: number
  span: number
  lane: number
}

function scheduledRange(todo: WorkTodo): { start: string; end: string } | null {
  const start = todo.startAt || todo.dueAt
  const end = todo.dueAt || todo.startAt
  if (!start || !end) return null
  return start <= end ? { start, end } : { start: end, end: start }
}

function packLanes(items: Omit<Bar, "lane">[]): Bar[] {
  const lanes: { endIdx: number }[] = []
  const placed: Bar[] = []
  const sorted = items.slice().sort((a, b) => a.startIdx - b.startIdx || a.span - b.span)
  for (const item of sorted) {
    let lane = lanes.findIndex((row) => row.endIdx + 0.35 < item.startIdx)
    if (lane < 0) {
      lane = lanes.length
      lanes.push({ endIdx: item.startIdx + item.span })
    } else {
      lanes[lane].endIdx = item.startIdx + item.span
    }
    placed.push({ ...item, lane })
  }
  return placed
}

export function WorkTimeline({
  todos,
  onOpen,
}: {
  todos: WorkTodo[]
  onOpen: (id: string) => void
}) {
  const [weekShift, setWeekShift] = useState(0)
  const today = isoToday()

  const { days, bars, unscheduled, todayIdx, laneCount } = useMemo(() => {
    const dated = todos
      .filter((todo) => todo.status !== "invoiced")
      .map((todo) => ({ todo, range: scheduledRange(todo) }))
    const scheduled = dated.filter((item): item is { todo: WorkTodo; range: { start: string; end: string } } => Boolean(item.range))
    const unscheduled = dated.filter((item) => !item.range).map((item) => item.todo)

    const starts = scheduled.map((item) => item.range.start).sort()
    const ends = scheduled.map((item) => item.range.end).sort()
    const focus = starts[0] || today
    const last = ends[ends.length - 1] || addDaysIso(focus, 13)
    let from = startOfMonday(focus)
    let to = addDaysIso(startOfMonday(last), 6)
    if (diffDays(from, to) < 20) to = addDaysIso(from, 20)
    if (diffDays(from, to) > 55) to = addDaysIso(from, 55)
    from = addDaysIso(from, weekShift * 7)
    to = addDaysIso(to, weekShift * 7)

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
    const bars = packLanes(raw)
    const laneCount = bars.reduce((max, bar) => Math.max(max, bar.lane + 1), 1)
    return {
      days,
      bars,
      unscheduled,
      todayIdx: days.indexOf(today),
      laneCount,
    }
  }, [todos, weekShift, today])

  const weeks: { key: string; label: string; span: number }[] = []
  for (const day of days) {
    const meta = isoWeekLabel(day)
    const key = `${meta.year}-W${meta.week}`
    const last = weeks[weeks.length - 1]
    if (last && last.key === key) last.span += 1
    else weeks.push({ key, label: `W${meta.week} ${meta.month}`, span: 1 })
  }

  const width = days.length * DAY_W
  const height = HEAD_H + laneCount * ROW_H + 16

  return (
    <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
      <Box px={4} py={3} display="flex" alignItems="center" justifyContent="space-between" gap={3} borderBottom={`1px solid ${APP_BORDER}`}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            as="button"
            h="32px"
            px={3}
            borderRadius="8px"
            border={`1px solid ${APP_BORDER}`}
            fontSize="0.8125rem"
            fontWeight="700"
            onClick={() => setWeekShift(0)}
          >
            Today
          </Box>
          <Box as="button" w="32px" h="32px" borderRadius="8px" border={`1px solid ${APP_BORDER}`} display="flex" alignItems="center" justifyContent="center" onClick={() => setWeekShift((n) => n - 1)}>
            <LuChevronLeft size={16} />
          </Box>
          <Box as="button" w="32px" h="32px" borderRadius="8px" border={`1px solid ${APP_BORDER}`} display="flex" alignItems="center" justifyContent="center" onClick={() => setWeekShift((n) => n + 1)}>
            <LuChevronRight size={16} />
          </Box>
        </Box>
        <Text fontSize="0.75rem" color={APP_MUTED} fontWeight="600">
          {bars.length} scheduled · {unscheduled.length} need dates
        </Text>
      </Box>

      {unscheduled.length > 0 && (
        <Box px={4} py={3} borderBottom={`1px solid ${APP_BORDER}`}>
          <Text fontSize="0.7rem" fontWeight="700" letterSpacing="0.06em" textTransform="uppercase" color={APP_MUTED} mb={2}>
            Needs dates
          </Text>
          <Box display="flex" gap={2} flexWrap="wrap">
            {unscheduled.map((todo) => (
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
                onClick={() => onOpen(todo.id)}
              >
                {todo.title}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box overflowX="auto">
        <Box position="relative" minW={`${width}px`} h={`${height}px`}>
          <Box display="flex" position="absolute" top={0} left={0} h="22px">
            {weeks.map((week) => (
              <Box
                key={week.key}
                w={`${week.span * DAY_W}px`}
                h="22px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="0.65rem"
                fontWeight="800"
                letterSpacing="0.08em"
                color={APP_MUTED}
                borderRight={`1px solid ${APP_BORDER}`}
              >
                {week.label}
              </Box>
            ))}
          </Box>
          <Box display="flex" position="absolute" top="22px" left={0} h="32px" borderBottom={`1px solid ${APP_BORDER}`}>
            {days.map((day) => {
              const n = Number(day.slice(8, 10))
              const isToday = day === today
              return (
                <Box
                  key={day}
                  w={`${DAY_W}px`}
                  h="32px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="0.75rem"
                  fontWeight={isToday ? "800" : "600"}
                  color={isToday ? "#DC2626" : APP_MUTED}
                  borderRight={`1px solid ${APP_BORDER}`}
                >
                  {n}
                </Box>
              )
            })}
          </Box>
          {days.map((day, i) => (
            <Box
              key={`col-${day}`}
              position="absolute"
              top={`${HEAD_H}px`}
              left={`${i * DAY_W}px`}
              w={`${DAY_W}px`}
              bottom={0}
              bg={i % 7 >= 5 ? "rgba(15,110,86,0.03)" : "transparent"}
              borderRight={`1px solid ${APP_BORDER}`}
            />
          ))}
          {todayIdx >= 0 && (
            <Box
              position="absolute"
              top={`${HEAD_H}px`}
              bottom={0}
              left={`${todayIdx * DAY_W + DAY_W / 2}px`}
              w="2px"
              bg="#EF4444"
              zIndex={2}
            />
          )}
          <svg
            width={width}
            height={height}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}
          >
            {bars.flatMap((bar) =>
              (bar.todo.dependsOnIds || []).map((id) => {
                const parent = bars.find((item) => item.todo.id === id)
                if (!parent) return null
                const x1 = (parent.startIdx + parent.span) * DAY_W
                const y1 = HEAD_H + parent.lane * ROW_H + BAR_H / 2 + 8
                const x2 = bar.startIdx * DAY_W
                const y2 = HEAD_H + bar.lane * ROW_H + BAR_H / 2 + 8
                const mid = (x1 + x2) / 2
                return (
                  <path
                    key={`${parent.todo.id}-${bar.todo.id}`}
                    d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                  />
                )
              })
            )}
          </svg>
          {bars.map((bar) => {
            const people = peopleOnTodo(bar.todo)
            return (
              <Box
                key={bar.todo.id}
                as="button"
                position="absolute"
                zIndex={4}
                left={`${bar.startIdx * DAY_W + 4}px`}
                top={`${HEAD_H + bar.lane * ROW_H + 8}px`}
                w={`${bar.span * DAY_W - 8}px`}
                h={`${BAR_H}px`}
                bg={todoColor(bar.todo.color)}
                color="white"
                borderRadius="999px"
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap={2}
                px={3}
                overflow="hidden"
                boxShadow="0 1px 2px rgba(14,27,23,0.12)"
                onClick={() => onOpen(bar.todo.id)}
                title={bar.todo.title}
              >
                <Text fontSize="0.75rem" fontWeight="700" truncate>
                  {bar.todo.title}
                </Text>
                <AvatarStack people={people} size={18} max={2} />
              </Box>
            )
          })}
        </Box>
      </Box>
      {bars.length === 0 && unscheduled.length === 0 && (
        <Box px={4} py={8}>
          <Text fontSize="0.875rem" color={APP_MUTED}>Add dates on a to-do to see it on the timeline.</Text>
        </Box>
      )}
    </Box>
  )
}
