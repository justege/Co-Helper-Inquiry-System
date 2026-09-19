import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Grid, Spinner, Stack, Text } from "@chakra-ui/react"
import { LuFolderKanban, LuPencil, LuTrash2 } from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
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
  createWorkspaceProject,
  deleteWorkspaceProject,
  getMyWorkspace,
  getWorkspaceProjects,
  updateWorkspaceProject,
  type WorkspaceClient,
  type WorkspaceProject,
} from "@/api/workspace"
import { displayName } from "@/lib/people"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [clients, setClients] = useState<WorkspaceClient[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<"create" | "rename" | "delete" | null>(null)
  const [active, setActive] = useState<WorkspaceProject | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [clientId, setClientId] = useState("")
  const [view, setView] = useState<"list" | "cards">("list")
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ws, data] = await Promise.all([getMyWorkspace(), getWorkspaceProjects()])
      setCanManage(ws.role === "owner")
      if (ws.role === "owner") setClients(ws.clients)
      setProjects(data.projects)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load projects")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function openCreate() {
    setActive(null)
    setName("")
    setDescription("")
    setClientId(clients[0]?.id ?? "")
    setFormError(null)
    setDialog("create")
  }

  function openRename(project: WorkspaceProject) {
    setActive(project)
    setName(project.name)
    setDescription(project.description || "")
    setClientId(project.clientId)
    setFormError(null)
    setDialog("rename")
  }

  function openDelete(project: WorkspaceProject) {
    setActive(project)
    setFormError(null)
    setDialog("delete")
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
    setBusy(true)
    setFormError(null)
    try {
      if (dialog === "rename" && active) {
        const updated = await updateWorkspaceProject(active.id, { name: next, description, clientId })
        setProjects((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
      } else {
        const created = await createWorkspaceProject(next, clientId, description)
        setProjects((prev) => [created, ...prev])
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

  return (
    <PageShell
      eyebrow="Workspace"
      title="Projects"
      subtitle="Each project belongs to one client. Invite collaborators on the project page."
      action={
        <Box display="flex" gap={2} alignItems="center">
          <AppButton size="sm" variant={view === "list" ? "primary" : "secondary"} onClick={() => setView("list")}>List</AppButton>
          <AppButton size="sm" variant={view === "cards" ? "primary" : "secondary"} onClick={() => setView("cards")}>Cards</AppButton>
          {canManage ? (
            <AppButton size="sm" onClick={openCreate} disabled={clients.length === 0}>New project</AppButton>
          ) : undefined}
        </Box>
      }
    >
      {error && (
        <Box mb={3} bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px" px={4} py={3}>
          <Text fontSize="0.8125rem" color="#991B1B">{error}</Text>
        </Box>
      )}

      {canManage && clients.length === 0 && !loading && (
        <Box mb={4} bg="#FFF8E8" border="1px solid #F6E05E" borderRadius="12px" px={4} py={3}>
          <Text fontSize="0.875rem" color="#92400E">
            Add a client first, then create a project for them.{" "}
            <Link to="/app/clients" style={{ fontWeight: 700 }}>Go to clients</Link>
          </Text>
        </Box>
      )}

      {loading ? (
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading projects…</Text>
        </Box>
      ) : (
        <Box {...APP_CARD} overflow="hidden">
          <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}
            display="flex" alignItems="center" gap={2.5}>
            <Box color={APP_ACCENT}><LuFolderKanban size={16} /></Box>
            <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>Your projects</Text>
          </Box>
          <Box p={5}>
            {projects.length === 0 ? (
              <Text fontSize="0.875rem" color={APP_MUTED} lineHeight="1.6">
                No projects yet. Create one for a client, then invite collaborators.
              </Text>
            ) : view === "cards" ? (
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                {projects.map((project) => (
                  <Box key={project.id} px={4} py={4} bg={APP_BG_SUBTLE} borderRadius="14px" border={`1px solid ${APP_BORDER}`}>
                    <Link to={`/app/projects/${project.id}`} style={{ textDecoration: "none" }}>
                      <Text fontSize="1rem" fontWeight="700" color={APP_INK} mb={1}>{project.name}</Text>
                    </Link>
                    {project.description && <Text fontSize="0.8125rem" color={APP_MUTED} mb={2}>{project.description}</Text>}
                    <Text fontSize="0.75rem" color={APP_LABEL}>
                      {displayName(project.client)}
                      {project.collaboratorCount ? ` · ${project.collaboratorCount} collaborator${project.collaboratorCount === 1 ? "" : "s"}` : ""}
                    </Text>
                  </Box>
                ))}
              </Grid>
            ) : (
              <Stack gap={3}>
                {projects.map((project) => (
                  <Box key={project.id} display="flex" alignItems="center" justifyContent="space-between" gap={3}
                    px={4} py={3} bg={APP_BG_SUBTLE} borderRadius="10px" border={`1px solid ${APP_BORDER}`} flexWrap="wrap">
                    <Box minW={0}>
                      <Link to={`/app/projects/${project.id}`} style={{ textDecoration: "none" }}>
                        <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>{project.name}</Text>
                      </Link>
                      <Text fontSize="0.75rem" color={APP_LABEL}>
                        {displayName(project.client)}
                        {project.collaboratorCount ? ` · ${project.collaboratorCount} collaborator${project.collaboratorCount === 1 ? "" : "s"}` : ""}
                      </Text>
                    </Box>
                    {canManage && (
                      <Box display="flex" gap={3} alignItems="center">
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
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      )}

      <DialogRoot
        open={dialog === "create" || dialog === "rename"}
        onOpenChange={({ open }) => { if (!open) setDialog(null) }}
        size="sm"
      >
        <DialogContent style={{ borderRadius: "16px", border: "1px solid #D8DCE8", overflow: "hidden", boxShadow: "0 20px 60px rgba(11,21,40,0.18)" }}>
          <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
            <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
              {dialog === "rename" ? "Edit project" : "New project"}
            </DialogTitle>
            <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
          </Box>
          <DialogHeader display="none" />
          <Box as="form" onSubmit={(e) => { e.preventDefault(); void save() }}>
            <DialogBody px={6} py={5}>
              <Field label="Name" required errorText={formError ?? undefined} invalid={Boolean(formError)}>
                <FormInput
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Website rebuild"
                  maxLength={80}
                />
              </Field>
              <Field label="Client" required>
                <FormNativeSelect value={clientId} onChange={(e) => setClientId(e.target.value)} mt={4}>
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
                  mt={4}
                />
              </Field>
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
              Remove <strong style={{ color: APP_INK }}>{active?.name}</strong>? This cannot be undone.
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
