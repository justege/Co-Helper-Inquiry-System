import { useEffect, useState } from "react"
import { getMe, updateMe, type User } from "../api/users"
import { getMyExpertProfile, updateMyExpertProfile } from "../api/expertProfile"
import { api } from "../lib/api"
import { Box, Button, Fieldset, Grid, Spinner, Stack, Text } from "@chakra-ui/react"
import { Switch } from "@/components/ui/switch"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { FormInput, FormNativeSelect, FormTextarea } from "@/components/ui/form-controls"
import { PageShell } from "@/components/ui/PageShell"
import {
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_BTN_PRIMARY,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
} from "@/components/ui/appUi"

type ProfileFields = {
  username: string
  firstName: string
  lastName: string
  companyName: string
}

type PartnerFields = {
  phone: string
  contactPref: string
  bio: string
  locationCity: string
  capacityNotes: string
  isAvailable: boolean
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [partnerSaved, setPartnerSaved] = useState(false)
  const [partnerLoading, setPartnerLoading] = useState(false)

  const personalForm = useForm<ProfileFields>({
    defaultValues: { username: "", firstName: "", lastName: "", companyName: "" },
  })

  const partnerForm = useForm<PartnerFields>({
    defaultValues: {
      phone: "",
      contactPref: "email",
      bio: "",
      locationCity: "Remote",
      capacityNotes: "",
      isAvailable: true,
    },
  })

  const isExpert = profile?.role === "expert"

  useEffect(() => {
    getMe()
      .then((p) => {
        setProfile(p)
        personalForm.reset({
          username: p.username ?? "",
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          companyName: p.companyName ?? "",
        })
        if (p.role === "expert") {
          setPartnerLoading(true)
          Promise.all([
            api.get<{ phone: string | null; contactPref: string }>("/api/team/contact").catch(() => ({ phone: p.phone ?? null, contactPref: p.contactPref ?? "email" })),
            getMyExpertProfile(),
          ])
            .then(([contact, expertProfile]) => {
              partnerForm.reset({
                phone: contact.phone ?? "",
                contactPref: contact.contactPref ?? "email",
                bio: expertProfile.bio ?? "",
                locationCity: expertProfile.locationCity ?? "Remote",
                capacityNotes: expertProfile.capacityNotes ?? "",
                isAvailable: expertProfile.isAvailable ?? true,
              })
            })
            .finally(() => setPartnerLoading(false))
        }
      })
      .finally(() => setLoading(false))
  }, [personalForm, partnerForm])

  async function onPersonalSubmit(data: ProfileFields) {
    const updated = await updateMe({
      username: data.username || undefined,
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
      companyName: data.companyName || undefined,
    })
    setProfile(updated)
    personalForm.reset({
      username: updated.username ?? "",
      firstName: updated.firstName ?? "",
      lastName: updated.lastName ?? "",
      companyName: updated.companyName ?? "",
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function onPartnerSubmit(data: PartnerFields) {
    await Promise.all([
      updateMe({ companyName: personalForm.getValues("companyName") || undefined }),
      api.put("/api/team/contact", {
        phone: data.phone || null,
        contactPref: data.contactPref,
      }),
      updateMyExpertProfile({
        bio: data.bio,
        locationCity: data.locationCity,
        capacityNotes: data.capacityNotes,
        isAvailable: data.isAvailable,
      }),
    ])
    const updated = await getMe()
    setProfile(updated)
    setPartnerSaved(true)
    setTimeout(() => setPartnerSaved(false), 2500)
  }

  return (
    <PageShell
      eyebrow="Account"
      title={isExpert ? "Partner profile" : "Your profile"}
      subtitle={
        isExpert
          ? "Manage your company details and partner information"
          : profile?.companyName ?? "Manage your personal information"
      }
    >
      {loading ? (
        <Box display="flex" alignItems="center" gap={2} py={6}>
          <Spinner size="sm" color="gray.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      ) : (
        <Stack gap={5}>
          <Grid templateColumns={{ base: "1fr", lg: "260px 1fr" }} gap={5} alignItems="start">
            <Box {...APP_CARD} overflow="hidden">
              <Box px={5} py={3} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
                <Text fontSize="0.6875rem" fontWeight="600" color={APP_LABEL} letterSpacing="0.06em" textTransform="uppercase">
                  Account
                </Text>
              </Box>
              <Stack gap={0}>
                <InfoRow label="Email" value={profile?.email ?? "—"} />
                <InfoRow label="Role" value={profile?.role ?? "client"} />
                {profile?.categories && profile.categories.length > 0 && (
                  <Box px={5} py={4}>
                    <Text fontSize="0.6875rem" color={APP_LABEL} fontWeight="500" mb={2} textTransform="uppercase" letterSpacing="0.04em">
                      Categories
                    </Text>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      {profile.categories.map((cat) => (
                        <Text key={cat.id} fontSize="0.8125rem" color={APP_MUTED}>{cat.name}</Text>
                      ))}
                    </Box>
                  </Box>
                )}
              </Stack>
            </Box>

            <Box
              as="form"
              onSubmit={personalForm.handleSubmit(onPersonalSubmit)}
              {...APP_CARD}
              p={{ base: 5, md: 6 }}
            >
              <Text fontSize="0.6875rem" fontWeight="600" color={APP_LABEL} letterSpacing="0.06em" textTransform="uppercase" mb={5}>
                Personal details
              </Text>
              <Fieldset.Root>
                <Fieldset.Content>
                  <Stack gap={4}>
                    <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4}>
                      <Field label="First name">
                        <FormInput type="text" placeholder="First name" {...personalForm.register("firstName")} />
                      </Field>
                      <Field label="Last name">
                        <FormInput type="text" placeholder="Last name" {...personalForm.register("lastName")} />
                      </Field>
                    </Grid>
                    <Field label="Username">
                      <FormInput type="text" placeholder="Choose a username" {...personalForm.register("username")} />
                    </Field>
                    {!isExpert && (
                      <Field label="Company / organisation" helperText="Your company or factory name.">
                        <FormInput type="text" placeholder="e.g. Anadolu Tekstil A.Ş." {...personalForm.register("companyName")} />
                      </Field>
                    )}
                  </Stack>
                </Fieldset.Content>
              </Fieldset.Root>
              <Box display="flex" alignItems="center" gap={3} mt={6} pt={5} borderTop={`1px solid ${APP_BORDER}`}>
                <Button
                  type="submit"
                  {...APP_BTN_PRIMARY}
                  loading={personalForm.formState.isSubmitting}
                  disabled={!personalForm.formState.isDirty}
                  _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
                >
                  Save personal details
                </Button>
                {saved && <Text fontSize="sm" color={APP_MUTED} fontWeight="500">Saved</Text>}
              </Box>
            </Box>
          </Grid>

          {isExpert && (
            <Box
              as="form"
              onSubmit={partnerForm.handleSubmit(onPartnerSubmit)}
              {...APP_CARD}
              p={{ base: 5, md: 6 }}
            >
              <Text fontSize="0.6875rem" fontWeight="600" color={APP_LABEL} letterSpacing="0.06em" textTransform="uppercase" mb={1}>
                Company & partner details
              </Text>
              <Text fontSize="0.8125rem" color={APP_MUTED} mb={5}>
                This information is visible to administrators when reviewing your partner profile.
              </Text>

              {partnerLoading ? (
                <Box display="flex" alignItems="center" gap={2} py={4}>
                  <Spinner size="sm" color="gray.500" />
                  <Text fontSize="sm" color={APP_MUTED}>Loading partner details…</Text>
                </Box>
              ) : (
                <Stack gap={4}>
                  <Field label="Company name" helperText="Your business or factory name as shown to clients and admins.">
                    <FormInput
                      type="text"
                      placeholder="e.g. Anadolu Tekstil A.Ş."
                      {...personalForm.register("companyName")}
                    />
                  </Field>

                  <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4}>
                    <Field label="Phone">
                      <FormInput type="tel" placeholder="+1 555 000 0000" {...partnerForm.register("phone")} />
                    </Field>
                    <Field label="Preferred contact">
                      <FormNativeSelect {...partnerForm.register("contactPref")}>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="both">Email & phone</option>
                      </FormNativeSelect>
                    </Field>
                  </Grid>

                  <Field label="Location">
                    <FormInput type="text" placeholder="City" {...partnerForm.register("locationCity")} />
                  </Field>

                  <Field label="About your company">
                    <FormTextarea
                      rows={4}
                      placeholder="Describe your capabilities, experience, and specialisations…"
                      {...partnerForm.register("bio")}
                    />
                  </Field>

                  <Field label="Capacity notes" helperText="Lead times, minimum order quantities, or current availability.">
                    <FormTextarea
                      rows={3}
                      placeholder="e.g. 2-week lead time, MOQ 500 units…"
                      {...partnerForm.register("capacityNotes")}
                    />
                  </Field>

                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={4} p={4} border={`1px solid ${APP_BORDER}`} borderRadius="8px" bg={APP_BG_SUBTLE}>
                    <Box>
                      <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>Available for new work</Text>
                      <Text fontSize="0.8125rem" color={APP_MUTED} mt={0.5}>
                        Turn off when you cannot take on new inquiries.
                      </Text>
                    </Box>
                    <Switch
                      checked={partnerForm.watch("isAvailable")}
                      onCheckedChange={(e) => partnerForm.setValue("isAvailable", e.checked, { shouldDirty: true })}
                      inputProps={partnerForm.register("isAvailable")}
                    />
                  </Box>
                </Stack>
              )}

              <Box display="flex" alignItems="center" gap={3} mt={6} pt={5} borderTop={`1px solid ${APP_BORDER}`}>
                <Button
                  type="submit"
                  {...APP_BTN_PRIMARY}
                  loading={partnerForm.formState.isSubmitting}
                  disabled={!partnerForm.formState.isDirty && !personalForm.formState.isDirty}
                  _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
                >
                  Save company details
                </Button>
                {partnerSaved && <Text fontSize="sm" color={APP_MUTED} fontWeight="500">Saved</Text>}
              </Box>
            </Box>
          )}
        </Stack>
      )}
    </PageShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box display="flex" alignItems="baseline" justifyContent="space-between" px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`}>
      <Text fontSize="0.875rem" color={APP_LABEL} fontWeight="500">{label}</Text>
      <Text fontSize="0.875rem" color={APP_INK} fontWeight="500" textTransform="capitalize">{value}</Text>
    </Box>
  )
}
