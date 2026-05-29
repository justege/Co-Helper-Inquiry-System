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
  /** Optional photo/image URL for the island background */
  headerBgImage?: string
  children: React.ReactNode
}

/**
 * Universal authorized-area page wrapper.
 *
 * Renders a floating, rounded "island" header with an optional background
 * image (or a clean gradient fallback), followed by the page content area.
 */
export function PageShell({
  title,
  subtitle,
  eyebrow,
  backHref,
  backLabel = "Back",
  action,
  wide,
  headerBgImage,
  children,
}: PageShellProps) {
  const maxW = wide ? "1280px" : PAGE_MAX_W

  return (
    <Box
      px={{ base: 3, md: 6, lg: 8 }}
      pt={{ base: 4, md: 5 }}
      pb={{ base: "96px", lg: 12 }}
      minH="100vh"
      bg="#F7F8FA"
    >
      {/* ── Island ──────────────────────────────────────────────────────────── */}
      <Box maxW={maxW} mx="auto" mb={{ base: 4, md: 5 }}>
        <Box
          borderRadius={{ base: "16px", md: "20px" }}
          overflow="hidden"
          position="relative"
          bg="#0B1C16"
        >
          {/* Background layer */}
          {headerBgImage ? (
            <>
              <Box
                position="absolute" inset={0}
                style={{
                  backgroundImage: `url(${headerBgImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center 40%",
                }}
              />
              <Box
                position="absolute" inset={0}
                background="linear-gradient(155deg, rgba(6,14,28,0.88) 0%, rgba(8,18,26,0.62) 50%, rgba(6,14,28,0.84) 100%)"
              />
            </>
          ) : (
            <>
              <Box
                position="absolute" inset={0}
                background="linear-gradient(135deg, #0B1C16 0%, #0F2219 55%, #081510 100%)"
              />
              {/* Dot grid */}
              <Box
                position="absolute" inset={0} pointerEvents="none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.042) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              {/* Ambient glow — top right */}
              <Box
                position="absolute"
                top="-50px" right="-50px"
                w="260px" h="260px"
                borderRadius="full"
                bg="rgba(15,110,86,0.13)"
                style={{ filter: "blur(72px)" }}
                pointerEvents="none"
              />
            </>
          )}

          {/* 3-px top accent bar */}
          <Box
            position="absolute" top={0} left={0} right={0} h="3px"
            background="linear-gradient(90deg, #0F6E56 0%, rgba(15,110,86,0.12) 100%)"
            zIndex={3}
          />

          {/* ── Content ── */}
          <Box position="relative" zIndex={2} px={{ base: 5, md: 7 }}>

            {/* Back link row */}
            {backHref && (
              <Box pt={{ base: 4, md: 4 }} mb={1}>
                <Link
                  to={backHref}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "rgba(255,255,255,0.36)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.015em",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.68)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.36)")
                  }
                >
                  <LuChevronLeft size={13} />
                  {backLabel}
                </Link>
              </Box>
            )}

            {/* Main row: text (left) + action (right) */}
            <Box
              display="flex"
              alignItems={subtitle ? "flex-start" : "center"}
              justifyContent="space-between"
              gap={4}
              pt={backHref ? 2 : { base: 5, md: 6 }}
              pb={{ base: 5, md: 6 }}
            >
              <Box>
                {eyebrow && (
                  <Text
                    fontSize="0.6875rem"
                    fontWeight="700"
                    color="rgba(106,191,162,0.7)"
                    letterSpacing="0.12em"
                    textTransform="uppercase"
                    mb={1.5}
                  >
                    {eyebrow}
                  </Text>
                )}
                <Heading
                  fontSize={{ base: "1.5rem", md: "1.875rem" }}
                  fontWeight="700"
                  color="white"
                  letterSpacing="-0.03em"
                  lineHeight="1.2"
                >
                  {title}
                </Heading>
                {subtitle && (
                  <Text
                    fontSize={{ base: "0.8125rem", md: "0.9375rem" }}
                    color="rgba(255,255,255,0.42)"
                    fontWeight="400"
                    mt={1.5}
                    lineHeight="1.5"
                  >
                    {subtitle}
                  </Text>
                )}
              </Box>

              {action && (
                <Box flexShrink={0} pt="2px">
                  {action}
                </Box>
              )}
            </Box>
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
