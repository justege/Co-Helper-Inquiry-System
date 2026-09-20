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
    body: "Send each company an invite link. They join your workspace and only see the projects you share with them. Someone invited by two operators simply belongs to two workspaces.",
  },
  {
    n: "03",
    title: "Run the work in one place",
    body: "Open the workbench: one Now, to-dos in project accordions, hours as you go. The client always sees current work, remaining hours, your normal week, and invoices from that same record.",
  },
]

const JOB_TYPES = [
  { name: "Ongoing service", examples: "Retainers, weekly support, continuous product work" },
  { name: "Fixed-scope project", examples: "A launch, a rebuild, a defined delivery with an end date" },
  { name: "To-dos", examples: "Status, estimate, and logged hours on each item" },
  { name: "Rates & hours", examples: "Hourly, fixed, or hybrid — then time against the project" },
  { name: "Weekly pace", examples: "Your normal week, hours on this project, a finish window" },
  { name: "Invoices", examples: "Draft from unbilled work, PDF, send, mark paid — we don’t move money" },
]

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="How it works"
        subtitle="A private workspace between a one-person business and the companies they work with — invite, work from one Now, and share hours, remaining work, and invoices."
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
            What lives on a project
          </Text>
          <Heading fontSize="1.25rem" fontWeight="600" color={INK} mb={3} letterSpacing="-0.02em">
            One project. Everything you used to scatter across email and a spreadsheet.
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
                "See only the projects they share with you",
                "See what they are working on right now — or an honest note if it’s other client work",
                "Follow remaining hours, weekly pace, and invoices",
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
                "Home is the work: one Now and to-dos in project accordions",
                "Set a normal week and optional hours/week per project",
                "Invoice from unbilled hours; we don’t take a cut or hold funds",
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
