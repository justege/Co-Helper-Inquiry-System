// no useState needed — matrix comparison is static
import { Box, Flex, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { MarketingFooter, AnnounceBar } from "@/components/marketing/MarketingUI"
import LandingInquiryForm from "@/components/landing/LandingInquiryForm"
import { AMBER, AMBER_HOVER, BLUE, GREEN, INK, MUTED, RULE } from "@/components/marketing/tokens"
import programmer1 from "@/assets/Programmer1.png"
import programmer2 from "@/assets/Programmer2.png"

// ─── Design tokens ───────────────────────────────────────────────────────────
const LIGHT     = "#F5F7FA"
const G_ON_DARK = "#86efac"   // mint — legible on INK

// ─── Nav ─────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Services",     to: "/how-it-works" },
  { label: "Platform",     to: "/how-it-works" },
  { label: "Pricing",      to: "/pricing" },
  { label: "About",        to: "/about" },
  { label: "For specialists", to: "/partners" },
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
        <Link to="/register" style={{ textDecoration: "none" }}>
          <Box
            px={4} py="8px" borderRadius="6px" fontSize="0.875rem" fontWeight="700"
            bg={AMBER} color={INK} border={`1px solid ${AMBER}`}
            transition="all 0.15s"
            _hover={{ bg: AMBER_HOVER, textDecoration: "none" }}
          >
            Post a project
          </Box>
        </Link>
      </Flex>
    </Flex>
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
  { value: "50+",   unit: "",        label: "Software & dev services in the catalog" },
  { value: "< 24h", unit: "",        label: "Fixed quote and PM assigned after briefing" },
  { value: "500+",  unit: "",        label: "Vetted developers and specialists" },
  { value: "1",     unit: "platform", label: "for briefs, milestones, and delivery" },
]

// ─── Comparison matrix ────────────────────────────────────────────────────────
const MATRIX_COLS = ["Cost", "Availability", "Speed", "Quality", "Coordination", "Scalability", "Risk", "Planability"]

const MATRIX_ROWS = [
  {
    name: "Co-Helper",
    desc: "Managed software delivery — one PM, fixed quotes, vetted dev team, one platform.",
    highlight: true,
    scores: [true, true, true, true, true, true, true, true],
  },
  {
    name: "In-house team",
    desc: "Strong product knowledge, but fixed overhead, capacity limits, and hiring risk.",
    scores: [false, false, false, true, true, false, false, false],
  },
  {
    name: "Traditional agency",
    desc: "Structured delivery, but slow scoping, high cost, and project-based handoffs.",
    scores: [false, false, false, true, false, false, false, false],
  },
  {
    name: "Upwork / Fiverr",
    desc: "Marketplace access — all vetting, coordination, and quality risk stays with you.",
    scores: [false, false, false, false, false, true, false, false],
  },
  {
    name: "Freelancers",
    desc: "Flexible and cheap, but unreliable availability, variable quality, and no backup.",
    scores: [true, false, false, false, false, false, false, false],
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

function CheckIconLight({ pass }: { pass: boolean }) {
  if (pass) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill={`${GREEN}22`} stroke={`${GREEN}60`} strokeWidth="1" />
        <path d="M6.5 10L8.5 12L13.5 7.5" stroke={GREEN} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill={LIGHT} stroke={RULE} strokeWidth="1" />
      <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "We launched our entire Shopify store in 12 days. I never once spoke to a developer. The PM kept me updated every 48 hours, and the site was exactly what we briefed. This is how it should work.",
    name: "Sarah K.",
    role: "Founder, DTC home goods brand",
    initials: "SK",
  },
  {
    quote: "I submitted the brief on a Monday afternoon. By Tuesday morning I had a fixed quote, a committed delivery date, and the name of my project manager. That speed alone justified the switch from Upwork.",
    name: "Marcus T.",
    role: "Head of Growth, SaaS startup",
    initials: "MT",
  },
  {
    quote: "We'd spent months on freelance platforms — vetting, briefing, chasing. One project with Co-Helper and we understood what we'd been missing: a single accountable person. The escrow model is the trust layer we always needed.",
    name: "Elena V.",
    role: "Marketing Director, mid-market retailer",
    initials: "EV",
  },
  {
    quote: "The PM pushed back on part of my brief because it would have cost us more without adding value. A freelancer would have just built what I asked. That professional judgment is what sets Co-Helper apart.",
    name: "Tom R.",
    role: "Co-founder, B2B software company",
    initials: "TR",
  },
  {
    quote: "Our SEO audit came back in 4 days with a 47-page report and a prioritised action plan. Exactly on the committed date. We've since run three more projects and the on-time rate is 100%.",
    name: "Priya S.",
    role: "CMO, e-learning platform",
    initials: "PS",
  },
  {
    quote: "I'm not technical. I've always needed someone to translate between what I want and what a developer builds. Co-Helper's PM is exactly that — without me having to hire a full-time product manager.",
    name: "Daniel M.",
    role: "Non-technical founder, fintech startup",
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
    tag: "Breadth",
    title: "50+ dev services on demand",
    body: "Full-stack apps, MVPs, mobile, APIs, automations, and e-commerce builds — scoped and delivered through one managed workflow.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    tag: "Predictable",
    title: "Fixed quote per project",
    body: "Clear scope, clear cost, clear delivery date — before work starts. No open-ended agency retainers or surprise change orders.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={INK} strokeWidth="1.5" />
        <path d="M12 7v5l3.5 2" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    tag: "Fast",
    title: "Quote within 24 hours",
    body: "Submit your brief on the platform. Your PM reviews it, sources the right developers, and returns a fixed quote — often the next business day.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke={INK} strokeWidth="1.5" />
        <path d="M8 10h8M8 14h5" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    tag: "Platform",
    title: "Everything in one place",
    body: "Briefs, milestones, PM updates, and file delivery live in one workspace. No scattered Slack threads, Jira tickets, or email chains.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.5" stroke={INK} strokeWidth="1.5" />
        <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    tag: "Accountable",
    title: "One PM, always",
    body: "A named project manager owns your build from brief to delivery — timeline, quality, and communication. Not a ticket queue or rotating account manager.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    tag: "Custom",
    title: "Built for your product",
    body: "No template shops or copy-paste codebases. Every build is scoped to your stack, users, and roadmap — with escrow protecting payment until you approve.",
  },
]

// ─── Dashboard mockup replaced by inline bento card ──────────────────────────
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-ignore — dead code kept to preserve history, removed from render
function _Dashboard_DEAD() {
  const milestones: { label: string; done: boolean; active?: boolean }[] = [
    { label: "Brief & scoping", done: true },
    { label: "Design phase", done: true },
    { label: "Development", done: false, active: true },
    { label: "QA & review", done: false },
    { label: "Client approval", done: false },
  ]
  return (
    <Box
      borderRadius="14px"
      border="1px solid rgba(255,255,255,0.07)"
      bg="#111B17" overflow="hidden"
      boxShadow="0 40px 100px rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.3)"
    >
      {/* Traffic lights */}
      <Flex h="38px" px={4} align="center" gap={1.5} bg="#0A120E"
        borderBottom="1px solid rgba(255,255,255,0.05)">
        <Box w="10px" h="10px" borderRadius="50%" bg="#FF5F57" />
        <Box w="10px" h="10px" borderRadius="50%" bg="#FEBC2E" />
        <Box w="10px" h="10px" borderRadius="50%" bg="#28C840" />
        <Box flex={1} mx={4}>
          <Box h="20px" w="140px" mx="auto" borderRadius="4px" bg="rgba(255,255,255,0.04)" />
        </Box>
      </Flex>

      <Flex>
        {/* Sidebar */}
        <Box w="160px" flexShrink={0} bg="#0D1510"
          borderRight="1px solid rgba(255,255,255,0.04)" p={3}>
          <Text fontSize="0.55rem" fontWeight="700" color="rgba(255,255,255,0.22)"
            letterSpacing="0.12em" textTransform="uppercase" mb={3} px={2}>
            Co-Helper
          </Text>
          {[["Dashboard", false], ["Projects", true], ["Messages", false], ["Billing", false]].map(([item, active]) => (
            <Box key={item as string}
              px={2} py={1.5} borderRadius="6px" mb={0.5}
              bg={active ? `${GREEN}15` : "transparent"}>
              <Text fontSize="0.75rem" fontWeight={active ? "600" : "400"}
                color={active ? G_ON_DARK : "rgba(255,255,255,0.35)"}>
                {item as string}
              </Text>
            </Box>
          ))}
          <Box mt={4} mb={1.5} px={2}>
            <Text fontSize="0.55rem" fontWeight="700" color="rgba(255,255,255,0.18)"
              letterSpacing="0.1em" textTransform="uppercase">Active</Text>
          </Box>
          {[["Shopify Launch", GREEN], ["SEO Audit", BLUE]].map(([p, c]) => (
            <Box key={p as string} px={2} py={1.5} borderRadius="6px" mb={0.5}>
              <Flex align="center" gap={1.5}>
                <Box w="5px" h="5px" borderRadius="50%" bg={c as string} />
                <Text fontSize="0.7rem" color="rgba(255,255,255,0.42)">{p as string}</Text>
              </Flex>
            </Box>
          ))}
        </Box>

        {/* Main */}
        <Box flex={1} p={5} bg="#111B17">
          <Flex justify="space-between" align="flex-start" mb={4}>
            <Box>
              <Text fontSize="0.95rem" fontWeight="700" color="white" mb={0.5}>
                Shopify Store Launch
              </Text>
              <Flex align="center" gap={2}>
                <Box w="16px" h="16px" borderRadius="50%" bg={`${GREEN}28`}
                  display="flex" alignItems="center" justifyContent="center">
                  <Text fontSize="0.5rem" fontWeight="700" color={G_ON_DARK}>S</Text>
                </Box>
                <Text fontSize="0.7rem" color="rgba(255,255,255,0.38)">
                  PM: Sarah M. · Due in 6 days
                </Text>
              </Flex>
            </Box>
            <Box px={2.5} py="3px" borderRadius="99px"
              bg={`${GREEN}18`} border={`1px solid ${GREEN}40`}>
              <Text fontSize="0.65rem" fontWeight="700" color={G_ON_DARK}>On Track</Text>
            </Box>
          </Flex>

          {/* Progress */}
          <Box mb={4}>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="0.65rem" color="rgba(255,255,255,0.28)">Progress</Text>
              <Text fontSize="0.65rem" fontWeight="600" color="rgba(255,255,255,0.5)">60%</Text>
            </Flex>
            <Box h="3px" borderRadius="99px" bg="rgba(255,255,255,0.06)" overflow="hidden">
              <Box h="full" w="60%" bg={GREEN} borderRadius="99px" />
            </Box>
          </Box>

          {/* Milestones */}
          <Text fontSize="0.6rem" fontWeight="600" color="rgba(255,255,255,0.25)"
            letterSpacing="0.08em" textTransform="uppercase" mb={2}>
            Milestones
          </Text>
          {milestones.map((m, i) => (
            <Flex key={i} align="center" gap={2.5} mb={i < milestones.length - 1 ? 1.5 : 0}>
              <Box w="16px" h="16px" borderRadius="50%" flexShrink={0}
                bg={m.done ? GREEN : m.active ? "rgba(255,255,255,0.04)" : "transparent"}
                border={m.active ? `1.5px solid ${BLUE}` : m.done ? "none" : "1px solid rgba(255,255,255,0.08)"}
                display="flex" alignItems="center" justifyContent="center">
                {m.done && (
                  <svg width="7" height="5" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {m.active && <Box w="5px" h="5px" borderRadius="50%" bg={BLUE} />}
              </Box>
              <Text fontSize="0.75rem" flex={1}
                color={m.done ? "rgba(255,255,255,0.28)" : m.active ? "white" : "rgba(255,255,255,0.2)"}
                fontWeight={m.active ? "600" : "400"}
                textDecoration={m.done ? "line-through" : "none"}>
                {m.label}
              </Text>
              {m.active && (
                <Box px={1.5} py="1px" borderRadius="4px" bg={`${BLUE}20`} border={`1px solid ${BLUE}30`}>
                  <Text fontSize="0.6rem" fontWeight="700" color={BLUE}>Active</Text>
                </Box>
              )}
            </Flex>
          ))}

          {/* PM message */}
          <Box mt={4} p={3} borderRadius="8px"
            bg="rgba(255,255,255,0.03)" border="1px solid rgba(255,255,255,0.05)">
            <Flex align="center" gap={2} mb={1.5}>
              <Box w="20px" h="20px" borderRadius="50%" bg={`${GREEN}22`}
                display="flex" alignItems="center" justifyContent="center">
                <Text fontSize="0.55rem" fontWeight="700" color={G_ON_DARK}>S</Text>
              </Box>
              <Box>
                <Text fontSize="0.7rem" fontWeight="600" color="rgba(255,255,255,0.7)">Sarah M. — PM</Text>
                <Text fontSize="0.6rem" color="rgba(255,255,255,0.25)">2h ago</Text>
              </Box>
            </Flex>
            <Text fontSize="0.7rem" color="rgba(255,255,255,0.45)" lineHeight="1.6">
              Dev is on track. Product pages done today — QA starts Monday. No action needed from you. ✓
            </Text>
          </Box>
        </Box>
      </Flex>

      {/* Status bar */}
      <Flex h="28px" px={5} align="center" gap={4}
        bg="#0A120E" borderTop="1px solid rgba(255,255,255,0.03)">
        <Flex align="center" gap={1.5}>
          <Box w="5px" h="5px" borderRadius="50%" bg="#22c55e" />
          <Text fontSize="0.6rem" color="rgba(255,255,255,0.25)">All systems operational</Text>
        </Flex>
        <Box flex={1} />
        <Text fontSize="0.6rem" color="rgba(255,255,255,0.18)">You never spoke to the developer.</Text>
      </Flex>
    </Box>
  )
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  // comparison tab state no longer needed — using matrix view

  return (
    <Box minH="100vh" bg="white" color={INK} fontFamily="var(--font-body)">

      {/* ══ § HERO ══════════════════════════════════════════════════════════ */}
      <Box
        position="relative" overflow="hidden"
        bg={INK}
        pt={{ base: 0, lg: 0 }}
      >
        {/* Background video */}
        <Box
          as="video"
          position="absolute" inset={0} w="full" h="full"
          objectFit="cover" zIndex={0}
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
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }} pt={{ base: 5, md: 6 }} pb={0} w="full">
          <NavBar light />
        </Box>

        {/* Hero content */}
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}
          pt={{ base: 16, md: 20 }} pb={{ base: 16, md: 20 }}>
          <Grid
            templateColumns={{ base: "1fr", lg: "1fr 460px" }}
            gap={{ base: 12, lg: 16 }}
            alignItems="center"
          >
            {/* Left */}
            <Box>

              {/* Headline */}
              <Heading
                as="h1"
                fontSize={{ base: "2.75rem", md: "3.75rem", lg: "4.5rem" }}
                fontWeight="800" lineHeight="1.04" letterSpacing="-0.04em"
                mb={6} fontFamily="var(--font-heading)"
              >
                <Box as="span" color="white" display="block">Software development,</Box>
                <Box as="span" color="white" display="block">managed on one platform.</Box>
                <Box as="span" color={G_ON_DARK} display="block">Predictable delivery.</Box>
              </Heading>

              <Text
                fontSize={{ base: "1rem", md: "1.125rem" }}
                color="rgba(255,255,255,0.55)"
                lineHeight="1.78" maxW="480px" mb={10}
              >
                Steer every build centrally through Co-Helper — with a dedicated project manager
                and vetted developers. Fixed quotes within 24 hours, committed delivery dates,
                and zero freelancer coordination on your side.
              </Text>

              <Flex gap={3} flexWrap="wrap" mb={14}>
                <Link to="/register" style={{ textDecoration: "none" }}>
                  <Box px={5} py="11px" borderRadius="6px" fontWeight="700" fontSize="0.9375rem"
                    bg={AMBER} color={INK} border={`1px solid ${AMBER}`}
                    _hover={{ bg: AMBER_HOVER }} transition="all 0.15s">
                    Post a project →
                  </Box>
                </Link>
                <Link to="/how-it-works" style={{ textDecoration: "none" }}>
                  <Box px={5} py="11px" borderRadius="6px" fontWeight="600" fontSize="0.9375rem"
                    bg="transparent" color="rgba(255,255,255,0.8)"
                    border="1px solid rgba(255,255,255,0.22)"
                    _hover={{ bg: "rgba(255,255,255,0.06)", color: "white" }}
                    transition="all 0.15s">
                    How it works
                  </Box>
                </Link>
              </Flex>

              {/* Stats */}
              <Flex gap={10} flexWrap="wrap">
                {[
                  { v: "50+",   l: "Dev services"   },
                  { v: "< 24h", l: "Quote returned" },
                  { v: "€0",    l: "Upfront risk"   },
                ].map((s) => (
                  <Box key={s.l}>
                    <Text fontSize={{ base: "1.625rem", md: "1.875rem" }} fontWeight="800"
                      color="white" letterSpacing="-0.04em" lineHeight="1"
                      fontFamily="var(--font-heading)">{s.v}</Text>
                    <Text fontSize="0.75rem" color="rgba(255,255,255,0.35)" mt={1}>{s.l}</Text>
                  </Box>
                ))}
              </Flex>
            </Box>

            {/* Right: form */}
            <LandingInquiryForm />
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
            The problem in everyday business
          </Text>
          <Heading
            fontSize={{ base: "1.875rem", md: "2.5rem" }}
            fontWeight="700" letterSpacing="-0.034em" mb={4}
            maxW="640px" fontFamily="var(--font-heading)"
          >
            The dev process slows your team.
          </Heading>
          <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.8" mb={14} maxW="560px">
            Many companies struggle with expensive agencies, overloaded in-house engineers,
            and unreliable freelancers — while product deadlines keep moving.
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={5}>
            {[
              {
                tag: "Clarity",
                title: "One provider. One platform.",
                body: "All software projects through a central workspace — no scattered agencies, contractors, or Slack threads. Feedback is bundled, approvals move faster, and you always know where things stand.",
              },
              {
                tag: "Reliability",
                title: "Quality and availability you can count on.",
                body: "Vetted developers matched to your stack, overseen by a dedicated PM who delivers on committed dates. Your team can rely on consistent output — not hero engineers or last-minute rescues.",
              },
              {
                tag: "Planability",
                title: "Budget and timing under control.",
                body: "Fixed quotes and defined delivery windows make every sprint planable. You know what ships when — before work starts — without surprise scope creep or open-ended retainers.",
              },
            ].map((item) => (
              <Box key={item.tag} p={8} bg={LIGHT} borderRadius="12px" border={`1px solid ${RULE}`}
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
            ))}
          </Grid>
        </Box>
      </Box>

      {/* ══ § THE FUTURE OF DELIVERY ════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg="white">
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={{ base: 12, lg: 20 }} alignItems="center">
            <Box>
              <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
                letterSpacing="0.12em" textTransform="uppercase" mb={4}
                fontFamily="var(--font-heading)">
                The future of delivery
              </Text>
              <Heading
                fontSize={{ base: "2rem", md: "2.75rem", lg: "3rem" }}
                fontWeight="700" letterSpacing="-0.035em" lineHeight="1.1" mb={6}
                fontFamily="var(--font-heading)"
              >
                Beyond hiring devs.
                <Box as="span" display="block" color={MUTED} fontWeight="600" fontSize={{ base: "1.625rem", md: "2.125rem" }}>
                  Managed software delivery, without the coordination tax.
                </Box>
              </Heading>
              <Text fontSize={{ base: "0.9375rem", md: "1rem" }} color={MUTED} lineHeight="1.8" mb={6}>
                Marketplaces sell access to freelancers and hand you all the risk: vetting,
                stand-ups, time-zone juggling, code review. Co-Helper sells the opposite —
                a finished build and a named PM accountable for it.
              </Text>
              <Text fontSize={{ base: "0.9375rem", md: "1rem" }} color={MUTED} lineHeight="1.8" mb={8}>
                By building the entire model around a dedicated PM who absorbs the coordination
                layer, your team gets fewer touchpoints, shorter feedback loops, and deliverables
                that actually match the brief.
              </Text>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <Box display="inline-flex" alignItems="center"
                  px={5} py="11px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                  bg={INK} color="white" border={`1px solid ${INK}`}
                  _hover={{ bg: "#1a2e26" }} transition="all 0.15s">
                  Post a project →
                </Box>
              </Link>
            </Box>

            {/* Right: feature list */}
            <Stack gap={5}>
              {[
                {
                  icon: "01",
                  title: "Brief written once",
                  body: "You describe what you need in a form or a message. No calls, no slides, no back-and-forth before work starts.",
                },
                {
                  icon: "02",
                  title: "PM assigned within hours",
                  body: "A named project manager reviews your brief, sources the right specialists, and returns a fixed quote and a committed date.",
                },
                {
                  icon: "03",
                  title: "Specialists sourced invisibly",
                  body: "Your PM manages the global talent network. You never interview, vet, or coordinate anyone. The expertise is invisible — the result is not.",
                },
                {
                  icon: "04",
                  title: "Approved, then paid",
                  body: "Deliverables arrive in your portal. Your PM handles all revisions. You approve — escrow releases. That's the entire loop.",
                },
              ].map((item) => (
                <Flex key={item.icon} gap={4} align="flex-start"
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
              ))}
            </Stack>
          </Grid>
        </Box>
      </Box>

      {/* ══ § EASY & HASSLE-FREE ════════════════════════════════════════════ */}
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
            World-class developers. Managed delivery.
            <Box as="span" color={MUTED}> Built to ship product, not meetings.</Box>
          </Heading>
          <Text fontSize="0.9375rem" color={MUTED} mb={14} maxW="520px" lineHeight="1.75">
            Whether you need an MVP, a Shopify build, API integrations, or a mobile app — one platform, one PM, one predictable process.
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={5}>
            {[
              {
                tag: "One PM, always",
                title: "Flexible, multi-discipline delivery",
                body: "A single project manager works across any service category. Pivot from a website build to a social campaign without re-onboarding anyone.",
              },
              {
                tag: "Vetted talent",
                title: "Top global specialists",
                body: "We're not restricted by borders. Our specialists are vetted on technical skill, communication, and reliability before they touch a client project.",
              },
              {
                tag: "Escrow-protected",
                title: "Structured, trusted delivery",
                body: "Milestone tracking, documented deliverables, and proactive PM updates — so you always know where your project stands without chasing anyone.",
              },
            ].map((c) => (
              <Box key={c.tag} p={8} bg="white" borderRadius="12px" border={`1px solid ${RULE}`}
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
            ))}
          </Grid>
        </Box>
      </Box>

      {/* ══ § SUCCESS IN NUMBERS ════════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg={INK}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Text fontSize="0.7rem" fontWeight="700" color={G_ON_DARK}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            Success in numbers
          </Text>
          <Heading
            fontSize={{ base: "1.875rem", md: "2.5rem" }}
            fontWeight="700" color="white" letterSpacing="-0.034em" mb={14}
            maxW="560px" fontFamily="var(--font-heading)"
          >
            The managed dev platform that ships on schedule.
          </Heading>

          <Grid templateColumns={{ base: "repeat(2,1fr)", md: "repeat(4,1fr)" }} gap={5} mb={16}>
            {STATS.map((s) => (
              <Box key={s.label} p={6} borderRadius="12px"
                bg="rgba(255,255,255,0.04)" border="1px solid rgba(255,255,255,0.07)">
                <Flex align="baseline" gap={1} mb={2}>
                  <Text fontSize={{ base: "2.5rem", md: "3rem" }} fontWeight="800"
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
                label: "Client story",
                headline: `"SaaS MVP shipped in 6 weeks. I never once spoke to a developer."`,
                sub: "Non-technical founder, full-stack MVP with auth and billing",
              },
              {
                label: "Client story",
                headline: `"Brief on Monday. Fixed quote and PM name by Tuesday morning."`,
                sub: "Head of Product at a growth-stage startup, API integration project",
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

      {/* ══ § OUR SERVICES ══════════════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg="white" borderBottom={`1px solid ${RULE}`}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            Our services
          </Text>
          <Flex justify="space-between" align="flex-end" mb={12} flexWrap="wrap" gap={6}>
            <Heading
              fontSize={{ base: "1.875rem", md: "2.5rem" }}
              fontWeight="700" letterSpacing="-0.034em" maxW="520px"
              fontFamily="var(--font-heading)"
            >
              More than outsourcing — a full software delivery catalog.
            </Heading>
            <Link to="/register" style={{ textDecoration: "none" }}>
              <Box px={5} py="10px" borderRadius="6px" fontWeight="600" fontSize="0.875rem"
                bg="transparent" color={MUTED} border={`1px solid ${RULE}`}
                _hover={{ borderColor: "#9CA3AF" }} transition="all 0.15s">
                Post a project →
              </Box>
            </Link>
          </Flex>

          <Grid templateColumns={{ base: "1fr", sm: "repeat(2,1fr)", md: "repeat(3,1fr)" }} gap={4}>
            {[
              { cat: "Full Stack Development", items: ["SaaS Platform Build", "REST & GraphQL APIs", "Admin Dashboard & Tools"], live: true },
              { cat: "MVP & Product Builds", items: ["SaaS MVP Build", "Startup Prototype", "Marketplace MVP"], live: true },
              { cat: "Mobile Apps",            items: ["React Native App", "Native iOS", "Native Android"], live: true },
              { cat: "Automation & Integrations", items: ["n8n Workflows", "CRM Integrations", "Webhook & API Pipelines"], live: true },
              { cat: "E-commerce",           items: ["Shopify Store Setup", "Headless Commerce", "E-commerce Migration"], live: true },
              { cat: "SEO & Marketing",      items: ["Technical SEO Audit", "GA4 & GTM Setup", "Google Ads Setup"], live: true },
            ].map((s) => (
              <Box key={s.cat} p={6} bg={LIGHT} borderRadius="12px"
                border={s.live ? `1px solid ${GREEN}30` : `1px solid ${RULE}`}
                _hover={{ bg: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                transition="all 0.2s">
                <Flex justify="space-between" align="flex-start" mb={4}>
                  <Text fontSize="0.9375rem" fontWeight="700" color={INK}
                    fontFamily="var(--font-heading)">{s.cat}</Text>
                  <Box px={2} py="2px" borderRadius="99px" bg={`${GREEN}14`} border={`1px solid ${GREEN}30`}>
                    <Text fontSize="0.6rem" fontWeight="700" color={GREEN}>Live</Text>
                  </Box>
                </Flex>
                <Stack gap={1.5}>
                  {s.items.map((item) => (
                    <Flex key={item} align="center" gap={2}>
                      <Box w="4px" h="4px" borderRadius="50%" bg={GREEN} flexShrink={0} />
                      <Text fontSize="0.8125rem" color={MUTED}>{item}</Text>
                    </Flex>
                  ))}
                </Stack>
              </Box>
            ))}
          </Grid>

          <Text fontSize="0.875rem" color={MUTED} mt={8} maxW="640px" lineHeight="1.7">
            From MVPs and full-stack SaaS to mobile apps, automations, and e-commerce — 50+ scoped services, one PM, one fixed quote per project.{" "}
            <Link to="/how-it-works" style={{ color: INK, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "2px" }}>
              Explore all services →
            </Link>
          </Text>
        </Box>
      </Box>

      {/* ══ § COMPARISON MATRIX ═════════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg={INK}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Text fontSize="0.7rem" fontWeight="700" color={G_ON_DARK}
            letterSpacing="0.12em" textTransform="uppercase" mb={4}
            fontFamily="var(--font-heading)">
            Co-Helper vs. classic dev solutions
          </Text>
          <Flex justify="space-between" align="flex-end" mb={14} flexWrap="wrap" gap={6}>
            <Heading
              fontSize={{ base: "1.875rem", md: "2.5rem" }}
              fontWeight="700" color="white" letterSpacing="-0.034em"
              maxW="540px" fontFamily="var(--font-heading)"
            >
              Agency, freelancer, in-house? Neither.
            </Heading>
            <Text fontSize="0.9375rem" color="rgba(255,255,255,0.4)" maxW="300px" lineHeight="1.75">
              Managed software delivery with a dedicated PM, fixed quotes, and one platform for every build.
            </Text>
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
                {MATRIX_COLS.map((col) => (
                  <Box key={col} textAlign="center">
                    <Text fontSize="0.7rem" fontWeight="700"
                      color="rgba(255,255,255,0.35)" letterSpacing="0.06em"
                      textTransform="uppercase">{col}</Text>
                  </Box>
                ))}
              </Grid>

              {/* Rows */}
              <Stack gap={2}>
                {MATRIX_ROWS.map((row) => (
                  <Box
                    key={row.name}
                    borderRadius="12px"
                    bg={row.highlight ? G_ON_DARK : "rgba(255,255,255,0.04)"}
                    border={row.highlight
                      ? "none"
                      : "1px solid rgba(255,255,255,0.06)"}
                    overflow="hidden"
                    transition="all 0.2s"
                    _hover={row.highlight ? undefined : { bg: "rgba(255,255,255,0.06)" }}
                  >
                    <Grid
                      templateColumns="240px repeat(8, 1fr)"
                      alignItems="center"
                      px={5} py={5}
                    >
                      {/* Name + desc */}
                      <Box pr={6}>
                        <Text
                          fontSize="0.9375rem" fontWeight="700" mb={1}
                          color={row.highlight ? INK : "white"}
                          fontFamily="var(--font-heading)"
                          letterSpacing="-0.01em"
                        >
                          {row.name}
                        </Text>
                        <Text
                          fontSize="0.8rem" lineHeight="1.55"
                          color={row.highlight ? "rgba(14,27,23,0.6)" : "rgba(255,255,255,0.35)"}
                        >
                          {row.desc}
                        </Text>
                      </Box>

                      {/* Score cells */}
                      {row.scores.map((pass, ci) => (
                        <Flex key={ci} justify="center" align="center">
                          {row.highlight
                            ? <CheckIconLight pass={pass} />
                            : <CheckIcon pass={pass} />}
                        </Flex>
                      ))}
                    </Grid>
                  </Box>
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
            Delivery wins, told by our clients.
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
                  built for better delivery
                </Box>
              </Heading>
            </Box>
            <Box>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.8" mb={6}>
                No matter the service, submitting a brief and receiving a finished deliverable is effortless. One platform. One PM. Total clarity.
              </Text>
              <Flex gap={3} flexWrap="wrap">
                <Link to="/how-it-works" style={{ textDecoration: "none" }}>
                  <Box px={5} py="10px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                    bg={INK} color="white" _hover={{ bg: "#1a3020" }} transition="all 0.15s">
                    Learn more
                  </Box>
                </Link>
                <Link to="/register" style={{ textDecoration: "none" }}>
                  <Box px={5} py="10px" borderRadius="6px" fontWeight="600" fontSize="0.875rem"
                    bg="transparent" color={MUTED} border={`1px solid ${RULE}`}
                    _hover={{ borderColor: "#9CA3AF", color: INK }} transition="all 0.15s">
                    Post a project
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
            {/* Card 1: tall left — dashboard command centre */}
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
                  Your delivery command center
                </Text>
                <Text fontSize="0.8125rem" color="rgba(255,255,255,0.45)" lineHeight="1.65" mb={6}>
                  Run every project in one connected workspace. Brief submissions, PM updates, milestones, and file delivery — all in one place.
                </Text>
              </Box>

              {/* Mini dashboard embed */}
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
                    <Text fontSize="0.75rem" fontWeight="700" color="white">SaaS MVP Build</Text>
                    <Box px={2} py="2px" borderRadius="99px" bg={`${GREEN}18`} border={`1px solid ${GREEN}35`}>
                      <Text fontSize="0.55rem" fontWeight="700" color={G_ON_DARK}>On Track</Text>
                    </Box>
                  </Flex>
                  <Box mb={3}>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="0.6rem" color="rgba(255,255,255,0.3)">Progress</Text>
                      <Text fontSize="0.6rem" color="rgba(255,255,255,0.5)">60%</Text>
                    </Flex>
                    <Box h="2px" borderRadius="99px" bg="rgba(255,255,255,0.06)">
                      <Box h="full" w="60%" bg={GREEN} borderRadius="99px" />
                    </Box>
                  </Box>
                  {[
                    { l: "Brief & scoping",  d: true  },
                    { l: "Design phase",     d: true  },
                    { l: "Development",      d: false, a: true },
                    { l: "QA & review",      d: false },
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
                        <Text fontSize="0.45rem" fontWeight="700" color={G_ON_DARK}>S</Text>
                      </Box>
                      <Text fontSize="0.6rem" fontWeight="600" color="rgba(255,255,255,0.6)">Sarah M. — PM</Text>
                    </Flex>
                    <Text fontSize="0.62rem" color="rgba(255,255,255,0.38)">
                      Dev on track. QA starts Monday. No action needed from you. ✓
                    </Text>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Card 2: PM workflow diagram — light green, top right */}
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
                PM workflow that runs itself
              </Text>
              <Text fontSize="0.8125rem" color="#3D6B5A" lineHeight="1.65" mb={7} maxW="360px">
                From brief submission to delivery approval, your PM manages the entire process. You watch the milestones tick. That's it.
              </Text>

              {/* Flow diagram */}
              <Box overflowX="auto">
                <Flex gap={2} align="center" minW="max-content">
                  {[
                    { label: "Brief submitted", done: true  },
                    { label: "PM reviews",      done: true  },
                    { label: "Quote returned",  done: true  },
                    { label: "Work in progress", done: false, active: true },
                    { label: "You approve",     done: false },
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

            {/* Card 3: built-in project intelligence — light blue */}
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
                Built-in project intelligence
              </Text>
              <Text fontSize="0.8125rem" color="#2A4D70" lineHeight="1.65" mb={6}>
                Your brief history, PM notes, and past feedback build a growing context — every new project is scoped faster and more accurately.
              </Text>
              {/* Visual: stacked brief cards */}
              <Flex gap={2} flexWrap="wrap">
                {["Brief #1 — SaaS MVP", "Brief #4 — API integration", "Brief #7 — Mobile app"].map((b, i) => (
                  <Box key={b} px={2.5} py={1.5} borderRadius="6px"
                    bg="white" boxShadow="0 1px 6px rgba(0,0,0,0.07)"
                    opacity={1 - i * 0.18}>
                    <Text fontSize="0.65rem" fontWeight="600" color={INK}>{b}</Text>
                  </Box>
                ))}
              </Flex>
            </Box>

            {/* Card 4: European PM team — light gray with photo backdrop */}
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
                  European project management
                </Text>
                <Text fontSize="0.8125rem" color={MUTED} lineHeight="1.65" mb={5} maxW="280px">
                  Every Co-Helper project manager is based in Europe — with our team headquartered in Berlin. Same-timezone coordination and hands-on oversight on every delivery.
                </Text>

                <Flex gap={2} mt="auto" flexWrap="wrap">
                  {["Berlin HQ", "Europe-based PMs", "CET / CEST"].map((tag) => (
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
            What sets Co-Helper apart from other dev options.
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

      {/* ══ § WORLD-CLASS TALENT ════════════════════════════════════════════ */}
      <Box py={{ base: 20, md: 28 }} bg={LIGHT} borderBottom={`1px solid ${RULE}`}>
        <Box maxW="1200px" mx="auto" px={{ base: 5, md: 8 }}>
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={{ base: 12, lg: 20 }} alignItems="center">
            <Box>
              <Text fontSize="0.7rem" fontWeight="700" color={GREEN}
                letterSpacing="0.12em" textTransform="uppercase" mb={4}
                fontFamily="var(--font-heading)">
                Work with the best
              </Text>
              <Heading
                fontSize={{ base: "1.875rem", md: "2.5rem" }}
                fontWeight="700" letterSpacing="-0.034em" mb={5}
                fontFamily="var(--font-heading)"
              >
                Vetted developers setting a higher bar.
              </Heading>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.8" mb={4}>
                Work with screened full-stack engineers, mobile developers, automation specialists,
                and e-commerce builders across four global regions.
              </Text>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.8" mb={8}>
                Recruited through a structured screen — portfolio, test task, and reference review —
                before they touch a client project. Every specialist is managed by a Co-Helper PM
                who ensures quality, timelines, and communication on your behalf.
              </Text>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <Box display="inline-flex" alignItems="center"
                  px={5} py="11px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                  bg={AMBER} color={INK} border={`1px solid ${AMBER}`}
                  _hover={{ bg: AMBER_HOVER }} transition="all 0.15s">
                  Post a project →
                </Box>
              </Link>
            </Box>

            {/* Right: region grid */}
            <Grid templateColumns="repeat(2,1fr)" gap={4}>
              {[
                { region: "Americas",     detail: "US & LATAM — same-day overlap",    note: "Shopify, dev, design" },
                { region: "Europe",       detail: "EU & UK — full timezone coverage", note: "SEO, content, dev" },
                { region: "Middle East",  detail: "Arabic & English specialists",      note: "Localisation, social" },
                { region: "Asia-Pacific", detail: "24/7 development cycles",           note: "Dev, QA, automation" },
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
                Speed and scale on speed dial
              </Text>
              <Heading
                fontSize={{ base: "2rem", md: "2.75rem" }}
                fontWeight="700" color="white" letterSpacing="-0.035em"
                lineHeight="1.1" mb={5} fontFamily="var(--font-heading)"
              >
                Your product deserves better than dev chaos.
              </Heading>
              <Text fontSize="0.9375rem" color="rgba(255,255,255,0.5)"
                lineHeight="1.8" mb={8} maxW="420px">
                Founders, product teams, and growing companies use Co-Helper to ship software
                without hiring overhead or freelancer roulette.
                There&rsquo;s a better way — and it&rsquo;s not another agency or more contractors.
              </Text>
              <Flex gap={3} flexWrap="wrap">
                <Link to="/register" style={{ textDecoration: "none" }}>
                  <Box px={5} py="11px" borderRadius="6px" fontWeight="700" fontSize="0.875rem"
                    bg={AMBER} color={INK} border={`1px solid ${AMBER}`}
                    _hover={{ bg: AMBER_HOVER }} transition="all 0.15s">
                    Post a project →
                  </Box>
                </Link>
                <Link to="/contact" style={{ textDecoration: "none" }}>
                  <Box px={5} py="11px" borderRadius="6px" fontWeight="600" fontSize="0.875rem"
                    bg="transparent" color="rgba(255,255,255,0.8)"
                    border="1px solid rgba(255,255,255,0.22)"
                    _hover={{ bg: "rgba(255,255,255,0.06)", color: "white" }}
                    transition="all 0.15s">
                    Book a callback
                  </Box>
                </Link>
              </Flex>
            </Box>

            {/* Specialists card — light photo backdrop */}
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
                  For specialists
                </Text>
                <Heading fontSize={{ base: "1.375rem", md: "1.5rem" }} fontWeight="700" color={INK}
                  letterSpacing="-0.025em" mb={4} fontFamily="var(--font-heading)" maxW="340px">
                  Qualified briefs. Zero client chasing.
                </Heading>
                <Text fontSize="0.9375rem" color={MUTED}
                  lineHeight="1.78" mb={6} maxW="360px">
                  Co-Helper PMs source and brief you directly. You focus entirely on delivery.
                  We handle client communication, revisions, milestone tracking, and payment release.
                </Text>
                <Stack gap={2.5} mb={7}>
                  {[
                    "Pre-scoped briefs in your discipline",
                    "PM manages all client communication",
                    "Verified specialist profile and rating",
                    "On-time payment — escrow-released",
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
                    Apply as a specialist →
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
