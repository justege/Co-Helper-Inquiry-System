import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Grid, Spinner, Stack, Text } from "@chakra-ui/react"
import { PageShell } from "@/components/ui/PageShell"
import {
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
  AppListRow,
  AppStatusText,
  formatStatusLabel,
} from "@/components/ui/appUi"
import { getMe } from "@/api/users"
import { getMyFinance, getWorkspaceFinance, type WorkspaceFinance } from "@/api/workspace"

import { formatMoney } from "@/lib/money"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box p={4} border={`1px solid ${APP_BORDER}`} borderRadius="10px" bg="white">
      <Text fontSize="0.6875rem" fontWeight="700" color={APP_LABEL} letterSpacing="0.08em" textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="1.25rem" fontWeight="700" color={APP_INK} mt={1}>{value}</Text>
    </Box>
  )
}

export default function FinancePage() {
  const [data, setData] = useState<WorkspaceFinance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFreelancer, setIsFreelancer] = useState(false)

  useEffect(() => {
    getMe()
      .then((me) => {
        const freelancer = me.role === "expert"
        setIsFreelancer(freelancer)
        return freelancer ? getWorkspaceFinance() : getMyFinance()
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totals = data?.totals
  const currency = data?.jobs[0]?.currency || "EUR"

  return (
    <PageShell
      eyebrow="Workspace"
      title="Finance"
      subtitle={isFreelancer ? "Income, outstanding amounts, and hours across your jobs." : "Payments and agreed amounts on jobs you share."}
    >
      {loading ? (
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      ) : error ? (
        <Box {...APP_CARD} p={5}><Text fontSize="sm" color={APP_INK}>{error}</Text></Box>
      ) : (
        <Stack gap={5}>
          <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap={3}>
            <Stat label="Agreed" value={formatMoney(totals?.agreedValue ?? 0, currency)} />
            <Stat label="Paid" value={formatMoney(totals?.paid ?? 0, currency)} />
            <Stat label="Remaining" value={formatMoney(totals?.remaining ?? 0, currency)} />
            <Stat label="Hours logged" value={`${(totals?.billableHours ?? 0).toFixed(1)} h`} />
          </Grid>

          <Box {...APP_CARD} overflow="hidden">
            <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
              <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>By job</Text>
            </Box>
            {(data?.jobs.length ?? 0) === 0 ? (
              <Box p={5}>
                <Text fontSize="0.875rem" color={APP_MUTED}>No jobs yet — open a job or import a Trello board to start tracking money and hours.</Text>
                {isFreelancer && (
                  <Link to="/app/trello" style={{ color: APP_INK, fontSize: "0.8125rem", fontWeight: 600 }}>
                    Import from Trello
                  </Link>
                )}
              </Box>
            ) : (
              (data?.jobs ?? []).map((job, i) => (
                <AppListRow key={job.inquiryId} href={`/app/jobs/${job.inquiryId}`} isLast={i === (data?.jobs.length ?? 0) - 1}>
                  <Box flex="1" minW={0}>
                    <Text fontSize="0.9375rem" fontWeight="600" color={APP_INK} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                      {job.title}
                    </Text>
                    <Text fontSize="0.75rem" color={APP_LABEL} mt={0.5}>
                      {formatMoney(job.paid, job.currency)} paid · {formatMoney(job.remaining, job.currency)} remaining
                      {job.billableHours ? ` · ${job.billableHours.toFixed(1)} h` : ""}
                    </Text>
                  </Box>
                  <AppStatusText label={formatStatusLabel(job.status)} />
                </AppListRow>
              ))
            )}
          </Box>
        </Stack>
      )}
    </PageShell>
  )
}
