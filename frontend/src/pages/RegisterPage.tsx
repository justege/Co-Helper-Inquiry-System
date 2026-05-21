import { useState, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  Box, Button, Flex, Heading, Input, Separator, Spinner, Text, VStack,
} from "@chakra-ui/react"
import { Field } from "@/components/ui/field"
import { useAuthContext } from "../components/auth/AuthContext"
import { updateMe } from "../api/users"

export default function RegisterPage() {
  const { registerWithEmail, loginWithGoogle } = useAuthContext()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await registerWithEmail(email, password)
      if (username.trim()) {
        await updateMe({ username: username.trim() })
      }
      navigate("/app/dashboard", { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setBusy(true)
    try {
      await loginWithGoogle()
      navigate("/app/dashboard", { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-up failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Flex minH="100vh" align="center" justify="center" p={4} bg="#fcfcfc">
      <Box
        bg="white"
        border="1px solid"
        borderColor="gray.100"
        rounded="3xl"
        p={10}
        w="full"
        maxW="420px"
        shadow="sm"
      >
        <Box as={Link} to="/" fontSize="sm" color="gray.500" fontWeight="500"
          _hover={{ color: "gray.800", textDecoration: "none" }}
        >
          ← Back
        </Box>

        <Heading mt={4} mb={6} fontSize="1.5rem" fontWeight="800" letterSpacing="-0.03em" color="gray.900">
          Create Account
        </Heading>

        {error && (
          <Box bg="red.50" border="1px solid" borderColor="red.200" rounded="lg" p={3} mb={4}>
            <Text fontSize="sm" color="red.600">{error}</Text>
          </Box>
        )}

        <VStack as="form" onSubmit={handleSubmit} gap={4}>
          <Field label="Username" w="full">
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoComplete="username"
              borderColor="gray.200"
              _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 3px rgba(255,161,78,0.15)" }}
            />
          </Field>
          <Field label="Email" w="full">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              borderColor="gray.200"
              _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 3px rgba(255,161,78,0.15)" }}
            />
          </Field>
          <Field label="Password" w="full">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
              borderColor="gray.200"
              _focus={{ borderColor: "orange.400", boxShadow: "0 0 0 3px rgba(255,161,78,0.15)" }}
            />
          </Field>
          <Button
            type="submit"
            colorPalette="orange"
            w="full"
            fontWeight="700"
            disabled={busy}
          >
            {busy ? <Spinner size="sm" /> : "Create Account"}
          </Button>
        </VStack>

        <Flex align="center" gap={3} my={5}>
          <Separator flex="1" />
          <Text fontSize="xs" color="gray.400" fontWeight="500">or</Text>
          <Separator flex="1" />
        </Flex>

        <Button
          variant="outline"
          colorPalette="gray"
          w="full"
          fontWeight="600"
          onClick={handleGoogle}
          disabled={busy}
          borderColor="gray.200"
          _hover={{ bg: "gray.50" }}
        >
          <GoogleIcon /> Continue with Google
        </Button>

        <Text mt={5} fontSize="sm" color="gray.500" textAlign="center" fontWeight="500">
          Already have an account?{" "}
          <Box as={Link} to="/login" color="orange.500" fontWeight="600"
            _hover={{ textDecoration: "underline" }}
          >
            Sign in
          </Box>
        </Text>
      </Box>
    </Flex>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
