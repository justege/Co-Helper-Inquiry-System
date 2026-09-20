import { useEffect, useState } from "react"
import { Box } from "@chakra-ui/react"
import { AppButton } from "@/components/ui/AppButton"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DIALOG_PANEL_STYLE,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { FormInput } from "@/components/ui/form-controls"
import { HoursField, HOUR_STEP, LOG_HOUR_MIN } from "./HoursField"
import { createTodo, logTime, type WorkTodo } from "@/api/work"
import { addDaysIso, isoToday } from "@/lib/todoStyle"

export function AddTodoDialog({
  open,
  projectId,
  milestoneId,
  defaultStartAt,
  defaultDueAt,
  onClose,
  onCreated,
}: {
  open: boolean
  projectId: string
  milestoneId?: string | null
  defaultStartAt?: string
  defaultDueAt?: string
  onClose: () => void
  onCreated: (todo: WorkTodo) => void
}) {
  const [title, setTitle] = useState("")
  const [estimate, setEstimate] = useState("")
  const [criterion, setCriterion] = useState("")
  const [startAt, setStartAt] = useState(defaultStartAt ?? isoToday())
  const [dueAt, setDueAt] = useState(defaultDueAt ?? addDaysIso(isoToday(), 5))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle("")
    setEstimate("")
    setCriterion("")
    setError(null)
    setStartAt(defaultStartAt ?? isoToday())
    setDueAt(defaultDueAt ?? addDaysIso(defaultStartAt ?? isoToday(), 5))
  }, [open, defaultStartAt, defaultDueAt])

  async function submit() {
    if (!title.trim()) return
    if (!criterion.trim()) {
      setError("Add one acceptance criterion the client can test")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const est = estimate ? Number(estimate) : null
      const created = await createTodo(projectId, {
        title: title.trim(),
        estimatedHours: est && Number.isFinite(est) ? est : null,
        milestoneId: milestoneId || null,
        acceptanceCriteria: [criterion.trim()],
        startAt: startAt || null,
        dueAt: dueAt || null,
      })
      setTitle("")
      setEstimate("")
      setCriterion("")
      setStartAt(isoToday())
      setDueAt(addDaysIso(isoToday(), 5))
      onCreated(created)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not add to-do")
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={({ open: next }) => { if (!next) onClose() }}
      size="sm"
      placement="center"
    >
      <DialogContent style={DIALOG_PANEL_STYLE}>
        <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
          <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
            New to-do
          </DialogTitle>
          <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
        </Box>
        <DialogHeader display="none" />
        <Box as="form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <DialogBody px={6} py={5}>
            <Field label="Title" required>
              <FormInput
                autoFocus
                placeholder="What needs to get done"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
              />
            </Field>
            <Field label="Estimated hours">
              <FormInput
                mt={4}
                type="number"
                step={HOUR_STEP}
                min={LOG_HOUR_MIN}
                placeholder="Optional — 1, 2, or 0.25"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
              />
            </Field>
            <Field label="Start / due">
              <Box mt={4} display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <FormInput type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                <FormInput type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </Box>
            </Field>
            <Field label="Acceptance criterion" required invalid={Boolean(error)} errorText={error ?? undefined}>
              <FormInput
                mt={4}
                placeholder="What should the client check when this is done?"
                value={criterion}
                onChange={(e) => setCriterion(e.target.value)}
                maxLength={300}
              />
            </Field>
          </DialogBody>
          <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
            <AppButton type="submit" loading={busy} flex={1}>Add to-do</AppButton>
            <AppButton variant="ghost" onClick={onClose}>Cancel</AppButton>
          </DialogFooter>
        </Box>
      </DialogContent>
    </DialogRoot>
  )
}

export function LogHoursDialog({
  open,
  todoId,
  onClose,
  onLogged,
}: {
  open: boolean
  todoId: string | null
  onClose: () => void
  onLogged: () => void
}) {
  const [hours, setHours] = useState("1")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!todoId) return
    const n = Number(hours)
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter hours greater than 0")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await logTime(todoId, { hours: n })
      setHours("1")
      onLogged()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not log hours")
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={({ open: next }) => { if (!next) onClose() }}
      size="sm"
      placement="center"
    >
      <DialogContent style={DIALOG_PANEL_STYLE}>
        <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
          <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
            Log hours
          </DialogTitle>
          <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
        </Box>
        <DialogHeader display="none" />
        <Box as="form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <DialogBody px={6} py={5}>
            <Field label="Hours" required invalid={Boolean(error)} errorText={error ?? undefined}>
              <HoursField
                autoFocus
                value={hours}
                onChange={setHours}
                w="100%"
                h="44px"
              />
            </Field>
          </DialogBody>
          <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
            <AppButton type="submit" loading={busy} flex={1}>Save hours</AppButton>
            <AppButton variant="ghost" onClick={onClose}>Cancel</AppButton>
          </DialogFooter>
        </Box>
      </DialogContent>
    </DialogRoot>
  )
}
