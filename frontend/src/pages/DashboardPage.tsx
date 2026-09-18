import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuthContext } from "../components/auth/AuthContext"
import { getMe, type User } from "../api/users"
import { getMyInquiries, type Inquiry, type InquiryStatus } from "../api/inquiries"
import { getMyFinance, getMyWorkspace, getWorkspaceFinance, type WorkspaceFinance } from "../api/workspace"
import { Box, Button, Grid, Spinner, Stack, Text } from "@chakra-ui/react"
import { LuInbox, LuPlus, LuWallet } from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import headerBg from "@/assets/Background.png"
import {
  APP_ACCENT,
  APP_BORDER,
  APP_BG_SUBTLE,
  APP_BTN_PRIMARY,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
  AppListRow,
  AppStatusText,
  formatStatusLabel,
} from "@/components/ui/appUi"
import { ClientJobsEmptyState, FeatureEmptyState, InquiryMockup, StartWorkspaceEmptyState } from "@/components/ui/FeatureEmptyState"

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: "Requested",
  matching: "Requested",
  offered: "Requested",
  accepted: "Doing",
  in_progress: "Doing",
  waiting: "Waiting",
  delivered: "Done",
  escalated: "Escalated",
  cancelled: "Cancelled",
}

const FREELANCER_VALUE_BULLETS = [
  "Invite the companies you already work with into your workspace",
  "Import a Trello board — columns become projects, cards become jobs",
  "Track hours and payments in one place per company",
]

const TRY_FMT = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" })

function StatCard({ label, value, to }: { label: string; value: string; to: string }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <Box p={4} border={`1px solid ${APP_BORDER}`} borderRadius="10px" bg="white" h="100%"
        transition="border-color 0.1s" _hover={{ borderColor: APP_ACCENT }}>
        <Text fontSize="0.6875rem" fontWeight="700" color={APP_LABEL} letterSpacing="0.08em" textTransform="uppercase">
          {label}
        </Text>
        <Text fontSize="1.2rem" fontWeight="700" color={APP_INK} mt={1}>{value}</Text>
      </Box>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuthContext()
  const [profile, setProfile] = useState<User | null>(null)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [finance, setFinance] = useState<WorkspaceFinance | null>(null)
  const [invitedToWorkspace, setInvitedToWorkspace] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then((me) => {
        setProfile(me)
        const freelancer = me.role === "expert"
        return Promise.allSettled([
          getMyInquiries(),
          freelancer ? getWorkspaceFinance() : getMyFinance(),
          freelancer ? Promise.resolve(null) : getMyWorkspace(),
        ])
      })
      .then((results) => {
        if (!results) return
        const [inqRes, finRes, wsRes] = results
        if (inqRes.status === "fulfilled") setInquiries(inqRes.value)
        if (finRes.status === "fulfilled") setFinance(finRes.value)
        if (wsRes.status === "fulfilled" && wsRes.value?.role === "client") {
          setInvitedToWorkspace(wsRes.value.workspaces.length > 0)
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  const isFreelancer = profile?.role === "expert"
  const firstName = profile?.firstName ?? user?.email?.split("@")[0] ?? ""
  const activeCount = inquiries.filter((i) => ["accepted", "in_progress", "pending"].includes(i.status)).length
  const recentInquiries = inquiries.slice(0, 8)
  const totals = finance?.totals

  return (
    <PageShell
      eyebrow="Dashboard"
      title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
      subtitle={profile?.companyName ?? undefined}
      headerBgImage={headerBg}
      action={
        <Link to="/app/inquiries/new" style={{ textDecoration: "none" }}>
          <Button
            size="sm" h="34px" px={4}
            bg="rgba(255,255,255,0.1)" color="white" fontWeight="600" fontSize="0.8125rem"
            borderRadius="8px" border="1px solid rgba(255,255,255,0.18)"
            transition="all 0.14s"
            display="inline-flex" alignItems="center" gap={1.5}
            _hover={{ bg: "rgba(255,255,255,0.18)", borderColor: "rgba(255,255,255,0.32)" }}
          >
            <LuPlus size={14} />
            New job
          </Button>
        </Link>
      }
    >
      {loading ? (
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      ) : inquiries.length === 0 ? (
        isFreelancer ? (
        <FeatureEmptyState
          title="Invite your first company and open a job"
          bullets={FREELANCER_VALUE_BULLETS}
          cta={
              <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
                <Link to="/app/clients" style={{ textDecoration: "none" }}>
                  <Button {...APP_BTN_PRIMARY} size="md" h="42px" px={6} fontSize="0.9375rem" display="inline-flex" alignItems="center" gap={2}>
                    <LuPlus size={16} />
                    Invite a client
                  </Button>
                </Link>
                <Link to="/app/trello" style={{ textDecoration: "none" }}>
                  <Button variant="outline" size="md" h="42px" px={6} borderColor={APP_BORDER}>
                    Import from Trello
                  </Button>
                </Link>
              </Box>
          }
          mockup={<InquiryMockup />}
        />
        ) : invitedToWorkspace ? (
          <ClientJobsEmptyState />
        ) : (
          <StartWorkspaceEmptyState />
        )
      ) : (
        <Stack gap={4}>
          <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap={3}>
            <StatCard to="/app/inquiries" label={isFreelancer ? "Open jobs" : "Jobs"} value={String(activeCount)} />
            <StatCard to="/app/finance" label="Hours logged" value={`${(totals?.billableHours ?? 0).toFixed(1)} h`} />
            <StatCard
              to="/app/finance"
              label={isFreelancer ? "Paid" : "You’ve paid"}
              value={TRY_FMT.format(totals?.paid ?? 0)}
            />
            <StatCard
              to="/app/finance"
              label={isFreelancer ? "Outstanding" : "Amount due"}
              value={TRY_FMT.format(totals?.remaining ?? 0)}
            />
          </Grid>

          <Box {...APP_CARD}>
            <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={3} mb={3} flexWrap="wrap">
                <Text fontSize="0.8125rem" fontWeight="600" color={APP_INK}>Recent jobs</Text>
                <Link to="/app/inquiries" style={{ textDecoration: "none" }}>
                  <Text fontSize="0.8125rem" color={APP_MUTED} fontWeight="500" _hover={{ color: APP_ACCENT }}>
                    View all
                  </Text>
                </Link>
              </Box>
              <Box display="flex" gap={2} overflowX="auto" pb={0.5}>
                <Box
                  display="inline-flex" alignItems="center" gap={1.5}
                  px={3} py={1.5} borderRadius="6px" fontSize="0.8125rem" fontWeight="500"
                  color={APP_MUTED} bg="white" border={`1px solid ${APP_BORDER}`}
                >
                  <LuInbox size={12} /> {inquiries.length} total
                </Box>
                <Link to="/app/finance" style={{ textDecoration: "none" }}>
                  <Box
                    display="inline-flex" alignItems="center" gap={1.5}
                    px={3} py={1.5} borderRadius="6px" fontSize="0.8125rem" fontWeight="500"
                    color={APP_MUTED} bg="white" border={`1px solid ${APP_BORDER}`}
                    _hover={{ borderColor: APP_ACCENT, color: APP_INK }}
                  >
                    <LuWallet size={12} /> Finance
                  </Box>
                </Link>
              </Box>
            </Box>

            {recentInquiries.map((inq, i) => (
              <AppListRow
                key={inq.id}
                href={`/app/inquiries/${inq.id}`}
                isLast={i === recentInquiries.length - 1}
              >
                <Box flex="1" minW={0}>
                  <Text fontSize="0.9375rem" fontWeight="600" color={APP_INK} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {inq.title}
                  </Text>
                  <Text fontSize="0.75rem" color={APP_LABEL} mt={0.5}>
                    {new Date(inq.createdAt).toLocaleDateString("tr-TR")}
                    {inq.project?.name ? ` · ${inq.project.name}` : inq.category?.name ? ` · ${inq.category.name}` : ""}
                  </Text>
                </Box>
                <AppStatusText label={INQUIRY_STATUS_LABELS[inq.status] ?? formatStatusLabel(inq.status)} />
              </AppListRow>
            ))}
          </Box>
        </Stack>
      )}
    </PageShell>
  )
}
