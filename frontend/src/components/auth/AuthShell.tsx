import { Box, Flex, Heading, Text, VStack } from "@chakra-ui/react"
import { Link } from "react-router-dom"

// ── Logo ──────────────────────────────────────────────────────────────────────

export function LogoMark({ dark = true, size = "md" }: { dark?: boolean; size?: "sm" | "md" }) {
  const px = size === "sm" ? "22px" : "26px"
  const py = size === "sm" ? "22px" : "26px"
  const dot = size === "sm" ? "8px" : "9px"
  const fs = size === "sm" ? "0.75rem" : "0.875rem"
  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Box
        w={px} h={py}
        bg={dark ? "#0D1B2E" : "rgba(255,255,255,0.15)"}
        rounded="6px"
        display="flex" alignItems="center" justifyContent="center"
        flexShrink={0}
      >
        <Box w={dot} h={dot} bg={dark ? "#1563B2" : "white"} rounded="sm" transform="rotate(45deg)" />
      </Box>
      <Text
        fontSize={fs} fontWeight="800" letterSpacing="0.06em" textTransform="uppercase"
        color={dark ? "#0D1B2E" : "white"}
        lineHeight="1"
      >
        OutsourceSoft
      </Text>
    </Box>
  )
}

// ── AuthShell ─────────────────────────────────────────────────────────────────

export type AuthPromoProps = {
  tagline: string
  imageSrc?: string
}

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
  promo,
}: {
  title: string
  subtitle: string
  footer: React.ReactNode
  children: React.ReactNode
  promo: AuthPromoProps
}) {
  return (
    <Flex minH="100vh" bg="#F2F4F8">
      {/* ── Left: Form panel ─────────────────────────────────────── */}
      <Flex
        flex={{ base: "1", lg: "none" }}
        w={{ base: "100%", lg: "440px" }}
        flexDir="column"
        px={{ base: 6, md: 10, lg: 14 }}
        py={10}
        bg="white"
        position="relative"
        zIndex={1}
        boxShadow={{ lg: "2px 0 24px rgba(11,21,40,0.06)" }}
      >
        {/* Brand */}
        <Box mb={16}>
          <Box as={Link} to="/" display="inline-flex" _hover={{ textDecoration: "none" }}>
            <LogoMark dark />
          </Box>
        </Box>

        {/* Form area */}
        <Flex flex="1" flexDir="column" justify="center">
          <Box maxW="340px" w="full">
            <VStack gap={1} align="flex-start" mb={8}>
              <Heading
                fontSize="1.625rem" fontWeight="800" color="#0D1B2E"
                letterSpacing="-0.03em" lineHeight="1.2"
              >
                {title}
              </Heading>
              <Text fontSize="0.875rem" color="#94A3B8" fontWeight="500" mt={1}>
                {subtitle}
              </Text>
            </VStack>
            {children}
          </Box>
        </Flex>

        {/* Footer */}
        <Text fontSize="0.8125rem" color="#94A3B8" fontWeight="500" mt={8}>
          {footer}
        </Text>
      </Flex>

      {/* ── Right: Photo panel ───────────────────────────────────── */}
      <Flex
        display={{ base: "none", lg: "flex" }}
        flex="1"
        position="relative"
        overflow="hidden"
      >
        {promo.imageSrc ? (
          <>
            <Box position="absolute" inset={0}
              bgImage={`url(${promo.imageSrc})`}
              bgSize="cover" bgPosition="center 40%"
            />
            {/* Gradient: strong at bottom for text, lighter in middle */}
            <Box position="absolute" inset={0}
              background="linear-gradient(180deg, rgba(8,16,32,0.55) 0%, rgba(8,16,32,0.20) 50%, rgba(8,16,32,0.72) 100%)"
            />
            {/* Blue accent line top */}
            <Box position="absolute" top={0} left={0} right={0} h="3px"
              background="linear-gradient(90deg, #1563B2 0%, rgba(21,99,178,0.3) 100%)" zIndex={3}
            />
            {/* Logo top-left */}
            <Box position="absolute" top={10} left={12} zIndex={4}>
              <LogoMark dark={false} size="sm" />
            </Box>
            {/* Bottom tagline — minimal */}
            <Box position="absolute" bottom={12} left={12} right={12} zIndex={4}>
              <Text
                fontSize={{ lg: "1.625rem", xl: "2rem" }}
                fontWeight="800"
                color="white"
                lineHeight="1.2"
                letterSpacing="-0.02em"
                maxW="420px"
              >
                {promo.tagline}
              </Text>
              <Box display="flex" alignItems="center" gap={2} mt={4}>
                <Box w="20px" h="1px" bg="rgba(255,255,255,0.4)" />
                <Text fontSize="0.75rem" color="rgba(255,255,255,0.4)" fontWeight="500" letterSpacing="0.04em">
                  OutsourceSoft · B2B Procurement · Turkey
                </Text>
              </Box>
            </Box>
          </>
        ) : (
          /* fallback dark panel */
          <Box bg="#0B1528" position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center">
            <Text fontSize="2rem" fontWeight="800" color="white" maxW="360px" textAlign="center" letterSpacing="-0.03em">
              {promo.tagline}
            </Text>
          </Box>
        )}
      </Flex>
    </Flex>
  )
}

export function AuthBrand() {
  return <LogoMark dark />
}
