import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const FEATURES = [
  "Private workspace you own",
  "Invite the companies you already work with",
  "Work home: one Now and to-dos in project accordions",
  "Remaining hours, weekly pace, and a finish window for clients",
  "Hourly, fixed, or hybrid rates — then invoices from unbilled hours",
  "PDF invoices you send; mark paid when money lands",
  "Companies you invite join at no extra cost",
  "No commission, no escrow, no matching fees",
]

export default function PricingPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="Pricing"
        subtitle="One plan. $9 per month until 31 December 2026, then $49 per month — with no discount after that."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1.1fr 0.9fr" }} gap={8} mb={16} alignItems="stretch">
          <Box p={{ base: 8, md: 10 }} bg={INK} color="white" borderRadius="16px" border={`1px solid ${INK}`}>
            <Text fontSize="0.75rem" fontWeight="600" letterSpacing="0.08em" textTransform="uppercase"
              color="rgba(255,255,255,0.6)" mb={3}>
              Workspace
            </Text>
            <Box display="flex" alignItems="baseline" gap={2} mb={1} flexWrap="wrap">
              <Heading fontSize="3rem" fontWeight="700" letterSpacing="-0.04em" lineHeight="1">$9</Heading>
              <Text fontSize="1rem" color="rgba(255,255,255,0.55)">USD / month</Text>
            </Box>
            <Text fontSize="0.875rem" color="rgba(255,255,255,0.72)" mb={2}>
              Early price through 31 December 2026
            </Text>
            <Text fontSize="0.9375rem" color="rgba(255,255,255,0.78)" lineHeight="1.7" mb={8}>
              For one-person businesses and the companies they work with. After 31.12.2026 the price is
              $49 USD per month, with no discount.
            </Text>
            <Stack gap={2.5} mb={8}>
              {FEATURES.map((f) => (
                <Text key={f} fontSize="0.875rem" fontWeight="500" color="rgba(255,255,255,0.9)">
                  {f}
                </Text>
              ))}
            </Stack>
            <CTA to="/partner/register" variant="white">Start your workspace</CTA>
            <Text fontSize="0.75rem" color="rgba(255,255,255,0.55)" mt={3}>
              Subscribe in Settings after you create a workspace — Stripe Checkout for $9 intro, then $49.
            </Text>
          </Box>

          <Stack gap={6}>
            <Box p={8} bg="white" borderRadius="16px" border={`1px solid ${RULE}`}>
              <Text fontSize="0.75rem" fontWeight="600" letterSpacing="0.08em" textTransform="uppercase" color={MUTED} mb={3}>
                From 1 January 2027
              </Text>
              <Heading fontSize="2rem" fontWeight="700" letterSpacing="-0.03em" color={INK} mb={1}>$49</Heading>
              <Text fontSize="0.8125rem" color={MUTED} mb={4}>USD / month · no discount</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.7">
                The same workspace. The early $9 rate ends on 31 December 2026. There is no other plan,
                no annual coupon, and no marketplace cut.
              </Text>
            </Box>
            <Box p={8} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
              <Text fontSize="0.75rem" fontWeight="600" letterSpacing="0.08em" textTransform="uppercase" color={MUTED} mb={3}>
                For companies
              </Text>
              <Heading fontSize="1.25rem" fontWeight="600" letterSpacing="-0.02em" color={INK} mb={3}>
                Join with an invite — no extra fee
              </Heading>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.7" mb={6}>
                The companies you work with see only the projects you share: to-dos, hours,
                remaining work, weekly pace, and invoices. They do not pay Co-Helper.
              </Text>
              <CTA to="/login" variant="outline">I have an invite</CTA>
            </Box>
          </Stack>
        </Grid>

        <Box p={8} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
          <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={4}>Frequently asked questions</Heading>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>Is there anything else to pay?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">
                No. $9/month until 31 December 2026, then $49/month. No commission, no usage fees, no
                add-ons. Invited companies do not pay.
              </Text>
            </Box>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>Do you process payments?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">
                No. You record what was agreed and what was paid. Money still moves the way you already
                work — invoice, transfer, cash.
              </Text>
            </Box>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>Is this a marketplace?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">
                No. Co-Helper does not match you with strangers or take a cut of jobs. You invite the
                companies you already work with.
              </Text>
            </Box>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mb={2}>What does the client see?</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">
                Current work (or an honest note if you’re on another client), remaining hours, your
                normal week, hours on their project, and invoices you send. They never pay Co-Helper.
              </Text>
            </Box>
          </Grid>
        </Box>
      </ContentSection>
    </MarketingLayout>
  )
}
