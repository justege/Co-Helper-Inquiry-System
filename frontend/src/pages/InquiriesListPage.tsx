import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Button, NativeSelect, Spinner, Text } from "@chakra-ui/react"
import {
  getMyInquiries,
  type Inquiry,
  type InquiryStatus,
  type BusinessType,
} from "../api/inquiries"
import { PageShell } from "@/components/ui/PageShell"
import {
  APP_BORDER,
  APP_BG_SUBTLE,
  APP_BTN_PRIMARY,
  APP_CARD,
  APP_INPUT_STYLE,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
  AppFilterChip,
  AppListRow,
  AppStatusText,
  formatStatusLabel,
} from "@/components/ui/appUi"

const STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: "Submitted",
  matching: "Matching",
  offered: "Offer received",
  accepted: "Accepted",
  in_progress: "In production",
  delivered: "Delivered",
  escalated: "Escalated",
  cancelled: "Cancelled",
}

const ALL_STATUSES: InquiryStatus[] = ["pending", "matching", "offered", "accepted", "in_progress", "delivered", "escalated", "cancelled"]

export default function InquiriesListPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | "all">("all")
  const [filterType, setFilterType] = useState<BusinessType | "all">("all")

  useEffect(() => {
    getMyInquiries()
      .then(setInquiries)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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
      eyebrow="Marketplace"
      title="My inquiries"
      subtitle={loading ? undefined : `${inquiries.length} total`}
      action={
        <Link to="/app/inquiries/new" style={{ textDecoration: "none" }}>
          <Button
            size="sm" h="34px" px={4}
            bg="rgba(255,255,255,0.12)" color="white" fontWeight="600" fontSize="0.8125rem"
            borderRadius="8px" border="1px solid rgba(255,255,255,0.25)"
            _hover={{ bg: "rgba(255,255,255,0.2)" }}
          >
            New inquiry
          </Button>
        </Link>
      }
    >
      {loading && (
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="gray.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      )}

      {error && (
        <Box {...APP_CARD} p={5}>
          <Text fontSize="sm" color={APP_INK}>{error}</Text>
        </Box>
      )}

      {!loading && !error && (
        <Box {...APP_CARD}>
          <Box px={5} py={3} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={3} mb={2} flexWrap="wrap">
              <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>Inquiries</Text>
              <Text fontSize="0.75rem" color={APP_LABEL}>
                {filtered.length} of {inquiries.length}
              </Text>
            </Box>
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <NativeSelect.Root {...APP_INPUT_STYLE} size="sm" w={{ base: "full", sm: "180px" }} h="34px">
                <NativeSelect.Field
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as InquiryStatus | "all")}
                >
                  <option value="all">All statuses</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <NativeSelect.Root {...APP_INPUT_STYLE} size="sm" w={{ base: "full", sm: "140px" }} h="34px">
                <NativeSelect.Field
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as BusinessType | "all")}
                >
                  <option value="all">All types</option>
                  <option value="service">Service</option>
                  <option value="tool_sourcing">Sourcing</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
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
                    Sourcing · {typeCounts.tool_sourcing}
                  </AppFilterChip>
                )}
              </Box>
            )}
          </Box>

          {filtered.length === 0 ? (
            <Box px={5} py={10} textAlign="center">
              <Text color={APP_MUTED} mb={4} fontSize="0.875rem">
                {inquiries.length === 0
                  ? "You haven't posted any inquiries yet."
                  : "No inquiries match the selected filters."}
              </Text>
              {inquiries.length === 0 && (
                <Link to="/app/inquiries/new" style={{ textDecoration: "none" }}>
                  <Button {...APP_BTN_PRIMARY} size="sm">Post your first inquiry</Button>
                </Link>
              )}
            </Box>
          ) : (
            filtered.map((inq, i) => (
              <AppListRow key={inq.id} href={`/app/inquiries/${inq.id}`} isLast={i === filtered.length - 1}>
                <Box flex="1" minW={0}>
                  <Text fontSize="0.9375rem" fontWeight="600" color={APP_INK} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {inq.title}
                  </Text>
                  <Box display="flex" alignItems="center" gap={2} mt={1} flexWrap="wrap">
                    <Text fontSize="0.75rem" color={APP_LABEL}>{inq.category?.name ?? "—"}</Text>
                    <Text fontSize="0.75rem" color={APP_LABEL}>·</Text>
                    <Text fontSize="0.75rem" color={APP_LABEL}>
                      {new Date(inq.createdAt).toLocaleDateString("tr-TR")}
                    </Text>
                    <Text fontSize="0.75rem" color={APP_LABEL}>·</Text>
                    <Text fontSize="0.75rem" color={APP_MUTED} textTransform="capitalize">
                      {inq.type === "tool_sourcing" ? "Sourcing" : "Service"}
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
