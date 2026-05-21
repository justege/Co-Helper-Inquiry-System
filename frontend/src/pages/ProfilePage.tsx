import { useEffect, useState } from "react"
import { getMe, updateMe, type User } from "../api/users"
import {
  Box, Button, Card, Heading, Input, Spinner, Stack, Text,
} from "@chakra-ui/react"
import { Field } from "@/components/ui/field"

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState("")

  useEffect(() => {
    getMe()
      .then(setProfile)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateMe({ username })
      setProfile(updated)
      setUsername("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box p={10} maxW="1000px">
      <Heading mb={7} fontSize="1.5rem" fontWeight="800" letterSpacing="-0.03em" color="gray.900">
        Profile
      </Heading>

      <Card.Root border="1px solid" borderColor="gray.100" rounded="3xl" shadow="xs" maxW="480px">
        <Card.Body p={7}>
          <Heading fontSize="1rem" fontWeight="700" color="gray.900" mb={5}>
            Edit Profile
          </Heading>

          {loading ? (
            <Box display="flex" alignItems="center" gap={2}>
              <Spinner size="sm" color="orange.400" />
              <Text fontSize="sm" color="gray.500">Loading…</Text>
            </Box>
          ) : (
            <Stack gap={5}>
              <Box display="grid" gridTemplateColumns="auto 1fr" gap={3} alignItems="baseline">
                <Text fontSize="sm" color="gray.500" fontWeight="500" whiteSpace="nowrap">
                  Current username
                </Text>
                <Text fontSize="0.9375rem" color="gray.800" fontWeight="600">
                  {profile?.username ?? "—"}
                </Text>
              </Box>

              <Field label="New username">
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter new username"
                  borderColor="gray.200"
                  _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 3px rgba(255,161,78,0.15)" }}
                />
              </Field>

              <Button
                colorPalette="orange"
                alignSelf="flex-start"
                fontWeight="700"
                onClick={handleSave}
                disabled={!username || saving}
              >
                {saving ? <Spinner size="sm" /> : "Save changes"}
              </Button>
            </Stack>
          )}
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
