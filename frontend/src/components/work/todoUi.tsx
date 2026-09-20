import { Box, Text } from "@chakra-ui/react"
import { APP_ACCENT, APP_BORDER, APP_INK, APP_MUTED } from "@/components/ui/appUi"
import { displayName, initials } from "@/lib/people"
import { formatDate } from "@/lib/hours"
import { isOverdue, todoStatusTone } from "@/lib/todoStyle"
import { TODO_STATUS_LABEL } from "@/lib/hours"

export function AvatarStack({
  people,
  max = 3,
  size = 22,
}: {
  people: Array<{ firstName?: string | null; lastName?: string | null; email?: string | null; companyName?: string | null; username?: string | null } | null | undefined>
  max?: number
  size?: number
}) {
  const list = people.filter(Boolean)
  if (!list.length) return null
  const shown = list.slice(0, max)
  const extra = list.length - shown.length
  return (
    <Box display="flex" alignItems="center">
      {shown.map((person, index) => (
        <Box
          key={`${displayName(person)}-${index}`}
          w={`${size}px`}
          h={`${size}px`}
          ml={index === 0 ? 0 : `-${Math.round(size / 4)}px`}
          borderRadius="999px"
          bg={APP_ACCENT}
          color="white"
          fontSize={size > 20 ? "0.62rem" : "0.55rem"}
          fontWeight="700"
          display="flex"
          alignItems="center"
          justifyContent="center"
          border="2px solid white"
          title={displayName(person)}
        >
          {initials(person)}
        </Box>
      ))}
      {extra > 0 && (
        <Text fontSize="0.7rem" color={APP_MUTED} ml={1} fontWeight="700">+{extra}</Text>
      )}
    </Box>
  )
}

export function StatusBadge({
  status,
  onClick,
}: {
  status?: string
  onClick?: () => void
}) {
  const tone = todoStatusTone(status)
  const label = TODO_STATUS_LABEL[status || "backlog"] || status
  return (
    <Box
      as={onClick ? "button" : "span"}
      onClick={onClick}
      display="inline-flex"
      alignItems="center"
      h="28px"
      px={2.5}
      borderRadius="8px"
      bg={tone.bg}
      color={tone.color}
      border={`1px solid ${tone.border}`}
      fontSize="0.75rem"
      fontWeight="700"
    >
      {label}
    </Box>
  )
}

export function DueChip({ dueAt, status }: { dueAt?: string | null; status?: string }) {
  if (!dueAt) return null
  const late = isOverdue(dueAt, status)
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      h="22px"
      px={2}
      borderRadius="6px"
      fontSize="0.7rem"
      fontWeight="700"
      bg={late ? "#FEF2F2" : "#F3F4F6"}
      color={late ? "#B91C1C" : APP_INK}
    >
      {late ? "Overdue · " : ""}{formatDate(dueAt)}
    </Box>
  )
}

export function SubtaskProgress({ done, total }: { done: number; total: number }) {
  if (total <= 0) return null
  const pct = Math.round((done / total) * 100)
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Text fontSize="0.75rem" color={APP_MUTED} fontWeight="600">Subtasks {done}/{total}</Text>
        <Text fontSize="0.75rem" color={APP_MUTED}>{pct}%</Text>
      </Box>
      <Box h="6px" bg="#EEF2FF" borderRadius="99px" overflow="hidden" border={`1px solid ${APP_BORDER}`}>
        <Box h="full" w={`${pct}%`} bg="#4F7CFF" borderRadius="99px" />
      </Box>
    </Box>
  )
}
