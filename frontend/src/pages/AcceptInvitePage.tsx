import { useEffect, useState } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { Box, Flex, Heading, Spinner, Text } from "@chakra-ui/react"
import { useAuthContext } from "@/components/auth/AuthContext"
import { getInvitePreview, acceptInvite, type InvitePreview } from "@/api/workspace"
import { GREEN, INK, MUTED } from "@/components/marketing/tokens"

function freelancerName(freelancer: InvitePreview["freelancer"]) {
  if (!freelancer) return "the one-person business you work with"
  const full = [freelancer.firstName, freelancer.lastName].filter(Boolean).join(" ")
  return full || freelancer.companyName || freelancer.username || freelancer.email
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuthContext()
  const navigate = useNavigate()

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) return
    getInvitePreview(token)
      .then(setPreview)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Invitation not found"))
  }, [token])

  useEffect(() => {
    if (!token || authLoading || !user || !preview) return
    setAccepting(true)
    acceptInvite(token)
      .then(() => navigate("/app", { replace: true }))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Could not accept invitation")
        setAccepting(false)
      })
  }, [token, authLoading, user, preview, navigate])

  if (!token) return null

  return (
    <Flex minH="100vh" align="center" justify="center" bg="#F3F6F4" px={4}>
      <Box
        w="full" maxW="440px" bg="white" borderRadius="16px"
        boxShadow="0 24px 64px rgba(0,0,0,0.12)" p={{ base: 6, md: 8 }}
      >
        {error ? (
          <>
            <Heading fontSize="1.25rem" fontWeight="800" color={INK} mb={2}>
              Invitation not available
            </Heading>
            <Text fontSize="0.875rem" color={MUTED} mb={6}>{error}</Text>
            <Link to="/" style={{ color: GREEN, fontWeight: 700, fontSize: "0.875rem" }}>
              ← Back to Co-Helper
            </Link>
          </>
        ) : !preview || authLoading ? (
          <Flex align="center" gap={3} py={6}>
            <Spinner size="sm" color="green.500" />
            <Text fontSize="0.875rem" color={MUTED}>Loading your invitation…</Text>
          </Flex>
        ) : accepting ? (
          <Flex align="center" gap={3} py={6}>
            <Spinner size="sm" color="green.500" />
            <Text fontSize="0.875rem" color={MUTED}>Joining {preview.workspaceName ?? "the workspace"}…</Text>
          </Flex>
        ) : (
          <>
            <Text fontSize="0.6875rem" fontWeight="700" color={GREEN}
              letterSpacing="0.1em" textTransform="uppercase" mb={3}>
              You&rsquo;re invited
            </Text>
            <Heading fontSize="1.375rem" fontWeight="800" color={INK} letterSpacing="-0.02em" mb={2}>
              {freelancerName(preview.freelancer)} invited you to Co-Helper
            </Heading>
            <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65" mb={7}>
              Accept the invite to join the workspace and see the projects shared with you.
            </Text>

            <Box
              as={Link}
              to={`/register?invite=${token}`}
              display="block" textAlign="center"
              px={5} py="12px" borderRadius="10px" fontWeight="700" fontSize="0.9375rem"
              bg={GREEN} color="white" mb={3}
              _hover={{ bg: "#0a5240", textDecoration: "none" }}
            >
              Create my account
            </Box>
            <Box
              as={Link}
              to={`/login?invite=${token}`}
              display="block" textAlign="center"
              px={5} py="12px" borderRadius="8px" fontWeight="600" fontSize="0.9375rem"
              bg="transparent" color={MUTED} border="1px solid #E2E8F0"
              _hover={{ borderColor: "#9CA3AF", color: INK, textDecoration: "none" }}
            >
              I already have an account
            </Box>
          </>
        )}
      </Box>
    </Flex>
  )
}
