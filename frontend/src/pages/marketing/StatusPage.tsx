import { useEffect, useState } from "react"
import { Box, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"
import { getPublicStatus } from "@/api/public"

export default function StatusPage() {
  const [status, setStatus] = useState<{ status: string; checks: Record<string, string> } | null>(null)
  useEffect(() => {
    getPublicStatus().then(setStatus).catch(() => setStatus({ status: "unknown", checks: { api: "unreachable" } }))
  }, [])
  const checks = status?.checks ?? { api: "checking", database: "checking" }

  return (
    <MarketingLayout>
      <PageHero
        label="Support"
        title="System status"
        subtitle="Live checks against the Co-Helper API and database."
      />
      <ContentSection narrow>
        <Box p={6} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`} mb={8}>
          <Text fontSize="0.9375rem" fontWeight="600" color={INK}>
            {status?.status === "operational" ? "All systems operational" : status?.status ?? "Checking…"}
          </Text>
        </Box>
        <Stack gap={0} border={`1px solid ${RULE}`} borderRadius="8px" overflow="hidden">
          {Object.entries(checks).map(([name, value]) => (
            <Box key={name} px={5} py={4} borderBottom={`1px solid ${RULE}`} display="flex" justifyContent="space-between">
              <Text fontWeight="600" color={INK} textTransform="capitalize">{name}</Text>
              <Text color={MUTED}>{value}</Text>
            </Box>
          ))}
        </Stack>
      </ContentSection>
    </MarketingLayout>
  )
}
