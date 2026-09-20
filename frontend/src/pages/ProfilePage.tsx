import { useEffect, useState } from "react"
import { getMe, updateMe, type User } from "../api/users"
import { Box, Grid, Spinner, Stack, Text } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { FormInput } from "@/components/ui/form-controls"
import { PageShell } from "@/components/ui/PageShell"
import { AppButton } from "@/components/ui/AppButton"
import {
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_CARD,
  APP_INK,
  APP_LABEL,
} from "@/components/ui/appUi"

type ProfileFields = {
  username: string
  firstName: string
  lastName: string
  companyName: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFields>({
    defaultValues: { username: "", firstName: "", lastName: "", companyName: "" },
  })

  useEffect(() => {
    getMe()
      .then((p) => {
        setProfile(p)
        reset({
          username: p.username ?? "",
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          companyName: p.companyName ?? "",
        })
      })
      .finally(() => setLoading(false))
  }, [reset])

  async function onSubmit(data: ProfileFields) {
    try {
      const next = await updateMe({
        username: data.username.trim() || undefined,
        firstName: data.firstName.trim() || undefined,
        lastName: data.lastName.trim() || undefined,
        companyName: data.companyName.trim() || undefined,
      })
      setProfile(next)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError("root", { message: e instanceof Error ? e.message : "Failed to save" })
    }
  }

  if (loading) {
    return (
      <PageShell eyebrow="Account" title="Profile">
        <Spinner />
      </PageShell>
    )
  }

  const filled = [profile?.username, profile?.firstName, profile?.lastName, profile?.companyName]
    .filter((value) => String(value || "").trim()).length

  return (
    <PageShell
      eyebrow="Account"
      title="Profile"
      stats={[
        { label: "Complete", value: `${filled}/4` },
        { label: "Name", value: [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "—" },
        { label: "Company", value: profile?.companyName || "—" },
        { label: "Username", value: profile?.username || "—" },
      ]}
    >
      <Box {...APP_CARD} overflow="hidden">
        <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
          <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>Personal details</Text>
        </Box>
        <Box p={5} as="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={5}>
            <Field label="Username">
              <FormInput {...register("username")} />
            </Field>
            <Field label="Company">
              <FormInput {...register("companyName")} />
            </Field>
            <Field label="First name">
              <FormInput {...register("firstName")} />
            </Field>
            <Field label="Last name">
              <FormInput {...register("lastName")} />
            </Field>
          </Grid>
          <Text fontSize="0.75rem" color={APP_LABEL} mt={4}>{profile?.email}</Text>
          {errors.root && <Text fontSize="sm" color="#B91C1C" mt={3}>{errors.root.message}</Text>}
          <Stack direction="row" align="center" gap={3} mt={5}>
            <AppButton type="submit" size="sm" loading={isSubmitting}>Save</AppButton>
            {saved && <Text fontSize="sm" color="#047857" fontWeight="600">Saved</Text>}
          </Stack>
        </Box>
      </Box>
    </PageShell>
  )
}
