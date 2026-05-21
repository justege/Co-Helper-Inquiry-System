import { useEffect, useState } from "react"
import { useAuthContext } from "../components/auth/AuthContext"
import { getMe, type User } from "../api/users"
import {
  Badge, Box, Card, Grid, Heading, Spinner, Stack, Text,
} from "@chakra-ui/react"

export default function DashboardPage() {
  const { user } = useAuthContext()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMe()
      .then(setProfile)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Box p={10} maxW="1000px">
      <Heading
        mb={7}
        fontSize="1.5rem"
        fontWeight="800"
        letterSpacing="-0.03em"
        color="gray.900"
      >
        Dashboard
      </Heading>

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={5}>
        {/* Firebase Identity Card */}
        <Card.Root border="1px solid" borderColor="gray.100" rounded="3xl" shadow="xs">
          <Card.Body p={7}>
            <Heading fontSize="1rem" fontWeight="700" color="gray.900" mb={5}>
              Firebase Identity
            </Heading>
            <Stack gap={3}>
              <DataRow label="Email" value={user?.email ?? "—"} />
              <DataRow label="UID" value={user?.uid ?? "—"} mono />
              <DataRow label="Provider" value={user?.providerData[0]?.providerId ?? "—"} />
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Profile Card */}
        <Card.Root border="1px solid" borderColor="gray.100" rounded="3xl" shadow="xs">
          <Card.Body p={7}>
            <Box display="flex" alignItems="center" gap={2} mb={5}>
              <Heading fontSize="1rem" fontWeight="700" color="gray.900">Profile</Heading>
              <Badge
                bg="orange.50"
                color="orange.600"
                border="1px solid"
                borderColor="orange.200"
                rounded="full"
                px={2}
                py={0}
                fontSize="0.65rem"
                fontWeight="700"
                letterSpacing="0.05em"
                textTransform="uppercase"
              >
                REST
              </Badge>
            </Box>

            {loading && (
              <Box display="flex" alignItems="center" gap={2}>
                <Spinner size="sm" color="orange.400" />
                <Text fontSize="sm" color="gray.500">Loading from API…</Text>
              </Box>
            )}

            {error && (
              <Box bg="red.50" border="1px solid" borderColor="red.200" rounded="lg" p={3}>
                <Text fontSize="sm" color="red.600">API error: {error}</Text>
                <Text fontSize="xs" color="red.400" mt={1}>Is the backend running on port 8000?</Text>
              </Box>
            )}

            {profile && (
              <Stack gap={3}>
                <DataRow label="ID" value={profile.id} mono />
                <DataRow label="Username" value={profile.username ?? "—"} />
                <DataRow label="Email" value={profile.email} />
                <DataRow
                  label="Member since"
                  value={new Date(profile.createdAt).toLocaleDateString()}
                />
              </Stack>
            )}

            {!loading && !error && !profile && (
              <Text fontSize="sm" color="gray.400">
                No profile returned — make sure .env is configured.
              </Text>
            )}
          </Card.Body>
        </Card.Root>
      </Grid>
    </Box>
  )
}

function DataRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <Box display="grid" gridTemplateColumns="auto 1fr" gap={3} alignItems="baseline">
      <Text fontSize="0.8125rem" color="gray.500" fontWeight="500" whiteSpace="nowrap">
        {label}
      </Text>
      <Text
        color="gray.800"
        fontWeight="600"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
        fontFamily={mono ? "'JetBrains Mono', monospace" : undefined}
        fontSize={mono ? "0.85em" : "0.9375rem"}
      >
        {value}
      </Text>
    </Box>
  )
}
