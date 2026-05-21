import { Box, Text } from "@chakra-ui/react"
import { firebaseConfigured } from "../../lib/firebase"

export function SetupBanner() {
  if (firebaseConfigured) return null

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={9999}
      bg="#fff8ec"
      borderBottom="1px solid"
      borderColor="#ffd699"
      px={6}
      py={3}
      fontSize="0.8125rem"
      color="#a05a00"
      display="flex"
      flexDir="column"
      gap={1}
    >
      <Text fontWeight="700">Setup required</Text>
      <Text color="#c97d1a" fontSize="xs">
        Firebase is not configured. Add your credentials to{" "}
        <Box as="span" fontWeight="600">frontend/.env</Box> to enable authentication.
      </Text>
    </Box>
  )
}
