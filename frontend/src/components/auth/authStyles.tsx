import { Box, Text } from "@chakra-ui/react"

export const authInputProps = {
  size: "lg" as const,
  h: "48px",
  rounded: "xl",
  bg: "#fafbff",
  borderColor: "#e4e7ef",
  fontSize: "sm",
  _placeholder: { color: "gray.400" },
  _focusVisible: {
    borderColor: "#4f77ff",
    boxShadow: "0 0 0 3px rgba(79, 119, 255, 0.15)",
  },
}

export const authPrimaryButtonProps = {
  size: "lg" as const,
  h: "48px",
  w: "full",
  rounded: "xl",
  fontWeight: "700",
  fontSize: "sm",
  bg: "#4f77ff",
  color: "white",
  _hover: { bg: "#3d66ef", transform: "translateY(-1px)", shadow: "md" },
  transition: "all 0.15s",
}

export function authFieldLabel(text: string, required = false) {
  return (
    <Text as="span" fontSize="sm" fontWeight="600" color="gray.700">
      {text}
      {required && (
        <Box as="span" color="red.400">
          *
        </Box>
      )}
    </Text>
  )
}
