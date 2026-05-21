import { useEffect, useState } from "react"
import { getMe, updateMe, type User } from "../api/users"
import {
  Box, Button, Card, Heading, Input, Spinner, Stack, Text,
} from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"

type ProfileFields = {
  username: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFields>({ defaultValues: { username: "" } })

  useEffect(() => {
    getMe()
      .then(setProfile)
      .finally(() => setLoading(false))
  }, [])

  async function onSubmit(data: ProfileFields) {
    const updated = await updateMe({ username: data.username })
    setProfile(updated)
    reset({ username: "" })
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
            <Stack as="form" onSubmit={handleSubmit(onSubmit)} gap={5}>
              <Box display="grid" gridTemplateColumns="auto 1fr" gap={3} alignItems="baseline">
                <Text fontSize="sm" color="gray.500" fontWeight="500" whiteSpace="nowrap">
                  Current username
                </Text>
                <Text fontSize="0.9375rem" color="gray.800" fontWeight="600">
                  {profile?.username ?? "—"}
                </Text>
              </Box>

              <Field
                label="New username"
                errorText={errors.username?.message}
                invalid={!!errors.username}
              >
                <Input
                  type="text"
                  placeholder="Enter new username"
                  borderColor={errors.username ? "red.400" : "gray.200"}
                  _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 3px rgba(255,161,78,0.15)" }}
                  {...register("username", { required: "Username is required" })}
                />
              </Field>

              <Button
                type="submit"
                colorPalette="orange"
                alignSelf="flex-start"
                fontWeight="700"
                loading={isSubmitting}
                disabled={!isDirty}
              >
                Save changes
              </Button>
            </Stack>
          )}
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
