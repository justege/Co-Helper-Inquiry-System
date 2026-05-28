import { useEffect, useMemo, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { PasswordInput } from "@/components/ui/password-input"
import {
  FormInput,
  FormNativeSelect,
  FormTextarea,
  formInvalidBorder,
} from "@/components/ui/form-controls"
import { MultiSelectPopover } from "@/components/ui/multi-select-popover"
import { AuthShell } from "@/components/auth/AuthShell"
import { AuthDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons"
import { authFieldLabel, authInputProps, authPrimaryButtonProps } from "@/components/auth/authStyles"
import { useAuthContext } from "../components/auth/AuthContext"
import { getPublicCategories } from "../api/categories"
import {
  getPublicCategoryServices,
  submitPartnerRegistration,
  type CategoryService,
  type PartnerServiceInput,
} from "../api/partners"
import { auth } from "../lib/firebase"
import loginPng from "@/assets/login.png"

type RegisterFields = {
  username: string
  email: string
  password: string
  companyName: string
  bio: string
  locationCity: string
}

const UNITS = ["project", "hour", "day", "piece"]
const TOTAL_STEPS = 3

const STEPS_META = [
  { n: 1, title: "Create your account", sub: "Set up credentials for your partner profile." },
  { n: 2, title: "About your practice", sub: "Share a bit about your team and where you work." },
  { n: 3, title: "Your expertise", sub: "Pick categories and services you deliver." },
]

function StepIndicator({ step }: { step: number }) {
  return (
    <Box mb={6}>
      <Flex justify="space-between" position="relative" mb={3}>
        <Box
          position="absolute"
          top="14px"
          left="14px"
          right="14px"
          h="2px"
          bg="#E2E8F0"
          zIndex={0}
        />
        <Box
          position="absolute"
          top="14px"
          left="14px"
          h="2px"
          bg="#0F6E56"
          zIndex={1}
          transition="width 0.35s ease"
          w={`calc((100% - 28px) * ${(step - 1) / (TOTAL_STEPS - 1)})`}
        />
        {STEPS_META.map((s) => {
          const done = step > s.n
          const current = step === s.n
          return (
            <Flex key={s.n} flexDir="column" align="center" gap={2} position="relative" zIndex={2}>
              <Box
                w="28px"
                h="28px"
                borderRadius="full"
                bg={done || current ? "#0F6E56" : "white"}
                border="2px solid"
                borderColor={done || current ? "#0F6E56" : "#CBD5E1"}
                display="flex"
                alignItems="center"
                justifyContent="center"
                transition="all 0.25s"
                boxShadow={current ? "0 0 0 4px rgba(15,110,86,0.15)" : "none"}
              >
                {done ? (
                  <Text fontSize="0.75rem" color="white" fontWeight="700">✓</Text>
                ) : (
                  <Text
                    fontSize="0.6875rem"
                    color={current ? "white" : "#94A3B8"}
                    fontWeight="700"
                  >
                    {s.n}
                  </Text>
                )}
              </Box>
              <Text
                fontSize="0.625rem"
                fontWeight="600"
                color={current || done ? "#475569" : "#94A3B8"}
                letterSpacing="0.05em"
                textTransform="uppercase"
                display={{ base: "none", sm: "block" }}
              >
                {s.n === 1 ? "Account" : s.n === 2 ? "Profile" : "Expertise"}
              </Text>
            </Flex>
          )
        })}
      </Flex>
      <Text fontSize="1rem" fontWeight="700" color="#0D1B2E" letterSpacing="-0.02em">
        {STEPS_META[step - 1].title}
      </Text>
      <Text fontSize="0.8125rem" color="#94A3B8" mt={0.5}>
        {STEPS_META[step - 1].sub}
      </Text>
    </Box>
  )
}

export default function PartnerRegisterPage() {
  const { registerWithEmail, loginWithGoogle } = useAuthContext()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [visible, setVisible] = useState(true)
  const [googleSignedIn, setGoogleSignedIn] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string; description: string | null }[]>([])
  const [catalog, setCatalog] = useState<CategoryService[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<Record<string, PartnerServiceInput>>({})
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [expertiseError, setExpertiseError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFields>({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      companyName: "",
      bio: "",
      locationCity: "Remote",
    },
  })

  useEffect(() => {
    Promise.all([
      getPublicCategories({ type: "service" }),
      getPublicCategoryServices(),
    ])
      .then(([cats, services]) => {
        setCategories(cats)
        setCatalog(services)
      })
      .catch(() => setLoadErr("Could not load service categories. Please refresh and try again."))
  }, [])

  const catalogByCategory = useMemo(() => {
    const map = new Map<string, CategoryService[]>()
    for (const item of catalog) {
      const list = map.get(item.categoryId) ?? []
      list.push(item)
      map.set(item.categoryId, list)
    }
    return map
  }, [catalog])

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat.id,
        label: cat.name,
        description: cat.description,
      })),
    [categories]
  )

  function fadeToStep(next: number) {
    setVisible(false)
    setTimeout(() => {
      setStep(next)
      setVisible(true)
    }, 180)
  }

  function setCategorySelection(nextIds: string[]) {
    const removed = selectedCategoryIds.filter((id) => !nextIds.includes(id))
    if (removed.length > 0) {
      setSelectedServices((services) => {
        const next = { ...services }
        for (const key of Object.keys(next)) {
          if (removed.includes(next[key].categoryId)) delete next[key]
        }
        return next
      })
    }
    setSelectedCategoryIds(nextIds)
    if (nextIds.length > 0) setExpertiseError(null)
  }

  function setServicesForCategory(categoryId: string, serviceIds: string[]) {
    const items = catalogByCategory.get(categoryId) ?? []
    setSelectedServices((prev) => {
      const next = { ...prev }
      for (const item of items) {
        if (serviceIds.includes(item.id)) {
          next[item.id] = next[item.id] ?? {
            categoryId: item.categoryId,
            title: item.name,
            description: item.description,
            priceUnit: "project",
            currency: "EUR",
          }
        } else {
          delete next[item.id]
        }
      }
      return next
    })
  }

  function updateServiceField(
    serviceId: string,
    field: keyof PartnerServiceInput,
    value: string
  ) {
    setSelectedServices((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]:
          field === "priceFrom" || field === "priceTo"
            ? value
              ? Number(value)
              : null
            : value,
      },
    }))
  }

  async function handleContinue() {
    clearErrors("root")
    if (step === 1) {
      const fields: (keyof RegisterFields)[] = googleSignedIn
        ? ["username"]
        : ["username", "email", "password"]
      const ok = await trigger(fields)
      if (ok) fadeToStep(2)
      return
    }
    if (step === 2) {
      fadeToStep(3)
    }
  }

  async function completeRegistration(data: RegisterFields) {
    if (selectedCategoryIds.length === 0) {
      setExpertiseError("Select at least one category you specialize in.")
      return
    }

    const services = Object.values(selectedServices).map((svc) => ({
      ...svc,
      priceFrom: svc.priceFrom != null ? Number(svc.priceFrom) : null,
      priceTo: svc.priceTo != null ? Number(svc.priceTo) : null,
    }))

    const token = await auth?.currentUser?.getIdToken()
    if (!token) throw new Error("Authentication failed — please try again.")

    await submitPartnerRegistration(
      {
        username: data.username.trim(),
        companyName: data.companyName.trim() || undefined,
        bio: data.bio.trim() || undefined,
        locationCity: data.locationCity.trim() || "Remote",
        categoryIds: selectedCategoryIds,
        services,
      },
      token
    )

    navigate("/app/partner-services", { replace: true })
  }

  async function onSubmit(data: RegisterFields) {
    try {
      setExpertiseError(null)
      if (!auth?.currentUser) {
        await registerWithEmail(data.email, data.password)
      }
      await completeRegistration(data)
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Registration failed",
      })
    }
  }

  async function handleGoogle() {
    try {
      clearErrors("root")
      await loginWithGoogle()
      const user = auth?.currentUser
      setGoogleSignedIn(true)
      setValue("username", user?.displayName ?? user?.email?.split("@")[0] ?? "partner")
      setValue("email", user?.email ?? "")
      setValue("password", "")
      fadeToStep(2)
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Google sign-up failed",
      })
    }
  }

  return (
    <AuthShell
      layout="centered"
      wide
      title="Join as a specialist"
      subtitle="Create your partner account, pick your categories, and list the services you deliver."
      promo={{
        tagline: "Get matched to scoped digital projects with a Co-Helper PM on every engagement.",
        imageSrc: loginPng,
      }}
      footer={
        <>
          Already verified?{" "}
          <Link to="/partner/login" style={{ color: "#0F6E56", fontWeight: "700" }}>
            Partner sign in
          </Link>
          {" · "}
          <Link to="/register" style={{ color: "#64748B", fontWeight: "600" }}>
            Client signup
          </Link>
        </>
      }
    >
      {loadErr && (
        <Box bg="#FEF2F2" border="1px solid #FECACA" rounded="10px" px={4} py={3} mb={5}>
          <Text fontSize="sm" color="#B91C1C">{loadErr}</Text>
        </Box>
      )}

      {errors.root && (
        <Box bg="#FEF2F2" border="1px solid #FECACA" rounded="10px" px={4} py={3} mb={5}>
          <Text fontSize="sm" color="#B91C1C">{errors.root.message}</Text>
        </Box>
      )}

      <StepIndicator step={step} />

      <Box
        as="form"
        onSubmit={handleSubmit(onSubmit)}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.22s ease, transform 0.22s ease",
        }}
      >
        {step === 1 && (
          <Stack gap={4}>
            <Field label={authFieldLabel("Username", true)} errorText={errors.username?.message} invalid={!!errors.username}>
              <FormInput
                type="text"
                placeholder="Your public name"
                autoComplete="username"
                {...authInputProps}
                {...formInvalidBorder(!!errors.username)}
                {...register("username", { required: "Username is required", minLength: { value: 2, message: "At least 2 characters" } })}
              />
            </Field>

            {!googleSignedIn && (
              <>
                <Field label={authFieldLabel("Email", true)} errorText={errors.email?.message} invalid={!!errors.email}>
                  <FormInput
                    type="email"
                    autoComplete="email"
                    {...authInputProps}
                    {...formInvalidBorder(!!errors.email)}
                    {...register("email", {
                      required: "Email is required",
                      pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
                    })}
                  />
                </Field>

                <Field label={authFieldLabel("Password", true)} errorText={errors.password?.message} invalid={!!errors.password}>
                  <PasswordInput
                    autoComplete="new-password"
                    {...authInputProps}
                    {...formInvalidBorder(!!errors.password)}
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 6, message: "At least 6 characters" },
                    })}
                  />
                </Field>
              </>
            )}

            {googleSignedIn && (
              <Box p={3} bg="#F0FAF5" border="1px solid #A7D7C5" borderRadius="10px">
                <Text fontSize="0.8125rem" color="#0F6E56" fontWeight="600">
                  Signed in with Google — continue to complete your profile.
                </Text>
              </Box>
            )}
          </Stack>
        )}

        {step === 2 && (
          <Stack gap={4}>
            <Field label={authFieldLabel("Company / studio name")}>
              <FormInput type="text" placeholder="Optional" {...authInputProps} {...register("companyName")} />
            </Field>

            <Field label={authFieldLabel("Location")}>
              <FormInput type="text" placeholder="Remote" {...authInputProps} {...register("locationCity")} />
            </Field>

            <Field label={authFieldLabel("About your practice")}>
              <FormTextarea rows={4} placeholder="Brief overview of your team, experience, and delivery style…" {...register("bio")} />
            </Field>
          </Stack>
        )}

        {step === 3 && (
          <Stack gap={5}>
            <Box>
              <Field
                label={authFieldLabel("Service categories", true)}
                helperText="Select every area you can deliver."
                errorText={expertiseError ?? undefined}
                invalid={!!expertiseError}
              >
                <MultiSelectPopover
                  options={categoryOptions}
                  value={selectedCategoryIds}
                  onChange={setCategorySelection}
                  placeholder="Select categories…"
                  invalid={!!expertiseError}
                />
              </Field>
            </Box>

            {selectedCategoryIds.map((categoryId) => {
              const category = categories.find((c) => c.id === categoryId)
              const items = catalogByCategory.get(categoryId) ?? []
              const selectedIds = items
                .filter((item) => Boolean(selectedServices[item.id]))
                .map((item) => item.id)

              const serviceOptions = items.map((item) => ({
                value: item.id,
                label: item.name,
                description: item.description,
                badge: !item.isLive ? (
                  <Badge bg="#EFF2F8" color="#64748B" rounded="full" px={2} fontSize="0.6rem">
                    Soon
                  </Badge>
                ) : undefined,
              }))

              return (
                <Box key={categoryId} p={4} border="1px solid #E2E8F0" borderRadius="12px" bg="#FAFBFD">
                  <Text fontSize="0.875rem" fontWeight="700" color="#0D1B2E" mb={3}>
                    {category?.name} services
                  </Text>

                  <MultiSelectPopover
                    options={serviceOptions}
                    value={selectedIds}
                    onChange={(ids) => setServicesForCategory(categoryId, ids)}
                    placeholder={`Select ${category?.name?.toLowerCase() ?? "category"} services…`}
                    emptyMessage="No catalog services in this category yet."
                  />

                  {selectedIds.length > 0 && (
                    <Stack gap={3} mt={4}>
                      {selectedIds.map((serviceId) => {
                        const item = items.find((i) => i.id === serviceId)
                        const svc = selectedServices[serviceId]
                        if (!item || !svc) return null
                        return (
                          <Box key={serviceId} p={3} bg="white" border="1px solid #E2E8F0" borderRadius="10px">
                            <Text fontSize="0.8125rem" fontWeight="600" color="#0D1B2E" mb={3}>
                              {item.name}
                            </Text>
                            <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={3}>
                              <Box>
                                <Text fontSize="0.6875rem" fontWeight="700" color="#64748B" mb={1}>Price from</Text>
                                <FormInput
                                  size="sm"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={svc.priceFrom ?? ""}
                                  onChange={(e) => updateServiceField(serviceId, "priceFrom", e.target.value)}
                                />
                              </Box>
                              <Box>
                                <Text fontSize="0.6875rem" fontWeight="700" color="#64748B" mb={1}>Price to</Text>
                                <FormInput
                                  size="sm"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={svc.priceTo ?? ""}
                                  onChange={(e) => updateServiceField(serviceId, "priceTo", e.target.value)}
                                />
                              </Box>
                              <Box>
                                <Text fontSize="0.6875rem" fontWeight="700" color="#64748B" mb={1}>Unit</Text>
                                <FormNativeSelect
                                  selectSize="sm"
                                  value={svc.priceUnit ?? "project"}
                                  onChange={(e) => updateServiceField(serviceId, "priceUnit", e.target.value)}
                                >
                                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                </FormNativeSelect>
                              </Box>
                              <Box>
                                <Text fontSize="0.6875rem" fontWeight="700" color="#64748B" mb={1}>Notes</Text>
                                <FormInput
                                  size="sm"
                                  placeholder="Optional delivery notes"
                                  value={svc.description ?? ""}
                                  onChange={(e) => updateServiceField(serviceId, "description", e.target.value)}
                                />
                              </Box>
                            </Grid>
                          </Box>
                        )
                      })}
                    </Stack>
                  )}
                </Box>
              )
            })}

            <Button type="submit" loading={isSubmitting} {...authPrimaryButtonProps}>
              Create partner account
            </Button>
          </Stack>
        )}
      </Box>

      <Flex align="center" justify="space-between" mt={7} pt={5} borderTop="1px solid #E2E8F0">
        {step > 1 ? (
          <Button
            variant="ghost"
            fontSize="0.875rem"
            fontWeight="600"
            color="#64748B"
            px={0}
            h="auto"
            py={0}
            _hover={{ color: "#0D1B2E" }}
            onClick={() => fadeToStep(step - 1)}
          >
            ← Back
          </Button>
        ) : (
          <Box />
        )}

        <Text fontSize="0.8125rem" color="#94A3B8" fontWeight="500">
          Step {step} of {TOTAL_STEPS}
        </Text>

        {step < TOTAL_STEPS ? (
          <Button
            fontSize="0.875rem"
            fontWeight="700"
            bg="#0D1B2E"
            color="white"
            px={5}
            h="40px"
            borderRadius="8px"
            _hover={{ bg: "#1a2d45" }}
            onClick={handleContinue}
          >
            Continue →
          </Button>
        ) : (
          <Box />
        )}
      </Flex>

      {step === 1 && !googleSignedIn && (
        <>
          <AuthDivider />
          <SocialAuthButtons onGoogle={handleGoogle} disabled={isSubmitting} />
        </>
      )}
    </AuthShell>
  )
}
