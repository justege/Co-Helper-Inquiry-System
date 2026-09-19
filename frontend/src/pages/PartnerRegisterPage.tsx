import { useNavigate, Link } from "react-router-dom"
import { Box, Text, VStack } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { PasswordInput } from "@/components/ui/password-input"
import { FormInput, formInvalidBorder } from "@/components/ui/form-controls"
import { AuthShell } from "@/components/auth/AuthShell"
import { AuthDivider, SocialAuthButtons } from "@/components/auth/SocialAuthButtons"
import { authFieldLabel, authInputProps } from "@/components/auth/authStyles"
import { useAuthContext } from "../components/auth/AuthContext"
import { submitPartnerRegistration } from "../api/partners"
import { auth } from "../lib/firebase"
import loginPng from "@/assets/login.png"
import { AppButton } from "@/components/ui/AppButton"

type RegisterFields = {
  username: string
  email: string
  password: string
  companyName: string
}

export default function PartnerRegisterPage() {
  const { registerWithEmail, loginWithGoogle } = useAuthContext()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFields>()

  async function completeWorkspace(username: string, companyName: string) {
    const token = await auth?.currentUser?.getIdToken()
    if (!token) throw new Error("Not signed in")
    await submitPartnerRegistration({ username, companyName }, token)
  }

  async function onSubmit(data: RegisterFields) {
    try {
      await registerWithEmail(data.email, data.password)
      await completeWorkspace(data.username.trim(), data.companyName.trim())
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
      const values = getValues()
      await completeWorkspace(
        values.username?.trim() || auth?.currentUser?.displayName || "studio",
        values.companyName?.trim() || ""
      )
      navigate("/app", { replace: true })
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Google sign-up failed",
      })
    }
  }

  return (
    <AuthShell
      title="Start your workspace"
      subtitle="Create an account for your one-person business. Invite clients and collaborators next."
      promo={{
        tagline: "A private workspace for you, your clients, and the people you bring onto a project.",
        imageSrc: loginPng,
      }}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/partner/login" style={{ color: "#0F6E56", fontWeight: 700 }}>
            Sign In
          </Link>
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
          label={authFieldLabel("Username", true)}
          errorText={errors.username?.message}
          invalid={!!errors.username}
        >
          <FormInput
            type="text"
            placeholder="studio"
            autoComplete="username"
            {...authInputProps}
            {...formInvalidBorder(!!errors.username)}
            {...register("username", { required: "Username is required", minLength: { value: 2, message: "At least 2 characters" } })}
          />
        </Field>

        <Field label={authFieldLabel("Company")} errorText={errors.companyName?.message} invalid={!!errors.companyName}>
          <FormInput
            type="text"
            placeholder="Optional"
            {...authInputProps}
            {...register("companyName")}
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
          Create workspace
        </AppButton>
      </VStack>

      <AuthDivider />
      <SocialAuthButtons onGoogle={handleGoogle} disabled={isSubmitting} />
    </AuthShell>
  )
}
