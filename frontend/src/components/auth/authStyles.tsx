import { Box, Text } from "@chakra-ui/react"
import { FORM_INPUT_PROPS_LG } from "@/components/ui/form-controls"

export const authInputProps = {
  ...FORM_INPUT_PROPS_LG,
  fontWeight: "500" as const,
}

export const authPrimaryButtonProps = {
  size: "lg" as const,
  h: "52px",
  px: "28px",
  w: "full",
  rounded: "10px",
  fontWeight: "600",
  fontSize: "0.9375rem",
  bg: "#0F6E56",
  color: "white",
  letterSpacing: "-0.005em",
  boxShadow: "0 1px 2px rgba(14,27,23,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
  _hover: { bg: "#0a5240", boxShadow: "0 2px 8px rgba(15,110,86,0.28)" },
  _active: { bg: "#083F30", transform: "translateY(0.5px)" },
  transition: "140ms ease",
}

export function authFieldLabel(text: string, required = false) {
  return (
    <Text
      as="span"
      fontSize="13px"
      fontWeight="600"
      color="#0E1B17"
      letterSpacing="-0.005em"
      mb="6px"
      display="block"
    >
      {text}
      {required && (
        <Box as="span" color="#0F6E56" ml={0.5}>*</Box>
      )}
    </Text>
  )
}
