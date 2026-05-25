import { Box, Flex, Grid, Stack, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { FOOTER_LINKS } from "./footerLinks"
import { ACCENT, INK, MUTED, RULE, SURFACE } from "./tokens"

export function Logo({ light = false }: { light?: boolean }) {
  const c = light ? "white" : INK
  return (
    <Link to="/" style={{ textDecoration: "none" }}>
      <Box display="flex" alignItems="center" gap={2}>
        <Box w="24px" h="24px" bg={light ? "white" : INK} rounded="4px"
          display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
          <Box w="8px" h="8px" bg={light ? INK : "white"} rounded="sm" transform="rotate(45deg)" />
        </Box>
        <Text fontSize="0.8125rem" fontWeight="700" color={c} letterSpacing="0.04em" textTransform="uppercase">
          OutsourceSoft
        </Text>
      </Box>
    </Link>
  )
}

export function CTA({
  to,
  children,
  variant = "primary",
}: {
  to: string
  children: React.ReactNode
  variant?: "primary" | "outline" | "ghost" | "white" | "hero-ghost"
}) {
  const styles = {
    primary: { bg: INK, color: "white", border: `1px solid ${INK}`, _hover: { bg: "#1E2530", textDecoration: "none" } },
    outline: { bg: "transparent", color: INK, border: `1px solid ${RULE}`, _hover: { borderColor: "#9CA3AF", textDecoration: "none" } },
    ghost: { bg: "transparent", color: MUTED, border: "none", _hover: { color: INK, textDecoration: "none" } },
    white: { bg: "white", color: INK, border: "1px solid white", _hover: { bg: "#F3F4F6", textDecoration: "none" } },
    "hero-ghost": {
      bg: "transparent",
      color: "rgba(255,255,255,0.85)",
      border: "1px solid rgba(255,255,255,0.35)",
      _hover: { bg: "rgba(255,255,255,0.08)", color: "white", textDecoration: "none" },
    },
  }[variant]

  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <Box
        display="inline-flex" alignItems="center"
        px={5} py="10px" borderRadius="6px" fontWeight="600" fontSize="0.875rem"
        transition="all 0.15s"
        {...styles}
      >
        {children}
      </Box>
    </Link>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="0.6875rem" fontWeight="600"
      color={MUTED}
      letterSpacing="0.1em" textTransform="uppercase" mb={4}
    >
      {children}
    </Text>
  )
}

export function Divider() {
  return <Box w="full" h="1px" bg={RULE} />
}

export function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <Box display="flex" gap={3} alignItems="flex-start">
      <Box w="14px" h="14px" flexShrink={0} mt="3px"
        border={`1.5px solid ${INK}`} rounded="2px"
        display="flex" alignItems="center" justifyContent="center">
        <Box w="6px" h="3px" borderLeft="1.5px solid" borderBottom="1.5px solid" borderColor={INK}
          transform="rotate(-45deg) translateY(-1px)" />
      </Box>
      <Text fontSize="0.9375rem" color={INK} fontWeight="500">{children}</Text>
    </Box>
  )
}

export function StepNumber({ n }: { n: string }) {
  return (
    <Box
      w="40px" h="40px" mb={6} borderRadius="6px"
      bg={SURFACE} border={`1px solid ${RULE}`}
      display="flex" alignItems="center" justifyContent="center"
      fontSize="0.8125rem" fontWeight="700" color={ACCENT}
    >
      {n}
    </Box>
  )
}

export function MarketingNav() {
  return (
    <Box as="header" bg="white" borderBottom={`1px solid ${RULE}`}>
      <Flex align="center" justify="space-between"
        maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} h="56px"
      >
        <Logo />
        <Flex align="center" gap={2}>
          <CTA to="/login" variant="ghost">Sign in</CTA>
          <CTA to="/register" variant="primary">Get started</CTA>
        </Flex>
      </Flex>
    </Box>
  )
}

export function MarketingFooter() {
  return (
    <Box bg={SURFACE} borderTop={`1px solid ${RULE}`}>
      <Box maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} pt={16} pb={10}>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr", md: "2fr 1fr 1fr 1fr 1fr" }} gap={10} mb={14}>
          <Box>
            <Logo />
            <Text fontSize="0.875rem" color={MUTED} mt={4} lineHeight="1.7" maxW="240px">
              The B2B procurement platform connecting global buyers with Turkey's finest manufacturers and service partners.
            </Text>
          </Box>
          {FOOTER_LINKS.map((col) => (
            <Box key={col.label}>
              <Text fontSize="0.75rem" fontWeight="600" color={INK} letterSpacing="0.06em"
                textTransform="uppercase" mb={4}>{col.label}</Text>
              <Stack gap={2.5}>
                {col.items.map((item) => (
                  <Link key={item.to} to={item.to} style={{ textDecoration: "none" }}>
                    <Text
                      fontSize="0.875rem"
                      color={MUTED}
                      _hover={{ color: INK }}
                      transition="color 0.1s"
                    >
                      {item.label}
                    </Text>
                  </Link>
                ))}
              </Stack>
            </Box>
          ))}
        </Grid>

        <Divider />

        <Flex align="center" justify="space-between" pt={8} flexWrap="wrap" gap={4}>
          <Text fontSize="0.8125rem" color={MUTED}>
            © {new Date().getFullYear()} OutsourceSoft. All rights reserved.
          </Text>
          <Text fontSize="0.8125rem" color={MUTED}>
            Istanbul · Izmir · Bursa · Ankara
          </Text>
        </Flex>
      </Box>
    </Box>
  )
}

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
      <Text fontSize="0.9375rem" fontWeight="600" color={INK} mb={2}>{title}</Text>
      <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">{children}</Text>
    </Box>
  )
}
