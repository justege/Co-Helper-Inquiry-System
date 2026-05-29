import { useEffect, useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Grid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react"
import { FormInput, FormNativeSelect } from "@/components/ui/form-controls"
import {
  LuArrowRight,
  LuRefreshCw,
  LuSearch,
} from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { AdminInquiriesEmptyState } from "@/components/ui/FeatureEmptyState"
import { api } from "@/lib/api"
import {
  APP_ACCENT,
  APP_BORDER,
  APP_BG_SUBTLE,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
  AppFilterChip,
  AppStatusText,
  formatStatusLabel,
} from "@/components/ui/appUi"

interface AdminInquiry {
  id: string
  title: string
  type: string
  urgency: string
  status: string
  createdAt: string
  assignedExpertId: string | null
  category: { id: string; name: string } | null
  client: { id: string; email: string; firstName: string | null; lastName: string | null; companyName: string | null }
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  matching: "Matching",
  offered: "Offered",
  accepted: "Accepted",
  in_progress: "In Production",
  delivered: "Delivered",
  escalated: "Escalated",
  cancelled: "Cancelled",
}

const PIPELINE_STAGES = [
  { key: "intake", label: "Intake", statuses: ["pending", "matching"] as const },
  { key: "offers", label: "Offers", statuses: ["offered", "escalated"] as const },
  { key: "active", label: "Production", statuses: ["accepted", "in_progress"] as const },
  { key: "done", label: "Closed", statuses: ["delivered", "cancelled"] as const },
] as const

export default function AdminInquiriesListPage() {
  const navigate = useNavigate()
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    api.get<AdminInquiry[]>("/api/admin/inquiries")
      .then(setInquiries)
      .catch(() => setInquiries([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => inquiries.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1
    return acc
  }, {}), [inquiries])

  const stageCounts = useMemo(() =>
    PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: stage.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0),
    })),
  [counts])

  const needsAttention = useMemo(
    () => (counts.pending ?? 0) + (counts.matching ?? 0) + (counts.offered ?? 0) + (counts.escalated ?? 0),
    [counts],
  )

  const filtered = inquiries.filter((inq) => {
    if (statusFilter !== "all") {
      if (statusFilter === "needs_attention") {
        if (!["pending", "matching", "offered", "escalated"].includes(inq.status)) return false
      } else if (statusFilter.startsWith("group:")) {
        const groupKey = statusFilter.replace("group:", "")
        const group = PIPELINE_STAGES.find((g) => g.key === groupKey)
        if (group && !group.statuses.some((s) => s === inq.status)) return false
      } else if (inq.status !== statusFilter) {
        return false
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        inq.title.toLowerCase().includes(q) ||
        inq.client.email.toLowerCase().includes(q) ||
        (inq.client.companyName ?? "").toLowerCase().includes(q) ||
        (inq.category?.name ?? "").toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <PageShell
      eyebrow="Administration"
      title="Inquiry Dashboard"
      subtitle={loading ? undefined : `${inquiries.length} inquiries`}
      wide
    >
      <Stack gap={4}>
        {!loading && inquiries.length === 0 && <AdminInquiriesEmptyState />}

        <Box {...APP_CARD} display={{ base: "none", lg: inquiries.length === 0 ? "none" : "block" }}>
          <Box px={5} py={3} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
            <Box display="flex" gap={3} alignItems="center" flexWrap="wrap" justifyContent="space-between" mb={2}>
              <Box display="flex" gap={2} alignItems="center" flex="1" minW="240px" maxW="400px">
                <Box position="relative" flex="1">
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color={APP_LABEL} zIndex={1}>
                    <LuSearch size={14} />
                  </Box>
                  <FormInput
                    size="sm"
                    h="34px"
                    pl={9}
                    placeholder="Search inquiries…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Box>
              </Box>
              <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                <FormNativeSelect
                  selectSize="sm"
                  rootProps={{ w: "160px" }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="needs_attention">Needs attention</option>
                  {PIPELINE_STAGES.map((group) => (
                    <option key={group.key} value={`group:${group.key}`}>{group.label}</option>
                  ))}
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </FormNativeSelect>
                <Button
                  variant="ghost"
                  size="sm"
                  h="34px"
                  borderRadius="8px"
                  color={APP_MUTED}
                  fontWeight="600"
                  onClick={load}
                  display="inline-flex"
                  gap={1.5}
                >
                  <LuRefreshCw size={13} />
                </Button>
                <Text fontSize="0.75rem" color={APP_LABEL} whiteSpace="nowrap">
                  {filtered.length} of {inquiries.length}
                </Text>
              </Box>
            </Box>
            <Box display="flex" gap={1.5} overflowX="auto" pb={0.5}>
              <AppFilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
                All
              </AppFilterChip>
              {needsAttention > 0 && (
                <AppFilterChip
                  active={statusFilter === "needs_attention"}
                  onClick={() => setStatusFilter(statusFilter === "needs_attention" ? "all" : "needs_attention")}
                >
                  Needs attention · {needsAttention}
                </AppFilterChip>
              )}
              {stageCounts.map((stage) => (
                <AppFilterChip
                  key={stage.key}
                  active={statusFilter === `group:${stage.key}`}
                  onClick={() => setStatusFilter(statusFilter === `group:${stage.key}` ? "all" : `group:${stage.key}`)}
                >
                  {stage.label} · {stage.count}
                </AppFilterChip>
              ))}
            </Box>
          </Box>

          <Grid
            templateColumns="3fr 1.2fr 100px 120px 110px 36px"
            gap={3}
            px={5}
            py={3}
            borderBottom={`1px solid ${APP_BORDER}`}
            bg={APP_BG_SUBTLE}
          >
            {["Inquiry", "Category", "Urgency", "Status", "Submitted", ""].map((h) => (
              <Text key={h} fontSize="0.625rem" fontWeight="600" color={APP_LABEL} textTransform="uppercase" letterSpacing="0.06em">
                {h}
              </Text>
            ))}
          </Grid>

          {loading ? (
            <Box px={5} py={8} display="flex" alignItems="center" gap={2}>
              <Spinner size="sm" color="green.500" />
              <Text fontSize="sm" color={APP_MUTED}>Loading inquiries…</Text>
            </Box>
          ) : filtered.length === 0 ? (
            <Box px={5} py={10} textAlign="center">
              <Text fontSize="sm" color={APP_LABEL} fontWeight="500">
                {search || statusFilter !== "all" ? "No inquiries match your filters." : "No inquiries yet."}
              </Text>
            </Box>
          ) : (
            filtered.map((inq, i) => (
              <Box
                key={inq.id}
                px={5}
                py={3.5}
                borderBottom={i < filtered.length - 1 ? `1px solid ${APP_BORDER}` : undefined}
                _hover={{ bg: APP_BG_SUBTLE }}
                transition="background 0.1s"
                cursor="pointer"
                onClick={() => navigate(`/app/admin/inquiries/${inq.id}`)}
              >
                <Grid templateColumns="3fr 1.2fr 100px 120px 110px 36px" gap={3} alignItems="center">
                  <Box minW={0}>
                    <Text fontSize="0.875rem" fontWeight="600" color={APP_INK} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                      {inq.title}
                    </Text>
                    <Text fontSize="0.75rem" color={APP_LABEL} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" mt="1px">
                      {inq.client.companyName ?? inq.client.email}
                      {inq.assignedExpertId ? " · Partner assigned" : ""}
                    </Text>
                  </Box>
                  <Text fontSize="0.8rem" color={APP_MUTED}>{inq.category?.name ?? "—"}</Text>
                  <Text fontSize="0.8rem" fontWeight="500" color={APP_MUTED} textTransform="capitalize">
                    {inq.urgency}
                  </Text>
                  <AppStatusText label={STATUS_LABELS[inq.status] ?? formatStatusLabel(inq.status)} />
                  <Text fontSize="0.75rem" color={APP_LABEL}>
                    {new Date(inq.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </Text>
                  <Box
                    as="span"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w="30px"
                    h="30px"
                    borderRadius="7px"
                    border={`1px solid ${APP_BORDER}`}
                    bg={APP_BG_SUBTLE}
                    color={APP_MUTED}
                  >
                    <LuArrowRight size={13} />
                  </Box>
                </Grid>
              </Box>
            ))
          )}
        </Box>

        <Box {...APP_CARD} display={{ base: inquiries.length === 0 ? "none" : "block", lg: "none" }}>
          <Box px={4} py={3} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
            <Box position="relative" mb={2}>
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color={APP_LABEL} zIndex={1}>
                <LuSearch size={14} />
              </Box>
              <FormInput
                size="sm"
                h="34px"
                pl={9}
                placeholder="Search inquiries…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>
            <Box display="flex" gap={1.5} overflowX="auto" pb={0.5}>
              <AppFilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</AppFilterChip>
              {stageCounts.map((stage) => (
                <AppFilterChip
                  key={stage.key}
                  active={statusFilter === `group:${stage.key}`}
                  onClick={() => setStatusFilter(statusFilter === `group:${stage.key}` ? "all" : `group:${stage.key}`)}
                >
                  {stage.label} · {stage.count}
                </AppFilterChip>
              ))}
            </Box>
          </Box>
        </Box>

        <Stack gap={3} display={{ base: "flex", lg: "none" }}>
          {loading ? (
            <Box {...APP_CARD} p={6} display="flex" alignItems="center" gap={2}>
              <Spinner size="sm" color="green.500" />
              <Text fontSize="sm" color={APP_MUTED}>Loading inquiries…</Text>
            </Box>
          ) : filtered.length === 0 ? (
            <Box {...APP_CARD} p={8} textAlign="center">
              <Text fontSize="sm" color={APP_LABEL}>
                {search || statusFilter !== "all" ? "No inquiries match your filters." : "No inquiries yet."}
              </Text>
            </Box>
          ) : (
            filtered.map((inq) => (
              <Box
                key={inq.id}
                {...APP_CARD}
                p={4}
                cursor="pointer"
                onClick={() => navigate(`/app/admin/inquiries/${inq.id}`)}
                _hover={{ borderColor: APP_ACCENT }}
                transition="border-color 0.12s"
              >
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={3} mb={3}>
                  <Box minW={0}>
                    <Text fontSize="0.9375rem" fontWeight="600" color={APP_INK} lineHeight="1.35">{inq.title}</Text>
                    <Text fontSize="0.8125rem" color={APP_LABEL} mt={1}>
                      {inq.client.companyName ?? inq.client.email}
                    </Text>
                  </Box>
                  <AppStatusText label={STATUS_LABELS[inq.status] ?? formatStatusLabel(inq.status)} />
                </Box>
                <Grid templateColumns="1fr 1fr" gap={2}>
                  <Text fontSize="0.75rem" color={APP_MUTED}>{inq.category?.name ?? "—"}</Text>
                  <Text fontSize="0.75rem" fontWeight="500" color={APP_MUTED} textTransform="capitalize" textAlign="right">
                    {inq.urgency}
                  </Text>
                </Grid>
                <Text fontSize="0.6875rem" color={APP_LABEL} mt={3}>
                  Submitted {new Date(inq.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {inq.assignedExpertId ? " · Partner assigned" : ""}
                </Text>
              </Box>
            ))
          )}
        </Stack>
      </Stack>
    </PageShell>
  )
}
