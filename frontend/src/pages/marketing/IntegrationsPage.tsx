import { Box, Grid, Heading, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, InfoCard, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const INTEGRATIONS = [
  {
    category: "ERP & Procurement",
    items: [
      { name: "SAP Ariba", status: "Available", detail: "Sync purchase requisitions and approved orders." },
      { name: "Oracle NetSuite", status: "Available", detail: "Export order data and supplier records." },
      { name: "Microsoft Dynamics", status: "Roadmap", detail: "Planned for Q3 2026." },
    ],
  },
  {
    category: "Communication",
    items: [
      { name: "Email notifications", status: "Available", detail: "Inquiry updates, bid alerts, and milestone notifications." },
      { name: "Slack", status: "Available", detail: "Channel alerts for project updates and milestone notifications." },
      { name: "Microsoft Teams", status: "Roadmap", detail: "Planned for Q2 2026." },
    ],
  },
  {
    category: "Documents & Storage",
    items: [
      { name: "PDF export", status: "Available", detail: "Generate offer summaries and order documents." },
      { name: "Google Drive", status: "Available", detail: "Attach and sync specification files." },
      { name: "SharePoint", status: "Roadmap", detail: "Enterprise document sync in development." },
    ],
  },
  {
    category: "Developer",
    items: [
      { name: "REST API", status: "Enterprise", detail: "Programmatic access to inquiries, offers, and orders." },
      { name: "Webhooks", status: "Enterprise", detail: "Real-time event notifications for your systems." },
      { name: "Single sign-on (SSO)", status: "Enterprise", detail: "SAML and OIDC for corporate identity providers." },
    ],
  },
]

function StatusBadge({ status }: { status: string }) {
  const isAvailable = status === "Available"
  return (
    <Text
      as="span"
      fontSize="0.6875rem"
      fontWeight="600"
      letterSpacing="0.06em"
      textTransform="uppercase"
      px={2}
      py={0.5}
      borderRadius="4px"
      bg={isAvailable ? SURFACE : "white"}
      color={isAvailable ? INK : MUTED}
      border={`1px solid ${RULE}`}
    >
      {status}
    </Text>
  )
}

export default function IntegrationsPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="Integrations"
        subtitle="Connect Co-Helper to your existing tools — from project management to team communication."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6} mb={12}>
          <InfoCard title="Built for growing teams">
            Integrations reduce manual data entry and keep your outsourcing workflow inside the tools your team already uses.
          </InfoCard>
          <InfoCard title="Enterprise-ready">
            API access, webhooks, and SSO are available on Enterprise plans. Contact sales for implementation support.
          </InfoCard>
        </Grid>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
          {INTEGRATIONS.map((group) => (
            <Box key={group.category}>
              <Heading fontSize="0.8125rem" fontWeight="600" color={MUTED} letterSpacing="0.08em"
                textTransform="uppercase" mb={4}>
                {group.category}
              </Heading>
              <Box border={`1px solid ${RULE}`} borderRadius="8px" overflow="hidden">
                {group.items.map((item, i) => (
                  <Box
                    key={item.name}
                    p={5}
                    bg="white"
                    borderTop={i > 0 ? `1px solid ${RULE}` : undefined}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={3} mb={1}>
                      <Text fontSize="0.9375rem" fontWeight="600" color={INK}>{item.name}</Text>
                      <StatusBadge status={item.status} />
                    </Box>
                    <Text fontSize="0.8125rem" color={MUTED} lineHeight="1.6">{item.detail}</Text>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Grid>

        <Box mt={12} p={8} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}
          display="flex" flexDirection={{ base: "column", md: "row" }}
          alignItems={{ md: "center" }} justifyContent="space-between" gap={6}>
          <Box>
            <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={2}>Need a custom integration?</Heading>
            <Text fontSize="0.875rem" color={MUTED}>Our enterprise team can help connect Co-Helper to your internal systems.</Text>
          </Box>
          <CTA to="/contact" variant="primary">Contact sales</CTA>
        </Box>
      </ContentSection>
    </MarketingLayout>
  )
}
