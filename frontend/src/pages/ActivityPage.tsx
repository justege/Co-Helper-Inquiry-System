import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { PageShell } from "@/components/ui/PageShell"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { getWorkspaceActivity } from "@/api/workspace"

export default function ActivityPage() {
  const [events, setEvents] = useState<{ id: string; type: string; createdAt: string; inquiryId: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getWorkspaceActivity()
      .then(setEvents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageShell title="Activity" subtitle="What happened across this workspace.">
      {loading ? (
        <Spinner size="sm" />
      ) : error ? (
        <Text color="#B91C1C">{error}</Text>
      ) : (
        <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
          {events.length === 0 && <Text p={5} color={APP_MUTED}>No activity yet.</Text>}
          {events.map((e) => {
            const inner = (
              <Box px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`}>
                <Text fontWeight="600" color={APP_INK}>{e.type.replace(/\./g, " ")}</Text>
                <Text fontSize="0.75rem" color={APP_MUTED}>{new Date(e.createdAt).toLocaleString()}</Text>
              </Box>
            )
            return e.inquiryId ? (
              <Link key={e.id} to={`/app/jobs/${e.inquiryId}`} style={{ textDecoration: "none" }}>{inner}</Link>
            ) : (
              <Box key={e.id}>{inner}</Box>
            )
          })}
        </Box>
      )}
    </PageShell>
  )
}
