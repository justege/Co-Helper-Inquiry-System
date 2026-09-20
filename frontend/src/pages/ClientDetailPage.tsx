import { useEffect, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { getWorkspaceClient, inviteExistingClient } from "@/api/workspace"
import { PageShell } from "@/components/ui/PageShell"
import { PartnerMockup } from "@/components/ui/FeatureEmptyState"
import { WelcomeBannerAction } from "@/components/ui/WelcomeBanner"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { displayName } from "@/lib/people"
import { AppButton } from "@/components/ui/AppButton"

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Awaited<ReturnType<typeof getWorkspaceClient>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getWorkspaceClient(id).then(setData).catch((e: Error) => setError(e.message))
  }, [id])

  if (!id) return <Navigate to="/app/clients" replace />
  if (error) return <PageShell eyebrow="Workspace" title="Client" backHref="/app/clients"><Text color="#B91C1C">{error}</Text></PageShell>
  if (!data) return <PageShell eyebrow="Workspace" title="Client" backHref="/app/clients"><Spinner /></PageShell>

  const { client, projects } = data

  return (
    <PageShell
      eyebrow="Workspace"
      title={displayName(client)}
      backHref="/app/clients"
      action={
        !client.userId ? (
          <WelcomeBannerAction
            onClick={() => {
              inviteExistingClient(client.id)
                .then(() => setInviteMsg("Invite sent"))
                .catch((e: Error) => setInviteMsg(e.message))
            }}
          >
            Send invite
          </WelcomeBannerAction>
        ) : undefined
      }
      intro={{
        title: "This client only sees the projects you attach",
        bullets: [
          "Invite them once — they join at no extra fee",
          "Each project is a separate job they can follow",
          "Open a project to add collaborators for that work only",
        ],
        cta: (
          <Link to={`/app/projects?new=1&client=${client.id}`} style={{ textDecoration: "none" }}>
            <AppButton>Create a project</AppButton>
          </Link>
        ),
        mockup: <PartnerMockup />,
      }}
    >
      {inviteMsg && <Text fontSize="0.8125rem" color={APP_MUTED} mb={4}>{inviteMsg}</Text>}
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        {projects.map((project) => (
          <Link key={project.id} to={`/app/projects/${project.id}`} style={{ textDecoration: "none" }}>
            <Box px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`}>
              <Text fontWeight="600" color={APP_INK}>{project.name}</Text>
              <Text fontSize="0.75rem" color={APP_MUTED}>
                {project.collaboratorCount} collaborator{project.collaboratorCount === 1 ? "" : "s"}
              </Text>
            </Box>
          </Link>
        ))}
        {projects.length === 0 && <Text p={5} color={APP_MUTED}>No projects with this client yet.</Text>}
      </Box>
    </PageShell>
  )
}
