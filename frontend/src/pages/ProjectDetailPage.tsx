import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import {
  getWorkspaceProject,
  inviteProjectCollaborator,
  removeProjectCollaborator,
  revokeInvitation,
} from "@/api/workspace"
import { PageShell } from "@/components/ui/PageShell"
import { APP_ACCENT, APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { AppButton } from "@/components/ui/AppButton"
import { Field } from "@/components/ui/field"
import { FormInput } from "@/components/ui/form-controls"
import { displayName } from "@/lib/people"
import { LuTrash2, LuUsers } from "react-icons/lu"

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Awaited<ReturnType<typeof getWorkspaceProject>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: "" } })

  function load() {
    if (!id) return
    getWorkspaceProject(id).then(setData).catch((e: Error) => setError(e.message))
  }

  useEffect(() => { load() }, [id])

  async function onInvite(values: { email: string }) {
    if (!id) return
    setInviteError(null)
    try {
      await inviteProjectCollaborator(id, values.email.trim())
      reset()
      load()
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : "Could not invite")
    }
  }

  if (error) return <PageShell title="Project" backHref="/app/projects"><Text color="#B91C1C">{error}</Text></PageShell>
  if (!data) return <PageShell title="Project" backHref="/app/projects"><Spinner /></PageShell>

  const canManage = data.role === "owner" || data.role === "admin"

  return (
    <PageShell
      title={data.project.name}
      subtitle={data.project.description || displayName(data.client)}
      backHref="/app/projects"
    >
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5} mb={5}>
        <Text fontSize="0.75rem" fontWeight="700" color={APP_MUTED} letterSpacing="0.06em" textTransform="uppercase" mb={2}>
          Client
        </Text>
        {canManage ? (
          <Link to={`/app/clients/${data.client.id}`} style={{ textDecoration: "none" }}>
            <Text fontWeight="700" color={APP_INK}>{displayName(data.client)}</Text>
            <Text fontSize="0.8125rem" color={APP_MUTED}>{data.client.email}</Text>
          </Link>
        ) : (
          <>
            <Text fontWeight="700" color={APP_INK}>{displayName(data.client)}</Text>
            <Text fontSize="0.8125rem" color={APP_MUTED}>{data.client.email}</Text>
          </>
        )}
      </Box>

      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} display="flex" alignItems="center" gap={2}>
          <LuUsers size={16} color={APP_ACCENT} />
          <Text fontWeight="700" color={APP_INK}>Collaborators</Text>
        </Box>
        <Box p={5}>
          {data.collaborators.length === 0 && data.pendingInvites.length === 0 && (
            <Text fontSize="0.875rem" color={APP_MUTED} mb={canManage ? 4 : 0}>
              No collaborators yet. Invite people who should work on this project with you.
            </Text>
          )}
          {data.collaborators.map((person) => (
            <Box key={person.id} display="flex" justifyContent="space-between" alignItems="center" py={3} borderBottom={`1px solid ${APP_BORDER}`}>
              <Box>
                <Text fontWeight="600" color={APP_INK}>{displayName(person)}</Text>
                <Text fontSize="0.75rem" color={APP_MUTED}>{person.email}</Text>
              </Box>
              {canManage && (
                <Box
                  as="button"
                  color="#B91C1C"
                  fontSize="0.75rem"
                  fontWeight="600"
                  onClick={() => {
                    if (!id) return
                    removeProjectCollaborator(id, person.id).then(load).catch(() => null)
                  }}
                >
                  <LuTrash2 size={12} /> Remove
                </Box>
              )}
            </Box>
          ))}
          {data.pendingInvites.map((inv) => (
            <Box key={inv.id} display="flex" justifyContent="space-between" alignItems="center" py={3} borderBottom={`1px solid ${APP_BORDER}`}>
              <Box>
                <Text fontWeight="600" color={APP_INK}>{inv.email}</Text>
                <Text fontSize="0.75rem" color={APP_MUTED}>Invite pending</Text>
              </Box>
              {canManage && (
                <Box as="button" color="#B91C1C" fontSize="0.75rem" fontWeight="600" onClick={() => revokeInvitation(inv.id).then(load)}>
                  Revoke
                </Box>
              )}
            </Box>
          ))}
          {canManage && (
            <Box as="form" onSubmit={handleSubmit(onInvite)} mt={4}>
              <Field label="Invite by email" invalid={!!inviteError} errorText={inviteError ?? undefined}>
                <FormInput type="email" placeholder="alex@studio.com" {...register("email", { required: true })} />
              </Field>
              <AppButton type="submit" size="sm" mt={3} loading={isSubmitting}>Send invite</AppButton>
            </Box>
          )}
        </Box>
      </Box>
    </PageShell>
  )
}
