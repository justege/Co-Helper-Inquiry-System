import { Box, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { GREEN, INK } from "@/theme/tokens"

export function BrandGlyph({ size = 28 }: { size?: number }) {
  const diamond = Math.round(size * 0.38)
  return (
    <Box
      w={`${size}px`}
      h={`${size}px`}
      bg={GREEN}
      rounded="md"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
    >
      <Box
        w={`${diamond}px`}
        h={`${diamond}px`}
        bg="white"
        rounded="1px"
        transform="rotate(45deg)"
      />
    </Box>
  )
}

export function BrandMark({
  inverted = false,
  size = "md",
  to = "/",
}: {
  inverted?: boolean
  size?: "sm" | "md"
  to?: string | null
}) {
  const glyph = size === "sm" ? 24 : 28
  const mark = (
    <Box display="flex" alignItems="center" gap="10px">
      <BrandGlyph size={glyph} />
      <Text
        fontSize={size === "sm" ? "0.6875rem" : "0.75rem"}
        fontWeight="800"
        letterSpacing="0.08em"
        textTransform="uppercase"
        color={inverted ? "white" : INK}
        lineHeight="1"
      >
        Co-Helper
      </Text>
    </Box>
  )

  if (!to) return mark
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      {mark}
    </Link>
  )
}
