import { useOutletContext } from "react-router-dom"
import { useEffect, useState } from "react"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { listActivity, type ActivityEvent } from "@/api/inquiries"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import type { Inquiry } from "@/api/inquiries"

export default function JobActivity() {
  const { inquiry } = useOutletContext<{ inquiry: Inquiry }>()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    listActivity(inquiry.id).then(setEvents).finally(() => setLoading(false))
  }, [inquiry.id])
  if (loading) return <Spinner size="sm" />
  return (
    <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5} maxW="720px">
      {events.length === 0 && <Text color={APP_MUTED}>No activity yet.</Text>}
      {events.map((e) => (
        <Box key={e.id} py={3} borderBottom={`1px solid ${APP_BORDER}`}>
          <Text fontWeight="600" color={APP_INK}>{e.type.replace(/\./g, " ")}</Text>
          <Text fontSize="0.75rem" color={APP_MUTED}>{new Date(e.createdAt).toLocaleString()}</Text>
        </Box>
      ))}
    </Box>
  )
}
