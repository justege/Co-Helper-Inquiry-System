import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const PLANS = [
  {
    name: "Client",
    price: "Free",
    period: "Pay per project only",
    description: "For teams outsourcing software development, MVPs, and digital builds.",
    features: [
      "Unlimited project briefs",
      "Dedicated PM on every build",
      "Fixed quote before work starts",
      "Escrow-protected milestones",
      "Multi-user team access",
    ],
    cta: { to: "/register", label: "Post a project", variant: "primary" as const },
    highlighted: true,
  },
  {
    name: "Specialist",
    price: "Success-based",
    period: "Per completed project",
    description: "For verified developers, mobile engineers, and automation specialists.",
    features: [
      "Pre-scoped dev briefs in your stack",
      "Co-Helper PM handles client communication",
      "Verified specialist badge",
      "Service catalogue publishing",
      "No subscription required to start",
    ],
    cta: { to: "/partners", label: "Apply as developer", variant: "outline" as const },
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "Annual contract",
    description: "For organisations with ongoing dev capacity needs and volume requirements.",
    features: [
      "Dedicated account manager",
      "Custom approval workflows",
      "API access & integrations",
      "Priority developer matching",
      "SLA-backed delivery guarantees",
    ],
    cta: { to: "/contact", label: "Book a callback", variant: "outline" as const },
    highlighted: false,
  },
]

export default function PricingPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="Pricing"
        subtitle="No client platform fees. Every project gets a fixed quote upfront — you pay only for scoped work, protected by escrow."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={6} mb={16}>
          {PLANS.map((plan) => (
            <Box
              key={plan.name}
              p={8}
              bg={plan.highlighted ? INK : "white"}
              color={plan.highlighted ? "white" : INK}
              borderRadius="8px"
              border={`1px solid ${plan.highlighted ? INK : RULE}`}
            >
              <Text fontSize="0.75rem" fontWeight="600" letterSpacing="0.08em" textTransform="uppercase"
                color={plan.highlighted ? "rgba(255,255,255,0.6)" : MUTED} mb={3}>
                {plan.name}
              </Text>
              <Heading fontSize="2rem" fontWeight="700" letterSpacing="-0.03em" mb={1}>{plan.price}</Heading>
              <Text fontSize="0.8125rem" color={plan.highlighted ? "rgba(255,255,255,0.55)" : MUTED} mb={5}>{plan.period}</Text>
              <Text fontSize="0.875rem" color={plan.highlighted ? "rgba(255,255,255,0.72)" : MUTED} lineHeight="1.65" mb={6}>
                {plan.description}
              </Text>
              <Stack gap={2.5} mb={8}>
                {plan.features.map((f) => (
                  <Text key={f} fontSize="0.875rem" fontWeight="500"
                    color={plan.highlighted ? "rgba(255,255,255,0.9)" : INK}>
                    {f}
                  </Text>
                ))}
              </Stack>
              <CTA to={plan.cta.to} variant={plan.highlighted ? "white" : plan.cta.variant}>{plan.cta.label}</CTA>
            </Box>
          ))}
        </Grid>

        <Box p={8} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
          <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={4}>Frequently asked questions</Heading>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>Is there a fee for clients?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">No. Clients post projects, receive fixed quotes, and pay only for approved deliverables — with no platform commission.</Text>
            </Box>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>How is pricing determined?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">Your PM scopes the work and returns a fixed quote with a committed delivery date — before any development starts.</Text>
            </Box>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>Do I get a project manager?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">Yes. Every project is assigned a dedicated Co-Helper PM who coordinates developers and keeps you updated through one platform.</Text>
            </Box>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>Can I upgrade to Enterprise later?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">Yes. Contact our team when your dev volume, SLA requirements, or integration needs grow.</Text>
            </Box>
          </Grid>
        </Box>
      </ContentSection>
    </MarketingLayout>
  )
}
