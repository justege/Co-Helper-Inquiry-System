import { useNavigate, Link } from "react-router-dom"
import { Box, Button, Input, Text, VStack } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { PasswordInput } from "@/components/ui/password-input"
import { AuthShell } from "@/components/auth/AuthShell"
import { AuthDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons"
import { authFieldLabel, authInputProps, authPrimaryButtonProps } from "@/components/auth/authStyles"
import { useAuthContext } from "../components/auth/AuthContext"

type LoginFields = {
  email: string
  password: string
}

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
      setError("root", {
        message: err instanceof Error ? err.message : "Login failed",
      })
    }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle()
      navigate("/app/dashboard", { replace: true })
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Google login failed",
      })
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back — enter your details to continue."
      promo={{
        eyebrow: "Welcome back",
        headline: "Start building",
        highlight: "faster today.",
        bullets: [
          "Firebase auth wired up out of the box",
          "REST API with Express + Supabase",
          "One command boots both servers",
        ],
        footer: "Firebase · Supabase · Express · React",
      }}
      footer={
        <>
          Don't have an account?{" "}
          <Box as={Link} to="/register" color="#4f77ff" fontWeight="700" _hover={{ textDecoration: "underline" }}>
            Sign Up
          </Box>
        </>
      }
    >
      {errors.root && (
        <Box bg="red.50" border="1px solid" borderColor="red.200" rounded="xl" px={4} py={3} mb={5}>
          <Text fontSize="sm" color="red.600">{errors.root.message}</Text>
        </Box>
      )}

      <VStack as="form" onSubmit={handleSubmit(onSubmit)} gap={4} align="stretch">
        <Field
          label={authFieldLabel("Email", true)}
          errorText={errors.email?.message}
          invalid={!!errors.email}
        >
          <Input
            type="email"
            autoComplete="email"
            {...authInputProps}
            borderColor={errors.email ? "red.400" : authInputProps.borderColor}
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
            autoComplete="current-password"
            {...authInputProps}
            borderColor={errors.password ? "red.400" : authInputProps.borderColor}
            {...register("password", { required: "Password is required" })}
          />
        </Field>

        <Button type="submit" loading={isSubmitting} {...authPrimaryButtonProps}>
          Sign-in
        </Button>
      </VStack>

      <AuthDivider />
      <SocialAuthButtons onGoogle={handleGoogle} disabled={isSubmitting} />
    </AuthShell>
  )
}
