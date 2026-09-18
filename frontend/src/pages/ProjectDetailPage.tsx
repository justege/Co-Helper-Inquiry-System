import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { getWorkspaceProject } from "@/api/workspace"
import { PageShell } from "@/components/ui/PageShell"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { AppButton } from "@/components/ui/AppButton"

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Awaited<ReturnType<typeof getWorkspaceProject>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getWorkspaceProject(id).then(setData).catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <PageShell title="Project" backHref="/app/projects"><Text color="#B91C1C">{error}</Text></PageShell>
  if (!data) return <PageShell title="Project" backHref="/app/projects"><Spinner /></PageShell>

  return (
    <PageShell
      title={data.project.name}
      subtitle={data.project.description || `${data.jobs.length} jobs`}
      backHref="/app/projects"
      action={
        <Link to={`/app/board?project=${data.project.id}`}>
          <AppButton variant="secondary">Open on board</AppButton>
        </Link>
      }
    >
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        {data.jobs.length === 0 && <Text p={5} color={APP_MUTED}>No jobs in this project yet.</Text>}
        {data.jobs.map((job) => (
          <Link key={job.id} to={`/app/jobs/${job.id}`} style={{ textDecoration: "none" }}>
            <Box px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`}>
              <Text fontWeight="600" color={APP_INK}>{job.title}</Text>
              <Text fontSize="0.75rem" color={APP_MUTED}>{job.status}</Text>
            </Box>
          </Link>
        ))}
      </Box>
    </PageShell>
  )
}
