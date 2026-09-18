import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE } from "@/components/marketing/tokens"

const TOPICS = [
  {
    title: "Getting started",
    links: [
      { label: "How a one-person business workspace works", to: "/how-it-works" },
      { label: "Inviting a company", to: "/how-it-works" },
      { label: "Joining with an invite", to: "/how-it-works" },
    ],
  },
  {
    title: "Jobs",
    links: [
      { label: "Opening a job and writing the brief", to: "/how-it-works" },
      { label: "Edit with AI on requirements and chat", to: "/how-it-works" },
      { label: "To-dos, hours, and payment logs", to: "/how-it-works" },
    ],
  },
  {
    title: "For one-person businesses",
    links: [
      { label: "Create your workspace", to: "/partners" },
      { label: "Import a Trello board", to: "/how-it-works" },
      { label: "Services you offer the companies you work with", to: "/partners" },
    ],
  },
  {
    title: "Account & billing",
    links: [
      { label: "Pricing — $9/month until 31.12.2026, then $49", to: "/pricing" },
      { label: "We don’t process payments", to: "/pricing" },
      { label: "Billing questions", to: "/contact" },
    ],
  },
]

export default function HelpPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Support"
        title="Help Center"
        subtitle="Guides for one-person businesses and the companies they invite — workspace, jobs, AI, hours, and payment logs."
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
