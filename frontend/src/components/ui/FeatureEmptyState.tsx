import { useState, type ReactNode } from "react"
import { Box, Stack, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import {
  LuInbox,
  LuStar,
  LuBuilding2,
  LuClipboardList,
  LuUsers,
  LuPlus,
} from "react-icons/lu"
import { createMyWorkspace } from "@/api/workspace"
import { AppButton } from "@/components/ui/AppButton"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
} from "./appUi"

// ── Generic layout ────────────────────────────────────────────────────────────

export function FeatureEmptyState({
  title,
  bullets = [],
  stats,
  cta,
  mockup,
}: {
  title: string
  bullets?: string[]
  stats?: { label: string; value: string; hint?: string }[]
  cta?: ReactNode
  mockup?: ReactNode
}) {
  return (
    <Box
      bg="white"
      border={`1px solid ${APP_BORDER}`}
      borderRadius="16px"
      boxShadow="0 8px 28px rgba(14,27,23,0.06), 0 1px 3px rgba(14,27,23,0.04)"
      px={{ base: 7, md: 12 }}
      py={{ base: 8, md: 12 }}
      display="flex"
      alignItems="center"
      gap={{ base: 0, md: 12 }}
      flexDir={{ base: "column", md: "row" }}
      overflow="hidden"
    >
      <Box flex="1" minW={0}>
        <Text
          fontSize={{ base: "1.5rem", md: "1.75rem" }}
          fontWeight="700"
          color={APP_INK}
          letterSpacing="-0.03em"
          lineHeight="1.2"
          mb={bullets.length || stats?.length ? 5 : 0}
          maxW="420px"
        >
          {title}
        </Text>

        {stats && stats.length > 0 && (
          <Box display={{ base: "grid", md: "none" }} gridTemplateColumns="1fr 1fr" gap={3} mb={cta ? 6 : 0}>
            {stats.map((stat) => (
              <Box key={stat.label} bg={APP_BG_SUBTLE} border={`1px solid ${APP_BORDER}`} borderRadius="12px" p={3}>
                <Text fontSize="0.65rem" fontWeight="700" color={APP_LABEL} textTransform="uppercase" letterSpacing="0.04em">{stat.label}</Text>
                <Text fontSize="1.25rem" fontWeight="800" color={APP_INK} letterSpacing="-0.03em">{stat.value}</Text>
                {stat.hint && <Text fontSize="0.7rem" color={APP_MUTED}>{stat.hint}</Text>}
              </Box>
            ))}
          </Box>
        )}

        {bullets.length > 0 && (
          <Stack gap={4} mb={cta ? 8 : 0}>
            {bullets.map((bullet) => (
              <Box key={bullet} display="flex" alignItems="flex-start" gap={3}>
                <Box
                  w="18px"
                  h="18px"
                  mt="2px"
                  flexShrink={0}
                  borderRadius="full"
                  bg={APP_ACCENT}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Box>
                <Text fontSize="0.9375rem" color="#374151" lineHeight="1.5">
                  {bullet}
                </Text>
              </Box>
            ))}
          </Stack>
        )}

        {cta && <Box mt={0}>{cta}</Box>}
      </Box>

      {stats && stats.length > 0 ? (
        <Box display={{ base: "none", md: "grid" }} gridTemplateColumns="1fr 1fr" gap={3} w="100%" maxW="340px" flexShrink={0}>
          {stats.map((stat) => (
            <Box key={stat.label} bg={APP_BG_SUBTLE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={4}>
              <Text fontSize="0.65rem" fontWeight="700" color={APP_LABEL} textTransform="uppercase" letterSpacing="0.04em">{stat.label}</Text>
              <Text fontSize="1.5rem" fontWeight="800" color={APP_INK} letterSpacing="-0.03em" mt={1}>{stat.value}</Text>
              {stat.hint && <Text fontSize="0.75rem" color={APP_MUTED} mt={1}>{stat.hint}</Text>}
            </Box>
          ))}
        </Box>
      ) : mockup}
    </Box>
  )
}

// ── Mockup cards ──────────────────────────────────────────────────────────────

/** Project card mockup — used on Projects and project detail. */
export function ProjectMockup() {
  return (
    <Box
      w="100%"
      maxW="340px"
      flexShrink={0}
      position="relative"
      display={{ base: "none", md: "block" }}
    >
      <Box
        position="absolute"
        top="16px" right="-8px"
        w="88%" h="90%"
        bg="#F0F2F5"
        borderRadius="12px"
        border="1px solid #E5E7EB"
      />
      <Box
        position="relative"
        bg="white"
        border="1px solid #E5E7EB"
        borderRadius="12px"
        p={5}
        boxShadow="0 4px 24px rgba(14,27,23,0.07)"
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box w="28px" h="28px" bg="#E8F5EF" borderRadius="8px" display="flex" alignItems="center" justifyContent="center">
              <LuClipboardList size={14} color={APP_ACCENT} />
            </Box>
            <Box>
              <Text fontSize="0.75rem" fontWeight="700" color={APP_INK} letterSpacing="-0.01em">PRJ-0042</Text>
              <Text fontSize="0.6875rem" color={APP_MUTED}>Shared project</Text>
            </Box>
          </Box>
          <Box px={2.5} py={1} borderRadius="6px" bg="#E8F5EF" fontSize="0.6875rem" fontWeight="600" color={APP_ACCENT}>
            Active
          </Box>
        </Box>

        <Text fontSize="0.875rem" fontWeight="600" color={APP_INK} mb={1} letterSpacing="-0.015em">
          Website rebuild
        </Text>
        <Text fontSize="0.75rem" color={APP_MUTED} mb={4}>Acme Studio · 2 collaborators</Text>

        {[
          { label: "Client", value: "Acme Studio" },
          { label: "Rate", value: "€65 / hour" },
          { label: "Hours", value: "12.5 logged" },
        ].map(({ label, value }) => (
          <Box
            key={label}
            display="flex"
            justifyContent="space-between"
            py={2}
            borderBottom="1px solid #F3F4F6"
            _last={{ borderBottom: "none" }}
          >
            <Text fontSize="0.75rem" color={APP_LABEL}>{label}</Text>
            <Text fontSize="0.75rem" fontWeight="500" color={APP_INK}>{value}</Text>
          </Box>
        ))}

        <Box display="flex" gap={2} mt={4}>
          {["Brief", "Chat"].map((p) => (
            <Box key={p} px={2.5} py={1} bg={APP_BG_SUBTLE} border={`1px solid ${APP_BORDER}`} borderRadius="6px" fontSize="0.6875rem" fontWeight="500" color={APP_MUTED}>
              {p}
            </Box>
          ))}
          <Box px={2.5} py={1} bg="#FFF7ED" border="1px solid #FED7AA" borderRadius="6px" fontSize="0.6875rem" fontWeight="600" color="#C2410C">
            2 to-dos
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

/** Inquiry card mockup — used on Dashboard and InquiriesListPage */
export function InquiryMockup() {
  return (
    <Box
      w="100%"
      maxW="340px"
      flexShrink={0}
      position="relative"
      display={{ base: "none", md: "block" }}
    >
      <Box
        position="absolute"
        top="16px" right="-8px"
        w="88%" h="90%"
        bg="#F0F2F5"
        borderRadius="12px"
        border="1px solid #E5E7EB"
      />
      <Box
        position="relative"
        bg="white"
        border="1px solid #E5E7EB"
        borderRadius="12px"
        p={5}
        boxShadow="0 4px 24px rgba(14,27,23,0.07)"
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box w="28px" h="28px" bg="#E8F5EF" borderRadius="8px" display="flex" alignItems="center" justifyContent="center">
              <LuInbox size={14} color={APP_ACCENT} />
            </Box>
            <Box>
              <Text fontSize="0.75rem" fontWeight="700" color={APP_INK} letterSpacing="-0.01em">INQ-0042</Text>
              <Text fontSize="0.6875rem" color={APP_MUTED}>New inquiry</Text>
            </Box>
          </Box>
          <Box px={2.5} py={1} borderRadius="6px" bg="#E8F5EF" fontSize="0.6875rem" fontWeight="600" color={APP_ACCENT}>
            Active
          </Box>
        </Box>

        <Text fontSize="0.875rem" fontWeight="600" color={APP_INK} mb={1} letterSpacing="-0.015em">
          Website redesign &amp; SEO
        </Text>
        <Text fontSize="0.75rem" color={APP_MUTED} mb={4}>Web Design · eCommerce</Text>

        {[
          { label: "Budget", value: "€2,000 – €5,000" },
          { label: "Timeline", value: "4 – 6 weeks" },
          { label: "Status", value: "Matching partners" },
        ].map(({ label, value }) => (
          <Box
            key={label}
            display="flex"
            justifyContent="space-between"
            py={2}
            borderBottom="1px solid #F3F4F6"
            _last={{ borderBottom: "none" }}
          >
            <Text fontSize="0.75rem" color={APP_LABEL}>{label}</Text>
            <Text fontSize="0.75rem" fontWeight="500" color={APP_INK}>{value}</Text>
          </Box>
        ))}

        <Box display="flex" gap={2} mt={4}>
          {["Partner A", "Partner B"].map((p) => (
            <Box key={p} px={2.5} py={1} bg={APP_BG_SUBTLE} border={`1px solid ${APP_BORDER}`} borderRadius="6px" fontSize="0.6875rem" fontWeight="500" color={APP_MUTED}>
              {p}
            </Box>
          ))}
          <Box px={2.5} py={1} bg="#FFF7ED" border="1px solid #FED7AA" borderRadius="6px" fontSize="0.6875rem" fontWeight="600" color="#C2410C">
            2 offers
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

/** Partner card mockup — used on AdminExpertsListPage */
export function PartnerMockup() {
  return (
    <Box
      w="100%"
      maxW="300px"
      flexShrink={0}
      position="relative"
      display={{ base: "none", md: "block" }}
    >
      <Box
        position="absolute"
        top="16px" right="-8px"
        w="88%" h="90%"
        bg="#F0F2F5"
        borderRadius="12px"
        border="1px solid #E5E7EB"
      />
      <Box
        position="relative"
        bg="white"
        border="1px solid #E5E7EB"
        borderRadius="12px"
        p={5}
        boxShadow="0 4px 24px rgba(14,27,23,0.07)"
      >
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={4}>
          <Box display="flex" alignItems="flex-start" gap={3}>
            <Box
              w="40px" h="40px" flexShrink={0}
              bg="#E8F5EF" borderRadius="10px"
              display="flex" alignItems="center" justifyContent="center"
              fontSize="0.875rem" fontWeight="700" color={APP_ACCENT}
            >
              AK
            </Box>
            <Box>
              <Text fontSize="0.8125rem" fontWeight="700" color={APP_INK} letterSpacing="-0.01em">Ayşe K.</Text>
              <Box display="flex" alignItems="center" gap={1} mt="1px">
                <LuBuilding2 size={11} color={APP_LABEL} />
                <Text fontSize="0.6875rem" color={APP_MUTED}>Digital Solutions</Text>
              </Box>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1} px={2} py={1} bg="#E8F5EF" borderRadius="6px">
            <LuStar size={11} color={APP_ACCENT} />
            <Text fontSize="0.6875rem" fontWeight="700" color={APP_ACCENT}>8.5</Text>
          </Box>
        </Box>

        <Box display="flex" gap={1.5} flexWrap="wrap" mb={4}>
          {["Web Design", "SEO", "eCommerce"].map((cat) => (
            <Text key={cat} fontSize="0.6875rem" fontWeight="500" color={APP_MUTED} px={2} py={0.5} bg={APP_BG_SUBTLE} borderRadius="4px" border={`1px solid ${APP_BORDER}`}>
              {cat}
            </Text>
          ))}
        </Box>

        {[
          { label: "Location", value: "İstanbul, Remote" },
          { label: "Categories", value: "3 areas" },
        ].map(({ label, value }) => (
          <Box key={label} display="flex" justifyContent="space-between" py={2} borderBottom="1px solid #F3F4F6" _last={{ borderBottom: "none" }}>
            <Text fontSize="0.75rem" color={APP_LABEL}>{label}</Text>
            <Text fontSize="0.75rem" fontWeight="500" color={APP_INK}>{value}</Text>
          </Box>
        ))}

        <Box display="flex" alignItems="center" gap={1.5} mt={4}>
          <Box w="7px" h="7px" bg="#10B981" borderRadius="full" />
          <Text fontSize="0.75rem" fontWeight="600" color="#059669">Available for new work</Text>
        </Box>
      </Box>
    </Box>
  )
}

/** Admin inquiry pipeline mockup — used on AdminInquiriesListPage */
export function AdminInquiryMockup() {
  const stages = [
    { label: "Intake", color: "#E8F5EF", textColor: APP_ACCENT, count: "12" },
    { label: "Offers", color: "#FFF7ED", textColor: "#C2410C", count: "5" },
    { label: "Production", color: "#EFF6FF", textColor: "#1D4ED8", count: "8" },
    { label: "Closed", color: APP_BG_SUBTLE, textColor: APP_MUTED, count: "34" },
  ]

  const rows = [
    { title: "Website redesign & SEO", status: "Matching", urgency: "High" },
    { title: "Custom ERP integration", status: "Offered", urgency: "Medium" },
    { title: "Mobile app development", status: "Active", urgency: "Low" },
  ]

  return (
    <Box
      w="100%"
      maxW="340px"
      flexShrink={0}
      position="relative"
      display={{ base: "none", md: "block" }}
    >
      <Box
        position="absolute"
        top="16px" right="-8px"
        w="88%" h="90%"
        bg="#F0F2F5"
        borderRadius="12px"
        border="1px solid #E5E7EB"
      />
      <Box
        position="relative"
        bg="white"
        border="1px solid #E5E7EB"
        borderRadius="12px"
        overflow="hidden"
        boxShadow="0 4px 24px rgba(14,27,23,0.07)"
      >
        <Box px={4} py={3} borderBottom="1px solid #F3F4F6" display="flex" alignItems="center" gap={2} bg={APP_BG_SUBTLE}>
          <LuClipboardList size={13} color={APP_ACCENT} />
          <Text fontSize="0.75rem" fontWeight="700" color={APP_INK}>Inquiry Dashboard</Text>
        </Box>

        <Box display="flex" gap={0} borderBottom="1px solid #F3F4F6">
          {stages.map((s) => (
            <Box key={s.label} flex="1" px={2} py={2.5} textAlign="center" borderRight="1px solid #F3F4F6" _last={{ borderRight: "none" }}>
              <Text fontSize="0.9375rem" fontWeight="700" color={s.textColor} lineHeight="1">{s.count}</Text>
              <Text fontSize="0.5625rem" color={APP_LABEL} fontWeight="500" mt={0.5}>{s.label}</Text>
            </Box>
          ))}
        </Box>

        {rows.map((row, i) => (
          <Box
            key={row.title}
            px={4} py={2.5}
            borderBottom={i < rows.length - 1 ? "1px solid #F3F4F6" : "none"}
            display="flex" alignItems="center" justifyContent="space-between" gap={3}
          >
            <Text fontSize="0.75rem" fontWeight="500" color={APP_INK} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" flex="1">
              {row.title}
            </Text>
            <Box px={2} py={0.5} bg="#F3F4F6" borderRadius="4px" fontSize="0.625rem" fontWeight="600" color={APP_MUTED} flexShrink={0}>
              {row.status}
            </Box>
          </Box>
        ))}

        <Box px={4} py={3} bg={APP_BG_SUBTLE} display="flex" alignItems="center" gap={2}>
          <LuUsers size={11} color={APP_LABEL} />
          <Text fontSize="0.6875rem" color={APP_LABEL}>3 active partners assigned</Text>
        </Box>
      </Box>
    </Box>
  )
}

// ── Pre-wired empty states for each page ──────────────────────────────────────

export function StartWorkspaceButton({
  redirectTo = "/app/projects",
  size = "md",
}: {
  redirectTo?: string
  size?: "sm" | "md"
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onStart() {
    setBusy(true)
    setError(null)
    try {
      await createMyWorkspace()
      window.location.assign(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start workspace")
      setBusy(false)
    }
  }

  return (
    <Box>
      <AppButton
        variant="primary"
        size={size}
        loading={busy}
        onClick={onStart}
      >
        <LuPlus size={size === "sm" ? 14 : 16} />
        Start my workspace
      </AppButton>
      {error && (
        <Text fontSize="0.8125rem" color="#B91C1C" mt={2}>
          {error}
        </Text>
      )}
    </Box>
  )
}

export function StartWorkspaceEmptyState() {
  return (
    <FeatureEmptyState
      title="Start your workspace"
      bullets={[
        "Create a workspace for your one-person business in one click",
        "Invite the companies you work with — they join at no extra fee",
        "Create projects and invite collaborators onto each one",
      ]}
      cta={
        <Box>
          <StartWorkspaceButton />
          <Text mt={4} fontSize="0.8125rem" color={APP_MUTED} maxW="420px" lineHeight="1.5">
            Working with a one-person business instead? Ask them for an invite link — you can see shared projects once you join.
          </Text>
        </Box>
      }
      mockup={<InquiryMockup />}
    />
  )
}

export function ClientJobsEmptyState() {
  return (
    <FeatureEmptyState
      title="Projects shared with you land here"
      bullets={[
        "Join a workspace with an invite from the person you work with",
        "See the projects you’re the client on, or invited to as a collaborator",
        "Keep everyone on one project instead of scattered email threads",
      ]}
      cta={
        <Link to="/app/projects" style={{ textDecoration: "none" }}>
          <AppButton size="md" h="42px" px={6} fontSize="0.9375rem" display="inline-flex" alignItems="center" gap={2}>
            View projects
          </AppButton>
        </Link>
      }
      mockup={<InquiryMockup />}
    />
  )
}

export function InquiriesEmptyState() {
  return <StartWorkspaceEmptyState />
}
