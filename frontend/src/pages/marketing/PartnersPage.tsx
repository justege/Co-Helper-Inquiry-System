import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { CheckItem, ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const REQUIREMENTS = [
  "Registered business or verified freelancer with portfolio",
  "Valid professional credentials in your service area",
  "English-speaking point of contact",
  "Relevant certifications or work samples where applicable",
  "Ability to deliver within stated timelines",
]

const BENEFITS = [
  "Pre-scoped project briefs matched to your capabilities",
  "Co-Helper project manager handles all client communication",
  "Verified specialist badge visible to global clients",
  "Publish your services and portfolio on the platform",
  "Success-based fees — no subscription required to start",
]

export default function PartnersPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Support"
        title="Specialist network"
        subtitle="Join Co-Helper as a verified software developer and receive scoped project briefs from clients worldwide."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12} mb={16}>
          <Box>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={5}>Why join our network</Heading>
            <Stack gap={3} mb={8}>
              {BENEFITS.map((b) => (
                <CheckItem key={b}>{b}</CheckItem>
              ))}
            </Stack>
            <CTA to="/partner/register" variant="primary">Apply now</CTA>
          </Box>

          <Box p={8} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
            <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={5}>Verification requirements</Heading>
            <Stack gap={3}>
              {REQUIREMENTS.map((r) => (
                <Text key={r} fontSize="0.875rem" color={MUTED} lineHeight="1.65">{r}</Text>
              ))}
            </Stack>
          </Box>
        </Grid>

        <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={6}>
          {[
            { step: "1", title: "Apply", body: "Create a specialist account and submit your profile, portfolio, and capability areas." },
            { step: "2", title: "Verification", body: "Our team reviews your application. Verified specialists receive a badge visible to all clients." },
            { step: "3", title: "Receive projects", body: "Matched project briefs arrive in your dashboard. Your Co-Helper PM coordinates delivery and client updates." },
          ].map((s) => (
            <Box key={s.step} p={7} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <Text fontSize="0.75rem" fontWeight="700" color={MUTED} mb={3}>Step {s.step}</Text>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={2}>{s.title}</Heading>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">{s.body}</Text>
            </Box>
          ))}
        </Grid>

        <Box mt={12} p={8} border={`1px solid ${RULE}`} borderRadius="8px"
          display="flex" flexDirection={{ base: "column", md: "row" }}
          alignItems={{ md: "center" }} justifyContent="space-between" gap={6}>
          <Box>
            <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={2}>Questions about joining?</Heading>
            <Text fontSize="0.875rem" color={MUTED}>Contact our partnerships team for onboarding support.</Text>
          </Box>
          <CTA to="/contact" variant="outline">Contact partnerships</CTA>
        </Box>
      </ContentSection>
    </MarketingLayout>
  )
}
