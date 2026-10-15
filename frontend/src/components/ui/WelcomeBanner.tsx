import { Box, Heading, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { GREEN, INK } from "@/theme/tokens"
import type { ReactNode } from "react"

export type PageStat = {
  label: string
  value: string
  hint?: string
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
          borderLeft={i === 0 ? "none" : "1px solid rgba(14,27,23,0.08)"}
          minW="72px"
        >
          <Text
            fontSize="1.375rem"
            fontWeight="600"
            color={INK}
            letterSpacing="-0.035em"
            lineHeight="1.1"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            maxW="148px"
          >
            {stat.value}
          </Text>
          <Text
            fontSize="0.625rem"
            fontWeight="600"
            letterSpacing="0.14em"
            textTransform="uppercase"
            color="rgba(14,27,23,0.42)"
            mt="6px"
          >
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
      className="atelier-island"
      overflow="hidden"
      minH={{ base: "auto", md: "132px" }}
      px={{ base: 5, md: 8 }}
      py={{ base: 6, md: 7 }}
      display="flex"
      flexWrap="wrap"
      alignItems={{ base: "flex-start", md: "center" }}
      justifyContent="space-between"
      gap={6}
      mb={6}
    >
      <Box position="relative" zIndex={1} minW={0} flex="1">
        <Text
          fontSize="0.625rem"
          fontWeight="600"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="rgba(14,27,23,0.4)"
          mb={2}
        >
          {eyebrow}
        </Text>
        <Heading
          as="h1"
          color={INK}
          fontFamily="var(--font-heading)"
          fontWeight="600"
          fontSize={{ base: "1.625rem", md: "2.125rem" }}
          letterSpacing="-0.035em"
          lineHeight="1.12"
        >
          {title}
        </Heading>
        {stats && stats.length > 0 && (
          <Box display={{ base: "flex", md: "none" }} gap={5} mt={4} flexWrap="wrap">
            {stats.slice(0, 4).map((stat) => (
              <Box key={stat.label}>
                <Text fontSize="1.125rem" fontWeight="600" color={INK} letterSpacing="-0.03em">{stat.value}</Text>
                <Text fontSize="0.625rem" fontWeight="600" letterSpacing="0.12em" textTransform="uppercase" color="rgba(14,27,23,0.42)" mt="2px">
                  {stat.label}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box position="relative" zIndex={1} display="flex" alignItems="center" gap={6} flexShrink={0}>
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
      borderRadius="12px"
      bg={INK}
      color="white"
      fontSize="0.8125rem"
      fontWeight="600"
      letterSpacing="-0.01em"
      boxShadow="0 1px 2px rgba(14,27,23,0.16), inset 0 1px 0 rgba(255,255,255,0.14)"
      transition="background-color 180ms ease, transform 180ms ease"
      _hover={{ bg: "#163028" }}
      _active={{ bg: GREEN, transform: "translateY(0.5px)" }}
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
