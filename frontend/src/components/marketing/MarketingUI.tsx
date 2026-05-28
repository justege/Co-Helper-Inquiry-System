import { Box, Flex, Grid, Stack, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { FOOTER_LINKS } from "./footerLinks"
import { AMBER_HOVER, GOLD, INK, MUTED, NAVY, RULE, SKY, SURFACE } from "./tokens"

// ── Logo ──────────────────────────────────────────────────────────────────────
export function Logo({ light = false }: { light?: boolean }) {
  const text = light ? "white" : INK
  return (
    <Link to="/" style={{ textDecoration: "none" }}>
      <Box display="flex" alignItems="center" gap="10px">
        {/* Convergence Dot mark */}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          {/* three thin lines converging to the center circle */}
          <line x1="2"  y1="4"  x2="14" y2="14" stroke={light ? "rgba(255,255,255,0.6)" : SKY} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26" y1="4"  x2="14" y2="14" stroke={light ? "rgba(255,255,255,0.6)" : SKY} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="26" x2="14" y2="14" stroke={light ? "rgba(255,255,255,0.6)" : SKY} strokeWidth="1.5" strokeLinecap="round" />
          {/* The central "PM" dot */}
          <circle cx="14" cy="14" r="4.5" fill={light ? "white" : INK} />
          <circle cx="14" cy="14" r="2"   fill={light ? INK     : "white"} />
        </svg>
        <Text
          fontSize="0.9375rem" fontWeight="700" color={text}
          letterSpacing="-0.01em"
          fontFamily="var(--font-heading)"
        >
          Co-Helper
        </Text>
      </Box>
    </Link>
  )
}

// ── Partner announce bar ──────────────────────────────────────────────────────
export function AnnounceBar() {
  return (
    <Link to="/partner/register" style={{ textDecoration: "none", display: "block" }}>
      <Box
        bg={NAVY}
        borderBottom="1px solid rgba(255,255,255,0.08)"
        transition="background 0.15s"
        _hover={{ bg: "#0a5240" }}
      >
        <Flex
          maxW="1200px"
          mx="auto"
          px={{ base: 5, md: 8 }}
          py={2.5}
          align="center"
          justify="center"
          gap={{ base: 1.5, md: 2.5 }}
          flexWrap="wrap"
        >
          <Text fontSize="0.8125rem" color="rgba(255,255,255,0.78)" fontWeight="500">
            Digital services specialist?
          </Text>
          <Text
            fontSize="0.8125rem"
            color="white"
            fontWeight="700"
            letterSpacing="0.01em"
            fontFamily="var(--font-heading)"
          >
            Apply as Expert / Partner →
          </Text>
        </Flex>
      </Box>
    </Link>
  )
}

// ── CTA Button ────────────────────────────────────────────────────────────────
type CTAVariant = "primary" | "gold" | "outline" | "ghost" | "white" | "hero-ghost" | "navy"

export function CTA({
  to,
  children,
  variant = "primary",
}: {
  to: string
  children: React.ReactNode
  variant?: CTAVariant
}) {
  const styles: Record<CTAVariant, object> = {
    primary: {
      bg: NAVY, color: "white", border: `1px solid ${NAVY}`,
      _hover: { bg: "#0a5240", textDecoration: "none" },
    },
    gold: {
      bg: GOLD, color: INK, border: `1px solid ${GOLD}`,
      _hover: { bg: AMBER_HOVER, textDecoration: "none" },
    },
    navy: {
      bg: NAVY, color: "white", border: `1px solid ${NAVY}`,
      _hover: { bg: "#0a5240", textDecoration: "none" },
    },
    outline: {
      bg: "transparent", color: INK, border: `1px solid ${RULE}`,
      _hover: { borderColor: "#9CA3AF", textDecoration: "none" },
    },
    ghost: {
      bg: "transparent", color: MUTED, border: "none",
      _hover: { color: INK, textDecoration: "none" },
    },
    white: {
      bg: "white", color: INK, border: "1px solid white",
      _hover: { bg: "#F3F4F6", textDecoration: "none" },
    },
    "hero-ghost": {
      bg: "transparent",
      color: "rgba(255,255,255,0.85)",
      border: "1px solid rgba(255,255,255,0.35)",
      _hover: { bg: "rgba(255,255,255,0.08)", color: "white", textDecoration: "none" },
    },
  }

  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <Box
        display="inline-flex" alignItems="center"
        px={5} py="10px" borderRadius="6px" fontWeight="600" fontSize="0.875rem"
        transition="all 0.15s" fontFamily="var(--font-heading)"
        {...styles[variant]}
      >
        {children}
      </Box>
    </Link>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, gold = false }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <Text
      fontSize="0.6875rem" fontWeight="600"
      color={gold ? GOLD : MUTED}
      letterSpacing="0.12em" textTransform="uppercase" mb={4}
      fontFamily="var(--font-heading)"
    >
      {children}
    </Text>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider() {
  return <Box w="full" h="1px" bg={RULE} />
}

// ── Check item ────────────────────────────────────────────────────────────────
export function CheckItem({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <Box display="flex" gap={3} alignItems="flex-start">
      <Box
        w="18px" h="18px" flexShrink={0} mt="2px" borderRadius="50%"
        bg={accent ? GOLD : NAVY}
        display="flex" alignItems="center" justifyContent="center"
      >
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Box>
      <Text fontSize="0.9375rem" color={INK} fontWeight="500" lineHeight="1.6">{children}</Text>
    </Box>
  )
}

// ── Step number ───────────────────────────────────────────────────────────────
export function StepNumber({ n }: { n: string }) {
  return (
    <Box
      w="44px" h="44px" mb={5} borderRadius="8px"
      bg={NAVY}
      display="flex" alignItems="center" justifyContent="center"
      fontSize="0.8125rem" fontWeight="700" color={GOLD}
      fontFamily="var(--font-heading)"
      letterSpacing="0.02em"
    >
      {n}
    </Box>
  )
}

// ── Marketing Nav (used by inner marketing pages) ─────────────────────────────
export function MarketingNav() {
  return (
    <Box as="header" bg="white" borderBottom={`1px solid ${RULE}`}>
      <Flex align="center" justify="space-between"
        maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} h="56px"
      >
        <Logo />
        <Flex align="center" gap={2}>
          <CTA to="/login" variant="ghost">Sign in</CTA>
          <CTA to="/register" variant="navy">Get started</CTA>
        </Flex>
      </Flex>
    </Box>
  )
}

// ── Marketing Footer ──────────────────────────────────────────────────────────
export function MarketingFooter() {
  return (
    <Box bg="#EFF1F6" px={{ base: 5, md: 8 }} pt={{ base: 10, md: 14 }} pb={{ base: 10, md: 14 }}>
      <Box
        maxW="1200px"
        mx="auto"
        bg="white"
        borderRadius="16px"
        border={`1px solid ${RULE}`}
        boxShadow="0 8px 32px rgba(14,27,23,0.06), 0 1px 3px rgba(14,27,23,0.04)"
        overflow="hidden"
      >
        <Box px={{ base: 6, md: 10 }} pt={{ base: 10, md: 12 }} pb={{ base: 8, md: 10 }}>
          <Grid
            templateColumns={{ base: "1fr", sm: "1fr 1fr", lg: "2.2fr 1fr 1fr 1fr 1fr" }}
            gap={{ base: 10, lg: 8 }}
            mb={12}
          >
            <Box maxW="300px">
              <Logo />
              <Text fontSize="0.875rem" color={MUTED} mt={4} lineHeight="1.75">
                The managed platform for software development — one PM, fixed quotes, and vetted developers on every build.
              </Text>
              <Flex gap={2} mt={6} flexWrap="wrap">
                {["50+ Dev Services", "500+ Specialists", "Berlin HQ"].map((b) => (
                  <Box
                    key={b}
                    px={3}
                    py="6px"
                    borderRadius="99px"
                    bg="#F0FAF5"
                    border={`1px solid ${NAVY}22`}
                  >
                    <Text fontSize="0.6875rem" fontWeight="700" color={NAVY} letterSpacing="0.01em">
                      {b}
                    </Text>
                  </Box>
                ))}
              </Flex>
            </Box>

            {FOOTER_LINKS.map((col) => (
              <Box key={col.label}>
                <Text
                  fontSize="0.6875rem"
                  fontWeight="700"
                  color={INK}
                  letterSpacing="0.08em"
                  textTransform="uppercase"
                  mb={4}
                  fontFamily="var(--font-heading)"
                >
                  {col.label}
                </Text>
                <Stack gap={2.5}>
                  {col.items.map((item) => (
                    <Link key={item.to} to={item.to} style={{ textDecoration: "none" }}>
                      <Text
                        fontSize="0.875rem"
                        color={MUTED}
                        fontWeight="500"
                        _hover={{ color: INK }}
                        transition="color 0.12s"
                      >
                        {item.label}
                      </Text>
                    </Link>
                  ))}
                </Stack>
              </Box>
            ))}
          </Grid>

          <Box w="full" h="1px" bg={RULE} />

          <Flex
            align="center"
            justify="space-between"
            pt={6}
            flexWrap="wrap"
            gap={3}
          >
            <Text fontSize="0.8125rem" color={MUTED} fontWeight="500">
              © {new Date().getFullYear()} Co-Helper. All rights reserved.
            </Text>
            <Text fontSize="0.8125rem" color={MUTED} fontWeight="500">
              Berlin · Remote-first · PM-led dev delivery
            </Text>
          </Flex>
        </Box>
      </Box>
    </Box>
  )
}

// ── Inner-page Hero (used by marketing sub-pages) ─────────────────────────────
export function PageHero({
  label,
  title,
  subtitle,
}: {
  label?: string
  title: string
  subtitle?: string
}) {
  return (
    <Box bg={SURFACE} borderBottom={`1px solid ${RULE}`}>
      <Box maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} py={{ base: 12, md: 16 }}>
        {label && <SectionLabel>{label}</SectionLabel>}
        <Text
          as="h1"
          fontSize={{ base: "2rem", md: "2.75rem" }}
          fontWeight="700"
          color={INK}
          letterSpacing="-0.03em"
          lineHeight="1.15"
          mb={subtitle ? 4 : 0}
          fontFamily="var(--font-heading)"
        >
          {title}
        </Text>
        {subtitle && (
          <Text fontSize={{ base: "1rem", md: "1.125rem" }} color={MUTED} maxW="640px" lineHeight="1.7">
            {subtitle}
          </Text>
        )}
      </Box>
    </Box>
  )
}

export function ContentSection({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <Box maxW={narrow ? "720px" : "1100px"} mx="auto" px={{ base: 5, md: 8 }} py={{ base: 12, md: 16 }}>
      {children}
    </Box>
  )
}

export function ProseBlock({ children }: { children: React.ReactNode }) {
  return (
    <Box
      fontSize="0.9375rem"
      color={MUTED}
      lineHeight="1.75"
      css={{
        "& h2": { color: INK, fontWeight: 600, fontSize: "1.0625rem", marginTop: "2rem", marginBottom: "0.75rem", letterSpacing: "-0.01em" },
        "& h3": { color: INK, fontWeight: 600, fontSize: "0.9375rem", marginTop: "1.5rem", marginBottom: "0.5rem" },
        "& p": { marginBottom: "1rem" },
        "& ul, & ol": { paddingLeft: "1.25rem", marginBottom: "1rem" },
        "& li": { marginBottom: "0.35rem" },
        "& a": { color: INK, textDecoration: "underline", textUnderlineOffset: "2px" },
      }}
    >
      {children}
    </Box>
  )
}

export function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box p={6} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
      <Text fontSize="0.9375rem" fontWeight="600" color={INK} mb={2} fontFamily="var(--font-heading)">{title}</Text>
      <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">{children}</Text>
    </Box>
  )
}

// ── Pill badge ────────────────────────────────────────────────────────────────
export function Pill({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "gold" | "sky" }) {
  const palette = {
    default: { bg: SURFACE, color: MUTED, border: RULE },
    gold:    { bg: "#F4FFE0", color: INK, border: "#D8FF86" },
    sky:     { bg: "#E0F2FE", color: "#0369A1", border: "#BAE6FD" },
  }[variant]
  return (
    <Box
      display="inline-flex" alignItems="center"
      px={3} py="4px" borderRadius="99px"
      bg={palette.bg} border={`1px solid ${palette.border}`}
      fontSize="0.75rem" fontWeight="600" color={palette.color}
      letterSpacing="0.02em"
    >
      {children}
    </Box>
  )
}
