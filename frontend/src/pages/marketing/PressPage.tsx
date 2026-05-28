import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const PRESS_ITEMS = [
  {
    date: "April 2026",
    outlet: "TechCrunch",
    title: "Co-Helper launches managed outsourcing platform for digital services",
  },
  {
    date: "March 2026",
    outlet: "Remote Work Weekly",
    title: "How dedicated project managers are replacing freelance marketplaces",
  },
  {
    date: "February 2026",
    outlet: "SaaS Magazine",
    title: "New platform connects businesses with vetted global specialists — no direct developer contact needed",
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
              <Text fontSize="0.875rem" fontWeight="600" color={INK}>press@co-helper.com</Text>
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
                Co-Helper is a digital services outsourcing platform connecting businesses worldwide with
                vetted specialists. Every project is assigned a dedicated project manager who coordinates
                delivery — so clients never need to speak to developers directly.
              </Text>
            </Box>
          </Stack>
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
