import { Box, Heading, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { INK, RADIUS_BANNER } from "@/theme/tokens"
import type { ReactNode } from "react"

const AVATARS = [
  { initials: "SK", bg: "#3DA07E" },
  { initials: "MT", bg: "#185FA5" },
  { initials: "EV", bg: "#0F6E56" },
  { initials: "TR", bg: "#6ABFA2" },
  { initials: "PS", bg: "#083F30" },
  { initials: "DM", bg: "#4B7A6A" },
]

function MapTexture() {
  const dots: Array<{ cx: number; cy: number; r: number }> = []
  for (let y = 12; y < 148; y += 11) {
    for (let x = 180; x < 920; x += 11) {
      const nx = (x - 500) / 340
      const ny = (y - 80) / 70
      const land =
        Math.exp(-((nx + 0.55) ** 2 + (ny + 0.1) ** 2) * 3.2) +
        Math.exp(-((nx - 0.15) ** 2 + (ny + 0.25) ** 2) * 5.5) +
        Math.exp(-((nx - 0.7) ** 2 + (ny - 0.15) ** 2) * 4.4) +
        Math.exp(-((nx + 0.05) ** 2 + (ny - 0.55) ** 2) * 8)
      if (land > 0.22 && (x * 13 + y * 7) % 17 > 4) {
        dots.push({ cx: x, cy: y, r: land > 0.55 ? 1.7 : 1.15 })
      }
    }
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 960 160"
      preserveAspectRatio="xMaxYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="rgba(134,239,172,0.28)" />
      ))}
    </svg>
  )
}

export function WelcomeBanner({
  eyebrow = "Dashboard",
  title,
  action,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
}) {
  return (
    <Box
      position="relative"
      overflow="hidden"
      borderRadius={RADIUS_BANNER}
      bg={INK}
      minH={{ base: "132px", md: "156px" }}
      px={{ base: 5, md: 8 }}
      py={{ base: 6, md: 7 }}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={6}
      mb={6}
    >
      <Box
        position="absolute"
        inset="0"
        background="radial-gradient(ellipse at 78% 50%, rgba(15,110,86,0.55) 0%, transparent 58%)"
      />
      <MapTexture />

      <Box position="relative" zIndex={1} minW={0}>
        <Text
          fontSize="0.6875rem"
          fontWeight="700"
          letterSpacing="0.16em"
          textTransform="uppercase"
          color="rgba(255,255,255,0.48)"
          mb={2}
        >
          {eyebrow}
        </Text>
        <Heading
          as="h1"
          color="white"
          fontFamily="var(--font-heading)"
          fontWeight="700"
          fontSize={{ base: "1.5rem", md: "2rem" }}
          letterSpacing="-0.03em"
          lineHeight="1.15"
        >
          {title}
        </Heading>
      </Box>

      <Box position="relative" zIndex={1} display="flex" alignItems="center" gap={4} flexShrink={0}>
        <Box display={{ base: "none", md: "flex" }} alignItems="center">
          {AVATARS.map((a, i) => (
            <Box
              key={a.initials}
              w="36px"
              h="36px"
              ml={i === 0 ? 0 : "-10px"}
              rounded="full"
              bg={a.bg}
              border="2px solid"
              borderColor={INK}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="0.625rem"
              fontWeight="800"
              color="white"
              zIndex={AVATARS.length - i}
            >
              {a.initials}
            </Box>
          ))}
        </Box>
        {action}
      </Box>
    </Box>
  )
}

export function WelcomeBannerAction({
  children,
  to,
  onClick,
}: {
  children: ReactNode
  to?: string
  onClick?: () => void
}) {
  const inner = (
    <Box
      display="inline-flex"
      alignItems="center"
      gap="8px"
      h="40px"
      px="16px"
      borderRadius="10px"
      bg="white"
      color={INK}
      fontSize="0.8125rem"
      fontWeight="700"
      _hover={{ bg: "#F0FAF5" }}
      whiteSpace="nowrap"
      as={to ? undefined : "button"}
      type={to ? undefined : "button"}
      onClick={onClick}
    >
      {children}
    </Box>
  )
  if (to) {
    return (
      <Link to={to} style={{ textDecoration: "none" }} onClick={onClick}>
        {inner}
      </Link>
    )
  }
  return inner
}
