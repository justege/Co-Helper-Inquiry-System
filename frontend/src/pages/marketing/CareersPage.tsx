import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const OPENINGS = [
  {
    title: "Senior Backend Engineer",
    location: "Istanbul · Hybrid",
    team: "Engineering",
    description: "Build and scale the APIs that power inquiry management, offer workflows, and partner integrations.",
  },
  {
    title: "Partner Success Manager",
    location: "Izmir · On-site",
    team: "Operations",
    description: "Onboard and support Turkish manufacturing partners. Ensure quality standards and platform adoption.",
  },
  {
    title: "Product Designer",
    location: "Remote · EU timezone",
    team: "Product",
    description: "Design procurement workflows for global buyers and partner-facing tools for manufacturers.",
  },
  {
    title: "Enterprise Sales Representative",
    location: "Berlin · Hybrid",
    team: "Sales",
    description: "Work with procurement teams at mid-market and enterprise companies sourcing from Turkey.",
  },
]

const BENEFITS = [
  "Competitive salary and equity",
  "Hybrid and remote-friendly roles",
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
        subtitle="Join us in building the infrastructure for transparent B2B sourcing from Turkey."
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
