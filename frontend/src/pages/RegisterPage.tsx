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
import { updateMe } from "../api/users"
import loginPng from "@/assets/login.png"

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
      subtitle="Join Co-Helper and start your first project today."
      promo={{
        tagline: "Digital services, managed for you — worldwide.",
        imageSrc: loginPng,
      }}
      footer={
        <>
          Already have an account?{" "}
          <Box as={Link} to="/login" color="#0F6E56" fontWeight="700" _hover={{ textDecoration: "underline" }}>
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

        <Button type="submit" loading={isSubmitting} mt={1} {...authPrimaryButtonProps}>
          Create Account
        </Button>
      </VStack>

      <AuthDivider />
      <SocialAuthButtons onGoogle={handleGoogle} disabled={isSubmitting} />
    </AuthShell>
  )
}
