import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { Box, Spinner, Stack, Text } from "@chakra-ui/react"
import { LuCopy, LuPlus, LuTrash2, LuUsers } from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { Field } from "@/components/ui/field"
import { FormInput } from "@/components/ui/form-controls"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
} from "@/components/ui/appUi"
import { AppButton } from "@/components/ui/AppButton"
import {
  createWorkspaceClient,
  getMyWorkspace,
  getWorkspaceInvitations,
  revokeInvitation,
  type FreelancerWorkspaceMe,
  type WorkspaceInvitation,
} from "@/api/workspace"
import { displayName } from "@/lib/people"

function inviteUrl(token: string) {
  return `${window.location.origin}/invite/${token}`
}

export default function ClientsPage() {
  const [data, setData] = useState<FreelancerWorkspaceMe | null>(null)
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteSent, setInviteSent] = useState<WorkspaceInvitation | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string; firstName: string; lastName: string; companyName: string }>({
    defaultValues: { email: "", firstName: "", lastName: "", companyName: "" },
  })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getMyWorkspace(), getWorkspaceInvitations()])
      .then(([me, inv]) => {
        if (me.role === "owner") setData(me)
        setInvitations(inv.filter((i) => i.kind !== "collaborator"))
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function onCreate(values: { email: string; firstName: string; lastName: string; companyName: string }) {
    try {
      const created = await createWorkspaceClient({
        email: values.email.trim(),
        firstName: values.firstName.trim() || undefined,
        lastName: values.lastName.trim() || undefined,
        companyName: values.companyName.trim() || undefined,
        invite: true,
      })
      setInviteSent(created.invitation)
      reset()
      load()
    } catch (e: unknown) {
      setError("email", { message: e instanceof Error ? e.message : "Failed to add client" })
    }
  }

  async function copyLink(token?: string, id?: string) {
    if (!token) return
    await navigator.clipboard.writeText(inviteUrl(token))
    setCopiedId(id ?? token)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <PageShell
      eyebrow="Workspace"
      title="Clients"
      subtitle="People you work for. Attach them to projects, then invite collaborators on each project."
      action={
        <AppButton size="sm" onClick={() => { setInviteSent(null); setInviteOpen(true) }}>
          <LuPlus size={14} /> Add client
        </AppButton>
      }
    >
      {loading ? (
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      ) : (
        <Stack gap={5}>
          <Box {...APP_CARD} overflow="hidden">
            <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}
              display="flex" alignItems="center" gap={2.5}>
              <Box color={APP_ACCENT}><LuUsers size={16} /></Box>
              <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>Clients</Text>
            </Box>
            <Box p={5}>
              {(data?.clients.length ?? 0) === 0 ? (
                <Text fontSize="0.875rem" color={APP_MUTED}>
                  No clients yet. Add someone by email — they can join when you send the invite.
                </Text>
              ) : (
                <Stack gap={3}>
                  {(data?.clients ?? []).map((c) => (
                    <Link key={c.id} to={`/app/clients/${c.id}`} style={{ textDecoration: "none" }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}
                        px={4} py={3} bg={APP_BG_SUBTLE} borderRadius="10px" border={`1px solid ${APP_BORDER}`}>
                        <Box>
                          <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>{displayName(c)}</Text>
                          <Text fontSize="0.75rem" color={APP_LABEL}>{c.email}</Text>
                        </Box>
                        <Text fontSize="0.75rem" fontWeight="600" color={APP_MUTED}>
                          {c.projectCount ?? 0} project{(c.projectCount ?? 0) === 1 ? "" : "s"}
                        </Text>
                      </Box>
                    </Link>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>

          {invitations.length > 0 && (
            <Box {...APP_CARD} overflow="hidden">
              <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
                <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>Pending invitations</Text>
              </Box>
              <Box p={5}>
                <Stack gap={3}>
                  {invitations.map((inv) => (
                    <Box key={inv.id} display="flex" alignItems="center" justifyContent="space-between" gap={3}
                      px={4} py={3} bg="#FFFBF0" borderRadius="10px" border="1px solid #FCD34D" flexWrap="wrap">
                      <Box>
                        <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>{inv.email}</Text>
                        <Text fontSize="0.75rem" color={APP_LABEL}>
                          Invited {new Date(inv.createdAt).toLocaleDateString("en-GB")}
                        </Text>
                      </Box>
                      <Box display="flex" gap={3} alignItems="center">
                        {inv.token && (
                          <Box as="button" onClick={() => copyLink(inv.token, inv.id)}
                            display="inline-flex" alignItems="center" gap={1}
                            color={APP_ACCENT} fontSize="0.75rem" fontWeight="600" cursor="pointer">
                            <LuCopy size={12} /> {copiedId === inv.id ? "Copied" : "Copy link"}
                          </Box>
                        )}
                        <Box as="button" onClick={() => revokeInvitation(inv.id).then(load)}
                          display="inline-flex" alignItems="center" gap={1}
                          color="#B91C1C" fontSize="0.75rem" fontWeight="600" cursor="pointer">
                          <LuTrash2 size={12} /> Revoke
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          )}
        </Stack>
      )}

      <DialogRoot open={inviteOpen} onOpenChange={({ open }) => { setInviteOpen(open); if (!open) { reset(); setInviteSent(null) } }} size="sm">
        <DialogContent style={{ borderRadius: "16px", border: "1px solid #D8DCE8", overflow: "hidden", boxShadow: "0 20px 60px rgba(11,21,40,0.18)" }}>
          <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
            <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
              Add client
            </DialogTitle>
            <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
          </Box>
          <DialogHeader display="none" />
          <Box as="form" onSubmit={handleSubmit(onCreate)}>
            <DialogBody px={6} py={5}>
              <Text fontSize="0.875rem" color={APP_MUTED} mb={4}>
                They&rsquo;ll be invited to <strong style={{ color: APP_INK }}>{data?.workspace.name ?? "your workspace"}</strong> and only see projects you attach them to.
              </Text>
              <Field label="Email address" invalid={!!errors.email} errorText={errors.email?.message}>
                <FormInput
                  type="email"
                  placeholder="client@company.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
                  })}
                />
              </Field>
              <Field label="First name">
                <FormInput mt={3} {...register("firstName")} />
              </Field>
              <Field label="Last name">
                <FormInput mt={3} {...register("lastName")} />
              </Field>
              <Field label="Company">
                <FormInput mt={3} {...register("companyName")} />
              </Field>
              {inviteSent && (
                <Box mt={3} p={3} bg={APP_BG_SUBTLE} borderRadius="8px">
                  <Text fontSize="sm" color="#047857" fontWeight="600" mb={2}>Invitation created</Text>
                  {inviteSent.token && (
                    <AppButton variant="ghost" size="sm" onClick={() => copyLink(inviteSent.token, inviteSent.id)}>
                      <LuCopy size={12} /> {copiedId === inviteSent.id ? "Copied" : "Copy invite link"}
                    </AppButton>
                  )}
                </Box>
              )}
            </DialogBody>
            <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
              <AppButton type="submit" loading={isSubmitting} flex={1}>
                Add and invite
              </AppButton>
              <AppButton variant="ghost" color={APP_MUTED} onClick={() => setInviteOpen(false)}>Cancel</AppButton>
            </DialogFooter>
          </Box>
        </DialogContent>
      </DialogRoot>
    </PageShell>
  )
}
