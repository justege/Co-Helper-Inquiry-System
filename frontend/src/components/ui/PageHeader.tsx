import { Box, Heading, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { LuChevronLeft } from "react-icons/lu"
import { INK, MUTED } from "@/theme/tokens"
import type { ReactNode } from "react"

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
  backLabel = "Back",
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  backHref?: string
  backLabel?: string
}) {
  return (
    <Box
      display="flex"
      flexWrap="wrap"
      alignItems={{ base: "flex-start", md: "center" }}
      justifyContent="space-between"
      gap={4}
      mb={6}
    >
      <Box minW={0}>
        {backHref && (
          <Link to={backHref} style={{ textDecoration: "none" }}>
            <Text fontSize="0.8125rem" color={MUTED} display="inline-flex" alignItems="center" gap="4px" mb={2} _hover={{ color: INK }}>
              <LuChevronLeft size={14} /> {backLabel}
            </Text>
          </Link>
        )}
        <Heading
          as="h1"
          fontFamily="'Space Grotesk', Inter, sans-serif"
          fontSize={{ base: "1.5rem", md: "1.75rem" }}
          fontWeight="700"
          letterSpacing="-0.02em"
          color={INK}
          lineHeight="1.2"
        >
          {title}
        </Heading>
        {subtitle && (
          <Text mt={1} fontSize="0.9375rem" color={MUTED} lineHeight="1.5">
            {subtitle}
          </Text>
        )}
      </Box>
      {action}
    </Box>
  )
}

export function PageBody({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <Box
      px={{ base: 4, md: 6, lg: 8 }}
      pt={{ base: 5, md: 6 }}
      pb={{ base: "96px", lg: 12 }}
      maxW={wide ? "1280px" : "960px"}
      mx="auto"
    >
      {children}
    </Box>
  )
}
