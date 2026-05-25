import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const PRESS_ITEMS = [
  {
    date: "April 2026",
    outlet: "Supply Chain Digital",
    title: "OutsourceSoft launches structured B2B sourcing platform for Turkish manufacturing",
  },
  {
    date: "March 2026",
    outlet: "Procurement Leaders",
    title: "How digital platforms are reducing friction in cross-border sourcing",
  },
  {
    date: "February 2026",
    outlet: "Turkish Export Council",
    title: "New marketplace connects verified Turkish exporters with European buyers",
  },
]

export default function PressPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Company"
        title="Press"
        subtitle="News, media resources, and contact information for journalists and analysts."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12}>
          <Box>
            <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={6}>Recent coverage</Heading>
            <Stack gap={0}>
              {PRESS_ITEMS.map((item, i) => (
                <Box
                  key={item.title}
                  py={6}
                  borderTop={i > 0 ? `1px solid ${RULE}` : undefined}
                >
                  <Text fontSize="0.75rem" color={MUTED} mb={2}>{item.date} · {item.outlet}</Text>
                  <Text fontSize="0.9375rem" fontWeight="600" color={INK} lineHeight="1.5">{item.title}</Text>
                </Box>
              ))}
            </Stack>
          </Box>

          <Stack gap={6}>
            <Box p={7} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={3}>Media contact</Heading>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65" mb={4}>
                For press inquiries, interview requests, and media assets, contact our communications team.
              </Text>
              <Text fontSize="0.875rem" fontWeight="600" color={INK}>press@outsourcesoft.com</Text>
            </Box>

            <Box p={7} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={3}>Brand assets</Heading>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65" mb={4}>
                Logo files, product screenshots, and company boilerplate are available on request.
              </Text>
              <CTA to="/contact" variant="outline">Request media kit</CTA>
            </Box>

            <Box p={7} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={3}>Company boilerplate</Heading>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.75">
                OutsourceSoft is a B2B procurement platform connecting global buyers with verified Turkish
                manufacturers and service partners. The platform manages the full sourcing workflow — from
                inquiry to delivery — with structured offers, document management, and real-time tracking.
              </Text>
            </Box>
          </Stack>
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
