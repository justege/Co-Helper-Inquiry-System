import { useNavigate, Link } from "react-router-dom"
import {
  Box, Button, Flex, Heading, HStack, IconButton, Input, Separator,
  Spinner, Text, VStack,
} from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Field } from "@/components/ui/field"
import { PasswordInput } from "@/components/ui/password-input"
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
    <Flex minH="100vh" bg="white">
      {/* ── Left: form panel ─────────────────────────────────── */}
      <Flex
        flex="1"
        flexDir="column"
        align="center"
        justify="center"
        px={{ base: 6, md: 12 }}
        py={12}
        bg="white"
      >
        <Box w="full" maxW="360px">
          {/* Logo */}
          <Box mb={10} textAlign="center">
            <Heading fontSize="2rem" fontWeight="800" letterSpacing="-0.04em" color="gray.900">
              <Box as="span" color="indigo.500">B</Box>oilerplate
            </Heading>
          </Box>

          {/* Root-level error */}
          {errors.root && (
            <Box bg="red.50" border="1px solid" borderColor="red.200" rounded="lg" px={4} py={3} mb={5}>
              <Text fontSize="sm" color="red.600">{errors.root.message}</Text>
            </Box>
          )}

          {/* Form */}
          <VStack as="form" onSubmit={handleSubmit(onSubmit)} gap={4} align="stretch">
            <Field
              label={<Text fontSize="sm" fontWeight="600" color="gray.700">Username</Text>}
              errorText={errors.username?.message}
              invalid={!!errors.username}
            >
              <Input
                type="text"
                placeholder="Choose a username"
                autoComplete="username"
                size="lg"
                rounded="lg"
                borderColor={errors.username ? "red.400" : "gray.200"}
                bg="white"
                _focus={{ borderColor: "indigo.400", boxShadow: "0 0 0 3px rgba(99,102,241,0.15)" }}
                {...register("username")}
              />
            </Field>

            <Field
              label={<Text fontSize="sm" fontWeight="600" color="gray.700">Email <Box as="span" color="red.400">*</Box></Text>}
              errorText={errors.email?.message}
              invalid={!!errors.email}
            >
              <Input
                type="email"
                autoComplete="email"
                size="lg"
                rounded="lg"
                borderColor={errors.email ? "red.400" : "gray.200"}
                bg="white"
                _focus={{ borderColor: "indigo.400", boxShadow: "0 0 0 3px rgba(99,102,241,0.15)" }}
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
                })}
              />
            </Field>

            <Field
              label={<Text fontSize="sm" fontWeight="600" color="gray.700">Password <Box as="span" color="red.400">*</Box></Text>}
              errorText={errors.password?.message}
              invalid={!!errors.password}
            >
              <PasswordInput
                autoComplete="new-password"
                size="lg"
                rounded="lg"
                borderColor={errors.password ? "red.400" : "gray.200"}
                bg="white"
                _focus={{ borderColor: "indigo.400", boxShadow: "0 0 0 3px rgba(99,102,241,0.15)" }}
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Password must be at least 6 characters" },
                })}
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              w="full"
              rounded="lg"
              fontWeight="700"
              fontSize="sm"
              loading={isSubmitting}
              bg="indigo.500"
              color="white"
              _hover={{ bg: "indigo.600", transform: "translateY(-1px)", shadow: "md" }}
              transition="all 0.15s"
              mt={1}
            >
              Create Account
            </Button>
          </VStack>

          {/* Divider */}
          <Flex align="center" gap={3} my={6}>
            <Separator flex="1" borderColor="gray.200" />
            <Text fontSize="xs" color="gray.400" fontWeight="500" textTransform="uppercase" letterSpacing="0.05em">
              or
            </Text>
            <Separator flex="1" borderColor="gray.200" />
          </Flex>

          {/* Social */}
          <HStack justify="center" gap={4}>
            <SocialButton label="Google" onClick={handleGoogle} disabled={isSubmitting}>
              <GoogleIcon />
            </SocialButton>
            <SocialButton label="Apple" disabled>
              <AppleIcon />
            </SocialButton>
          </HStack>

          <Text mt={8} fontSize="sm" color="gray.500" textAlign="center" fontWeight="500">
            Already have an account?{" "}
            <Box as={Link} to="/login" color="indigo.500" fontWeight="700" _hover={{ textDecoration: "underline" }}>
              Sign In
            </Box>
          </Text>
        </Box>
      </Flex>

      {/* ── Right: decorative panel ───────────────────────────── */}
      <RightPanel
        eyebrow="Join thousands of developers"
        headline={<>Ship your idea<br /><Box as="span" color="yellow.300">in hours, not weeks.</Box></>}
        features={[
          "Auth ready: email/password + Google sign-in",
          "Supabase Postgres with auto-created tables",
          "One command spins up frontend + backend",
        ]}
        footer="Free to use · Open source · MIT license"
        emoji="⚡"
      />
    </Flex>
  )
}

/* ── Shared right panel ──────────────────────────────────────────── */
function RightPanel({
  eyebrow,
  headline,
  features,
  footer,
  emoji,
}: {
  eyebrow: string
  headline: React.ReactNode
  features: string[]
  footer: string
  emoji: string
}) {
  return (
    <Box
      display={{ base: "none", lg: "flex" }}
      flex="1"
      bg="linear-gradient(135deg, #4353e0 0%, #6366f1 45%, #8b5cf6 100%)"
      position="relative"
      overflow="hidden"
      flexDir="column"
      align="center"
      justify="center"
      px={12}
      py={16}
    >
      <Box position="absolute" top="-80px" right="-80px" w="320px" h="320px" bg="whiteAlpha.100" rounded="full" />
      <Box position="absolute" bottom="-60px" left="-60px" w="240px" h="240px" bg="whiteAlpha.100" rounded="full" />
      <Box position="absolute" top="40%" left="-40px" w="140px" h="140px" bg="whiteAlpha.50" rounded="full" />

      <VStack gap={8} position="relative" zIndex={1} textAlign="center" maxW="360px">
        <Box>
          <Text fontSize="lg" color="whiteAlpha.800" fontWeight="500" mb={2}>{eyebrow}</Text>
          <Heading fontSize="3rem" fontWeight="800" color="white" lineHeight="1.1" letterSpacing="-0.03em">
            {headline}
          </Heading>
        </Box>

        <Box w="full" bg="whiteAlpha.200" rounded="3xl" p={8} backdropFilter="blur(10px)" border="1px solid" borderColor="whiteAlpha.300">
          <VStack gap={4}>
            <Text fontSize="4xl">{emoji}</Text>
            <VStack gap={2} w="full">
              {features.map((f) => (
                <HStack key={f} gap={2} w="full">
                  <Box w={2} h={2} rounded="full" bg="yellow.300" flexShrink={0} />
                  <Text fontSize="sm" color="whiteAlpha.900" fontWeight="500" textAlign="left">{f}</Text>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Box>

        <Text fontSize="sm" color="whiteAlpha.600" fontWeight="500">{footer}</Text>
      </VStack>
    </Box>
  )
}

/* ── Shared sub-components ───────────────────────────────────────── */
function SocialButton({
  label, children, onClick, disabled,
}: {
  label: string
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <IconButton
      aria-label={label}
      variant="outline"
      rounded="full"
      size="lg"
      w="56px"
      h="56px"
      borderColor="gray.200"
      bg="white"
      _hover={{ bg: "gray.50", borderColor: "gray.300" }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </IconButton>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}
