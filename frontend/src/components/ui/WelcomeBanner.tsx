import { Box, Heading, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { INK, RADIUS_BANNER } from "@/theme/tokens"
import type { ReactNode } from "react"

export type PageStat = {
  label: string
  value: string
  hint?: string
}

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

export function BannerStats({ stats }: { stats: PageStat[] }) {
  if (!stats.length) return null
  return (
    <Box display={{ base: "none", md: "flex" }} alignItems="stretch" gap={0} flexShrink={0}>
      {stats.slice(0, 4).map((stat, i) => (
        <Box
          key={stat.label}
          pl={i === 0 ? 0 : 5}
          ml={i === 0 ? 0 : 5}
          borderLeft={i === 0 ? "none" : "1px solid rgba(255,255,255,0.12)"}
          minW="76px"
        >
          <Text
            fontSize="1.25rem"
            fontWeight="800"
            color="white"
            letterSpacing="-0.03em"
            lineHeight="1.1"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            maxW="140px"
          >
            {stat.value}
          </Text>
          <Text fontSize="0.6875rem" fontWeight="600" color="rgba(255,255,255,0.55)" mt="3px">
            {stat.label}
          </Text>
        </Box>
      ))}
    </Box>
  )
}

export function WelcomeBanner({
  eyebrow = "Dashboard",
  title,
  action,
  stats,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
  stats?: PageStat[]
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
        {stats && stats.length > 0 && (
          <Box display={{ base: "flex", md: "none" }} gap={5} mt={4} flexWrap="wrap">
            {stats.slice(0, 4).map((stat) => (
              <Box key={stat.label}>
                <Text fontSize="1rem" fontWeight="800" color="white">{stat.value}</Text>
                <Text fontSize="0.65rem" fontWeight="600" color="rgba(255,255,255,0.55)">{stat.label}</Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box position="relative" zIndex={1} display="flex" alignItems="center" gap={5} flexShrink={0}>
        {stats && stats.length > 0 ? <BannerStats stats={stats} /> : null}
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
