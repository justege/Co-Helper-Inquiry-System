import { Box, Heading, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { LuChevronLeft } from "react-icons/lu"
import istanbulPng from "@/assets/istanbul.png"

export const PAGE_MAX_W = "960px"

interface PageShellProps {
  /** Page title — rendered large in the island */
  title: string
  /** Optional small line below the title */
  subtitle?: string
  /** Small all-caps eyebrow above the title */
  eyebrow?: string
  /** Back link rendered as an arrow in the top-left of the island */
  backHref?: string
  backLabel?: string
  /** Optional React node placed top-right of the island (e.g. a CTA button) */
  action?: React.ReactNode
  /** Stretch max width beyond PAGE_MAX_W (for admin / wide layouts) */
  wide?: boolean
  children: React.ReactNode
}

/**
 * Universal page wrapper.
 *
 * Renders a "island" hero (Istanbul skyline, uniform dark overlay, centered
 * text) followed by content at the same max-width.
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
      bg="#EFF1F6"
    >
      {/* ── Island ─────────────────────────────────────────────────────────── */}
      <Box maxW={maxW} mx="auto" mb={{ base: 4, md: 6 }}>
        <Box
          borderRadius={{ base: "16px", md: "20px" }}
          overflow="hidden"
          position="relative"
          h={{ base: "168px", md: "210px" }}
          bgImage={`url(${istanbulPng})`}
          bgSize="cover"
          style={{ backgroundPosition: "center 38%" }}
        >
          {/* Uniform dark overlay for strong readability */}
          <Box
            position="absolute"
            inset={0}
            background="linear-gradient(180deg, rgba(8,16,32,0.78) 0%, rgba(8,16,32,0.68) 100%)"
          />

          {/* Subtle top border accent */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            h="3px"
            background="linear-gradient(90deg, #1563B2 0%, rgba(21,99,178,0.3) 100%)"
            zIndex={3}
          />

          {/* Back button — top left */}
          {backHref && (
            <Link
              to={backHref}
              style={{
                position: "absolute",
                top: "20px",
                left: "24px",
                zIndex: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "rgba(255,255,255,0.55)",
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

          {/* Text content — centered horizontally and vertically */}
          <Box
            position="absolute"
            inset={0}
            zIndex={2}
            display="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            px={{ base: 6, md: 12 }}
            pt={backHref ? "20px" : 0}
          >
            {eyebrow && (
              <Text
                fontSize="0.6875rem"
                fontWeight="700"
                color="rgba(160,195,240,0.8)"
                letterSpacing="0.12em"
                textTransform="uppercase"
                mb={2}
              >
                {eyebrow}
              </Text>
            )}
            <Heading
              fontSize={{ base: "1.5rem", md: "2rem" }}
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
                color="rgba(255,255,255,0.5)"
                fontWeight="400"
                mt={2}
                lineHeight="1.5"
                maxW="520px"
              >
                {subtitle}
              </Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Content — same max-width as island ─────────────────────────────── */}
      <Box maxW={maxW} mx="auto">
        {children}
      </Box>
    </Box>
  )
}
