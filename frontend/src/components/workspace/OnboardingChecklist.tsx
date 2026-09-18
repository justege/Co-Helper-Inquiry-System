import { Box, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { LuCircleCheck, LuCircle } from "react-icons/lu"
import { GREEN, INK, MUTED, RULE, SURFACE } from "@/theme/tokens"
import { AppButton } from "@/components/ui/AppButton"

export function OnboardingChecklist({
  isSolo,
  hasWorkspace,
  hasClients,
  hasProjects,
  hasJobs,
}: {
  isSolo: boolean
  hasWorkspace: boolean
  hasClients: boolean
  hasProjects: boolean
  hasJobs: boolean
}) {
  if (!isSolo && hasJobs) return null
  const items = isSolo
    ? [
        { done: hasWorkspace, label: "Create your workspace", to: "/app/settings" },
        { done: hasClients, label: "Invite your first client", to: "/app/clients" },
        { done: hasProjects, label: "Add a project folder", to: "/app/projects" },
        { done: hasJobs, label: "Open the first job", to: "/app/inquiries/new" },
      ]
    : [
        { done: hasJobs, label: "Create your first job", to: "/app/inquiries/new" },
      ]
  if (items.every((i) => i.done)) return null

  return (
    <Box bg={SURFACE} border={`1px solid ${RULE}`} borderRadius="14px" p={{ base: 5, md: 6 }} mb={6}>
      <Text fontFamily="'Space Grotesk', Inter, sans-serif" fontWeight="700" fontSize="1.125rem" color={INK} mb={1}>
        Get set up
      </Text>
      <Text fontSize="0.875rem" color={MUTED} mb={4}>
        {isSolo
          ? "Four steps to a professional workspace with your clients."
          : "Share a brief so work has a home besides email."}
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
      {isSolo && !hasJobs && (
        <Box mt={4}>
          <Link to="/app/inquiries/new">
            <AppButton variant="accent">New job</AppButton>
          </Link>
        </Box>
      )}
    </Box>
  )
}
