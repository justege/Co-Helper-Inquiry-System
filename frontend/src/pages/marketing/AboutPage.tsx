import { Box, Grid, Heading, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero, ProseBlock } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const VALUES = [
  { title: "Transparency", body: "Every inquiry, offer, and milestone is visible to all parties. No hidden commissions or opaque intermediaries." },
  { title: "Verification", body: "Partners are reviewed before they can bid. Buyers work with manufacturers and service firms that meet our standards." },
  { title: "Efficiency", body: "Structured workflows replace email chains and spreadsheets. Procurement teams save time at every stage." },
  { title: "Trust", body: "We build long-term relationships between global buyers and Turkish suppliers — not one-off transactions." },
]

const STATS = [
  { v: "500+", l: "Verified partners" },
  { v: "18", l: "Manufacturing categories" },
  { v: "55+", l: "Delivery destinations" },
  { v: "24h", l: "Average first bid" },
]

export default function AboutPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Company"
        title="About OutsourceSoft"
        subtitle="We connect global procurement teams with Turkey's verified manufacturers and service partners — transparently, efficiently, and at scale."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12} mb={16}>
          <ProseBlock>
            <p>
              OutsourceSoft was founded to solve a persistent problem in international sourcing: finding reliable
              Turkish suppliers is easy in theory, but managing inquiries, comparing offers, and tracking delivery
              across time zones and languages remains fragmented and inefficient.
            </p>
            <p>
              Our platform brings the entire procurement workflow into one place — from the first product brief
              to the final shipment confirmation. Buyers gain visibility and control. Partners receive qualified
              leads without cold outreach.
            </p>
            <p>
              Headquartered in Istanbul with operations across Izmir, Bursa, and Ankara, we serve procurement
              teams across Europe, the Middle East, and beyond.
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
