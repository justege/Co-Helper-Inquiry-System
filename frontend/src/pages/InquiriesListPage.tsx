import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { FormNativeSelect } from "@/components/ui/form-controls"
import {
  getMyInquiries,
  type Inquiry,
  type InquiryStatus,
  type BusinessType,
} from "../api/inquiries"
import { getMe } from "../api/users"
import { getMyWorkspace } from "../api/workspace"
import { PageShell } from "@/components/ui/PageShell"
import { ClientJobsEmptyState, FeatureEmptyState, InquiryMockup, StartWorkspaceEmptyState } from "@/components/ui/FeatureEmptyState"
import { LuPlus } from "react-icons/lu"
import { AppButton } from "@/components/ui/AppButton"
import {
  APP_BORDER,
  APP_BG_SUBTLE,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
  AppFilterChip,
  AppListRow,
  AppStatusText,
  formatStatusLabel,
} from "@/components/ui/appUi"

const STATUS_LABELS: Record<InquiryStatus, string> = {
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

const ALL_STATUSES: InquiryStatus[] = ["pending", "matching", "offered", "accepted", "in_progress", "waiting", "delivered", "escalated", "cancelled"]

export default function InquiriesListPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | "all">("all")
  const [filterType, setFilterType] = useState<BusinessType | "all">("all")
  const [isFreelancer, setIsFreelancer] = useState(false)
  const [invitedToWorkspace, setInvitedToWorkspace] = useState(false)

  const location = useLocation()

  useEffect(() => {
    getMe()
      .then((me) => {
        const freelancer = me.role === "expert"
        setIsFreelancer(freelancer)
        if (freelancer) return null
        return getMyWorkspace()
      })
      .then((ws) => {
        if (ws?.role === "client") setInvitedToWorkspace(ws.workspaces.length > 0)
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getMyInquiries()
      .then((data) => { if (!cancelled) setInquiries(data) })
      .catch((err: Error) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [location.key])

  const counts = useMemo(() => inquiries.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1
    return acc
  }, {}), [inquiries])

  const typeCounts = useMemo(() => ({
    service: inquiries.filter((i) => i.type === "service").length,
    tool_sourcing: inquiries.filter((i) => i.type === "tool_sourcing").length,
  }), [inquiries])

  const filtered = inquiries.filter((i) => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false
    if (filterType !== "all" && i.type !== filterType) return false
    return true
  })

  return (
    <PageShell
      eyebrow="Jobs"
      title="My jobs"
      subtitle={loading ? undefined : `${inquiries.length} total`}
      action={
        <Link to="/app/inquiries/new" style={{ textDecoration: "none" }}>
          <AppButton
            size="sm" h="34px" px={4}
            bg="rgba(255,255,255,0.12)" color="white" fontWeight="600" fontSize="0.8125rem"
            borderRadius="8px" border="1px solid rgba(255,255,255,0.25)"
            _hover={{ bg: "rgba(255,255,255,0.2)" }}
          >
            New job
          </AppButton>
        </Link>
      }
    >
      {loading && (
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      )}

      {error && (
        <Box {...APP_CARD} p={5}>
          <Text fontSize="sm" color={APP_INK}>{error}</Text>
        </Box>
      )}

      {!loading && !error && inquiries.length === 0 && (
        isFreelancer ? (
          <FeatureEmptyState
            title="Import a Trello board or open a job"
            bullets={[
              "Connect Trello and turn each column into a project",
              "Cards become jobs; checklists and comments become to-dos",
              "Invite a company so they can follow the work",
            ]}
            cta={
              <Box display="flex" gap={2} flexWrap="wrap">
                <Link to="/app/trello" style={{ textDecoration: "none" }}>
                  <AppButton size="md" h="42px" px={6} fontSize="0.9375rem">
                    Connect Trello
                  </AppButton>
                </Link>
                <Link to="/app/inquiries/new" style={{ textDecoration: "none" }}>
                  <AppButton variant="secondary" size="md">
                    <LuPlus size={16} /> New job
                  </AppButton>
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
      )}

      {!loading && !error && inquiries.length > 0 && (
        <Box {...APP_CARD}>
          <Box px={5} py={3} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={3} mb={2} flexWrap="wrap">
              <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>Inquiries</Text>
              <Text fontSize="0.75rem" color={APP_LABEL}>
                {filtered.length} of {inquiries.length}
              </Text>
            </Box>
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <FormNativeSelect
                selectSize="sm"
                rootProps={{ w: { base: "full", sm: "180px" } }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as InquiryStatus | "all")}
              >
                <option value="all">All statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </FormNativeSelect>
              <FormNativeSelect
                selectSize="sm"
                rootProps={{ w: { base: "full", sm: "140px" } }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as BusinessType | "all")}
              >
                <option value="all">All types</option>
                <option value="service">Service</option>
                <option value="tool_sourcing">Fixed Project</option>
              </FormNativeSelect>
            </Box>
            {(filterStatus !== "all" || filterType !== "all") && (
              <Box display="flex" gap={1.5} overflowX="auto" mt={2} pb={0.5}>
                <AppFilterChip active={filterStatus === "all" && filterType === "all"} onClick={() => { setFilterStatus("all"); setFilterType("all") }}>
                  Show all
                </AppFilterChip>
              </Box>
            )}
            {inquiries.length > 0 && filterStatus === "all" && filterType === "all" && (
              <Box display="flex" gap={1.5} overflowX="auto" mt={2} pb={0.5}>
                {ALL_STATUSES.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
                  <AppFilterChip key={s} active={false} onClick={() => setFilterStatus(s)}>
                    {STATUS_LABELS[s]} · {counts[s]}
                  </AppFilterChip>
                ))}
                {typeCounts.service > 0 && (
                  <AppFilterChip active={false} onClick={() => setFilterType("service")}>
                    Service · {typeCounts.service}
                  </AppFilterChip>
                )}
                {typeCounts.tool_sourcing > 0 && (
                  <AppFilterChip active={false} onClick={() => setFilterType("tool_sourcing")}>
                    Fixed Project · {typeCounts.tool_sourcing}
                  </AppFilterChip>
                )}
              </Box>
            )}
          </Box>

          {filtered.length === 0 && inquiries.length > 0 ? (
            <Box px={5} py={8} textAlign="center">
              <Text color={APP_MUTED} fontSize="0.875rem">No inquiries match the selected filters.</Text>
            </Box>
          ) : filtered.length === 0 ? null : (
            filtered.map((inq, i) => (
              <AppListRow key={inq.id} href={`/app/jobs/${inq.id}`} isLast={i === filtered.length - 1}>
                <Box flex="1" minW={0}>
                  <Text fontSize="0.9375rem" fontWeight="600" color={APP_INK} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {inq.title}
                  </Text>
                  <Box display="flex" alignItems="center" gap={2} mt={1} flexWrap="wrap">
                    <Text fontSize="0.75rem" color={APP_LABEL}>{inq.project?.name ?? inq.category?.name ?? "—"}</Text>
                    <Text fontSize="0.75rem" color={APP_LABEL}>·</Text>
                    <Text fontSize="0.75rem" color={APP_LABEL}>
                      {new Date(inq.createdAt).toLocaleDateString("tr-TR")}
                    </Text>
                    <Text fontSize="0.75rem" color={APP_LABEL}>·</Text>
                    <Text fontSize="0.75rem" color={APP_MUTED} textTransform="capitalize">
                      {inq.type === "tool_sourcing" ? "Fixed Project" : "Ongoing Service"}
                    </Text>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={4} flexShrink={0}>
                  <Text fontSize="0.75rem" color={APP_MUTED} display={{ base: "none", sm: "block" }} textTransform="capitalize">
                    {inq.urgency}
                  </Text>
                  <AppStatusText label={STATUS_LABELS[inq.status] ?? formatStatusLabel(inq.status)} />
                </Box>
              </AppListRow>
            ))
          )}
        </Box>
      )}
    </PageShell>
  )
}
