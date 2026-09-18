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
import { acceptInvite } from "@/api/workspace"
import loginPng from "@/assets/login.png"
import { AppButton } from "@/components/ui/AppButton"


type LoginFields = { email: string; password: string }

export default function LoginPage() {
  const { loginWithEmail, loginWithGoogle } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const invite = searchParams.get("invite")

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>()

  async function afterAuth() {
    if (invite) {
      try { await acceptInvite(invite) } catch { /* invite may already be accepted */ }
    }
    navigate("/app", { replace: true })
  }

  async function onSubmit(data: LoginFields) {
    try {
      await loginWithEmail(data.email, data.password)
      await afterAuth()
    } catch (err: unknown) {
      setError("root", { message: err instanceof Error ? err.message : "Login failed" })
    }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle()
      await afterAuth()
    } catch (err: unknown) {
      setError("root", { message: err instanceof Error ? err.message : "Google login failed" })
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="See your jobs, agreed rates, and payments — all in one workspace."
      promo={{
        tagline: "You were invited here — every job, rate, and payment, in one place.",
        imageSrc: loginPng,
      }}
      footer={
        <>
          No account?{" "}
          <Link to="/register" style={{ color: "#0F6E56", fontWeight: "700" }}>
            Create one
          </Link>
          {" · "}
          <Link to="/partner/login" style={{ color: "#64748B", fontWeight: "600" }}>
            Run a one-person business?
          </Link>
        </>
      }
    >
      {invite && (
        <Box bg="#F0FAF5" border="1px solid #A7D7C5" rounded="10px" px={4} py={3} mb={5}>
          <Text fontSize="0.8125rem" color="#0F6E56" fontWeight="600">
            Sign in to accept your workspace invitation.
          </Text>
        </Box>
      )}

      {errors.root && (
        <Box bg="#FEF2F2" border="1px solid #FECACA" rounded="10px" px={4} py={3} mb={5}>
          <Text fontSize="sm" color="#B91C1C">{errors.root.message}</Text>
        </Box>
      )}

      <VStack as="form" onSubmit={handleSubmit(onSubmit)} gap={4} align="stretch">
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
            autoComplete="current-password"
            {...authInputProps}
            {...formInvalidBorder(!!errors.password)}
            {...register("password", { required: "Password is required" })}
          />
        </Field>

        <AppButton type="submit" size="lg" loading={isSubmitting} w="full">
          Sign In
        </AppButton>
      </VStack>

      <AuthDivider />
      <SocialAuthButtons onGoogle={handleGoogle} disabled={isSubmitting} />
    </AuthShell>
  )
}
