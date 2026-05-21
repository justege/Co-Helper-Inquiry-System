import { useNavigate, Link } from "react-router-dom"
import { Box, Button, Input, Text, VStack } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { PasswordInput } from "@/components/ui/password-input"
import { AuthShell } from "@/components/auth/AuthShell"
import { AuthDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons"
import { authFieldLabel, authInputProps, authPrimaryButtonProps } from "@/components/auth/authStyles"
import { useAuthContext } from "../components/auth/AuthContext"
import { updateMe } from "../api/users"

type RegisterFields = {
  username: string
  email: string
  password: string
}

export default function RegisterPage() {
  const { registerWithEmail, loginWithGoogle } = useAuthContext()
  const navigate = useNavigate()

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
      navigate("/app/dashboard", { replace: true })
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Registration failed",
      })
    }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle()
      navigate("/app/dashboard", { replace: true })
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Google sign-up failed",
      })
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Get started with Boilerplate in under a minute."
      promo={{
        eyebrow: "Join developers",
        headline: "Ship your idea",
        highlight: "in hours, not weeks.",
        bullets: [
          "Email/password and Google sign-in ready",
          "Supabase Postgres with auto-created tables",
          "One command spins up frontend + backend",
        ],
        footer: "Free to use · Open source · MIT license",
      }}
      footer={
        <>
          Already have an account?{" "}
          <Box as={Link} to="/login" color="#4f77ff" fontWeight="700" _hover={{ textDecoration: "underline" }}>
            Sign In
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
          label={authFieldLabel("Username")}
          errorText={errors.username?.message}
          invalid={!!errors.username}
        >
          <Input
            type="text"
            placeholder="Choose a username"
            autoComplete="username"
            {...authInputProps}
            borderColor={errors.username ? "red.400" : authInputProps.borderColor}
            {...register("username")}
          />
        </Field>

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
            autoComplete="new-password"
            {...authInputProps}
            borderColor={errors.password ? "red.400" : authInputProps.borderColor}
            {...register("password", {
              required: "Password is required",
              minLength: { value: 6, message: "Password must be at least 6 characters" },
            })}
          />
        </Field>

        <Button type="submit" loading={isSubmitting} mt={1} {...authPrimaryButtonProps}>
          Create Account
        </Button>
      </VStack>

      <AuthDivider />
      <SocialAuthButtons onGoogle={handleGoogle} disabled={isSubmitting} />
    </AuthShell>
  )
}
