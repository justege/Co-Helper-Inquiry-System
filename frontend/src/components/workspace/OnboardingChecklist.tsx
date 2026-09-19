import { Box, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { LuCircleCheck, LuCircle } from "react-icons/lu"
import { GREEN, INK, MUTED, RULE, SURFACE } from "@/theme/tokens"
import { AppButton } from "@/components/ui/AppButton"

export function OnboardingChecklist({
  isOwner,
  hasWorkspace,
  hasClients,
  hasProjects,
}: {
  isOwner: boolean
  hasWorkspace: boolean
  hasClients: boolean
  hasProjects: boolean
}) {
  if (!isOwner) return null
  const items = [
    { done: hasWorkspace, label: "Create your workspace", to: "/app/settings" },
    { done: hasClients, label: "Add your first client", to: "/app/clients" },
    { done: hasProjects, label: "Create a project", to: "/app/projects" },
  ]
  if (items.every((i) => i.done)) return null

  return (
    <Box bg={SURFACE} border={`1px solid ${RULE}`} borderRadius="14px" p={{ base: 5, md: 6 }} mb={6}>
      <Text fontFamily="'Space Grotesk', Inter, sans-serif" fontWeight="700" fontSize="1.125rem" color={INK} mb={1}>
        Get set up
      </Text>
      <Text fontSize="0.875rem" color={MUTED} mb={4}>
        A workspace, a client, then a project they can join with collaborators.
      </Text>
      <Box display="flex" flexDir="column" gap={2}>
        {items.map((item) => (
          <Link key={item.label} to={item.to} style={{ textDecoration: "none" }}>
            <Box display="flex" alignItems="center" gap={3} py={2} color={item.done ? MUTED : INK}>
              {item.done ? <LuCircleCheck color={GREEN} /> : <LuCircle />}
              <Text fontWeight="600" textDecoration={item.done ? "line-through" : "none"}>{item.label}</Text>
            </Box>
          </Link>
        ))}
      </Box>
      {!hasClients && (
        <Box mt={4}>
          <Link to="/app/clients">
            <AppButton variant="accent">Add a client</AppButton>
          </Link>
        </Box>
      )}
    </Box>
  )
}
