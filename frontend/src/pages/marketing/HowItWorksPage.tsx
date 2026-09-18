import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { CheckItem, ContentSection, CTA, PageHero, StepNumber } from "@/components/marketing/MarketingUI"
import { GREEN, INK, LIGHT, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const STEPS = [
  {
    n: "01",
    title: "Open a workspace",
    body: "A one-person business creates an account and gets a private workspace. There is no marketplace browse, no matching, and no Co-Helper PM — you already have the companies you work with.",
  },
  {
    n: "02",
    title: "Invite the companies you work with",
    body: "Send each company an invite link. They join your workspace and only see the jobs you share with them. Someone invited by two operators simply belongs to two workspaces.",
  },
  {
    n: "03",
    title: "Run every job in one place",
    body: "Open a job (or import a Trello board). Clarify the brief and chat with Edit with AI, agree hourly or project rates, keep to-dos, log hours, and record payments — so both sides always know where things stand.",
  },
]

const JOB_TYPES = [
  { name: "Ongoing service", examples: "Retainers, weekly support, continuous product work" },
  { name: "Fixed-scope project", examples: "A launch, a rebuild, a defined delivery with an end date" },
  { name: "Requirements & chat", examples: "One shared brief, messages, and documents per job" },
  { name: "To-dos", examples: "Checklists from you — or imported from Trello cards" },
  { name: "Rates & hours", examples: "Hourly or project price, then logged time against the job" },
  { name: "Payment logs", examples: "Record paid, partial, or unpaid — Co-Helper does not process money" },
]

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="How it works"
        subtitle="A private workspace between a one-person business and the companies they work with — invite, open jobs, clarify with AI, and track rates, hours, and payments."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={{ base: 10, md: 8 }} mb={16}>
          {STEPS.map((step) => (
            <Box key={step.n}>
              <StepNumber n={step.n} />
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={3}>{step.title}</Heading>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.7">{step.body}</Text>
            </Box>
          ))}
        </Grid>

        <Box mb={16}>
          <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            What lives on a job
          </Text>
          <Heading fontSize="1.25rem" fontWeight="600" color={INK} mb={3} letterSpacing="-0.02em">
            One job. Everything you used to scatter across email and Trello.
          </Heading>
          <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.75" mb={8} maxW="640px">
            You decide the work. Co-Helper is the shared record — not a staffing network and not an escrow agent.
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)", lg: "repeat(3,1fr)" }} gap={4}>
            {JOB_TYPES.map((cat) => (
              <Box key={cat.name} p={6} bg={LIGHT} borderRadius="8px" border={`1px solid ${RULE}`}>
                <Text fontSize="0.9375rem" fontWeight="700" color={INK} mb={2} fontFamily="var(--font-heading)">
                  {cat.name}
                </Text>
                <Text fontSize="0.8125rem" color={MUTED} lineHeight="1.65">{cat.examples}</Text>
              </Box>
            ))}
          </Grid>
        </Box>

        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
          <Box p={10} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={4}>For companies</Heading>
            <Stack gap={3} mb={8}>
              {[
                "You join with an invite from the one-person business you work with",
                "See only the jobs they share with you",
                "Agree hourly or project rates together",
                "Follow hours, to-dos, and what you’ve paid",
                "No browsing, matching, or platform commission",
              ].map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </Stack>
            <CTA to="/login" variant="primary">I have an invite</CTA>
          </Box>
          <Box p={10} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
            <Heading fontSize="1.125rem" fontWeight="600" color={INK} mb={4}>For one-person businesses</Heading>
            <Stack gap={3} mb={8}>
              {[
                "Your own workspace — you own the client relationship",
                "Invite companies by email and copy a link",
                "Import Trello columns as projects and cards as jobs",
                "Edit with AI on requirements, chat, and to-dos",
                "Log hours and payments; we don’t take a cut or hold funds",
              ].map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </Stack>
            <CTA to="/partner/register" variant="outline">Start your workspace</CTA>
          </Box>
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
