import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const OPENINGS = [
  {
    title: "Senior Backend Engineer",
    location: "Remote · Global",
    team: "Engineering",
    description: "Build the APIs behind workspaces, jobs, Trello import, and payment logs — Postgres, Express, and DigitalOcean.",
  },
  {
    title: "Product Engineer (workspace)",
    location: "Remote · EU timezone",
    team: "Engineering",
    description: "Own the job surface for one-person businesses and invited companies: chat, to-dos, agreements, hours, and Edit with AI.",
  },
  {
    title: "Product Designer",
    location: "Remote · Global",
    team: "Product",
    description: "Design calm tools for two people on a job — not a marketplace browse, not a staffing dashboard.",
  },
  {
    title: "Customer success (one-person businesses)",
    location: "Remote · Americas",
    team: "Support",
    description: "Help one-person businesses invite companies, import Trello, and keep hours and payment logs honest.",
  },
]

const BENEFITS = [
  "Competitive salary and equity",
  "Fully remote-friendly roles",
  "Private health insurance",
  "Professional development budget",
  "Annual team offsite",
]

export default function CareersPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Company"
        title="Careers"
        subtitle="Help us build the shared workspace between a one-person business and the companies they work with — not a hiring marketplace."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={12} mb={16}>
          <Box>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={4}>Open positions</Heading>
            <Stack gap={4}>
              {OPENINGS.map((job) => (
                <Box key={job.title} p={6} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
                  <Box display="flex" flexWrap="wrap" justifyContent="space-between" gap={2} mb={2}>
                    <Text fontSize="0.9375rem" fontWeight="600" color={INK}>{job.title}</Text>
                    <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.04em" textTransform="uppercase">
                      {job.team}
                    </Text>
                  </Box>
                  <Text fontSize="0.8125rem" color={MUTED} mb={3}>{job.location}</Text>
                  <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65" mb={4}>{job.description}</Text>
                  <CTA to="/contact" variant="outline">Apply now</CTA>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box>
            <Box p={6} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`} mb={6}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={4}>Benefits</Heading>
              <Stack gap={2}>
                {BENEFITS.map((b) => (
                  <Text key={b} fontSize="0.875rem" color={MUTED}>{b}</Text>
                ))}
              </Stack>
            </Box>
            <Box p={6} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={3}>Don't see your role?</Heading>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65" mb={4}>
                Send your CV and a brief introduction. We review all applications.
              </Text>
              <CTA to="/contact" variant="primary">Get in touch</CTA>
            </Box>
          </Box>
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
