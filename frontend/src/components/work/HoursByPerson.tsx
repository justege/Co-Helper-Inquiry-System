import { useMemo } from "react"
import { Box, Text } from "@chakra-ui/react"
import type { TimeEntry } from "@/api/work"
import type { WorkspaceUserBrief } from "@/api/workspace"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_INK,
  APP_MUTED,
  APP_SURFACE,
} from "@/components/ui/appUi"
import { displayName, initials } from "@/lib/people"
import { formatHours } from "@/lib/hours"
import { isoWeekLabel, startOfMonday } from "@/lib/todoStyle"

export type HoursScale = "day" | "week" | "month"

type Person = WorkspaceUserBrief & { role?: string }

function periodKey(iso: string, scale: HoursScale) {
  const day = iso.slice(0, 10)
  if (scale === "day") return day
  if (scale === "week") return startOfMonday(day)
  return day.slice(0, 7)
}

function periodLabel(key: string, scale: HoursScale) {
  if (scale === "day") {
    const d = new Date(`${key}T12:00:00`)
    return {
      primary: String(d.getDate()),
      secondary: d.toLocaleDateString(undefined, { weekday: "short" }),
    }
  }
  if (scale === "week") {
    const meta = isoWeekLabel(key)
    return { primary: `W${meta.week}`, secondary: meta.month }
  }
  const d = new Date(`${key}-01T12:00:00`)
  return {
    primary: d.toLocaleDateString(undefined, { month: "short" }),
    secondary: String(d.getFullYear()),
  }
}

function columnsFor(days: string[], scale: HoursScale) {
  const cols: { key: string; days: string[] }[] = []
  for (const day of days) {
    const key = periodKey(day, scale)
    const last = cols[cols.length - 1]
    if (last && last.key === key) last.days.push(day)
    else cols.push({ key, days: [day] })
  }
  return cols
}

export function HoursByPerson({
  people,
  entries,
  days,
  scale,
}: {
  people: Person[]
  entries: TimeEntry[]
  days: string[]
  scale: HoursScale
}) {
  const columns = useMemo(() => columnsFor(days, scale), [days, scale])
  const today = new Date().toISOString().slice(0, 10)

  const rows = useMemo(() => {
    const byUser = new Map<string, Person>()
    for (const person of people) {
      if (person.role === "client") continue
      byUser.set(person.id, person)
    }
    for (const entry of entries) {
      const person = entry.user
      if (!person || byUser.has(entry.userId)) continue
      byUser.set(entry.userId, person)
    }

    const hours = new Map<string, number>()
    const add = (userId: string, key: string, amount: number) => {
      const id = `${userId}:${key}`
      hours.set(id, (hours.get(id) || 0) + amount)
    }
    for (const entry of entries) {
      add(entry.userId, periodKey(entry.entryDate, scale), entry.hours || 0)
    }

    return [...byUser.values()].map((person) => {
      const cells = columns.map((col) => hours.get(`${person.id}:${col.key}`) || 0)
      const total = cells.reduce((sum, n) => sum + n, 0)
      return { person, cells, total }
    })
  }, [people, entries, columns, scale])

  if (!days.length) return null

  const colW = scale === "day" ? 44 : scale === "week" ? 64 : 72

  return (
    <Box borderBottom={`1px solid ${APP_BORDER}`}>
      <Box px={4} pt={3} pb={2} display="flex" alignItems="baseline" justifyContent="space-between" gap={3}>
        <Text fontSize="0.7rem" fontWeight="700" letterSpacing="0.06em" textTransform="uppercase" color={APP_MUTED}>
          Hours by person
        </Text>
        <Text fontSize="0.75rem" color={APP_MUTED}>
          {scale === "day" ? "Each day" : scale === "week" ? "Each week" : "Each month"}
        </Text>
      </Box>
      {rows.length === 0 ? (
        <Text px={4} pb={4} fontSize="0.8125rem" color={APP_MUTED}>
          Log hours on a to-do to see time per person here.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Box minW={`${180 + columns.length * colW + 72}px`}>
            <Box
              display="grid"
              gridTemplateColumns={`180px repeat(${columns.length}, ${colW}px) 72px`}
              borderTop={`1px solid ${APP_BORDER}`}
            >
              <Box px={4} py={2} bg={APP_BG_SUBTLE} borderBottom={`1px solid ${APP_BORDER}`} />
              {columns.map((col) => {
                const label = periodLabel(col.key, scale)
                const isToday = scale === "day" && col.key === today
                return (
                  <Box
                    key={col.key}
                    py={2}
                    bg={isToday ? "rgba(239,68,68,0.06)" : APP_BG_SUBTLE}
                    borderBottom={`1px solid ${APP_BORDER}`}
                    borderLeft={`1px solid ${APP_BORDER}`}
                    textAlign="center"
                  >
                    <Text fontSize="0.75rem" fontWeight="700" color={isToday ? "#DC2626" : APP_INK} lineHeight="1">
                      {label.primary}
                    </Text>
                    <Text fontSize="0.6rem" color={APP_MUTED} mt="2px" lineHeight="1">
                      {label.secondary}
                    </Text>
                  </Box>
                )
              })}
              <Box
                px={2}
                py={2}
                bg={APP_BG_SUBTLE}
                borderBottom={`1px solid ${APP_BORDER}`}
                borderLeft={`1px solid ${APP_BORDER}`}
                textAlign="right"
              >
                <Text fontSize="0.65rem" fontWeight="700" color={APP_MUTED} letterSpacing="0.04em">
                  Total
                </Text>
              </Box>

              {rows.map((row) => (
                <Box key={row.person.id} display="contents">
                  <Box
                    px={4}
                    py={2}
                    display="flex"
                    alignItems="center"
                    gap={2}
                    borderBottom={`1px solid ${APP_BORDER}`}
                    bg={APP_SURFACE}
                    minW={0}
                  >
                    <Box
                      w="24px"
                      h="24px"
                      borderRadius="999px"
                      bg={APP_ACCENT}
                      color="white"
                      fontSize="0.6rem"
                      fontWeight="700"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      {initials(row.person)}
                    </Box>
                    <Box minW={0}>
                      <Text fontSize="0.8125rem" fontWeight="600" color={APP_INK} truncate>
                        {displayName(row.person)}
                      </Text>
                      {row.person.role ? (
                        <Text fontSize="0.65rem" color={APP_MUTED} textTransform="capitalize">
                          {row.person.role === "owner" ? "One-person business" : row.person.role}
                        </Text>
                      ) : null}
                    </Box>
                  </Box>
                  {row.cells.map((hours, index) => {
                    const col = columns[index]
                    const isToday = scale === "day" && col.key === today
                    return (
                      <Box
                        key={col.key}
                        borderBottom={`1px solid ${APP_BORDER}`}
                        borderLeft={`1px solid ${APP_BORDER}`}
                        bg={hours > 0 ? "rgba(15,110,86,0.08)" : isToday ? "rgba(239,68,68,0.04)" : APP_SURFACE}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        minH="44px"
                      >
                        <Text
                          fontSize="0.75rem"
                          fontWeight={hours > 0 ? "700" : "500"}
                          color={hours > 0 ? APP_INK : APP_MUTED}
                        >
                          {hours > 0 ? formatHours(hours) : "—"}
                        </Text>
                      </Box>
                    )
                  })}
                  <Box
                    px={2}
                    borderBottom={`1px solid ${APP_BORDER}`}
                    borderLeft={`1px solid ${APP_BORDER}`}
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                    bg={APP_SURFACE}
                  >
                    <Text fontSize="0.8125rem" fontWeight="700" color={APP_INK}>
                      {formatHours(row.total)}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}
