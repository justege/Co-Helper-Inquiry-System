import { Box, Grid, Heading, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero, ProseBlock } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const VALUES = [
  { title: "Clarity", body: "Every project, milestone, and deliverable lives in one platform. Fixed quotes upfront — no hidden fees or opaque handoffs between developers." },
  { title: "Verification", body: "Developers are reviewed on portfolio, test tasks, and references before they join the network. You work with vetted engineers, not open marketplace roulette." },
  { title: "Planability", body: "Committed delivery dates and escrow-protected payments make every build predictable. Your PM owns the timeline so you can plan around shipping, not chasing." },
  { title: "Accountability", body: "One named project manager per build — not a rotating account team. We build long-term delivery relationships, not one-off gig transactions." },
]

const STATS = [
  { v: "50+",  l: "Software services in catalog" },
  { v: "500+", l: "Verified specialists" },
  { v: "40+",  l: "Countries covered" },
  { v: "<24h", l: "Average quote turnaround" },
]

export default function AboutPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Company"
        title="About Co-Helper"
        subtitle="We connect businesses with vetted software developers — and assign one dedicated project manager to deliver every build on time."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12} mb={16}>
          <ProseBlock>
            <p>
              Co-Helper was founded to solve a persistent problem in software outsourcing: finding skilled
              developers is easy, but managing them across scopes, time zones, and deadlines remains
              fragmented — especially when you have to coordinate every sprint yourself.
            </p>
            <p>
              Our platform brings the entire dev workflow into one place — from the first project brief
              to production delivery. Clients get a dedicated project manager who scopes work, matches
              vetted engineers, and owns quality. Developers receive qualified briefs without chasing clients.
            </p>
            <p>
              Headquartered in Berlin with Europe-based PMs and a global specialist network, we serve
              startups, product teams, and growing companies who need MVPs, full-stack apps, mobile builds,
              automations, and e-commerce — delivered reliably, without the hiring overhead.
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
