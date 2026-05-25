import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const PLANS = [
  {
    name: "Buyer",
    price: "Free",
    period: "No commission",
    description: "For procurement teams sourcing products and services from Turkey.",
    features: [
      "Unlimited inquiries",
      "Side-by-side offer comparison",
      "Document management",
      "Production & shipment tracking",
      "Multi-user team access",
    ],
    cta: { to: "/register", label: "Create buyer account", variant: "primary" as const },
    highlighted: true,
  },
  {
    name: "Partner",
    price: "Success-based",
    period: "Per accepted order",
    description: "For verified manufacturers and service providers in Turkey.",
    features: [
      "Qualified inquiry briefs",
      "Structured offer submission",
      "Verified partner badge",
      "Service catalogue publishing",
      "Client communication tools",
    ],
    cta: { to: "/partners", label: "Apply as partner", variant: "outline" as const },
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "Annual contract",
    description: "For large procurement organisations with volume requirements.",
    features: [
      "Dedicated account manager",
      "Custom approval workflows",
      "API access & integrations",
      "Priority partner matching",
      "SLA-backed support",
    ],
    cta: { to: "/contact", label: "Contact sales", variant: "outline" as const },
    highlighted: false,
  },
]

export default function PricingPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="Pricing"
        subtitle="Transparent pricing with no hidden fees. Buyers use the platform free of charge; partners pay only on successful orders."
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
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>Is there a fee for buyers?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">No. Buyers can post inquiries, compare offers, and manage orders at no cost.</Text>
            </Box>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>How do partners pay?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">Partners pay a success fee only when a buyer accepts their offer. No subscription required to start.</Text>
            </Box>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>Can I upgrade to Enterprise later?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">Yes. Contact our sales team when your procurement volume or integration needs grow.</Text>
            </Box>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>Are payment processing fees included?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">Payment between buyer and partner is handled directly. OutsourceSoft does not add payment processing markups.</Text>
            </Box>
          </Grid>
        </Box>
      </ContentSection>
    </MarketingLayout>
  )
}
