import { useEffect, useState } from "react"
import { Box, Text } from "@chakra-ui/react"
import { FormInput, FormNativeSelect } from "@/components/ui/form-controls"
import {
  APP_BORDER,
  APP_LABEL,
} from "@/components/ui/appUi"
import { updateInquiry, type Inquiry } from "@/api/inquiries"
import { AppButton } from "@/components/ui/AppButton"
import {
  createWorkspaceProject,
  getWorkspaceProjects,
  type WorkspaceProject,
} from "@/api/workspace"

export function ProjectField({
  inquiry,
  canCreate,
  onUpdated,
}: {
  inquiry: Inquiry
  canCreate: boolean
  onUpdated: (inquiry: Inquiry) => void
}) {
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getWorkspaceProjects()
      .then((data) => setProjects(data.projects))
      .catch(() => setProjects([]))
  }, [])

  async function assign(projectId: string | null) {
    setBusy(true)
    setError(null)
    try {
      const updated = await updateInquiry(inquiry.id, { projectId })
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the project")
    } finally {
      setBusy(false)
    }
  }

  async function createAndAssign() {
    const next = name.trim()
    if (next.length < 1) {
      setError("Give the project a name")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const created = await createWorkspaceProject(next)
      setProjects((prev) => [...prev, created])
      const updated = await updateInquiry(inquiry.id, { projectId: created.id })
      onUpdated(updated)
      setName("")
      setCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that project")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: "1fr", sm: "120px 1fr" }}
      gap={{ base: 0.5, sm: 3 }}
      alignItems={{ base: "start", sm: "center" }}
      py={1.5}
      borderBottom={`1px solid ${APP_BORDER}`}
    >
      <Text fontSize="0.8125rem" color={APP_LABEL} fontWeight="500">Project</Text>
      <Box>
        {creating ? (
          <Box>
            <FormInput
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void createAndAssign()
                }
                if (e.key === "Escape") {
                  setCreating(false)
                  setError(null)
                }
              }}
            />
            <Box display="flex" gap={2} mt={2}>
              <AppButton size="sm" loading={busy} onClick={() => void createAndAssign()}>
                Create
              </AppButton>
              <AppButton size="sm" variant="ghost" onClick={() => { setCreating(false); setError(null) }}>
                Cancel
              </AppButton>
            </Box>
          </Box>
        ) : (
          <FormNativeSelect
            selectSize="sm"
            disabled={busy}
            value={inquiry.projectId ?? ""}
            onChange={(e) => {
              const value = e.target.value
              if (value === "__new") {
                setCreating(true)
                return
              }
              void assign(value || null)
            }}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
            {canCreate && <option value="__new">+ New project</option>}
          </FormNativeSelect>
        )}
        {error && <Text fontSize="0.6875rem" color="#B91C1C" mt={1}>{error}</Text>}
      </Box>
    </Box>
  )
}
