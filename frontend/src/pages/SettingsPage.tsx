import { Box, Card, Heading, Text } from "@chakra-ui/react"

export default function SettingsPage() {
  return (
    <Box p={10} maxW="1000px">
      <Heading mb={7} fontSize="1.5rem" fontWeight="800" letterSpacing="-0.03em" color="gray.900">
        Settings
      </Heading>

      <Card.Root border="1px solid" borderColor="gray.100" rounded="3xl" shadow="xs" maxW="480px">
        <Card.Body p={7}>
          <Heading fontSize="1rem" fontWeight="700" color="gray.900" mb={2}>
            App Settings
          </Heading>
          <Text fontSize="sm" color="gray.500" fontWeight="500">
            Add your settings here.
          </Text>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
