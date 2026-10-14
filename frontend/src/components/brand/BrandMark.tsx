import { Box, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { INK } from "@/theme/tokens"

export function BrandGlyph({ size = 28 }: { size?: number }) {
  const fontSize = size <= 24 ? "0.95rem" : "1.15rem"
  return (
    <Text
      as="span"
      fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
      fontWeight="500"
      fontSize={fontSize}
      letterSpacing="-0.04em"
      lineHeight="1"
      color="inherit"
    >
      {"<EO/>"}
    </Text>
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
    <Box display="flex" alignItems="center" gap="10px" color={inverted ? "white" : INK}>
      <BrandGlyph size={glyph} />
      <Text
        fontSize={size === "sm" ? "0.6875rem" : "0.75rem"}
        fontWeight="600"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color="inherit"
        lineHeight="1"
      >
        EgemenOkur
      </Text>
    </Box>
  )

  if (!to) return mark
  return (
    <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
      {mark}
    </Link>
  )
}
