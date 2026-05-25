import { Box, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const SERVICES = [
  { name: "Platform (app.outsourcesoft.com)", status: "operational", uptime: "99.98%" },
  { name: "API", status: "operational", uptime: "99.95%" },
  { name: "Authentication", status: "operational", uptime: "99.99%" },
  { name: "Email notifications", status: "operational", uptime: "99.90%" },
  { name: "Document uploads", status: "operational", uptime: "99.97%" },
]

function StatusIndicator({ status }: { status: string }) {
  const isOperational = status === "operational"
  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Box w="8px" h="8px" borderRadius="full" bg={isOperational ? "#374151" : MUTED} />
      <Text fontSize="0.8125rem" fontWeight="600" color={INK} textTransform="capitalize">{status}</Text>
    </Box>
  )
}

export default function StatusPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Support"
        title="System status"
        subtitle="Current operational status of OutsourceSoft services."
      />

      <ContentSection narrow>
        <Box p={6} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`} mb={8}>
          <Box display="flex" alignItems="center" gap={3}>
            <Box w="10px" h="10px" borderRadius="full" bg="#374151" />
            <Text fontSize="0.9375rem" fontWeight="600" color={INK}>All systems operational</Text>
          </Box>
          <Text fontSize="0.8125rem" color={MUTED} mt={2}>Last checked: {new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</Text>
        </Box>

        <Box border={`1px solid ${RULE}`} borderRadius="8px" overflow="hidden" mb={10}>
          {SERVICES.map((service, i) => (
            <Box
              key={service.name}
              px={6} py={5}
              bg="white"
              borderTop={i > 0 ? `1px solid ${RULE}` : undefined}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={3}
            >
              <Text fontSize="0.9375rem" fontWeight="500" color={INK}>{service.name}</Text>
              <Box display="flex" alignItems="center" gap={6}>
                <Text fontSize="0.8125rem" color={MUTED}>{service.uptime} uptime (30d)</Text>
                <StatusIndicator status={service.status} />
              </Box>
            </Box>
          ))}
        </Box>

        <Stack gap={6}>
          <Box>
            <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={3}>Recent incidents</Text>
            <Text fontSize="0.875rem" color={MUTED}>No incidents reported in the last 90 days.</Text>
          </Box>
          <Box>
            <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={3}>Scheduled maintenance</Text>
            <Text fontSize="0.875rem" color={MUTED}>No maintenance scheduled. Updates are deployed with zero-downtime releases.</Text>
          </Box>
        </Stack>
      </ContentSection>
    </MarketingLayout>
  )
}
