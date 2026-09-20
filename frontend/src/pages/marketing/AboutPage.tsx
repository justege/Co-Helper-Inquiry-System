import { Box, Grid, Heading, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero, ProseBlock } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const VALUES = [
  { title: "You own the relationship", body: "Companies come from you. We don’t match, staff, or insert a project manager between you and the people you already work with." },
  { title: "One record of the work", body: "To-dos, rates, hours, remaining work, and invoices live together — so nothing important is trapped in email." },
  { title: "Honesty, not theatre", body: "If you’re on another client, we say so. If there’s no estimate, we don’t invent a date." },
  { title: "Track money, don’t process it", body: "Record what was agreed and what was paid. Invoicing and transfers stay how you already operate." },
]

const STATS = [
  { v: "1", l: "Workspace per one-person business" },
  { v: "Invite", l: "How companies join" },
  { v: "0", l: "Marketplace commission" },
  { v: "Logs", l: "Payments — not escrow" },
]

export default function AboutPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Company"
        title="About Co-Helper"
        subtitle="We build the shared workspace between a one-person business and the companies they work with — so the work, the rate, and the hours live in one place."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12} mb={16}>
          <ProseBlock>
            <p>
              Co-Helper started from a simple observation: one-person businesses already have companies
              they work with. What they lack is a calm, shared place to run the job — without posting a
              project into a marketplace or handing the relationship to a platform PM.
            </p>
            <p>
              The product is a workspace owned by a one-person business. You invite the companies you
              already work with. Each project holds to-dos, an hourly or project rate, time entries,
              remaining hours, weekly pace, and invoices generated from unbilled work.
            </p>
            <p>
              We are based in Berlin and remote-first. We are not a staffing network, escrow agent, or
              hiring marketplace. If you need someone to find developers for you, Co-Helper is the wrong tool.
            </p>
          </ProseBlock>
          <Grid templateColumns="repeat(2,1fr)" gap={4}>
            {STATS.map((s) => (
              <Box key={s.l} p={6} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
                <Text fontSize="1.75rem" fontWeight="700" color={INK} letterSpacing="-0.03em">{s.v}</Text>
                <Text fontSize="0.8125rem" color={MUTED} mt={1}>{s.l}</Text>
              </Box>
            ))}
          </Grid>
        </Grid>

        <Heading fontSize="1.25rem" fontWeight="600" color={INK} mb={8} letterSpacing="-0.02em">Our values</Heading>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap={6}>
          {VALUES.map((v) => (
            <Box key={v.title} p={7} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={2}>{v.title}</Heading>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.7">{v.body}</Text>
            </Box>
          ))}
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
