import { Box, Text } from "@chakra-ui/react"
import { FORM_INPUT_PROPS_LG } from "@/components/ui/form-controls"

export const authInputProps = {
  ...FORM_INPUT_PROPS_LG,
  fontWeight: "500" as const,
}

export const authPrimaryButtonProps = {
  size: "lg" as const,
  h: "46px",
  w: "full",
  rounded: "10px",
  fontWeight: "700",
  fontSize: "0.9375rem",
  bg: "#0F6E56",
  color: "white",
  letterSpacing: "0.01em",
  _hover: { bg: "#0a5240", transform: "translateY(-1px)" },
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
        <Box as="span" color="#0F6E56" ml={0.5}>*</Box>
      )}
    </Text>
  )
}
