import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { CheckItem, ContentSection, CTA, PageHero, StepNumber } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const STEPS = [
  {
    n: "01",
    title: "Post an inquiry",
    body: "Describe your product or service need in plain language. Set quantity, deadline, and budget range. Attach specifications, drawings, or reference images. Most buyers complete their first inquiry in under five minutes.",
  },
  {
    n: "02",
    title: "Receive partner bids",
    body: "Verified Turkish manufacturers and service partners review your brief and submit structured, itemised offers — typically within 24 hours. Each bid includes pricing, lead time, payment terms, and production notes.",
  },
  {
    n: "03",
    title: "Accept & track delivery",
    body: "Compare bids side by side, accept the best offer, and track production milestones and shipment status on your dashboard. All documents, messages, and updates stay in one place.",
  },
]

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="How it works"
        subtitle="A structured procurement workflow from first inquiry to final delivery — built for global buyers sourcing from Turkey."
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

        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
          <Box p={10} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={4}>For buyers</Heading>
            <Stack gap={3} mb={8}>
              {["No commission on accepted orders", "Structured offer comparison", "Document and PDF management", "Real-time status tracking"].map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </Stack>
            <CTA to="/register" variant="primary">Create buyer account</CTA>
          </Box>
          <Box p={10} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={4}>For partners</Heading>
            <Stack gap={3} mb={8}>
              {["Pre-qualified inquiry briefs", "Structured bid submission", "Verified partner profile", "Managed client communication"].map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </Stack>
            <CTA to="/partners" variant="outline">Learn about partnerships</CTA>
          </Box>
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
