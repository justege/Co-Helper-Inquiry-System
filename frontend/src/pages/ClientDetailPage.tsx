import { useEffect, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { getMyInquiries } from "@/api/inquiries"
import { getMyWorkspace, getWorkspaceFinance, type FreelancerWorkspaceMe } from "@/api/workspace"
import { PageShell } from "@/components/ui/PageShell"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { clientDisplayName } from "@/lib/boardStatus"
import { formatMoney } from "@/lib/money"
import { AppButton } from "@/components/ui/AppButton"
import { AppValue } from "@/components/ui/AppFormField"

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ws, setWs] = useState<FreelancerWorkspaceMe | null>(null)
  const [jobs, setJobs] = useState<{ id: string; title: string; status: string }[]>([])
  const [outstanding, setOutstanding] = useState(0)
  const [currency, setCurrency] = useState("EUR")

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      const [data, list, finance] = await Promise.all([
        getMyWorkspace().catch(() => null),
        getMyInquiries(),
        getWorkspaceFinance().catch(() => null),
      ])
      if (cancelled) return
      if (data && data.role === "owner") setWs(data)
      const mine = list.filter((j) => j.clientId === id).map((j) => ({ id: j.id, title: j.title, status: j.status }))
      setJobs(mine)
      const ids = new Set(mine.map((j) => j.id))
      if (finance) {
        setOutstanding(finance.jobs.filter((j) => ids.has(j.inquiryId)).reduce((a, j) => a + j.outstanding, 0))
        setCurrency(finance.jobs.find((j) => ids.has(j.inquiryId))?.currency || "EUR")
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (!id) return <Navigate to="/app/clients" replace />
  if (!ws) return <PageShell title="Client" backHref="/app/clients"><Spinner /></PageShell>

  const client = ws.clients.find((c) => c.id === id)
  if (!client) return <PageShell title="Client" backHref="/app/clients"><Text>Client not found.</Text></PageShell>

  return (
    <PageShell
      title={clientDisplayName(client)}
      subtitle={client.email}
      backHref="/app/clients"
      action={
        <Link to="/app/inquiries/new">
          <AppButton size="sm">New job</AppButton>
        </Link>
      }
    >
      <Box mb={5} maxW="320px">
        <Text fontSize="13px" fontWeight="600" mb="6px">Outstanding</Text>
        <AppValue>{formatMoney(outstanding, currency)}</AppValue>
      </Box>
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        {jobs.map((job) => (
          <Link key={job.id} to={`/app/jobs/${job.id}`} style={{ textDecoration: "none" }}>
            <Box px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`}>
              <Text fontWeight="600" color={APP_INK}>{job.title}</Text>
              <Text fontSize="0.75rem" color={APP_MUTED}>{job.status.replace(/_/g, " ")}</Text>
            </Box>
          </Link>
        ))}
        {jobs.length === 0 && <Text p={5} color={APP_MUTED}>No jobs with this client yet.</Text>}
      </Box>
    </PageShell>
  )
}
