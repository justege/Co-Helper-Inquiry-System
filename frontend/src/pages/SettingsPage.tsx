import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import {
  Box,
  Grid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react"
import { Field } from "@/components/ui/field"
import { FormInput, FormNativeSelect } from "@/components/ui/form-controls"
import {
  LuMail,
  LuPhone,
  LuShieldCheck,
  LuUsers,
  LuPlus,
  LuTrash2,
  LuCopy,
  LuLayoutGrid,
} from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { getMe, updateMe, type User } from "@/api/users"
import { getBilling, startCheckout, openBillingPortal } from "@/api/billing"
import {
  getMyWorkspace,
  getWorkspaceInvitations,
  inviteClient,
  revokeInvitation,
  updateWorkspaceSettings,
  type FreelancerWorkspaceMe,
  type ClientWorkspaceMe,
  type WorkspaceInvitation,
} from "@/api/workspace"
import { StartWorkspaceButton } from "@/components/ui/FeatureEmptyState"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog"
import { AppButton } from "@/components/ui/AppButton"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
} from "@/components/ui/appUi"

// ── Types ─────────────────────────────────────────────────────────────────────

type ContactFields = { phone: string; contactPref: string }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordSent, setPasswordSent] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    getMe().then(setProfile).finally(() => setLoading(false))
  }, [])

  async function handlePasswordReset() {
    if (!auth || !profile?.email) return
    setPasswordError(null)
    try {
      await sendPasswordResetEmail(auth, profile.email)
      setPasswordSent(true)
      setTimeout(() => setPasswordSent(false), 5000)
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : "Failed to send reset email")
    }
  }

  if (loading) {
    return (
      <PageShell eyebrow="Account" title="Settings" subtitle="Manage your workspace preferences">
        <Box display="flex" alignItems="center" gap={2} py={6}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      </PageShell>
    )
  }

  return (
    <PageShell eyebrow="Account" title="Settings" subtitle="Manage your workspace and team preferences">
      <Stack gap={5}>
        <ContactSection profile={profile} />

        {/* Security */}
        <SectionCard icon={<LuShieldCheck size={16} />} title="Security">
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={4} flexWrap="wrap">
            <Box>
              <Text fontSize="0.9rem" fontWeight="600" color={APP_INK} mb={1}>Password</Text>
              <Text fontSize="0.8125rem" color={APP_MUTED}>
                Send a reset link to <strong>{profile?.email}</strong> to change your password.
              </Text>
              {passwordSent && (
                <Text fontSize="0.8rem" color="#047857" fontWeight="600" mt={2}>✓ Reset email sent — check your inbox.</Text>
              )}
              {passwordError && (
                <Text fontSize="0.8rem" color="#B91C1C" mt={2}>{passwordError}</Text>
              )}
            </Box>
            <AppButton variant="ghost" size="sm" color={APP_ACCENT} onClick={handlePasswordReset} flexShrink={0}>
              Send reset link
            </AppButton>
          </Box>
        </SectionCard>

        {profile?.role === "expert" ? (
          <>
            <WorkspaceSettingsSection />
            <BillingSection />
            <FreelancerClientsSection />
            <TrelloImportSection />
          </>
        ) : profile?.role === "client" ? (
          <ClientWorkspacesSection />
        ) : null}
      </Stack>
    </PageShell>
  )
}

// ── Contact Section ───────────────────────────────────────────────────────────

function ContactSection({ profile }: { profile: User | null }) {
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactFields>({ defaultValues: { phone: "", contactPref: "email" } })

  useEffect(() => {
    if (!profile) return
    reset({ phone: profile.phone ?? "", contactPref: profile.contactPref ?? "email" })
  }, [profile, reset])

  async function onSubmit(data: ContactFields) {
    try {
      await updateMe({ phone: data.phone || null, contactPref: data.contactPref })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError("root", { message: e instanceof Error ? e.message : "Failed to save" })
    }
  }

  return (
    <SectionCard icon={<LuMail size={16} />} title="Contact Preferences">
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={5}>
          <Box>
            <FieldLabel>Email address</FieldLabel>
            <FormInput value={profile?.email ?? ""} readOnly opacity={0.6} cursor="not-allowed" />
            <Text fontSize="0.75rem" color={APP_LABEL} mt={1.5}>Managed via your login provider.</Text>
          </Box>

          <Field label="" invalid={!!errors.phone} errorText={errors.phone?.message}>
            <FieldLabel>Phone number</FieldLabel>
            <Box display="flex" alignItems="center" gap={2}>
              <LuPhone size={15} color="#8A96A8" style={{ flexShrink: 0 }} />
              <FormInput flex={1} placeholder="+1 555 000 0000" {...register("phone")} />
            </Box>
          </Field>

          <Box>
            <FieldLabel>Preferred contact method</FieldLabel>
            <FormNativeSelect {...register("contactPref")}>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="both">Email &amp; Phone</option>
            </FormNativeSelect>
          </Box>
        </Grid>

        {errors.root && <Text fontSize="sm" color="#B91C1C" mt={3}>{errors.root.message}</Text>}

        <Box display="flex" alignItems="center" gap={3} mt={5} pt={5} borderTop={`1px solid ${APP_BORDER}`}>
          <AppButton type="submit" size="sm" loading={isSubmitting}>Save Preferences</AppButton>
          {saved && <Text fontSize="sm" color="#047857" fontWeight="600">✓ Saved</Text>}
        </Box>
      </Box>
    </SectionCard>
  )
}

// ── Freelancer: workspace clients ────────────────────────────────────────────

type InviteClientFields = { email: string }

function FreelancerClientsSection() {
  const [data, setData] = useState<FreelancerWorkspaceMe | null>(null)
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset: resetInvite,
    setError: setInviteError,
    formState: { errors: inviteErrors, isSubmitting: inviting },
  } = useForm<InviteClientFields>({ defaultValues: { email: "" } })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getMyWorkspace(), getWorkspaceInvitations()])
      .then(([me, inv]) => {
        if (me.role === "owner") setData(me)
        setInvitations(inv)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function onInvite(values: InviteClientFields) {
    try {
      await inviteClient(values.email.trim())
      setInviteSent(true)
      resetInvite()
      load()
      setTimeout(() => { setInviteSent(false); setInviteOpen(false) }, 2000)
    } catch (e: unknown) {
      setInviteError("email", { message: e instanceof Error ? e.message : "Failed to send invite" })
    }
  }

  async function handleRevoke(id: string) {
    await revokeInvitation(id)
    load()
  }

  async function copyInvite(token?: string, id?: string) {
    if (!token) return
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`)
    setCopiedId(id ?? token)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <>
      <SectionCard
        icon={<LuUsers size={16} />}
        title="Your Clients"
        action={
          <AppButton size="sm" onClick={() => setInviteOpen(true)} display="inline-flex" gap={1.5}>
            <LuPlus size={13} /> Invite Client
          </AppButton>
        }
      >
        {loading ? (
          <Box display="flex" alignItems="center" gap={2} py={3}>
            <Spinner size="sm" color="green.500" />
            <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
          </Box>
        ) : (
          <Stack gap={3}>
            {(data?.clients.length ?? 0) === 0 && invitations.length === 0 ? (
              <Text fontSize="0.875rem" color={APP_LABEL}>
                No clients yet. Invite the clients you already work with — they&rsquo;ll only see the jobs you share with them.
              </Text>
            ) : (
              <>
                {(data?.clients ?? []).map((c) => (
                  <Box key={c.id} display="flex" alignItems="center" justifyContent="space-between" gap={3}
                    px={4} py={3} bg={APP_BG_SUBTLE} borderRadius="10px" border={`1px solid ${APP_BORDER}`}>
                    <Box>
                      <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
                      </Text>
                      {[c.firstName, c.lastName].filter(Boolean).length > 0 && (
                        <Text fontSize="0.75rem" color={APP_LABEL}>{c.email}</Text>
                      )}
                    </Box>
                    <Text fontSize="0.75rem" fontWeight="600" color={APP_MUTED}>Client</Text>
                  </Box>
                ))}

                {invitations.length > 0 && (
                  <Box mt={2}>
                    <Text fontSize="0.6875rem" fontWeight="700" color={APP_LABEL} letterSpacing="0.09em" textTransform="uppercase" mb={2}>
                      Pending invitations
                    </Text>
                    {invitations.map((inv) => (
                      <Box key={inv.id} display="flex" alignItems="center" justifyContent="space-between" gap={3}
                        px={4} py={3} bg="#FFFBF0" borderRadius="10px" border="1px solid #FCD34D" mb={2}>
                        <Box>
                          <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>{inv.email}</Text>
                          <Text fontSize="0.75rem" color={APP_LABEL}>
                            Invited {new Date(inv.createdAt).toLocaleDateString("en-GB")}
                          </Text>
                        </Box>
                        <Box display="flex" gap={3} alignItems="center">
                          {inv.token && (
                            <Box as="button" onClick={() => copyInvite(inv.token, inv.id)}
                              display="inline-flex" alignItems="center" gap={1}
                              color={APP_ACCENT} fontSize="0.75rem" fontWeight="600" cursor="pointer">
                              <LuCopy size={12} /> {copiedId === inv.id ? "Copied" : "Copy link"}
                            </Box>
                          )}
                          <Box as="button" onClick={() => handleRevoke(inv.id)}
                            display="inline-flex" alignItems="center" gap={1}
                            color="#B91C1C" fontSize="0.75rem" fontWeight="600" cursor="pointer">
                            <LuTrash2 size={12} /> Revoke
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </>
            )}
          </Stack>
        )}
      </SectionCard>

      {/* Invite Modal */}
      <DialogRoot open={inviteOpen} onOpenChange={({ open }) => { setInviteOpen(open); if (!open) resetInvite() }} size="sm">
        <DialogContent style={{ borderRadius: "16px", border: "1px solid #D8DCE8", overflow: "hidden", boxShadow: "0 20px 60px rgba(11,21,40,0.18)" }}>
          <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2.5}>
              <Box w="7px" h="7px" bg="#0F6E56" rounded="full" />
              <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
                Invite Client
              </DialogTitle>
            </Box>
            <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
          </Box>

          <DialogHeader display="none" />

          <Box as="form" onSubmit={handleSubmit(onInvite)}>
            <DialogBody px={6} py={5}>
              <Text fontSize="0.875rem" color={APP_MUTED} mb={4}>
                Enter your client&rsquo;s email. They&rsquo;ll get a link to join{" "}
                <strong style={{ color: APP_INK }}>{data?.workspace.name ?? "your workspace"}</strong> and see only the jobs you share with them.
              </Text>
              <Field label="Email address" invalid={!!inviteErrors.email} errorText={inviteErrors.email?.message}>
                <FormInput
                  type="email"
                  placeholder="client@company.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
                  })}
                />
              </Field>
              {inviteSent && <Text fontSize="sm" color="#047857" fontWeight="600" mt={2}>✓ Invitation sent!</Text>}
            </DialogBody>

            <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
              <AppButton type="submit" loading={inviting} flex={1}>
                Send Invitation
              </AppButton>
              <AppButton variant="ghost" color={APP_MUTED} onClick={() => { setInviteOpen(false); resetInvite() }}>
                Cancel
              </AppButton>
            </DialogFooter>
          </Box>
        </DialogContent>
      </DialogRoot>
    </>
  )
}

// ── Client: connected freelancers (read-only) ────────────────────────────────

function ClientWorkspacesSection() {
  const [data, setData] = useState<ClientWorkspaceMe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyWorkspace()
      .then((me) => { if (me.role === "client") setData(me) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  return (
    <SectionCard icon={<LuUsers size={16} />} title="Workspaces you belong to">
      {loading ? (
        <Box display="flex" alignItems="center" gap={2} py={3}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      ) : (data?.workspaces.length ?? 0) === 0 ? (
        <Stack gap={3}>
          <Text fontSize="0.875rem" color={APP_LABEL}>
            Start your own workspace as a one-person business, or wait for an invite from someone you work with.
          </Text>
          <StartWorkspaceButton redirectTo="/app/board" size="sm" />
        </Stack>
      ) : (
        <Stack gap={3}>
          {(data?.workspaces ?? []).map((w) => (
            <Box key={w.id} display="flex" alignItems="center" justifyContent="space-between" gap={3}
              px={4} py={3} bg={APP_BG_SUBTLE} borderRadius="10px" border={`1px solid ${APP_BORDER}`}>
              <Box>
                <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>
                  {w.freelancer
                    ? [w.freelancer.firstName, w.freelancer.lastName].filter(Boolean).join(" ") || w.freelancer.companyName || w.freelancer.email
                    : w.name}
                </Text>
                {w.freelancer?.email && (
                  <Text fontSize="0.75rem" color={APP_LABEL}>{w.freelancer.email}</Text>
                )}
              </Box>
              <Text fontSize="0.75rem" fontWeight="600" color={APP_MUTED}>Owner</Text>
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  )
}

function TrelloImportSection() {
  return (
    <SectionCard icon={<LuLayoutGrid size={16} />} title="Import from Trello">
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={4} flexWrap="wrap">
        <Box maxW="520px">
          <Text fontSize="0.9rem" fontWeight="600" color={APP_INK} mb={1}>Bring an existing board in</Text>
          <Text fontSize="0.8125rem" color={APP_MUTED} lineHeight="1.5">
            Columns become projects and cards become work on your shared board. This is an import — day-to-day work stays here.
          </Text>
        </Box>
        <Link to="/app/trello" style={{ textDecoration: "none" }}>
          <AppButton variant="ghost" size="sm" color={APP_ACCENT} flexShrink={0}>
            Open Trello import
          </AppButton>
        </Link>
      </Box>
    </SectionCard>
  )
}

function WorkspaceSettingsSection() {
  const [currency, setCurrency] = useState("EUR")
  const [timezone, setTimezone] = useState("UTC")
  const [name, setName] = useState("")
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    getMyWorkspace().then((ws) => {
      if (ws.role === "owner") {
        setName(ws.workspace.name)
        setCurrency(ws.workspace.currency || "EUR")
        setTimezone(ws.workspace.timezone || "UTC")
      }
    }).catch(() => null)
  }, [])
  return (
    <SectionCard icon={<LuLayoutGrid size={16} />} title="Workspace">
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={5}>
        <Box>
          <FieldLabel>Name</FieldLabel>
          <FormInput value={name} onChange={(e) => setName(e.target.value)} />
        </Box>
        <Box>
          <FieldLabel>Currency</FieldLabel>
          <FormNativeSelect value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="TRY">TRY</option>
          </FormNativeSelect>
        </Box>
        <Box>
          <FieldLabel>Timezone</FieldLabel>
          <FormInput value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </Box>
      </Grid>
      <AppButton size="sm" mt={5} onClick={() => updateWorkspaceSettings({ name, currency, timezone }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000) })}>
        Save workspace
      </AppButton>
      {saved && <Text fontSize="sm" color="#047857" fontWeight="600" mt={2}>Saved</Text>}
    </SectionCard>
  )
}

function BillingSection() {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getBilling>> | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { getBilling().then(setInfo).catch(() => null) }, [])
  return (
    <SectionCard icon={<LuShieldCheck size={16} />} title="Billing">
      <Text fontSize="0.875rem" color={APP_MUTED} mb={3}>
        {info ? `Plan: ${info.plan} · Status: ${info.status}` : "Loading billing…"}
      </Text>
      <Text fontSize="0.8125rem" color={APP_MUTED} mb={4}>
        Intro pricing is $9/month until 31 Dec 2026, then $49/month. Co-Helper does not take commission on client work.
      </Text>
      {info?.stripeConfigured ? (
        <Box display="flex" gap={2}>
          <AppButton size="sm" loading={busy} onClick={async () => {
            setBusy(true)
            try {
              const { url } = await startCheckout()
              window.location.href = url
            } finally { setBusy(false) }
          }}>Subscribe</AppButton>
          <AppButton variant="ghost" size="sm" onClick={async () => {
            const { url } = await openBillingPortal()
            window.location.href = url
          }}>Manage</AppButton>
        </Box>
      ) : (
        <Text fontSize="0.8125rem" color={APP_MUTED}>Stripe is not configured on this environment yet.</Text>
      )}
    </SectionCard>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Box {...APP_CARD} overflow="hidden">
      <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} display="flex" alignItems="center" justifyContent="space-between" gap={3} bg={APP_BG_SUBTLE}>
        <Box display="flex" alignItems="center" gap={2.5}>
          <Box color={APP_ACCENT}>{icon}</Box>
          <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>{title}</Text>
        </Box>
        {action}
      </Box>
      <Box p={5}>{children}</Box>
    </Box>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="0.75rem" fontWeight="600" color={APP_LABEL} mb={1.5} letterSpacing="0.01em">
      {children}
    </Text>
  )
}
