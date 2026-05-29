import { Box, Button, Stack, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import {
  LuCircleCheckBig,
  LuInbox,
  LuStar,
  LuBuilding2,
  LuClipboardList,
  LuUsers,
} from "react-icons/lu"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_BTN_PRIMARY,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
} from "./appUi"

// ── Generic layout ────────────────────────────────────────────────────────────

export function FeatureEmptyState({
  title,
  bullets,
  cta,
  mockup,
}: {
  title: string
  bullets: string[]
  cta?: React.ReactNode
  mockup?: React.ReactNode
}) {
  return (
    <Box
      bg="white"
      border={`1px solid ${APP_BORDER}`}
      borderRadius="16px"
      px={{ base: 7, md: 12 }}
      py={{ base: 10, md: 14 }}
      display="flex"
      alignItems="center"
      gap={{ base: 0, md: 12 }}
      flexDir={{ base: "column", md: "row" }}
      overflow="hidden"
    >
      <Box flex="1" minW={0}>
        <Text
          fontSize={{ base: "1.625rem", md: "2rem" }}
          fontWeight="700"
          color={APP_INK}
          letterSpacing="-0.03em"
          lineHeight="1.2"
          mb={6}
          maxW="420px"
        >
          {title}
        </Text>

        <Stack gap={4} mb={cta ? 8 : 0}>
          {bullets.map((bullet) => (
            <Box key={bullet} display="flex" alignItems="flex-start" gap={3}>
              <Box pt="2px" color={APP_ACCENT} flexShrink={0}>
                <LuCircleCheckBig size={17} strokeWidth={2} />
              </Box>
              <Text fontSize="0.9375rem" color="#374151" lineHeight="1.5">
                {bullet}
              </Text>
            </Box>
          ))}
        </Stack>

        {cta && <Box mt={0}>{cta}</Box>}
      </Box>

      {mockup}
    </Box>
  )
}

// ── Mockup cards ──────────────────────────────────────────────────────────────

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

export function InquiriesEmptyState() {
  return (
    <FeatureEmptyState
      title="Track all your inquiries in one place"
      bullets={[
        "Post a project or service request in under 2 minutes",
        "Get matched with vetted partners who fit your needs",
        "Manage offers, timelines, and delivery — all here",
      ]}
      cta={
        <Link to="/app/inquiries/new" style={{ textDecoration: "none" }}>
          <Button {...APP_BTN_PRIMARY} size="md" h="42px" px={6} fontSize="0.9375rem" display="inline-flex" alignItems="center" gap={2}>
            + Post your first inquiry
          </Button>
        </Link>
      }
      mockup={<InquiryMockup />}
    />
  )
}

export function AdminInquiriesEmptyState() {
  return (
    <FeatureEmptyState
      title="Your inquiry dashboard is ready"
      bullets={[
        "All client inquiries will appear here in real time",
        "Filter by status, urgency, and pipeline stage",
        "Assign partners and track delivery from a single view",
      ]}
      mockup={<AdminInquiryMockup />}
    />
  )
}

export function AdminPartnersEmptyState() {
  return (
    <FeatureEmptyState
      title="Build your partner network"
      bullets={[
        "Onboard service providers and assign categories",
        "Score and rank partners based on performance",
        "Match the right partner to every incoming inquiry",
      ]}
      mockup={<PartnerMockup />}
    />
  )
}
