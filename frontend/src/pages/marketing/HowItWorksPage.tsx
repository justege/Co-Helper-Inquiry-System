import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { CheckItem, ContentSection, CTA, PageHero, StepNumber } from "@/components/marketing/MarketingUI"
import { GREEN, INK, LIGHT, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const STEPS = [
  {
    n: "01",
    title: "Post your project brief",
    body: "Describe what you need built — MVP, full-stack app, mobile, API, automation, or e-commerce. Attach specs, wireframes, or references. Most clients complete their first brief in under five minutes.",
  },
  {
    n: "02",
    title: "Your PM scopes and quotes",
    body: "A dedicated Co-Helper project manager reviews your brief, matches vetted developers from our network, and returns a fixed quote with a committed delivery date — typically within 24 hours.",
  },
  {
    n: "03",
    title: "Track delivery to approval",
    body: "Your PM manages milestones, code review, and client updates until you approve the deliverable. Briefs, files, and status live in one platform — no chasing contractors.",
  },
]

const SERVICE_CATEGORIES = [
  { name: "Full Stack Development", examples: "SaaS platforms, APIs, admin tools, Chrome extensions" },
  { name: "MVP & Product Builds", examples: "Startup prototypes, marketplace MVPs, AI-assisted v1 products" },
  { name: "Mobile Apps", examples: "React Native, native iOS/Android, store launch support" },
  { name: "Automation & Integrations", examples: "n8n, CRM sync, webhooks, Zapier/Make workflows" },
  { name: "E-commerce", examples: "Shopify, headless commerce, migrations, subscriptions" },
  { name: "SEO & Marketing", examples: "Technical SEO, GA4/GTM, paid search setup" },
]

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="How it works"
        subtitle="Managed software delivery from first brief to shipped code — with a dedicated project manager on every build."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={{ base: 10, md: 8 }} mb={16}>
          {STEPS.map((step) => (
            <Box key={step.n}>
              <StepNumber n={step.n} />
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={3}>{step.title}</Heading>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.7">{step.body}</Text>
            </Box>
          ))}
        </Grid>

        <Box mb={16}>
          <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            Service catalog
          </Text>
          <Heading fontSize="1.25rem" fontWeight="600" color={INK} mb={3} letterSpacing="-0.02em">
            50+ software services. One managed workflow.
          </Heading>
          <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.75" mb={8} maxW="640px">
            Whether you need an MVP this quarter or ongoing feature work, every service is scoped,
            quoted, and delivered through the same PM-led platform.
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)", lg: "repeat(3,1fr)" }} gap={4}>
            {SERVICE_CATEGORIES.map((cat) => (
              <Box key={cat.name} p={6} bg={LIGHT} borderRadius="8px" border={`1px solid ${RULE}`}>
                <Text fontSize="0.9375rem" fontWeight="700" color={INK} mb={2} fontFamily="var(--font-heading)">
                  {cat.name}
                </Text>
                <Text fontSize="0.8125rem" color={MUTED} lineHeight="1.65">{cat.examples}</Text>
              </Box>
            ))}
          </Grid>
        </Box>

        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
          <Box p={10} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={4}>For clients</Heading>
            <Stack gap={3} mb={8}>
              {[
                "No platform commission on accepted projects",
                "Dedicated PM on every software build",
                "Fixed quote before work starts",
                "Escrow-protected payment on approval",
                "Milestone tracking and document management",
              ].map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </Stack>
            <CTA to="/register" variant="primary">Post a project</CTA>
          </Box>
          <Box p={10} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={4}>For specialists</Heading>
            <Stack gap={3} mb={8}>
              {[
                "Pre-scoped dev briefs matched to your stack",
                "Co-Helper PM handles all client communication",
                "Verified specialist profile",
                "Focus on shipping code, not sales",
              ].map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </Stack>
            <CTA to="/partners" variant="outline">Join the developer network</CTA>
          </Box>
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
