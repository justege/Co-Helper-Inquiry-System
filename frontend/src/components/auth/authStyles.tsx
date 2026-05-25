import { Box, Text } from "@chakra-ui/react"

export const authInputProps = {
  size: "lg" as const,
  h: "46px",
  rounded: "10px",
  bg: "white",
  borderColor: "#D8DCE8",
  fontSize: "0.9375rem",
  fontWeight: "500",
  _placeholder: { color: "#B8C0D0" },
  _focusVisible: {
    bg: "white",
    borderColor: "#1563B2",
    boxShadow: "0 0 0 3px rgba(21,99,178,0.15)",
  },
}

export const authPrimaryButtonProps = {
  size: "lg" as const,
  h: "46px",
  w: "full",
  rounded: "10px",
  fontWeight: "700",
  fontSize: "0.9375rem",
  bg: "#1563B2",
  color: "white",
  letterSpacing: "0.01em",
  _hover: { bg: "#1252A0", transform: "translateY(-1px)" },
  _active: { transform: "translateY(0)" },
  transition: "all 0.15s",
}

export function authFieldLabel(text: string, required = false) {
  return (
    <Text
      as="span"
      fontSize="0.6875rem"
      fontWeight="700"
      color="#4A5568"
      letterSpacing="0.07em"
      textTransform="uppercase"
    >
      {text}
      {required && (
        <Box as="span" color="#1563B2" ml={0.5}>*</Box>
      )}
    </Text>
  )
}
