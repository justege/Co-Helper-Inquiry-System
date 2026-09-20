import { useCallback, useMemo, useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Box, Grid, Spinner, Text } from "@chakra-ui/react"
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { WelcomeBannerAction } from "@/components/ui/WelcomeBanner"
import { Field } from "@/components/ui/field"
import { FormInput, FormNativeSelect } from "@/components/ui/form-controls"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DIALOG_PANEL_STYLE,
} from "@/components/ui/dialog"
import { InviteEmailsField } from "@/components/workspace/InviteEmailsField"
import { EMPTY_INVITE_EMAILS, normalizeInviteEmails } from "@/lib/inviteEmails"
import { APP_ACCENT, APP_BORDER, APP_INK, APP_MUTED } from "@/components/ui/appUi"
import { AppButton } from "@/components/ui/AppButton"
import { ProjectMockup } from "@/components/ui/FeatureEmptyState"
import { ProjectGlance } from "@/components/work/ProjectGlance"
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  getMyWorkspace,
  updateWorkspaceProject,
  type WorkspaceClient,
  type WorkspaceProject,
} from "@/api/workspace"
import { getWorkbench, type WorkProject } from "@/api/work"
import { displayName } from "@/lib/people"

type Filter = "all" | "active" | "waiting" | "done"

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams()
  const [projects, setProjects] = useState<WorkProject[]>([])
  const [clients, setClients] = useState<WorkspaceClient[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<"create" | "rename" | "delete" | null>(null)
  const [active, setActive] = useState<WorkProject | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [clientId, setClientId] = useState("")
  const [emails, setEmails] = useState<string[]>(EMPTY_INVITE_EMAILS)
  const [filter, setFilter] = useState<Filter>("all")
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ws, work] = await Promise.all([getMyWorkspace(), getWorkbench()])
      setCanManage(ws.role === "owner")
      if (ws.role === "owner") setClients(ws.clients)
      setProjects(work.projects)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load projects")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (loading || !canManage || clients.length === 0) return
    if (params.get("new") !== "1") return
    openCreate(params.get("client"))
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete("new")
      next.delete("client")
      return next
    }, { replace: true })
  }, [loading, canManage, clients, params, setParams])

  function openCreate(preferredClientId?: string | null) {
    setActive(null)
    setName("")
    setDescription("")
    setClientId(
      preferredClientId && clients.some((client) => client.id === preferredClientId)
        ? preferredClientId
        : (clients[0]?.id ?? "")
    )
    setEmails([...EMPTY_INVITE_EMAILS])
    setFormError(null)
    setDialog("create")
  }

  function openRename(project: WorkProject) {
    setActive(project)
    setName(project.name)
    setDescription(project.description || "")
    setClientId(project.clientId)
    setFormError(null)
    setDialog("rename")
  }

  function openDelete(project: WorkProject) {
    setActive(project)
    setFormError(null)
    setDialog("delete")
  }

  function mergeProject(updated: WorkspaceProject) {
    setProjects((prev) => prev.map((item) => (
      item.id === updated.id
        ? {
            ...item,
            name: updated.name,
            description: updated.description ?? item.description,
            clientId: updated.clientId,
            client: updated.client,
            status: updated.status || item.status,
          }
        : item
    )))
  }

  async function save() {
    const next = name.trim()
    if (next.length < 1) {
      setFormError("Give the project a name")
      return
    }
    if (!clientId) {
      setFormError("Pick a client for this project")
      return
    }
    let inviteEmails: string[] = []
    if (dialog === "create") {
      const collected = normalizeInviteEmails(emails)
      if (collected.error) {
        setFormError(collected.error)
        return
      }
      inviteEmails = collected.emails
    }
    setBusy(true)
    setFormError(null)
    try {
      if (dialog === "rename" && active) {
        const updated = await updateWorkspaceProject(active.id, { name: next, description, clientId })
        mergeProject(updated)
      } else {
        await createWorkspaceProject(next, clientId, description, inviteEmails.length ? { emails: inviteEmails } : undefined)
        await load()
      }
      setDialog(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save that project")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!active) return
    setBusy(true)
    setFormError(null)
    try {
      await deleteWorkspaceProject(active.id)
      setProjects((prev) => prev.filter((item) => item.id !== active.id))
      setDialog(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not delete that project")
    } finally {
      setBusy(false)
    }
  }

  const needClient = canManage && clients.length === 0
  const empty = !loading && projects.length === 0
  const visible = useMemo(() => {
    if (filter === "waiting") return projects.filter((project) => project.waitingOnClient)
    if (filter === "done") return projects.filter((project) => project.finished || project.status === "done")
    if (filter === "active") return projects.filter((project) => !project.finished && project.status !== "done")
    return projects
  }, [filter, projects])

  const counts = {
    all: projects.length,
    active: projects.filter((project) => !project.finished && project.status !== "done").length,
    waiting: projects.filter((project) => project.waitingOnClient).length,
    done: projects.filter((project) => project.finished || project.status === "done").length,
  }

  return (
    <PageShell
      eyebrow="Workspace"
      title="Projects"
      action={
        canManage ? (
          needClient ? (
            <WelcomeBannerAction to="/app/clients">
              <LuPlus size={15} /> Add a client
            </WelcomeBannerAction>
          ) : (
            <WelcomeBannerAction onClick={() => openCreate()}>
              <LuPlus size={15} /> New project
            </WelcomeBannerAction>
          )
        ) : undefined
      }
      intro={empty ? {
        title: "One shared project for the work you run together",
        bullets: [
          "Attach the client this work belongs to — they see only this project",
          "To-dos, hours, and remaining work live on the project",
          "Invite collaborators onto the project, not your whole workspace",
        ],
        cta: canManage ? (
          needClient ? (
            <Link to="/app/clients" style={{ textDecoration: "none" }}>
              <AppButton>
                <LuPlus size={16} /> Add a client first
              </AppButton>
            </Link>
          ) : (
            <AppButton onClick={() => openCreate()}>
              <LuPlus size={16} /> New project
            </AppButton>
          )
        ) : (
          <AppButton variant="secondary" disabled>
            Waiting for an invite
          </AppButton>
        ),
        mockup: <ProjectMockup />,
      } : undefined}
    >
      {error && (
        <Box mb={3} bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px" px={4} py={3}>
          <Text fontSize="0.8125rem" color="#991B1B">{error}</Text>
        </Box>
      )}

      {loading ? (
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading projects…</Text>
        </Box>
      ) : projects.length > 0 ? (
        <>
          <Box display="flex" gap={2} flexWrap="wrap" mb={4}>
            {([
              ["all", `All (${counts.all})`],
              ["active", `Active (${counts.active})`],
              ["waiting", `Waiting (${counts.waiting})`],
              ["done", `Done (${counts.done})`],
            ] as const).map(([id, label]) => (
              <Box
                key={id}
                as="button"
                h="32px"
                px={3}
                borderRadius="999px"
                fontSize="0.75rem"
                fontWeight="700"
                border={`1px solid ${filter === id ? APP_ACCENT : APP_BORDER}`}
                bg={filter === id ? "rgba(15,110,86,0.08)" : "white"}
                color={filter === id ? APP_ACCENT : APP_MUTED}
                onClick={() => setFilter(id)}
              >
                {label}
              </Box>
            ))}
          </Box>
          {visible.length === 0 ? (
            <Text fontSize="0.875rem" color={APP_MUTED}>No projects in this filter.</Text>
          ) : (
            <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={3}>
              {visible.map((project) => (
                <ProjectGlance
                  key={project.id}
                  project={project}
                  actions={canManage ? (
                    <>
                      <Box as="button" onClick={() => openRename(project)}
                        display="inline-flex" alignItems="center" gap={1}
                        color={APP_ACCENT} fontSize="0.75rem" fontWeight="600" cursor="pointer">
                        <LuPencil size={12} /> Edit
                      </Box>
                      <Box as="button" onClick={() => openDelete(project)}
                        display="inline-flex" alignItems="center" gap={1}
                        color="#B91C1C" fontSize="0.75rem" fontWeight="600" cursor="pointer">
                        <LuTrash2 size={12} /> Delete
                      </Box>
                    </>
                  ) : undefined}
                />
              ))}
            </Grid>
          )}
        </>
      ) : null}

      <DialogRoot
        open={dialog === "create" || dialog === "rename"}
        onOpenChange={({ open }) => { if (!open) setDialog(null) }}
        size={dialog === "create" ? "md" : "sm"}
      >
        <DialogContent style={{ ...DIALOG_PANEL_STYLE, maxHeight: "90vh" }}>
          <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
            <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
              {dialog === "rename" ? "Edit project" : "New project"}
            </DialogTitle>
            <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
          </Box>
          <DialogHeader display="none" />
          <Box as="form" onSubmit={(e) => { e.preventDefault(); void save() }}>
            <DialogBody px={6} py={5} display="grid" gap={4} maxH="70vh" overflowY="auto">
              <Field label="Name" required>
                <FormInput
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Website rebuild"
                  maxLength={80}
                />
              </Field>
              <Field label="Client" required>
                <FormNativeSelect value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Select a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{displayName(c)}</option>
                  ))}
                </FormNativeSelect>
              </Field>
              <Field label="Notes">
                <FormInput
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </Field>
              {dialog === "create" && (
                <Box pt={2} borderTop={`1px solid ${APP_BORDER}`}>
                  <InviteEmailsField emails={emails} onChange={setEmails} />
                </Box>
              )}
              {formError && <Text fontSize="0.8125rem" color="#B91C1C">{formError}</Text>}
            </DialogBody>
            <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
              <AppButton type="submit" loading={busy} flex={1}>
                {dialog === "rename" ? "Save" : "Create"}
              </AppButton>
              <AppButton variant="ghost" color={APP_MUTED} onClick={() => setDialog(null)}>Cancel</AppButton>
            </DialogFooter>
          </Box>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={dialog === "delete"} onOpenChange={({ open }) => { if (!open) setDialog(null) }} size="sm">
        <DialogContent style={{ borderRadius: "16px", border: "1px solid #D8DCE8", overflow: "hidden", boxShadow: "0 20px 60px rgba(11,21,40,0.18)" }}>
          <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
            <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
              Delete project
            </DialogTitle>
            <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
          </Box>
          <DialogHeader display="none" />
          <DialogBody px={6} py={5}>
            <Text fontSize="0.875rem" color={APP_MUTED} lineHeight="1.6">
              Remove <strong style={{ color: APP_INK }}>{active?.name}</strong>? To-dos, hours, files, and invoices for this project will be removed. This cannot be undone.
            </Text>
            {formError && <Text fontSize="0.8125rem" color="#B91C1C" mt={3}>{formError}</Text>}
          </DialogBody>
          <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
            <AppButton variant="danger" loading={busy} onClick={() => void remove()} flex={1}>
              Delete
            </AppButton>
            <AppButton variant="ghost" color={APP_MUTED} onClick={() => setDialog(null)}>Cancel</AppButton>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </PageShell>
  )
}
