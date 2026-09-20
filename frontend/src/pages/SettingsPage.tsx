import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
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
  LuLayoutGrid,
} from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { AdminInquiryMockup, StartWorkspaceButton } from "@/components/ui/FeatureEmptyState"
import { getMe, updateMe, type User } from "@/api/users"
import { getBilling, startCheckout, openBillingPortal } from "@/api/billing"
import {
  getMyWorkspace,
  sendWorkspaceTestEmail,
  updateWorkspaceSettings,
  type ClientWorkspaceMe,
} from "@/api/workspace"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
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

type ContactFields = { phone: string; contactPref: string }

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
      <PageShell eyebrow="Account" title="Settings">
        <Box display="flex" alignItems="center" gap={2} py={6}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading…</Text>
        </Box>
      </PageShell>
    )
  }

  return (
    <PageShell
      eyebrow="Account"
      title="Settings"
      intro={{
        title: "Your workspace, billing, and how people reach you",
        bullets: [
          "Set contact details so clients know how to get hold of you",
          "Workspace name, weekly hours, currency, and email live here",
          "Subscribe when you’re ready — invited companies never pay Co-Helper",
        ],
        mockup: <AdminInquiryMockup />,
      }}
    >
      <Stack gap={5}>
        <ContactSection profile={profile} />

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
            <EmailSettingsSection />
            <BillingSection />
          </>
        ) : profile?.role === "client" ? (
          <ClientWorkspacesSection />
        ) : null}
      </Stack>
    </PageShell>
  )
}

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
          <StartWorkspaceButton redirectTo="/app/projects" size="sm" />
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

function WorkspaceSettingsSection() {
  const [currency, setCurrency] = useState("EUR")
  const [timezone, setTimezone] = useState("Europe/Istanbul")
  const [name, setName] = useState("")
  const [weeklyHours, setWeeklyHours] = useState("20")
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    getMyWorkspace().then((ws) => {
      if (ws.role === "owner") {
        setName(ws.workspace.name)
        setCurrency(ws.workspace.currency || "EUR")
        setTimezone(ws.workspace.timezone || "Europe/Istanbul")
        setWeeklyHours(String(ws.workspace.weeklyHours || 20))
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
        <Box>
          <FieldLabel>Hours you normally work per week</FieldLabel>
          <FormInput type="number" step="0.5" min="1" max="168" value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} />
        </Box>
      </Grid>
      <AppButton size="sm" mt={5} onClick={() => updateWorkspaceSettings({ name, currency, timezone, weeklyHours: Number(weeklyHours) || 20 }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000) })}>
        Save workspace
      </AppButton>
      {saved && <Text fontSize="sm" color="#047857" fontWeight="600" mt={2}>Saved</Text>}
    </SectionCard>
  )
}

function EmailSettingsSection() {
  const [emailMode, setEmailMode] = useState("platform")
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpFrom, setSmtpFrom] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [configured, setConfigured] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testMsg, setTestMsg] = useState<string | null>(null)
  useEffect(() => {
    getMyWorkspace().then((ws) => {
      if (ws.role === "owner") {
        setEmailMode(ws.workspace.emailMode || "platform")
        setSmtpHost(ws.workspace.smtpHost || "")
        setSmtpPort(String(ws.workspace.smtpPort || 587))
        setSmtpUser(ws.workspace.smtpUser || "")
        setSmtpFrom(ws.workspace.smtpFrom || "")
        setConfigured(Boolean(ws.workspace.smtpConfigured))
      }
    }).catch(() => null)
  }, [])
  return (
    <SectionCard icon={<LuMail size={16} />} title="Email">
      <Text fontSize="0.875rem" color={APP_MUTED} mb={4}>
        Invites go through Co-Helper email or your own SMTP.
      </Text>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={5}>
        <Box>
          <FieldLabel>Send via</FieldLabel>
          <FormNativeSelect value={emailMode} onChange={(e) => setEmailMode(e.target.value)}>
            <option value="platform">Co-Helper email</option>
            <option value="smtp">Your SMTP</option>
          </FormNativeSelect>
        </Box>
        {emailMode === "smtp" && (
          <>
            <Box>
              <FieldLabel>SMTP host</FieldLabel>
              <FormInput value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
            </Box>
            <Box>
              <FieldLabel>Port</FieldLabel>
              <FormInput value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
            </Box>
            <Box>
              <FieldLabel>Username</FieldLabel>
              <FormInput value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
            </Box>
            <Box>
              <FieldLabel>From</FieldLabel>
              <FormInput value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="You <you@example.com>" />
            </Box>
            <Box>
              <FieldLabel>Password {configured ? "(saved — leave blank to keep)" : ""}</FieldLabel>
              <FormInput type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
            </Box>
          </>
        )}
      </Grid>
      <Box display="flex" gap={2} mt={5} flexWrap="wrap">
        <AppButton size="sm" onClick={() => updateWorkspaceSettings({
          emailMode: emailMode as "platform" | "smtp",
          smtpHost,
          smtpPort: Number(smtpPort) || 587,
          smtpUser,
          smtpFrom,
          smtpPassword: smtpPassword || undefined,
        }).then(() => { setSaved(true); setSmtpPassword(""); setTimeout(() => setSaved(false), 2000) })}>
          Save email
        </AppButton>
        <AppButton size="sm" variant="secondary" onClick={() => sendWorkspaceTestEmail().then(() => setTestMsg("Sent")).catch((e: Error) => setTestMsg(e.message))}>
          Send test email
        </AppButton>
      </Box>
      {saved && <Text fontSize="sm" color="#047857" fontWeight="600" mt={2}>Saved</Text>}
      {testMsg && <Text fontSize="sm" color={APP_MUTED} mt={2}>{testMsg}</Text>}
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
