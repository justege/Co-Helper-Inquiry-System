import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuthContext } from "../components/auth/AuthContext"
import { getMe, type User } from "../api/users"
import { getMyInquiries, type Inquiry, type InquiryStatus } from "../api/inquiries"
import { Box, Button, Spinner, Stack, Text } from "@chakra-ui/react"
import { LuInbox, LuPenLine } from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
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

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: "Submitted",
  matching: "Matching",
  offered: "Offer received",
  accepted: "Accepted",
  in_progress: "In production",
  delivered: "Delivered",
  escalated: "Escalated",
  cancelled: "Cancelled",
}

function StatLink({ to, icon, label, count }: { to: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <Link to={to} style={{ textDecoration: "none", flexShrink: 0 }}>
      <Box
        display="inline-flex"
        alignItems="center"
        gap={1.5}
        px={3}
        py={1.5}
        borderRadius="6px"
        fontSize="0.8125rem"
        fontWeight="500"
        color={APP_MUTED}
        bg="white"
        border={`1px solid ${APP_BORDER}`}
        transition="all 0.1s"
        _hover={{ borderColor: APP_ACCENT, color: APP_INK }}
        whiteSpace="nowrap"
      >
        {icon}
        {label} · {count}
      </Box>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuthContext()
  const [profile, setProfile] = useState<User | null>(null)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([getMe(), getMyInquiries()]).then(
      ([profileRes, inquiriesRes]) => {
        if (profileRes.status === "fulfilled") setProfile(profileRes.value)
        if (inquiriesRes.status === "fulfilled") setInquiries(inquiriesRes.value)
        setLoading(false)
      },
    )
  }, [])

  const firstName = profile?.firstName ?? user?.email?.split("@")[0] ?? ""
  const offerCount = inquiries.filter((i) => i.status === "offered").length
  const activeCount = inquiries.filter((i) => ["accepted", "in_progress"].includes(i.status)).length
  const recentInquiries = inquiries.slice(0, 8)

  return (
    <PageShell
      eyebrow="B2B Marketplace"
      title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
      subtitle={
        loading
          ? undefined
          : profile?.companyName ?? `${inquiries.length} inquiries`
      }
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
      {loading ? (
        <Box display="flex" alignItems="center" gap={2} py={6}>
          <Spinner size="sm" color="gray.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      ) : (
        <Stack gap={4}>
          <Box {...APP_CARD}>
            <Box px={5} py={3} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={3} mb={2} flexWrap="wrap">
                <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>Recent inquiries</Text>
                <Link to="/app/inquiries" style={{ textDecoration: "none" }}>
                  <Text fontSize="0.8125rem" color={APP_MUTED} fontWeight="500" _hover={{ color: APP_ACCENT }}>
                    View all
                  </Text>
                </Link>
              </Box>
              <Box display="flex" gap={1.5} overflowX="auto" pb={0.5}>
                <StatLink to="/app/inquiries" icon={<LuInbox size={12} />} label="Inquiries" count={inquiries.length} />
                <StatLink to="/app/inquiries" icon={<LuPenLine size={12} />} label="Offers" count={offerCount} />
                <StatLink to="/app/inquiries" icon={<LuInbox size={12} />} label="Active" count={activeCount} />
              </Box>
            </Box>

            {inquiries.length === 0 ? (
              <Box px={5} py={10} textAlign="center">
                <Text fontSize="0.875rem" color={APP_MUTED} mb={4}>No inquiries yet.</Text>
                <Link to="/app/inquiries/new" style={{ textDecoration: "none" }}>
                  <Button {...APP_BTN_PRIMARY} size="sm">Post your first inquiry</Button>
                </Link>
              </Box>
            ) : (
              <>
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
                      <Text fontSize="0.75rem" color={APP_LABEL} mt={1}>
                        {new Date(inq.createdAt).toLocaleDateString("tr-TR")}
                        {inq.category?.name ? ` · ${inq.category.name}` : ""}
                      </Text>
                    </Box>
                    <AppStatusText label={INQUIRY_STATUS_LABELS[inq.status] ?? formatStatusLabel(inq.status)} />
                  </AppListRow>
                ))}
              </>
            )}
          </Box>
        </Stack>
      )}
    </PageShell>
  )
}
