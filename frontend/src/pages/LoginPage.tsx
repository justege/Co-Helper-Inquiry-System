import { useNavigate, Link } from "react-router-dom"
import { Box, Button, Text, VStack } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { PasswordInput } from "@/components/ui/password-input"
import { FormInput, formInvalidBorder } from "@/components/ui/form-controls"
import { AuthShell } from "@/components/auth/AuthShell"
import { AuthDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons"
import { authFieldLabel, authInputProps, authPrimaryButtonProps } from "@/components/auth/authStyles"
import { useAuthContext } from "../components/auth/AuthContext"
import loginPng from "@/assets/login.png"

type LoginFields = { email: string; password: string }

export default function LoginPage() {
  const { loginWithEmail, loginWithGoogle } = useAuthContext()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>()

  async function onSubmit(data: LoginFields) {
    try {
      await loginWithEmail(data.email, data.password)
      navigate("/app/dashboard", { replace: true })
    } catch (err: unknown) {
      setError("root", { message: err instanceof Error ? err.message : "Login failed" })
    }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle()
      navigate("/app/dashboard", { replace: true })
    } catch (err: unknown) {
      setError("root", { message: err instanceof Error ? err.message : "Google login failed" })
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back to Co-Helper."
      promo={{
        tagline: "Outsource digital work with a project manager who delivers.",
        imageSrc: loginPng,
      }}
      footer={
        <>
          No account?{" "}
          <Link to="/register" style={{ color: "#0F6E56", fontWeight: "700" }}>
            Create one
          </Link>
        </>
      }
    >
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

        <Button type="submit" loading={isSubmitting} {...authPrimaryButtonProps}>
          Sign In
        </Button>
      </VStack>

      <AuthDivider />
      <SocialAuthButtons onGoogle={handleGoogle} disabled={isSubmitting} />
    </AuthShell>
  )
}
