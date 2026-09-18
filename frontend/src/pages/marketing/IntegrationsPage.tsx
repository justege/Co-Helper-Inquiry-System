import { Box, Grid, Heading, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, InfoCard, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const INTEGRATIONS = [
  {
    category: "Work you already run",
    items: [
      { name: "Trello", status: "Available", detail: "Connect a board: columns become projects, cards become jobs, checklists become to-dos." },
      { name: "Job documents", status: "Available", detail: "Upload briefs, specs, and files onto each job." },
      { name: "Workspace invites", status: "Available", detail: "Email plus a copyable invite link so clients can join without a marketplace listing." },
    ],
  },
  {
    category: "Communication",
    items: [
      { name: "In-job chat", status: "Available", detail: "Messages on the job, with Edit with AI to clarify before you send." },
      { name: "Email notifications", status: "Roadmap", detail: "Invite and job updates when outbound email is configured." },
      { name: "Slack / Teams", status: "Roadmap", detail: "Optional alerts later — the source of truth stays the workspace." },
    ],
  },
  {
    category: "AI",
    items: [
      { name: "Edit with AI", status: "Available", detail: "Rewrite requirements, chat, and to-dos using that job’s context. Key stays on the server." },
      { name: "Job brief helper", status: "Available", detail: "Conversational helper to structure a job before you open it." },
      { name: "Custom models", status: "Talk to us", detail: "Included plan only — contact us if you need a private model or stricter data handling." },
    ],
  },
  {
    category: "Account & files",
    items: [
      { name: "Firebase Auth", status: "Available", detail: "Email/password and social sign-in for workspace owners and invited companies." },
      { name: "Object storage", status: "Available", detail: "DigitalOcean Spaces or local files for job attachments." },
      { name: "SSO", status: "Talk to us", detail: "SAML/OIDC is not a separate plan — write to us if a company you work with requires it." },
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
        subtitle="Connect the tools you already use — Trello, files, sign-in, and AI on the job. Not a procurement or matching stack."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6} mb={12}>
          <InfoCard title="Built for a two-sided workspace">
            Integrations serve the one-person business and invited companies on a job. We don’t sync work out to a marketplace or a Co-Helper PM.
          </InfoCard>
          <InfoCard title="You opt in">
            Trello and AI only run when you connect them. We don’t scrape boards or send job text to a model unless you ask.
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
            <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={2}>Need something else connected?</Heading>
            <Text fontSize="0.875rem" color={MUTED}>Tell us what you use today. We’ll say honestly whether it belongs in a workspace product.</Text>
          </Box>
          <CTA to="/contact" variant="primary">Contact us</CTA>
        </Box>
      </ContentSection>
    </MarketingLayout>
  )
}
