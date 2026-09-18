import { Box, Flex, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { MarketingFooter, AnnounceBar } from "@/components/marketing/MarketingUI"
import {
  CodeTypewriter,
  MatrixColHeader,
  MatrixRow,
  ScrollColorText,
  ScrollReveal,
  TypewriterSubline,
} from "@/components/landing/LandingEffects"
import { AMBER, AMBER_HOVER, BLUE, GREEN, INK, MUTED, RULE } from "@/components/marketing/tokens"
import programmer1 from "@/assets/Programmer1.png"
import programmer2 from "@/assets/Programmer2.png"

// ─── Design tokens ───────────────────────────────────────────────────────────
const LIGHT     = "#F5F7FA"
const G_ON_DARK = "#86efac"   // mint — legible on INK

// ─── Nav ─────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "How it works",  to: "/how-it-works" },
  { label: "Pricing",       to: "/pricing" },
  { label: "About",         to: "/about" },
  { label: "For one-person businesses", to: "/partners" },
]

function LogoMark({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" style={{ textDecoration: "none" }}>
      <Flex align="center" gap="10px">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          <line x1="2"  y1="4"  x2="14" y2="14" stroke={light ? "rgba(255,255,255,0.55)" : BLUE} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26" y1="4"  x2="14" y2="14" stroke={light ? "rgba(255,255,255,0.55)" : BLUE} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="26" x2="14" y2="14" stroke={light ? "rgba(255,255,255,0.55)" : BLUE} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="14" cy="14" r="4.5" fill={light ? "white" : INK} />
          <circle cx="14" cy="14" r="2"   fill={light ? INK : "white"} />
        </svg>
        <Text fontSize="0.9375rem" fontWeight="700" color={light ? "white" : INK}
          letterSpacing="-0.01em" fontFamily="var(--font-heading)">
          Co-Helper
        </Text>
      </Flex>
    </Link>
  )
}

function NavBar({ light = false }: { light?: boolean }) {
  const textColor   = light ? "rgba(255,255,255,0.72)" : MUTED
  const hoverColor  = light ? "white"                  : INK
  const ctaOutline  = light
    ? { bg: "transparent", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.28)", _hover: { bg: "rgba(255,255,255,0.06)", color: "white" } }
    : { bg: "transparent", color: MUTED, border: `1px solid ${RULE}`, _hover: { borderColor: "#9CA3AF" } }

  return (
    <Flex align="center" justify="space-between" w="full">
      <LogoMark light={light} />

      {/* Centre links — hidden on mobile */}
      <Flex align="center" gap={6} display={{ base: "none", lg: "flex" }}>
        {NAV_LINKS.map((l) => (
          <Link key={l.label} to={l.to} style={{ textDecoration: "none" }}>
            <Text
              fontSize="0.875rem" fontWeight="500" color={textColor}
              transition="color 0.12s"
              _hover={{ color: hoverColor }}
            >
              {l.label}
            </Text>
          </Link>
        ))}
      </Flex>

      {/* Right CTAs */}
      <Flex align="center" gap={2}>
        <Link to="/login" style={{ textDecoration: "none" }}>
          <Box
            px={4} py="8px" borderRadius="6px" fontSize="0.875rem" fontWeight="600"
            transition="all 0.15s" {...ctaOutline}
          >
            Sign in
          </Box>
        </Link>
        <Link to="/partner/register" style={{ textDecoration: "none" }}>
          <Box
            px={4} py="8px" borderRadius="6px" fontSize="0.875rem" fontWeight="700"
            bg={AMBER} color={INK} border={`1px solid ${AMBER}`}
            transition="all 0.15s"
            _hover={{ bg: AMBER_HOVER, textDecoration: "none" }}
          >
            Start your workspace
          </Box>
        </Link>
      </Flex>
    </Flex>
  )
}

// ─── Get-started card (hero) ─────────────────────────────────────────────────
// Replaces the old marketplace brief-intake form: no browsing, no matching —
// just two clear paths into a shared workspace.

function GetStartedCard() {
  return (
    <Box
      borderRadius="16px"
      border="1px solid rgba(255,255,255,0.1)"
      bg="rgba(255,255,255,0.04)"
      backdropFilter="blur(6px)"
      p={{ base: 6, md: 7 }}
      boxShadow="0 30px 80px rgba(0,0,0,0.35)"
    >
      <Text fontSize="0.6875rem" fontWeight="700" color="rgba(255,255,255,0.5)"
        letterSpacing="0.12em" textTransform="uppercase" mb={2}>
        Get started in minutes
      </Text>
      <Heading fontSize={{ base: "1.375rem", md: "1.5rem" }} fontWeight="700" color="white"
        letterSpacing="-0.02em" mb={2} fontFamily="var(--font-heading)">
        Set up your workspace
      </Heading>
      <Text fontSize="0.875rem" color="rgba(255,255,255,0.55)" lineHeight="1.65" mb={6}>
        No project posting, no matching. Co-Helper is where you and the companies you already
        work with keep every job, rate, and payment in one place.
      </Text>

      <Stack gap={3}>
        <Link to="/partner/register" style={{ textDecoration: "none" }}>
          <Flex
            align="center" justify="space-between" gap={3}
            p={4} borderRadius="12px"
            bg={AMBER} border={`1px solid ${AMBER}`}
            transition="all 0.15s"
            _hover={{ bg: AMBER_HOVER }}
          >
            <Box>
              <Text fontSize="0.9375rem" fontWeight="700" color={INK}>I run a one-person business</Text>
              <Text fontSize="0.75rem" color="rgba(14,27,23,0.7)" mt="2px">
                Create your workspace and invite the companies you work with
              </Text>
            </Box>
            <Text fontSize="1.125rem" color={INK}>→</Text>
          </Flex>
        </Link>

        <Link to="/login" style={{ textDecoration: "none" }}>
          <Flex
            align="center" justify="space-between" gap={3}
            p={4} borderRadius="12px"
            bg="rgba(255,255,255,0.06)" border="1px solid rgba(255,255,255,0.14)"
            transition="all 0.15s"
            _hover={{ bg: "rgba(255,255,255,0.1)" }}
          >
            <Box>
              <Text fontSize="0.9375rem" fontWeight="700" color="white">I was invited by a one-person business</Text>
              <Text fontSize="0.75rem" color="rgba(255,255,255,0.5)" mt="2px">
                Sign in to see your jobs, rates, and payments
              </Text>
            </Box>
            <Text fontSize="1.125rem" color="white">→</Text>
          </Flex>
        </Link>
      </Stack>

      <Text fontSize="0.75rem" color="rgba(255,255,255,0.35)" mt={5} lineHeight="1.6">
        Every workspace is private between a one-person business and the companies they invite — nobody else sees it.
      </Text>
    </Box>
  )
}

// ─── Client type strip ────────────────────────────────────────────────────────
const CLIENT_TYPES = [
  "SaaS startups", "Non-technical founders", "E-commerce brands",
  "Product studios", "Growth-stage companies", "Lean product teams",
  "Digital agencies", "Bootstrapped MVPs", "Marketing-led products", "SMB software owners",
]

function ClientStrip() {
  return (
    <Box
      borderTop={`1px solid ${RULE}`} borderBottom={`1px solid ${RULE}`}
      py={4} overflow="hidden" bg="white"
    >
      <Flex
        gap={10} whiteSpace="nowrap"
        style={{ animation: "marqueeTick 28s linear infinite" }}
      >
        {[...CLIENT_TYPES, ...CLIENT_TYPES].map((t, i) => (
          <Flex key={i} align="center" gap={3} flexShrink={0}>
            <Box w="5px" h="5px" borderRadius="50%" bg={RULE} flexShrink={0} />
            <Text fontSize="0.875rem" fontWeight="500" color={MUTED}>{t}</Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "1",      unit: "workspace", label: "Shared between you and every client you invite" },
  { value: "AI",     unit: "",          label: "Rewrites requirements, chat, and to-dos for clarity" },
  { value: "Hourly", unit: "or fixed",  label: "Agree the pricing model that fits each job" },
  { value: "100%",   unit: "",          label: "Of hours and payments logged in one place" },
]

// ─── Comparison matrix ────────────────────────────────────────────────────────
const MATRIX_COLS = ["Setup time", "Client visibility", "AI clarity", "Hours tracking", "Payment tracking", "Cost", "Ownership", "Your branding"]

const MATRIX_ROWS = [
  {
    name: "Co-Helper",
    desc: "Your own workspace — invite clients, agree rates, track hours and payments, clarify everything with AI.",
    highlight: true,
    scores: [true, true, true, true, true, true, true, true],
  },
  {
    name: "Email + spreadsheets",
    desc: "Familiar, but scattered across inboxes and files. No shared view, no AI help, and totals are manual.",
    scores: [true, false, false, false, false, true, true, true],
  },
  {
    name: "Generic task tools",
    desc: "Fine for your own to-do list, but clients rarely log in — and there's no rate or payment tracking built in.",
    scores: [false, false, false, false, false, false, true, true],
  },
  {
    name: "Marketplace platforms",
    desc: "You get discovery, but the platform owns the relationship, takes a cut, and buries your history in its inbox.",
    scores: [true, true, false, true, false, false, false, false],
  },
]

function CheckIcon({ pass }: { pass: boolean }) {
  if (pass) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill="rgba(134,239,172,0.15)" stroke="rgba(134,239,172,0.4)" strokeWidth="1" />
        <path d="M6.5 10L8.5 12L13.5 7.5" stroke="#86efac" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "I used to keep client requirements spread across three Slack channels and a Google Doc. Now every job has one thread, and Edit with AI turns my rushed notes into something my client actually understands.",
    name: "Sarah K.",
    role: "Independent web developer",
    initials: "SK",
  },
  {
    quote: "My developer invited me straight into Co-Helper. I can see exactly what's agreed, how many hours have been logged, and what I've paid — no more digging through email threads.",
    name: "Marcus T.",
    role: "Head of operations, DTC brand",
    initials: "MT",
  },
  {
    quote: "Switching between hourly and fixed-fee clients used to mean three different spreadsheets. Now every job has its own rate agreement and a running total that's always accurate.",
    name: "Elena V.",
    role: "Independent marketing consultant",
    initials: "EV",
  },
  {
    quote: "AI cleaned up my messy brief into something our partner could actually scope. We agreed a fixed price the same afternoon, in writing, inside the job.",
    name: "Tom R.",
    role: "Product lead, small SaaS team",
    initials: "TR",
  },
  {
    quote: "The to-do list per job keeps me and my client aligned on what's next — and the activity log means neither of us has to ask 'wait, did we agree to that?'",
    name: "Priya S.",
    role: "Independent product designer",
    initials: "PS",
  },
  {
    quote: "I can see my total spend with our one-person partner at a glance — paid, unpaid, and what's still in progress. That transparency alone was worth switching.",
    name: "Daniel M.",
    role: "Founder, early-stage company",
    initials: "DM",
  },
]

// ─── Difference pillars ───────────────────────────────────────────────────────
const PILLARS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={INK} strokeWidth="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={INK} strokeWidth="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={INK} strokeWidth="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={INK} strokeWidth="1.5" />
      </svg>
    ),
    tag: "Your workspace",
    title: "Invite clients directly",
    body: "No browsing, no matching. Create a workspace and invite the clients you already work with — each one sees only their own jobs.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    tag: "AI-assisted",
    title: "Edit with AI, everywhere",
    body: "Turn a rushed note into a clear requirement, tidy up a chat message, or sharpen a to-do — using the full context of that job.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={INK} strokeWidth="1.5" />
        <path d="M12 7v5l3.5 2" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    tag: "Flexible pricing",
    title: "Hourly or fixed, per job",
    body: "Propose a rate, the other side agrees, and it's on record. Change it later and the history stays intact.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke={INK} strokeWidth="1.5" />
        <path d="M8 10h8M8 14h5" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    tag: "Always tracked",
    title: "Hours logged, not guessed",
    body: "Log time against a job as you work. Billable hours roll up automatically against the agreed rate.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.5" stroke={INK} strokeWidth="1.5" />
        <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    tag: "Full visibility",
    title: "Payments and income at a glance",
    body: "Mark payments as paid, partial, or outstanding — and see totals per job, per client, and across your whole workspace.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    tag: "One record",
    title: "An activity log for everything",
    body: "Every agreement, logged hour, payment, and AI edit is timestamped — so nobody has to ask what was decided.",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <Box minH="100vh" bg="white" color={INK} fontFamily="var(--font-body)">

      {/* ══ § HERO ══════════════════════════════════════════════════════════ */}
      <Box
        position="relative" overflow="hidden"
        bg={INK}
        pt={{ base: 0, lg: 0 }}
      >
        {/* Background video — scaled to crop AI watermark */}
        <Box
          as="video"
          position="absolute" inset={0} w="full" h="full"
          objectFit="cover" objectPosition="50% 42%"
          transform="scale(1.22)" transformOrigin="center center"
          zIndex={0}
          // @ts-ignore — HTML video attrs passed as Box props
          autoPlay loop muted playsInline
          src="/assets/hero.mp4"
        />

        {/* Dark overlay so text stays legible */}
        <Box
          position="absolute" inset={0} zIndex={1}
          background="linear-gradient(160deg, rgba(14,27,23,0.82) 0%, rgba(14,27,23,0.70) 60%, rgba(14,27,23,0.85) 100%)"
        />

        {/* Subtle grid texture on top of video */}
        <svg aria-hidden style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          pointerEvents: "none", zIndex: 2,
        }} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 120} y1="0" x2={i * 120} y2="900"
              stroke="#fff" strokeWidth="0.5" opacity="0.03" />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 130} x2="1440" y2={i * 130}
              stroke="#fff" strokeWidth="0.5" opacity="0.03" />
          ))}
        </svg>

        {/* Nav + content — above video */}
        <Box position="relative" zIndex={3} display="flex" flexDir="column">
        <AnnounceBar />
        <Box maxW="1280px" mx="auto" px={{ base: 5, md: 8 }} pt={{ base: 5, md: 6 }} pb={0} w="full">
          <NavBar light />
        </Box>

        {/* Hero content */}
        <Box maxW="1280px" mx="auto" px={{ base: 5, md: 8 }}
          pt={{ base: 10, md: 12 }} pb={{ base: 12, md: 14 }}>
          <Grid
            templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 460px" }}
            gap={{ base: 10, lg: 14 }}
            alignItems="center"
          >
            {/* Left */}
            <Box maxW={{ lg: "520px" }}>

              <Text
                fontSize="0.6875rem" fontWeight="700"
                color="rgba(255,255,255,0.45)" letterSpacing="0.14em"
                textTransform="uppercase" mb={4}
                fontFamily="var(--font-heading)"
              >
                The one-person business workspace
              </Text>

              {/* Headline */}
              <Heading
                as="h1"
                fontSize={{ base: "2rem", md: "2.375rem", lg: "2.625rem" }}
                fontWeight="700" lineHeight="1.12" letterSpacing="-0.03em"
                mb={4} fontFamily="var(--font-heading)"
              >
                <Box as="span" color="white" display="block">Run every job</Box>
                <Box as="span" color={G_ON_DARK} display="block" mt={1}>
                  in one shared workspace.
                </Box>
              </Heading>

              <Text
                fontSize={{ base: "0.9375rem", md: "1rem" }}
                color="rgba(255,255,255,0.58)"
                lineHeight="1.65" maxW="420px" mb={6}
              >
                Invite the companies you work with, agree how you're paid, and let AI keep requirements,
                chat, and to-dos clear for both sides — with hours and payments tracked automatically.
              </Text>

              <Flex gap={2.5} flexWrap="wrap" mb={8}>
                <Link to="/partner/register" style={{ textDecoration: "none" }}>
                  <Box px={4} py="9px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                    bg={AMBER} color={INK} border={`1px solid ${AMBER}`}
                    _hover={{ bg: AMBER_HOVER }} transition="all 0.15s">
                    Start your workspace →
                  </Box>
                </Link>
                <Link to="/how-it-works" style={{ textDecoration: "none" }}>
                  <Box px={4} py="9px" borderRadius="6px" fontWeight="600" fontSize="0.875rem"
                    bg="transparent" color="rgba(255,255,255,0.78)"
                    border="1px solid rgba(255,255,255,0.2)"
                    _hover={{ bg: "rgba(255,255,255,0.06)", color: "white" }}
                    transition="all 0.15s">
                    How it works
                  </Box>
                </Link>
              </Flex>

              {/* Stats */}
              <Flex
                gap={0} flexWrap="wrap"
                borderTop="1px solid rgba(255,255,255,0.1)"
                pt={5}
              >
                {[
                  { v: "1 workspace", l: "Per company you work with" },
                  { v: "AI",          l: "Edit with AI, everywhere" },
                  { v: "Hourly/fixed", l: "Rates, tracked either way" },
                ].map((s, i) => (
                  <Flex
                    key={s.l} align="center"
                    pr={{ base: 6, md: 8 }}
                    mr={{ base: 6, md: 8 }}
                    borderRight={i < 2 ? "1px solid rgba(255,255,255,0.1)" : undefined}
                  >
                    <Box>
                      <Text fontSize={{ base: "1.25rem", md: "1.375rem" }} fontWeight="700"
                        color="white" letterSpacing="-0.03em" lineHeight="1"
                        fontFamily="var(--font-heading)">{s.v}</Text>
                      <Text fontSize="0.6875rem" color="rgba(255,255,255,0.38)" mt={1}
                        letterSpacing="0.02em">{s.l}</Text>
                    </Box>
                  </Flex>
                ))}
              </Flex>
            </Box>

            {/* Right: get-started card */}
            <Box w="full" minW={0}>
              <GetStartedCard />
            </Box>
          </Grid>
        </Box>
        </Box>{/* end zIndex wrapper */}
      </Box>{/* end hero */}

      {/* Client type strip */}
      <ClientStrip />

      {/* ══ § THE PROBLEM ═══════════════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg="white" borderBottom={`1px solid ${RULE}`}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            The problem with client work today
          </Text>
          <Heading
            fontSize={{ base: "1.875rem", md: "2.5rem" }}
            fontWeight="700" letterSpacing="-0.034em" mb={4}
            maxW="640px" fontFamily="var(--font-heading)"
          >
            Client work slows down without a shared system.
          </Heading>
          <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.8" mb={14} maxW="560px">
            One-person businesses juggle chat apps, spreadsheets, and invoices across every company —
            while the actual work waits on a clear answer.
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={5}>
            {[
              {
                tag: "Clarity",
                title: "One shared job, not five threads",
                body: "Requirements, chat, and files live with the job — not scattered across email, WhatsApp, and messages neither of you can find again.",
              },
              {
                tag: "Understanding",
                title: "AI keeps everyone on the same page",
                body: "A rushed voice note or a vague client message becomes something both of you can act on — without a slow back-and-forth.",
              },
              {
                tag: "Money",
                title: "Rates, hours, and payments — tracked",
                body: "Agree how you're paid, log hours as you go, and record every payment. No more guessing what's owed or rebuilding invoices from memory.",
              },
            ].map((item, i) => (
              <ScrollReveal key={item.tag} delay={i * 100}>
                <Box p={8} bg={LIGHT} borderRadius="12px" border={`1px solid ${RULE}`}
                  _hover={{ borderColor: GREEN, bg: "white", boxShadow: `0 4px 20px rgba(15,110,86,0.06)` }}
                  transition="all 0.2s">
                  <Box display="inline-flex" px={2.5} py="3px" borderRadius="99px" mb={5}
                    bg={`${GREEN}12`} border={`1px solid ${GREEN}30`}>
                    <Text fontSize="0.65rem" fontWeight="700" color={GREEN}
                      letterSpacing="0.06em">{item.tag}</Text>
                  </Box>
                  <Text fontSize="1rem" fontWeight="700" color={INK} mb={3}
                    letterSpacing="-0.015em" fontFamily="var(--font-heading)">{item.title}</Text>
                  <Text fontSize="0.9rem" color={MUTED} lineHeight="1.75">{item.body}</Text>
                </Box>
              </ScrollReveal>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* ══ § BEYOND SCATTERED TOOLS ══════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg="white">
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={{ base: 12, lg: 20 }} alignItems="center">
            <Box>
              <ScrollReveal>
                <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
                  letterSpacing="0.12em" textTransform="uppercase" mb={4}
                  fontFamily="var(--font-heading)">
                  A better way to work with clients
                </Text>
              </ScrollReveal>
              <ScrollReveal delay={80}>
                <Heading
                  fontSize={{ base: "2rem", md: "2.75rem", lg: "3rem" }}
                  fontWeight="700" letterSpacing="-0.035em" lineHeight="1.1" mb={2}
                  fontFamily="var(--font-heading)"
                >
                  Beyond scattered tools.
                </Heading>
              </ScrollReveal>
              <ScrollReveal delay={160}>
                <TypewriterSubline
                  phrases={[
                    "One workspace instead of five tools.",
                    "AI clarity on every requirement.",
                    "Every hour and payment, logged.",
                  ]}
                  fontSize={{ base: "1.125rem", md: "1.375rem", lg: "1.5rem" }}
                />
              </ScrollReveal>
              <CodeTypewriter />
              <ScrollReveal delay={240}>
                <Text fontSize={{ base: "0.9375rem", md: "1rem" }} color={MUTED} lineHeight="1.8" mb={6} mt={6}>
                  One-person businesses juggle company email, a spreadsheet for hours, an invoicing tool,
                  and requirements buried in chat threads. Co-Helper puts all of it — chat,
                  rates, hours, payments — inside a single shared job.
                </Text>
              </ScrollReveal>
              <ScrollReveal delay={320}>
                <Text fontSize={{ base: "0.9375rem", md: "1rem" }} color={MUTED} lineHeight="1.8" mb={8}>
                  Because every client is invited into their own workspace, nothing gets lost
                  in a shared inbox — and AI can rewrite anything using the full context of that job.
                </Text>
              </ScrollReveal>
              <ScrollReveal delay={400}>
                <Link to="/partner/register" style={{ textDecoration: "none" }}>
                  <Box display="inline-flex" alignItems="center"
                    px={5} py="11px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                    bg={INK} color="white" border={`1px solid ${INK}`}
                    _hover={{ bg: "#1a2e26" }} transition="all 0.15s">
                    Start your workspace →
                  </Box>
                </Link>
              </ScrollReveal>
            </Box>

            {/* Right: feature list */}
            <Stack gap={5}>
              {[
                {
                  icon: "01",
                  title: "Invite your client",
                  body: "Add them by email. They see only the jobs you share with them — nothing else.",
                },
                {
                  icon: "02",
                  title: "Scope the job together",
                  body: "Write requirements in plain language. Edit with AI turns them into something both sides understand.",
                },
                {
                  icon: "03",
                  title: "Agree a rate",
                  body: "Hourly or fixed — propose it, they agree, and it's on record from day one.",
                },
                {
                  icon: "04",
                  title: "Track hours and payments",
                  body: "Log time as you work and record payments as they land. Every job shows exactly where it stands.",
                },
              ].map((item, i) => (
                <ScrollReveal key={item.icon} delay={i * 90}>
                  <Flex gap={4} align="flex-start"
                    p={5} borderRadius="10px" bg={LIGHT} border={`1px solid ${RULE}`}
                    _hover={{ borderColor: GREEN, bg: "white", boxShadow: `0 4px 20px rgba(15,110,86,0.06)` }}
                    transition="all 0.2s">
                    <Box w="32px" h="32px" borderRadius="8px" bg={INK} flexShrink={0}
                      display="flex" alignItems="center" justifyContent="center">
                      <Text fontSize="0.7rem" fontWeight="700" color={G_ON_DARK}>{item.icon}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="0.9375rem" fontWeight="700" color={INK} mb={1.5}
                        fontFamily="var(--font-heading)">{item.title}</Text>
                      <Text fontSize="0.875rem" color={MUTED} lineHeight="1.7">{item.body}</Text>
                    </Box>
                  </Flex>
                </ScrollReveal>
              ))}
            </Stack>
          </Grid>
        </Box>
      </Box>

      {/* ══ § EVERYTHING IN ONE WORKSPACE ═══════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg={LIGHT} borderTop={`1px solid ${RULE}`} borderBottom={`1px solid ${RULE}`}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            Easy &amp; hassle-free
          </Text>
          <Heading
            fontSize={{ base: "1.875rem", md: "2.5rem" }}
            fontWeight="700" letterSpacing="-0.034em" mb={3}
            maxW="640px" fontFamily="var(--font-heading)"
          >
            Everything in one shared workspace.
            {" "}
            <ScrollColorText as="span" from={MUTED} to={GREEN} fontWeight="600">
              Built for you and your clients.
            </ScrollColorText>
          </Heading>
          <Text fontSize="0.9375rem" color={MUTED} mb={14} maxW="520px" lineHeight="1.75">
            Whether you bill hourly or per project, manage one client or twenty — one
            workspace, one process, per relationship.
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={5}>
            {[
              {
                tag: "Your workspace",
                title: "You invite, you decide",
                body: "There's no browsing or matching. You invite the clients you already work with — each one sees only their own jobs.",
              },
              {
                tag: "AI-assisted",
                title: "Clarity without extra effort",
                body: "Edit with AI turns a messy note into a clear requirement or a clean chat message — using the context of that job.",
              },
              {
                tag: "Fully tracked",
                title: "Rates, hours, and payments in one place",
                body: "Propose hourly or fixed pricing, log time as you work, and record payments — so both sides always know where a job stands.",
              },
            ].map((c, i) => (
              <ScrollReveal key={c.tag} delay={i * 100}>
                <Box p={8} bg="white" borderRadius="12px" border={`1px solid ${RULE}`}
                  _hover={{ borderColor: GREEN, boxShadow: `0 4px 20px rgba(15,110,86,0.07)` }}
                  transition="all 0.2s">
                  <Box display="inline-flex" px={2.5} py="3px" borderRadius="99px" mb={5}
                    bg={`${GREEN}12`} border={`1px solid ${GREEN}30`}>
                    <Text fontSize="0.65rem" fontWeight="700" color={GREEN}
                      letterSpacing="0.06em">{c.tag}</Text>
                  </Box>
                  <Text fontSize="1rem" fontWeight="700" color={INK} mb={3}
                    letterSpacing="-0.015em" fontFamily="var(--font-heading)">{c.title}</Text>
                  <Text fontSize="0.9rem" color={MUTED} lineHeight="1.75">{c.body}</Text>
                </Box>
              </ScrollReveal>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* ══ § BUILT FOR REAL CLIENT WORK ════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg={INK}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Text fontSize="0.7rem" fontWeight="700" color={G_ON_DARK}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            Built for real client work
          </Text>
          <Heading
            fontSize={{ base: "1.875rem", md: "2.5rem" }}
            fontWeight="700" color="white" letterSpacing="-0.034em" mb={14}
            maxW="560px" fontFamily="var(--font-heading)"
          >
            Everything a one-person business needs to run client work well.
          </Heading>

          <Grid templateColumns={{ base: "repeat(2,1fr)", md: "repeat(4,1fr)" }} gap={5} mb={16}>
            {STATS.map((s) => (
              <Box key={s.label} p={6} borderRadius="12px"
                bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.07)">
                <Flex align="baseline" gap={1} mb={2}>
                  <Text fontSize={{ base: "2rem", md: "2.5rem" }} fontWeight="800"
                    color="white" letterSpacing="-0.05em" lineHeight="1"
                    fontFamily="var(--font-heading)">{s.value}</Text>
                  {s.unit && (
                    <Text fontSize="1rem" fontWeight="600" color={G_ON_DARK}>{s.unit}</Text>
                  )}
                </Flex>
                <Text fontSize="0.8rem" color="rgba(255,255,255,0.4)" lineHeight="1.6">{s.label}</Text>
              </Box>
            ))}
          </Grid>

          {/* Customer story highlights */}
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap={5}>
            {[
              {
                label: "Operator story",
                headline: `"I invited my three biggest companies in one afternoon. Now every job has its own thread instead of scattered emails."`,
                sub: "Independent web developer",
              },
              {
                label: "Client story",
                headline: `"I can finally see what I've paid and what's still owed — without asking our partner to explain a spreadsheet."`,
                sub: "Small business owner, tracking payments in Co-Helper",
              },
            ].map((s) => (
              <Box key={s.headline} p={7} borderRadius="12px"
                bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.07)"
                _hover={{ bg: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}
                transition="all 0.2s">
                <Text fontSize="0.65rem" fontWeight="700" color={G_ON_DARK}
                  letterSpacing="0.1em" textTransform="uppercase" mb={4}>{s.label}</Text>
                <Text fontSize={{ base: "1rem", md: "1.125rem" }} fontWeight="600"
                  color="white" lineHeight="1.5" mb={4}>{s.headline}</Text>
                <Text fontSize="0.8125rem" color="rgba(255,255,255,0.38)">{s.sub}</Text>
              </Box>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* ══ § COMPARISON MATRIX ═════════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg={INK}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Text fontSize="0.7rem" fontWeight="700" color={G_ON_DARK}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            Co-Helper vs. how you work today
          </Text>
          <Flex justify="space-between" align="flex-end" mb={14} flexWrap="wrap" gap={6}>
            <ScrollReveal>
              <Heading
                fontSize={{ base: "1.875rem", md: "2.5rem" }}
                fontWeight="700" color="white" letterSpacing="-0.034em"
                maxW="540px" fontFamily="var(--font-heading)"
              >
                Email, spreadsheets, generic tools?{" "}
                <Box as="span" display="inline">
                  <ScrollColorText as="span" from="rgba(255,255,255,0.45)" to="#86efac">
                    None of them fit.
                  </ScrollColorText>
                </Box>
              </Heading>
            </ScrollReveal>
            <ScrollReveal delay={120}>
              <Text fontSize="0.9375rem" maxW="300px" lineHeight="1.75">
                <ScrollColorText as="span" from="rgba(255,255,255,0.35)" to="rgba(255,255,255,0.72)">
                  A workspace built specifically for one-person businesses and the companies they work with — not a general-purpose tool.
                </ScrollColorText>
              </Text>
            </ScrollReveal>
          </Flex>

          {/* Table — horizontally scrollable on mobile */}
          <Box overflowX="auto" mx={{ base: -5, md: 0 }} px={{ base: 5, md: 0 }}>
            <Box minW="1040px">
              {/* Column headers */}
              <Grid
                templateColumns="240px repeat(8, 1fr)"
                mb={3} px={5}
              >
                <Box />
                {MATRIX_COLS.map((col, i) => (
                  <MatrixColHeader key={col} label={col} index={i} />
                ))}
              </Grid>

              {/* Rows */}
              <Stack gap={2}>
                {MATRIX_ROWS.map((row, ri) => (
                  <MatrixRow key={row.name} row={row} rowIndex={ri} />
                ))}
              </Stack>

              {/* Legend */}
              <Flex gap={5} mt={6} px={5} flexWrap="wrap">
                <Flex align="center" gap={2}>
                  <CheckIcon pass={true} />
                  <Text fontSize="0.75rem" color="rgba(255,255,255,0.35)">Included</Text>
                </Flex>
                <Flex align="center" gap={2}>
                  <CheckIcon pass={false} />
                  <Text fontSize="0.75rem" color="rgba(255,255,255,0.35)">Not included / self-managed</Text>
                </Flex>
              </Flex>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ══ § TESTIMONIALS ══════════════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg="white" overflow="hidden">
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }} mb={12}>
          <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            Don&rsquo;t just take it from us
          </Text>
          <Heading
            fontSize={{ base: "1.875rem", md: "2.5rem" }}
            fontWeight="700" letterSpacing="-0.034em"
            maxW="520px" fontFamily="var(--font-heading)"
          >
            Told by one-person businesses and the companies they work with.
          </Heading>
        </Box>

        {/* Two-row scroll */}
        {[TESTIMONIALS.slice(0, 3), TESTIMONIALS.slice(3)].map((row, ri) => (
          <Box
            key={ri} overflow="hidden" mb={ri === 0 ? 4 : 0}
          >
            <Flex
              gap={4}
              style={{
                animation: `marqueeTick ${ri === 0 ? 32 : 40}s linear infinite`,
                animationDirection: ri === 0 ? "normal" : "reverse",
              }}
            >
              {[...row, ...row].map((t, i) => (
                <Box
                  key={i} flexShrink={0} w={{ base: "320px", md: "380px" }}
                  p={6} borderRadius="12px"
                  bg={LIGHT} border={`1px solid ${RULE}`}
                >
                  <Text fontSize="0.9rem" color={INK} lineHeight="1.75" mb={5}
                    fontStyle="italic">
                    &ldquo;{t.quote}&rdquo;
                  </Text>
                  <Flex align="center" gap={3}>
                    <Box w="36px" h="36px" borderRadius="50%" bg={`${GREEN}18`}
                      border={`1px solid ${GREEN}35`}
                      display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                      <Text fontSize="0.7rem" fontWeight="700" color={GREEN}>{t.initials}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="0.8125rem" fontWeight="700" color={INK}>{t.name}</Text>
                      <Text fontSize="0.75rem" color={MUTED}>{t.role}</Text>
                    </Box>
                  </Flex>
                </Box>
              ))}
            </Flex>
          </Box>
        ))}
      </Box>

      {/* ══ § PLATFORM — BENTO GRID ═════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg="#F7F6F1">
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>

          {/* Section header — two-column like Superside */}
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8} mb={14} alignItems="end">
            <Box>
              <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
                letterSpacing="0.12em" textTransform="uppercase" mb={4}
                fontFamily="var(--font-heading)">
                Easy &amp; hassle-free
              </Text>
              <Heading
                fontSize={{ base: "2rem", md: "2.625rem" }}
                fontWeight="700" letterSpacing="-0.036em" lineHeight="1.1"
                fontFamily="var(--font-heading)" color={INK}
              >
                One intelligent system,{" "}
                <Box as="em" fontStyle="italic" fontWeight="600" color="#3D6B5A">
                  built for real client work
                </Box>
              </Heading>
            </Box>
            <Box>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.8" mb={6}>
                Every job — requirements, chat, rates, hours, payments — lives in one connected
                workspace. One platform, total clarity, for you and your client.
              </Text>
              <Flex gap={3} flexWrap="wrap">
                <Link to="/how-it-works" style={{ textDecoration: "none" }}>
                  <Box px={5} py="10px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                    bg={INK} color="white" _hover={{ bg: "#1a3020" }} transition="all 0.15s">
                    Learn more
                  </Box>
                </Link>
                <Link to="/partner/register" style={{ textDecoration: "none" }}>
                  <Box px={5} py="10px" borderRadius="6px" fontWeight="600" fontSize="0.875rem"
                    bg="transparent" color={MUTED} border={`1px solid ${RULE}`}
                    _hover={{ borderColor: "#9CA3AF", color: INK }} transition="all 0.15s">
                    Start your workspace
                  </Box>
                </Link>
              </Flex>
            </Box>
          </Grid>

          {/* Bento grid */}
          <Grid
            templateColumns={{ base: "1fr", md: "1fr 1fr", lg: "1fr 1fr 1fr" }}
            templateRows={{ lg: "auto auto" }}
            gap={3}
          >
            {/* Card 1: tall left — job command centre */}
            <Box
              gridRow={{ lg: "1 / 3" }} gridColumn={{ lg: "1" }}
              bg={INK} borderRadius="16px" overflow="hidden"
              display="flex" flexDirection="column"
              minH={{ base: "420px", lg: "auto" }}
            >
              <Box p={6} pb={0}>
                <Text fontSize="1.0625rem" fontWeight="700" color="white"
                  letterSpacing="-0.015em" mb={1.5}
                  fontFamily="var(--font-heading)">
                  Your job command center
                </Text>
                <Text fontSize="0.8125rem" color="rgba(255,255,255,0.45)" lineHeight="1.65" mb={6}>
                  Run every job in one connected workspace. Requirements, chat, to-dos,
                  and file sharing — all in one place.
                </Text>
              </Box>

              {/* Mini job embed */}
              <Box flex={1} mx={4} mb={4} borderRadius="10px" overflow="hidden"
                border="1px solid rgba(255,255,255,0.07)" bg="#0D1510">
                {/* Traffic lights */}
                <Flex h="30px" px={3} align="center" gap={1}
                  bg="#0A120E" borderBottom="1px solid rgba(255,255,255,0.04)">
                  <Box w="8px" h="8px" borderRadius="50%" bg="#FF5F57" />
                  <Box w="8px" h="8px" borderRadius="50%" bg="#FEBC2E" />
                  <Box w="8px" h="8px" borderRadius="50%" bg="#28C840" />
                </Flex>
                <Box p={4}>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Text fontSize="0.75rem" fontWeight="700" color="white">Shopify Refresh</Text>
                    <Box px={2} py="2px" borderRadius="99px" bg={`${GREEN}18`} border={`1px solid ${GREEN}35`}>
                      <Text fontSize="0.55rem" fontWeight="700" color={G_ON_DARK}>In progress</Text>
                    </Box>
                  </Flex>
                  <Box mb={3}>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="0.6rem" color="rgba(255,255,255,0.3)">Rate</Text>
                      <Text fontSize="0.6rem" color="rgba(255,255,255,0.5)">€65/hr · 12.5h logged</Text>
                    </Flex>
                    <Box h="2px" borderRadius="99px" bg="rgba(255,255,255,0.06)">
                      <Box h="full" w="60%" bg={GREEN} borderRadius="99px" />
                    </Box>
                  </Box>
                  {[
                    { l: "Requirements agreed", d: true  },
                    { l: "Rate agreed",         d: true  },
                    { l: "Build in progress",   d: false, a: true },
                    { l: "Client review",       d: false },
                  ].map((m) => (
                    <Flex key={m.l} align="center" gap={2} mb={1.5}>
                      <Box w="12px" h="12px" borderRadius="50%" flexShrink={0}
                        bg={m.d ? GREEN : m.a ? "transparent" : "transparent"}
                        border={m.a ? `1.5px solid ${BLUE}` : m.d ? "none" : "1px solid rgba(255,255,255,0.1)"}
                        display="flex" alignItems="center" justifyContent="center">
                        {m.d && <svg width="6" height="4" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        {m.a && <Box w="4px" h="4px" borderRadius="50%" bg={BLUE} />}
                      </Box>
                      <Text fontSize="0.65rem" color={m.d ? "rgba(255,255,255,0.25)" : m.a ? "white" : "rgba(255,255,255,0.2)"}
                        fontWeight={m.a ? "600" : "400"} textDecoration={m.d ? "line-through" : "none"}>
                        {m.l}
                      </Text>
                    </Flex>
                  ))}
                  <Box mt={3} p={3} borderRadius="6px" bg="rgba(255,255,255,0.04)">
                    <Flex align="center" gap={1.5} mb={1}>
                      <Box w="14px" h="14px" borderRadius="50%" bg={`${GREEN}25`}
                        display="flex" alignItems="center" justifyContent="center">
                        <Text fontSize="0.45rem" fontWeight="700" color={G_ON_DARK}>AI</Text>
                      </Box>
                      <Text fontSize="0.6rem" fontWeight="600" color="rgba(255,255,255,0.6)">Edit with AI</Text>
                    </Flex>
                    <Text fontSize="0.62rem" color="rgba(255,255,255,0.38)">
                      Rewrote client's message into a clear scope change. ✓
                    </Text>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Card 2: job workflow diagram — light green, top right */}
            <Box
              gridRow={{ lg: "1" }} gridColumn={{ lg: "2 / 4" }}
              bg="#D6EFE4" borderRadius="16px" p={7}
              minH={{ base: "320px", lg: "280px" }}
              position="relative" overflow="hidden"
            >
              {/* BG texture circles */}
              <svg aria-hidden style={{ position: "absolute", right: 0, bottom: 0, opacity: 0.08, pointerEvents: "none" }}
                width="240" height="200" viewBox="0 0 240 200">
                <circle cx="180" cy="150" r="120" fill={GREEN} />
              </svg>

              <Text fontSize="1.0625rem" fontWeight="700" color={INK}
                letterSpacing="-0.015em" mb={1.5} fontFamily="var(--font-heading)">
                A workflow that keeps both sides aligned
              </Text>
              <Text fontSize="0.8125rem" color="#3D6B5A" lineHeight="1.65" mb={7} maxW="360px">
                From requirements to a signed-off rate to hours and payments — every job moves
                through the same clear stages, visible to you and your client.
              </Text>

              {/* Flow diagram */}
              <Box overflowX="auto">
                <Flex gap={2} align="center" minW="max-content">
                  {[
                    { label: "Job created",     done: true  },
                    { label: "Rate proposed",   done: true  },
                    { label: "Rate agreed",     done: true  },
                    { label: "Work in progress", done: false, active: true },
                    { label: "Hours & payments logged", done: false },
                  ].map((step, i) => (
                    <Flex key={step.label} align="center" gap={2}>
                      <Flex
                        align="center" gap={2}
                        px={3} py="8px" borderRadius="8px" flexShrink={0}
                        bg={step.done ? "white" : step.active ? INK : "rgba(255,255,255,0.5)"}
                        border={step.done ? "none" : step.active ? "none" : "1px dashed rgba(61,107,90,0.35)"}
                        boxShadow={step.done ? "0 1px 6px rgba(0,0,0,0.08)" : "none"}
                      >
                        {step.done && (
                          <Box w="14px" h="14px" borderRadius="50%" bg={`${GREEN}20`}
                            display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                            <svg width="7" height="5" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Box>
                        )}
                        {step.active && (
                          <Box w="6px" h="6px" borderRadius="50%" bg={G_ON_DARK} flexShrink={0}
                            style={{ animation: "convergePulse 2s ease-in-out infinite" }} />
                        )}
                        <Text fontSize="0.75rem" fontWeight="600"
                          color={step.done ? INK : step.active ? "white" : "#3D6B5A"}>
                          {step.label}
                        </Text>
                      </Flex>
                      {i < 4 && (
                        <Box w="20px" h="1px" bg="rgba(61,107,90,0.25)" flexShrink={0}
                          position="relative">
                          <Box position="absolute" right="-2px" top="-3px"
                            color="rgba(61,107,90,0.35)" fontSize="0.5rem">▶</Box>
                        </Box>
                      )}
                    </Flex>
                  ))}
                </Flex>
              </Box>
            </Box>

            {/* Card 3: AI clarity on every job — light blue */}
            <Box
              gridRow={{ lg: "2" }} gridColumn={{ lg: "2" }}
              bg="#D9E8F5" borderRadius="16px" p={7}
              minH="230px" position="relative" overflow="hidden"
            >
              <svg aria-hidden style={{ position: "absolute", right: 0, top: 0, opacity: 0.07, pointerEvents: "none" }}
                width="140" height="140" viewBox="0 0 140 140">
                <circle cx="100" cy="40" r="80" fill={BLUE} />
              </svg>
              <Text fontSize="1.0625rem" fontWeight="700" color={INK}
                letterSpacing="-0.015em" mb={1.5} fontFamily="var(--font-heading)">
                AI clarity on every job
              </Text>
              <Text fontSize="0.8125rem" color="#2A4D70" lineHeight="1.65" mb={6}>
                Edit with AI rewrites requirements, chat messages, and to-dos using that job's
                context — so nothing gets lost in translation between you and your client.
              </Text>
              {/* Visual: stacked AI rewrite examples */}
              <Flex gap={2} flexWrap="wrap">
                {["Requirement clarified", "Chat message tidied", "To-do simplified"].map((b, i) => (
                  <Box key={b} px={2.5} py={1.5} borderRadius="6px"
                    bg="white" boxShadow="0 1px 6px rgba(0,0,0,0.07)"
                    opacity={1 - i * 0.18}>
                    <Text fontSize="0.65rem" fontWeight="600" color={INK}>{b}</Text>
                  </Box>
                ))}
              </Flex>
            </Box>

            {/* Card 4: you keep the relationship — light gray with photo backdrop */}
            <Box
              gridRow={{ lg: "2" }} gridColumn={{ lg: "3" }}
              borderRadius="16px"
              minH="230px"
              position="relative"
              overflow="hidden"
              bgImage={`url(${programmer1})`}
              bgSize="cover"
              bgPosition="center 20%"
            >
              {/* Light wash — keeps text readable while photo shows through */}
              <Box
                position="absolute"
                inset={0}
                background="linear-gradient(135deg, rgba(245,247,250,0.94) 0%, rgba(237,238,240,0.88) 55%, rgba(237,238,240,0.72) 100%)"
              />

              <Box position="relative" zIndex={1} p={7} display="flex" flexDirection="column" h="full">
                <Text fontSize="1.0625rem" fontWeight="700" color={INK}
                  letterSpacing="-0.015em" mb={1.5} fontFamily="var(--font-heading)">
                  You keep the relationship
                </Text>
                <Text fontSize="0.8125rem" color={MUTED} lineHeight="1.65" mb={5} maxW="280px">
                  No middleman, no platform cut, no borrowed client list. Co-Helper is a tool
                  you use with the clients you already have — under your own brand.
                </Text>

                <Flex gap={2} mt="auto" flexWrap="wrap">
                  {["Your clients", "Your rates", "Your brand"].map((tag) => (
                    <Box
                      key={tag}
                      px={2.5}
                      py="4px"
                      borderRadius="99px"
                      bg="rgba(255,255,255,0.85)"
                      backdropFilter="blur(8px)"
                      boxShadow="0 1px 6px rgba(0,0,0,0.06)"
                    >
                      <Text fontSize="0.625rem" fontWeight="700" color={INK}>{tag}</Text>
                    </Box>
                  ))}
                </Flex>
              </Box>
            </Box>
          </Grid>
        </Box>
      </Box>

      {/* ══ § OUR DIFFERENCE ════════════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg="white" borderBottom={`1px solid ${RULE}`}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            Our difference
          </Text>
          <Heading
            fontSize={{ base: "1.875rem", md: "2.5rem" }}
            fontWeight="700" letterSpacing="-0.034em" mb={14}
            maxW="560px" fontFamily="var(--font-heading)"
          >
            What sets Co-Helper apart from a pile of generic tools.
          </Heading>

          <Grid templateColumns={{ base: "1fr", sm: "repeat(2,1fr)", lg: "repeat(3,1fr)" }} gap={5}>
            {PILLARS.map((p) => (
              <Box key={p.tag} p={7} bg={LIGHT} borderRadius="12px"
                border={`1px solid ${RULE}`}
                _hover={{ bg: "white", borderColor: GREEN, boxShadow: `0 4px 20px rgba(15,110,86,0.07)` }}
                transition="all 0.2s">
                <Box display="inline-flex" px={2.5} py="3px" borderRadius="99px" mb={4}
                  bg={`${GREEN}12`} border={`1px solid ${GREEN}25`}>
                  <Text fontSize="0.65rem" fontWeight="700" color={GREEN}
                    letterSpacing="0.06em">{p.tag}</Text>
                </Box>
                <Box mb={4}>{p.icon}</Box>
                <Text fontSize="1rem" fontWeight="700" color={INK} mb={2.5}
                  letterSpacing="-0.015em" fontFamily="var(--font-heading)">{p.title}</Text>
                <Text fontSize="0.875rem" color={MUTED} lineHeight="1.75">{p.body}</Text>
              </Box>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* ══ § BUILT FOR ANY FREELANCE BUSINESS ══════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg={LIGHT} borderBottom={`1px solid ${RULE}`}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={{ base: 12, lg: 20 }} alignItems="center">
            <Box>
              <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
                letterSpacing="0.12em" textTransform="uppercase" mb={4}
                fontFamily="var(--font-heading)">
                Works for any discipline
              </Text>
              <Heading
                fontSize={{ base: "1.875rem", md: "2.5rem" }}
                fontWeight="700" letterSpacing="-0.034em" mb={5}
                fontFamily="var(--font-heading)"
              >
                Built for how one-person businesses actually work.
              </Heading>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.8" mb={4}>
                Whether you bill by the hour or by the project, work with two clients or
                twenty, Co-Helper adapts to your business — not the other way around.
              </Text>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.8" mb={8}>
                Set up your workspace once, invite companies as you take them on, and let AI and
                built-in tracking handle the busywork around every job.
              </Text>
              <Link to="/partner/register" style={{ textDecoration: "none" }}>
                <Box display="inline-flex" alignItems="center"
                  px={5} py="11px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                  bg={AMBER} color={INK} border={`1px solid ${AMBER}`}
                  _hover={{ bg: AMBER_HOVER }} transition="all 0.15s">
                  Start your workspace →
                </Box>
              </Link>
            </Box>

            {/* Right: discipline grid */}
            <Grid templateColumns="repeat(2,1fr)" gap={4}>
              {[
                { region: "Web & software",      detail: "Dev, QA, and product work", note: "Hourly or fixed" },
                { region: "Design & branding",    detail: "Identity, product, and UX", note: "Fixed-price projects" },
                { region: "Marketing & growth",   detail: "SEO, ads, and content",     note: "Retainers or hourly" },
                { region: "Consulting & coaching", detail: "Advisory and strategy",     note: "Hourly billing" },
              ].map((r) => (
                <Box key={r.region} p={6} bg="white" borderRadius="12px"
                  border={`1px solid ${RULE}`}
                  _hover={{ borderColor: GREEN, boxShadow: `0 4px 16px rgba(15,110,86,0.07)` }}
                  transition="all 0.2s">
                  <Text fontSize="1rem" fontWeight="700" color={INK} mb={1.5}
                    fontFamily="var(--font-heading)">{r.region}</Text>
                  <Text fontSize="0.8125rem" color={MUTED} mb={1} lineHeight="1.5">{r.detail}</Text>
                  <Text fontSize="0.75rem" color={GREEN}>{r.note}</Text>
                </Box>
              ))}
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* ══ § FINAL CTA ═════════════════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg={INK} borderTop="1px solid rgba(255,255,255,0.04)">
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={{ base: 12, lg: 20 }} alignItems="center">
            <Box>
              <Text fontSize="0.7rem" fontWeight="700" color={G_ON_DARK}
                letterSpacing="0.12em" textTransform="uppercase" mb={4}
                fontFamily="var(--font-heading)">
                Run your business, not your inbox
              </Text>
              <Heading
                fontSize={{ base: "2rem", md: "2.75rem" }}
                fontWeight="700" color="white" letterSpacing="-0.035em"
                lineHeight="1.1" mb={5} fontFamily="var(--font-heading)"
              >
                Your client work deserves better than email and spreadsheets.
              </Heading>
              <Text fontSize="0.9375rem" color="rgba(255,255,255,0.5)"
                lineHeight="1.8" mb={8} maxW="420px">
                One-person businesses use Co-Helper to invite companies into a shared workspace — one
                place for requirements, chat, rates, hours, and payments.
              </Text>
              <Flex gap={3} flexWrap="wrap">
                <Link to="/partner/register" style={{ textDecoration: "none" }}>
                  <Box px={5} py="11px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                    bg={AMBER} color={INK} border={`1px solid ${AMBER}`}
                    _hover={{ bg: AMBER_HOVER }} transition="all 0.15s">
                    Start your workspace →
                  </Box>
                </Link>
                <Link to="/contact" style={{ textDecoration: "none" }}>
                  <Box px={5} py="11px" borderRadius="6px" fontWeight="600" fontSize="0.875rem"
                    bg="transparent" color="rgba(255,255,255,0.8)"
                    border="1px solid rgba(255,255,255,0.22)"
                    _hover={{ bg: "rgba(255,255,255,0.06)", color: "white" }}
                    transition="all 0.15s">
                    Talk to us
                  </Box>
                </Link>
              </Flex>
            </Box>

            {/* One-person business card — light photo backdrop */}
            <Box
              borderRadius="14px"
              position="relative"
              overflow="hidden"
              bgImage={`url(${programmer2})`}
              bgSize="cover"
              bgPosition="right 25%"
            >
              <Box
                position="absolute"
                inset={0}
                background="linear-gradient(105deg, rgba(245,247,250,0.96) 0%, rgba(237,238,240,0.9) 45%, rgba(237,238,240,0.62) 100%)"
              />

              <Box position="relative" zIndex={1} p={8}>
                <Text fontSize="0.65rem" fontWeight="700" color={GREEN}
                  letterSpacing="0.12em" textTransform="uppercase" mb={4}
                  fontFamily="var(--font-heading)">
                  For one-person businesses
                </Text>
                <Heading fontSize={{ base: "1.375rem", md: "1.5rem" }} fontWeight="700" color={INK}
                  letterSpacing="-0.025em" mb={4} fontFamily="var(--font-heading)" maxW="340px">
                  Run your one-person business like a professional practice.
                </Heading>
                <Text fontSize="0.9375rem" color={MUTED}
                  lineHeight="1.78" mb={6} maxW="360px">
                  Invite the companies you work with, agree how you're paid, and let AI keep requirements,
                  chat, and to-dos clear for both sides.
                </Text>
                <Stack gap={2.5} mb={7}>
                  {[
                    "Invite companies in seconds — no approval queue",
                    "Edit with AI on every requirement, message, and to-do",
                    "Hourly or fixed rate, agreed and on record",
                    "Every hour and payment logged automatically",
                  ].map((item) => (
                    <Flex key={item} gap={2.5} align="flex-start">
                      <Box w="14px" h="14px" borderRadius="50%" flexShrink={0} mt="2px"
                        bg={`${GREEN}18`}
                        display="flex" alignItems="center" justifyContent="center">
                        <svg width="7" height="5" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke={GREEN} strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Box>
                      <Text fontSize="0.875rem" color={MUTED} lineHeight="1.6">{item}</Text>
                    </Flex>
                  ))}
                </Stack>
                <Link to="/partner/register" style={{ textDecoration: "none" }}>
                  <Box display="inline-flex" alignItems="center"
                    px={5} py="10px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                    bg={GREEN} color="white"
                    _hover={{ bg: "#0a5240" }}
                    transition="all 0.15s">
                    Start your workspace →
                  </Box>
                </Link>
              </Box>
            </Box>
          </Grid>
        </Box>
      </Box>

      <MarketingFooter />
    </Box>
  )
}
