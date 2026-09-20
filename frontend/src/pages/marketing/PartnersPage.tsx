import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { CheckItem, ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const REQUIREMENTS = [
  "A company (or companies) you already work with, or plan to invite",
  "A service you offer — hourly or project-based",
  "An email address for each company you want to invite",
]

const BENEFITS = [
  "Invite companies directly — no approval queue, no waiting to get matched",
  "Work from one Now — to-dos grouped by project, not a CRM dashboard",
  "Propose hourly or fixed rates and keep a record of what was agreed",
  "Log hours and send invoices per project, per company, and across your workspace",
  "$9 USD per month until 31 December 2026, then $49 — nothing else",
]

export default function PartnersPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="For one-person businesses"
        title="Your own client workspace"
        subtitle="Set up a workspace, invite the companies you already work with, and run every project — to-dos, hours, remaining work, and invoices — in one place."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12} mb={16}>
          <Box>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={5}>Why one-person businesses use Co-Helper</Heading>
            <Stack gap={3} mb={8}>
              {BENEFITS.map((b) => (
                <CheckItem key={b}>{b}</CheckItem>
              ))}
            </Stack>
            <CTA to="/partner/register" variant="primary">Start your workspace</CTA>
          </Box>

          <Box p={8} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
            <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={5}>What you'll need</Heading>
            <Stack gap={3}>
              {REQUIREMENTS.map((r) => (
                <Text key={r} fontSize="0.875rem" color={MUTED} lineHeight="1.65">{r}</Text>
              ))}
            </Stack>
          </Box>
        </Grid>

        <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={6}>
          {[
            { step: "1", title: "Set up your workspace", body: "Create your account and list the services you offer — hourly, fixed, or both." },
            { step: "2", title: "Invite your companies", body: "Add each company by email. They see only the jobs you share with them." },
            { step: "3", title: "Run the job", body: "Scope requirements with AI, agree a rate, and track hours and payments as you go." },
          ].map((s) => (
            <Box key={s.step} p={7} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <Text fontSize="0.75rem" fontWeight="700" color={MUTED} mb={3}>Step {s.step}</Text>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={2}>{s.title}</Heading>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">{s.body}</Text>
            </Box>
          ))}
        </Grid>

        <Box mt={12} p={8} border={`1px solid ${RULE}`} borderRadius="8px"
          display="flex" flexDirection={{ base: "column", md: "row" }}
          alignItems={{ md: "center" }} justifyContent="space-between" gap={6}>
          <Box>
            <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={2}>Questions before you start?</Heading>
            <Text fontSize="0.875rem" color={MUTED}>Reach out and we'll help you get your workspace set up.</Text>
          </Box>
          <CTA to="/contact" variant="outline">Contact us</CTA>
        </Box>
      </ContentSection>
    </MarketingLayout>
  )
}
