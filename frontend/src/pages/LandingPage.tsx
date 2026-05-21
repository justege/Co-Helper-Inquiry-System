import { Box, Button, Flex, Grid, Heading, HStack, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"

export default function LandingPage() {
  return (
    <Box minH="100vh" display="flex" flexDir="column" bg="#fcfcfc">
      {/* Header */}
      <Flex
        as="header"
        align="center"
        justify="space-between"
        px={10}
        py={5}
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <Heading fontSize="1.375rem" fontWeight="800" letterSpacing="-0.04em" color="gray.900">
          Payd
        </Heading>
        <HStack gap={3}>
          <Button asChild variant="outline" colorPalette="gray" size="sm" fontWeight="600">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild colorPalette="orange" size="sm" fontWeight="600">
            <Link to="/register">Get Started</Link>
          </Button>
        </HStack>
      </Flex>

      {/* Hero */}
      <Flex
        flex="1"
        flexDir="column"
        align="center"
        justify="center"
        textAlign="center"
        px={8}
        py={20}
        gap={5}
      >
        <Heading
          fontSize={{ base: "2rem", md: "3.5rem" }}
          fontWeight="800"
          lineHeight="1.15"
          letterSpacing="-0.04em"
          color="gray.900"
        >
          React · Node.js · Express
          <br />
          <Box as="span" color="orange.400">ready to ship.</Box>
        </Heading>
        <Text color="gray.500" maxW="500px" lineHeight="1.7" fontSize="1.05rem" fontWeight="500">
          Firebase auth, Supabase PostgreSQL, REST API — wired up and working out of the box.
        </Text>
        <Button asChild colorPalette="orange" size="lg" fontWeight="700" mt={2}
          px={8} rounded="xl" shadow="sm"
          _hover={{ shadow: "md", transform: "translateY(-1px)" }}
          transition="all 0.15s"
        >
          <Link to="/register">Start building</Link>
        </Button>
      </Flex>

      {/* Feature grid */}
      <Grid
        templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }}
        borderTop="1px solid"
        borderColor="gray.100"
        bg="gray.100"
        gap="1px"
      >
        {FEATURES.map((f) => (
          <Box key={f.title} bg="white" p={9} display="flex" flexDir="column" gap={2}>
            <Text fontSize="1.5rem">{f.icon}</Text>
            <Heading fontSize="0.9375rem" fontWeight="700" color="gray.900">{f.title}</Heading>
            <Text color="gray.500" fontSize="0.875rem" lineHeight="1.6" fontWeight="500">{f.desc}</Text>
          </Box>
        ))}
      </Grid>
    </Box>
  )
}

const FEATURES = [
  {
    icon: "⚡",
    title: "REST API",
    desc: "Express serving a clean REST API with Firebase token verification on every request.",
  },
  {
    icon: "🔐",
    title: "Firebase Auth",
    desc: "Email/password and Google sign-in. ID tokens verified server-side on every request.",
  },
  {
    icon: "🗄️",
    title: "Supabase PostgreSQL",
    desc: "Managed Postgres with SSL. Tables are auto-created on first boot.",
  },
  {
    icon: "🚀",
    title: "Instant dev",
    desc: "One command boots both servers simultaneously.",
  },
]
