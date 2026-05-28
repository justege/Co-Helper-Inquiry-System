import { Box, Heading, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { LuChevronLeft } from "react-icons/lu"

export const PAGE_MAX_W = "960px"

interface PageShellProps {
  title: string
  subtitle?: string
  eyebrow?: string
  backHref?: string
  backLabel?: string
  action?: React.ReactNode
  wide?: boolean
  children: React.ReactNode
}

/**
 * Universal authorized-area page wrapper.
 *
 * Renders a brand-consistent ink island header followed by content.
 * No external images — pure Co-Helper brand DNA.
 */
export function PageShell({
  title,
  subtitle,
  eyebrow,
  backHref,
  backLabel = "Back",
  action,
  wide,
  children,
}: PageShellProps) {
  const maxW = wide ? "1280px" : PAGE_MAX_W

  return (
    <Box
      px={{ base: 4, md: 6, lg: 8 }}
      pt={{ base: 4, md: 6 }}
      pb={{ base: "88px", lg: 10 }}
      minH="100vh"
      bg="#F2F4F0"
    >
      {/* ── Island header ──────────────────────────────────────────────────── */}
      <Box maxW={maxW} mx="auto" mb={{ base: 4, md: 6 }}>
        <Box
          borderRadius={{ base: "16px", md: "20px" }}
          overflow="hidden"
          position="relative"
          h={{ base: "160px", md: "200px" }}
          bg="#0E1B17"
        >
          {/* Subtle grid lines */}
          <svg aria-hidden style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            pointerEvents: "none",
          }} viewBox="0 0 960 200" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 110} y1="0" x2={i * 110} y2="200"
                stroke="#fff" strokeWidth="0.5" opacity="0.04" />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 52} x2="960" y2={i * 52}
                stroke="#fff" strokeWidth="0.5" opacity="0.04" />
            ))}
          </svg>

          {/* Green glow — bottom left */}
          <Box
            position="absolute"
            bottom="-60px" left="-40px"
            w="260px" h="260px"
            borderRadius="full"
            bg="rgba(15,110,86,0.18)"
            filter="blur(60px)"
            pointerEvents="none"
          />

          {/* Top accent bar — green */}
          <Box
            position="absolute" top={0} left={0} right={0} h="3px"
            background="linear-gradient(90deg, #0F6E56 0%, rgba(15,110,86,0.2) 100%)"
            zIndex={3}
          />

          {/* Back link */}
          {backHref && (
            <Link
              to={backHref}
              style={{
                position: "absolute",
                top: "20px", left: "24px",
                zIndex: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              <LuChevronLeft size={13} />
              {backLabel}
            </Link>
          )}

          {/* Action slot — top right */}
          {action && (
            <Box
              position="absolute"
              top={{ base: 4, md: 5 }}
              right={{ base: 4, md: 6 }}
              zIndex={4}
            >
              {action}
            </Box>
          )}

          {/* Text — centered */}
          <Box
            position="absolute" inset={0} zIndex={2}
            display="flex" flexDir="column"
            alignItems="center" justifyContent="center"
            textAlign="center"
            px={{ base: 6, md: 12 }}
            pt={backHref ? "20px" : 0}
          >
            {eyebrow && (
              <Text
                fontSize="0.6875rem" fontWeight="700"
                color="rgba(167,215,197,0.75)"
                letterSpacing="0.14em" textTransform="uppercase" mb={2}
              >
                {eyebrow}
              </Text>
            )}
            <Heading
              fontSize={{ base: "1.5rem", md: "2rem" }}
              fontWeight="700" color="white"
              letterSpacing="-0.03em" lineHeight="1.2"
            >
              {title}
            </Heading>
            {subtitle && (
              <Text
                fontSize={{ base: "0.8125rem", md: "0.9375rem" }}
                color="rgba(255,255,255,0.45)"
                fontWeight="400" mt={2} lineHeight="1.5" maxW="520px"
              >
                {subtitle}
              </Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <Box maxW={maxW} mx="auto">
        {children}
      </Box>
    </Box>
  )
}
