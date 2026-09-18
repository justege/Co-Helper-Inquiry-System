import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Grid, Spinner, Text } from "@chakra-ui/react"
import { getMe, type User } from "@/api/users"
import { getMyInquiries, type Inquiry } from "@/api/inquiries"
import { getMyFinance, getMyWorkspace, getWorkspaceActivity, getWorkspaceFinance, getWorkspaceProjects, type WorkspaceFinance } from "@/api/workspace"
import { PageShell } from "@/components/ui/PageShell"
import { AppStatCard, APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { OnboardingChecklist } from "@/components/workspace/OnboardingChecklist"
import { AppButton } from "@/components/ui/AppButton"
import { formatMoney } from "@/lib/money"
import { columnForStatus } from "@/lib/boardStatus"

export default function DashboardPage() {
  const [me, setMe] = useState<User | null>(null)
  const [jobs, setJobs] = useState<Inquiry[]>([])
  const [finance, setFinance] = useState<WorkspaceFinance | null>(null)
  const [clientCount, setClientCount] = useState(0)
  const [projectCount, setProjectCount] = useState(0)
  const [hasWorkspace, setHasWorkspace] = useState(false)
  const [activity, setActivity] = useState<{ id: string; type: string; createdAt: string; inquiryId: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const profile = await getMe()
      setMe(profile)
      const solo = profile.role === "expert"
      const [jobList, fin, ws, projects, act] = await Promise.all([
        getMyInquiries(),
        solo ? getWorkspaceFinance() : getMyFinance(),
        getMyWorkspace().catch(() => null),
        getWorkspaceProjects().catch(() => ({ projects: [] })),
        solo ? getWorkspaceActivity().catch(() => []) : Promise.resolve([]),
      ])
      setJobs(jobList)
      setFinance(fin)
      setProjectCount(projects.projects.length)
      if (ws && "workspace" in ws) {
        setHasWorkspace(true)
        setClientCount(ws.clients.length)
      } else if (ws && "workspaces" in ws) {
        setHasWorkspace(ws.workspaces.length > 0)
      }
      setActivity(act.slice(0, 6))
      setLoading(false)
    })().catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <PageShell title="Home"><Spinner /></PageShell>
  }

  const solo = me?.role === "expert"
  const doing = jobs.filter((j) => columnForStatus(j.status) === "doing").length
  const waiting = jobs.filter((j) => columnForStatus(j.status) === "waiting").length
  const currency = finance?.jobs[0]?.currency || "EUR"

  return (
    <PageShell
      title={solo ? "Home" : "Your workspace"}
      subtitle={solo ? "Jobs, clients, and outstanding payments in one place." : "Jobs shared with your solo partner."}
      action={
        <Link to="/app/inquiries/new">
          <AppButton>New job</AppButton>
        </Link>
      }
    >
      <OnboardingChecklist
        isSolo={Boolean(solo)}
        hasWorkspace={hasWorkspace}
        hasClients={clientCount > 0}
        hasProjects={projectCount > 0}
        hasJobs={jobs.length > 0}
      />
      <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap={4} mb={6}>
        <AppStatCard label="Active" value={doing} hint="Doing now" />
        <AppStatCard label="Waiting" value={waiting} />
        <AppStatCard label="Outstanding" value={formatMoney(finance?.totals.outstanding ?? 0, currency)} />
        <AppStatCard label="Hours" value={(finance?.totals.billableHours ?? 0).toFixed(1)} />
      </Grid>
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        <Box px={5} py={3} borderBottom={`1px solid ${APP_BORDER}`}>
          <Text fontWeight="700" color={APP_INK}>Recent jobs</Text>
        </Box>
        {jobs.slice(0, 8).map((job) => (
          <Link key={job.id} to={`/app/jobs/${job.id}`} style={{ textDecoration: "none" }}>
            <Box px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`} _hover={{ bg: "#F7F8FA" }}>
              <Text fontWeight="600" color={APP_INK}>{job.title}</Text>
              <Text fontSize="0.75rem" color={APP_MUTED}>{job.status.replace(/_/g, " ")}</Text>
            </Box>
          </Link>
        ))}
        {jobs.length === 0 && <Text p={5} color={APP_MUTED}>No jobs yet.</Text>}
      </Box>
      {solo && activity.length > 0 && (
        <Box mt={6} bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5}>
          <Text fontWeight="700" mb={3}>Activity</Text>
          {activity.map((e) => (
            <Text key={e.id} fontSize="0.8125rem" color={APP_MUTED} py={1}>{e.type.replace(/\./g, " ")}</Text>
          ))}
        </Box>
      )}
    </PageShell>
  )
}
