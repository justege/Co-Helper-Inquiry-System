import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE } from "@/components/marketing/tokens"

const TOPICS = [
  {
    title: "Getting started",
    links: [
      { label: "How to create a buyer account", to: "/how-it-works" },
      { label: "Posting your first inquiry", to: "/how-it-works" },
      { label: "Understanding the dashboard", to: "/how-it-works" },
    ],
  },
  {
    title: "Inquiries & offers",
    links: [
      { label: "Writing an effective product brief", to: "/how-it-works" },
      { label: "Comparing partner offers", to: "/how-it-works" },
      { label: "Accepting and managing orders", to: "/how-it-works" },
    ],
  },
  {
    title: "For partners",
    links: [
      { label: "Applying as a verified partner", to: "/partners" },
      { label: "Submitting structured offers", to: "/partners" },
      { label: "Publishing your service catalogue", to: "/partners" },
    ],
  },
  {
    title: "Account & billing",
    links: [
      { label: "Pricing and fees", to: "/pricing" },
      { label: "Team access and roles", to: "/contact" },
      { label: "Enterprise plans", to: "/pricing" },
    ],
  },
]

export default function HelpPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Support"
        title="Help Center"
        subtitle="Guides and answers for buyers, partners, and procurement teams."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={12}>
          {TOPICS.map((topic) => (
            <Box key={topic.title} p={7} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="0.9375rem" fontWeight="600" color={INK} mb={4}>{topic.title}</Heading>
              <Stack gap={2.5}>
                {topic.links.map((link) => (
                  <Link key={link.label} to={link.to} style={{ textDecoration: "none" }}>
                    <Text fontSize="0.875rem" color={MUTED} _hover={{ color: INK }}>
                      {link.label}
                    </Text>
                  </Link>
                ))}
              </Stack>
            </Box>
          ))}
        </Grid>

        <Box p={8} border={`1px solid ${RULE}`} borderRadius="8px" display="flex"
          flexDirection={{ base: "column", md: "row" }}
          alignItems={{ md: "center" }} justifyContent="space-between" gap={6}>
          <Box>
            <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={2}>Can't find what you need?</Heading>
            <Text fontSize="0.875rem" color={MUTED}>Our support team typically responds within one business day.</Text>
          </Box>
          <CTA to="/contact" variant="primary">Contact support</CTA>
        </Box>
      </ContentSection>
    </MarketingLayout>
  )
}
