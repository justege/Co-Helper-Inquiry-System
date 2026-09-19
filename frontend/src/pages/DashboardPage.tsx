import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Grid, Spinner, Text } from "@chakra-ui/react"
import { getMe, type User } from "@/api/users"
import { getMyWorkspace, getWorkspaceProjects, type WorkspaceProject } from "@/api/workspace"
import { PageShell } from "@/components/ui/PageShell"
import { AppStatCard, APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { OnboardingChecklist } from "@/components/workspace/OnboardingChecklist"
import { AppButton } from "@/components/ui/AppButton"
import { displayName } from "@/lib/people"

export default function DashboardPage() {
  const [me, setMe] = useState<User | null>(null)
  const [clientCount, setClientCount] = useState(0)
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [hasWorkspace, setHasWorkspace] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const profile = await getMe()
      setMe(profile)
      const [ws, projectData] = await Promise.all([
        getMyWorkspace().catch(() => null),
        getWorkspaceProjects().catch(() => ({ projects: [] })),
      ])
      setProjects(projectData.projects)
      if (ws && "workspace" in ws) {
        setHasWorkspace(true)
        setClientCount(ws.clients.length)
      } else if (ws && "workspaces" in ws) {
        setHasWorkspace(ws.workspaces.length > 0)
      }
      setLoading(false)
    })().catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <PageShell title="Home"><Spinner /></PageShell>
  }

  const owner = me?.role === "expert"

  return (
    <PageShell
      title="Home"
      subtitle={owner ? "Your clients and the projects you share with them." : "Projects shared with you."}
      action={
        owner ? (
          <Link to="/app/projects">
            <AppButton>New project</AppButton>
          </Link>
        ) : undefined
      }
    >
      <OnboardingChecklist
        isOwner={Boolean(owner)}
        hasWorkspace={hasWorkspace}
        hasClients={clientCount > 0}
        hasProjects={projects.length > 0}
      />
      <Grid templateColumns={{ base: "1fr 1fr", md: owner ? "repeat(2, 1fr)" : "1fr" }} gap={4} mb={6}>
        <AppStatCard label="Projects" value={projects.length} />
        {owner && <AppStatCard label="Clients" value={clientCount} />}
      </Grid>
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        <Box px={5} py={3} borderBottom={`1px solid ${APP_BORDER}`}>
          <Text fontWeight="700" color={APP_INK}>Recent projects</Text>
        </Box>
        {projects.slice(0, 8).map((project) => (
          <Link key={project.id} to={`/app/projects/${project.id}`} style={{ textDecoration: "none" }}>
            <Box px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`} _hover={{ bg: "#F7F8FA" }}>
              <Text fontWeight="600" color={APP_INK}>{project.name}</Text>
              <Text fontSize="0.75rem" color={APP_MUTED}>
                {displayName(project.client, "No client")}
                {project.collaboratorCount ? ` · ${project.collaboratorCount} collaborator${project.collaboratorCount === 1 ? "" : "s"}` : ""}
              </Text>
            </Box>
          </Link>
        ))}
        {projects.length === 0 && <Text p={5} color={APP_MUTED}>No projects yet.</Text>}
      </Box>
    </PageShell>
  )
}
