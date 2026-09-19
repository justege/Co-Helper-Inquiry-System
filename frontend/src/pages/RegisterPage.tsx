import { useEffect, useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { Box, Text, VStack } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { PasswordInput } from "@/components/ui/password-input"
import { FormInput, formInvalidBorder } from "@/components/ui/form-controls"
import { AuthShell } from "@/components/auth/AuthShell"
import { AuthDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons"
import { authFieldLabel, authInputProps } from "@/components/auth/authStyles"
import { useAuthContext } from "../components/auth/AuthContext"
import { updateMe } from "../api/users"
import { acceptInvite, getInvitePreview } from "@/api/workspace"
import loginPng from "@/assets/login.png"
import { AppButton } from "@/components/ui/AppButton"


type RegisterFields = {
  username: string
  email: string
  password: string
}

export default function RegisterPage() {
  const { registerWithEmail, loginWithGoogle } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const invite = searchParams.get("invite")
  const [freelancerLabel, setFreelancerLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!invite) return
    getInvitePreview(invite)
      .then((p) => {
        const f = p.freelancer
        const name = f ? [f.firstName, f.lastName].filter(Boolean).join(" ") || f.companyName || f.username : null
        setFreelancerLabel(name)
      })
      .catch(() => null)
  }, [invite])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFields>()

  async function onSubmit(data: RegisterFields) {
    try {
      await registerWithEmail(data.email, data.password)
      if (data.username.trim()) {
        await updateMe({ username: data.username.trim() })
      }
      if (invite) {
        try { await acceptInvite(invite) } catch { /* invite may already be accepted */ }
      }
      navigate("/app", { replace: true })
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Registration failed",
      })
    }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle()
      if (invite) {
        try { await acceptInvite(invite) } catch { /* invite may already be accepted */ }
      }
      navigate("/app", { replace: true })
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Google sign-up failed",
      })
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="You were invited to Co-Helper — set up your account to join the workspace."
      promo={{
        tagline: "One shared workspace with the one-person business you work with — jobs, rates, and payments in one place.",
        imageSrc: loginPng,
      }}
      footer={
        <>
          Already have an account?{" "}
          <Box as={Link} to="/login" color="#0F6E56" fontWeight="700" _hover={{ textDecoration: "underline" }}>
            Sign In
          </Box>
          {" · "}
          <Box as={Link} to="/partner/register" color="#64748B" fontWeight="600" _hover={{ textDecoration: "underline" }}>
            Run a one-person business?
          </Box>
        </>
      }
    >
      {invite && (
        <Box bg="#F0FAF5" border="1px solid #A7D7C5" rounded="xl" px={4} py={3} mb={5}>
          <Text fontSize="0.8125rem" color="#0F6E56" fontWeight="600">
            {freelancerLabel ? `${freelancerLabel} invited you` : "You were invited"} — create your
            account to join.
          </Text>
        </Box>
      )}

      {errors.root && (
        <Box bg="red.50" border="1px solid" borderColor="red.200" rounded="xl" px={4} py={3} mb={5}>
          <Text fontSize="sm" color="red.600">{errors.root.message}</Text>
        </Box>
      )}

      <VStack as="form" onSubmit={handleSubmit(onSubmit)} gap={4} align="stretch">
        <Field
          label={authFieldLabel("Username")}
          errorText={errors.username?.message}
          invalid={!!errors.username}
        >
          <FormInput
            type="text"
            placeholder="Choose a username"
            autoComplete="username"
            {...authInputProps}
            {...formInvalidBorder(!!errors.username)}
            {...register("username")}
          />
        </Field>

        <Field
          label={authFieldLabel("Email", true)}
          errorText={errors.email?.message}
          invalid={!!errors.email}
        >
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

        <Field
          label={authFieldLabel("Password", true)}
          errorText={errors.password?.message}
          invalid={!!errors.password}
        >
          <PasswordInput
            autoComplete="new-password"
            {...authInputProps}
            {...formInvalidBorder(!!errors.password)}
            {...register("password", {
              required: "Password is required",
              minLength: { value: 6, message: "Password must be at least 6 characters" },
            })}
          />
        </Field>

        <AppButton type="submit" size="lg" loading={isSubmitting} w="full">
          Create Account
        </AppButton>
      </VStack>

      <AuthDivider />
      <SocialAuthButtons onGoogle={handleGoogle} disabled={isSubmitting} />
    </AuthShell>
  )
}
