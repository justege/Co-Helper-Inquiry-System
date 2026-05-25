import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { CheckItem, ContentSection, CTA, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const REQUIREMENTS = [
  "Registered company in Turkey with export experience",
  "Valid tax registration and business licence",
  "English-speaking point of contact",
  "Relevant industry certifications where applicable",
  "Ability to fulfil orders within stated lead times",
]

const BENEFITS = [
  "Pre-qualified inquiry briefs matched to your capabilities",
  "Structured offer submission — no unstructured email chains",
  "Verified partner badge visible to global buyers",
  "Publish your services and price lists on the platform",
  "Success-based fees — no subscription required to start",
]

export default function PartnersPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Support"
        title="Partner program"
        subtitle="Join OutsourceSoft as a verified manufacturer or service provider and receive qualified leads from global buyers."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12} mb={16}>
          <Box>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={5}>Why partner with us</Heading>
            <Stack gap={3} mb={8}>
              {BENEFITS.map((b) => (
                <CheckItem key={b}>{b}</CheckItem>
              ))}
            </Stack>
            <CTA to="/register" variant="primary">Apply now</CTA>
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
            { step: "1", title: "Apply", body: "Create a partner account and submit your company profile, certifications, and capability areas." },
            { step: "2", title: "Verification", body: "Our team reviews your application. Verified partners receive a badge visible to all buyers." },
            { step: "3", title: "Receive inquiries", body: "Matched inquiry briefs arrive in your dashboard. Submit structured offers within the deadline." },
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
            <Heading fontSize="1.0625rem" fontWeight="600" color={INK} mb={2}>Questions about partnering?</Heading>
            <Text fontSize="0.875rem" color={MUTED}>Contact our partnerships team for onboarding support.</Text>
          </Box>
          <CTA to="/contact" variant="outline">Contact partnerships</CTA>
        </Box>
      </ContentSection>
    </MarketingLayout>
  )
}
