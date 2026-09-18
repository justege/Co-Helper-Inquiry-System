import { useCallback, useEffect, useState } from "react"
import { Box, Spinner, Stack, Text } from "@chakra-ui/react"
import { LuCheck, LuClock, LuPlus, LuTrash2 } from "react-icons/lu"
import EditWithAI from "@/components/ai/EditWithAI"
import {
  APP_ACCENT as ACCENT,
  APP_BG_SUBTLE as BG_SUBTLE,
  APP_BORDER as BORDER,
  APP_INK as INK,
  APP_LABEL as LABEL,
  APP_MUTED as MUTED,
  APP_SURFACE as SURFACE,
  AppCard as Card,
} from "@/components/ui/appUi"
import { AppButton } from "@/components/ui/AppButton"
import {
  agreeAgreement,
  createTodo,
  declineAgreement,
  deleteTimeEntry,
  deleteTodo,
  getJobFinance,
  listAgreements,
  listPayments,
  listTimeEntries,
  listTodos,
  logTime,
  proposeAgreement,
  recordPayment,
  updatePayment,
  updateTodo,
  type InquiryTodo,
  type JobFinance,
  type Payment,
  type PriceAgreement,
  type TimeEntry,
} from "@/api/job"

import { formatMoney } from "@/lib/money"
import { AppInput } from "@/components/ui/AppInput"
import { AppSelect } from "@/components/ui/AppSelect"

function money(n: number, currency = "EUR") {
  return formatMoney(n, currency)
}

export function TodosCard({
  inquiryId,
  canLog,
  onHoursLogged,
  refreshKey,
}: {
  inquiryId: string
  canLog?: boolean
  onHoursLogged?: () => void
  refreshKey?: number
}) {
  const [todos, setTodos] = useState<InquiryTodo[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logFor, setLogFor] = useState<string | null>(null)
  const [logHours, setLogHours] = useState("")
  const [logging, setLogging] = useState(false)

  const load = useCallback(() => {
    listTodos(inquiryId)
      .then(setTodos)
      .catch(() => setTodos([]))
      .finally(() => setLoading(false))
  }, [inquiryId])

  useEffect(() => { load() }, [load, refreshKey])

  async function addTodo() {
    const title = draft.trim()
    if (!title) return
    setSaving(true)
    setError(null)
    try {
      const todo = await createTodo(inquiryId, { title })
      setTodos((prev) => [...prev, todo])
      setDraft("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not add to-do")
    } finally {
      setSaving(false)
    }
  }

  async function toggle(todo: InquiryTodo) {
    const next = todo.status === "done" ? "open" : "done"
    const updated = await updateTodo(inquiryId, todo.id, { status: next })
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...updated, hoursLogged: t.hoursLogged } : t)))
  }

  async function addHours(todo: InquiryTodo) {
    const n = Number(logHours)
    if (!(n > 0)) return
    setLogging(true)
    setError(null)
    try {
      await logTime(inquiryId, { hours: n, todoId: todo.id })
      setTodos((prev) => prev.map((t) => (
        t.id === todo.id ? { ...t, hoursLogged: (t.hoursLogged || 0) + n } : t
      )))
      setLogHours("")
      setLogFor(null)
      onHoursLogged?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not log hours")
    } finally {
      setLogging(false)
    }
  }

  return (
    <Card label="To-dos">
      {loading ? (
        <Box display="flex" alignItems="center" gap={2}>
          <Spinner size="sm" color="gray.500" />
          <Text fontSize="0.875rem" color={MUTED}>Loading…</Text>
        </Box>
      ) : (
        <Stack gap={3}>
          {todos.length === 0 && (
            <Text fontSize="0.875rem" color={MUTED}>No to-dos yet. Checklist items from Trello land here.</Text>
          )}
          <Stack gap={0}>
            {todos.map((todo) => (
              <Box key={todo.id} py={2.5} borderBottom={`1px solid ${BORDER}`} _last={{ borderBottom: "none" }}>
                <Box display="flex" alignItems="flex-start" gap={3}>
                  <Box
                    as="button"
                    w="20px" h="20px" mt="1px" flexShrink={0} borderRadius="4px"
                    border={`1.5px solid ${todo.status === "done" ? ACCENT : BORDER}`}
                    bg={todo.status === "done" ? ACCENT : SURFACE}
                    color="white"
                    display="flex" alignItems="center" justifyContent="center"
                    onClick={() => toggle(todo)}
                  >
                    {todo.status === "done" && <LuCheck size={11} />}
                  </Box>
                  <Box flex="1" minW={0}>
                    <Text fontSize="0.875rem" color={todo.status === "done" ? LABEL : INK}
                      textDecoration={todo.status === "done" ? "line-through" : "none"}>
                      {todo.title}
                    </Text>
                    {todo.body && (
                      <Text fontSize="0.75rem" color={LABEL} mt={0.5}>{todo.body}</Text>
                    )}
                  </Box>
                  {todo.hoursLogged > 0 && (
                    <Text fontSize="0.75rem" fontWeight="600" color={INK} flexShrink={0} mt="2px">
                      {todo.hoursLogged.toFixed(todo.hoursLogged % 1 ? 1 : 0)} h
                    </Text>
                  )}
                  {canLog && (
                    <Box
                      as="button"
                      color={logFor === todo.id ? ACCENT : MUTED}
                      _hover={{ color: INK }}
                      onClick={() => { setLogFor(logFor === todo.id ? null : todo.id); setLogHours("") }}
                      title="Log hours on this to-do"
                    >
                      <LuClock size={14} />
                    </Box>
                  )}
                  <Box as="button" color={MUTED} _hover={{ color: INK }} onClick={() => deleteTodo(inquiryId, todo.id).then(load)}>
                    <LuTrash2 size={13} />
                  </Box>
                </Box>
                {canLog && logFor === todo.id && (
                  <Box display="flex" gap={2} mt={2} pl="32px">
                    <AppInput
                      autoFocus
                      type="number"
                      min="0.25"
                      max="24"
                      step="0.25"
                      placeholder="Hours"
                      controlSize="sm"
                      w="90px"
                      value={logHours}
                      onChange={(e) => setLogHours(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addHours(todo) } }}
                    />
                    <AppButton size="sm" loading={logging} onClick={() => void addHours(todo)} disabled={!logHours}>
                      Log
                    </AppButton>
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
          {error && <Text fontSize="0.8125rem" color="#B91C1C">{error}</Text>}
          {draft.trim() && (
            <Box display="flex" justifyContent="flex-end">
              <EditWithAI inquiryId={inquiryId} target="todo" getText={() => draft} onApply={setDraft} />
            </Box>
          )}
          <Box display="flex" gap={2}>
            <AppInput
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTodo() } }}
              placeholder="Add a to-do…"
              controlSize="sm"
              flex="1"
            />
            <AppButton size="sm" variant="accent" loading={saving} onClick={addTodo} disabled={!draft.trim()}>
              <LuPlus size={14} />
            </AppButton>
          </Box>
        </Stack>
      )}
    </Card>
  )
}

export function AgreementCard({ inquiryId, currentUserId }: { inquiryId: string; currentUserId: string | null }) {
  const [agreements, setAgreements] = useState<PriceAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [billingType, setBillingType] = useState<"hourly" | "project">("hourly")
  const [hourlyRate, setHourlyRate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")
  const [projectPrice, setProjectPrice] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    listAgreements(inquiryId).then(setAgreements).catch(() => setAgreements([])).finally(() => setLoading(false))
  }, [inquiryId])

  useEffect(() => { load() }, [load])

  async function propose() {
    setSaving(true)
    setError(null)
    try {
      await proposeAgreement(inquiryId, {
        billingType,
        hourlyRate: billingType === "hourly" ? Number(hourlyRate) : undefined,
        estimatedHours: billingType === "hourly" && estimatedHours ? Number(estimatedHours) : undefined,
        projectPrice: billingType === "project" ? Number(projectPrice) : undefined,
        notes: notes.trim() || undefined,
      })
      setHourlyRate(""); setEstimatedHours(""); setProjectPrice(""); setNotes("")
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not propose")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card label="Price agreement">
      {loading ? (
        <Spinner size="sm" color="gray.500" />
      ) : (
        <Stack gap={3}>
          {agreements.map((a) => (
            <Box key={a.id} p={3} border={`1px solid ${BORDER}`} borderRadius="8px" bg={BG_SUBTLE}>
              <Text fontSize="0.8125rem" fontWeight="600" color={INK}>
                {a.billingType === "hourly"
                  ? `${money(a.hourlyRate ?? 0, a.currency)} / hour`
                  : money(a.projectPrice ?? 0, a.currency)}
                {" · "}
                <Text as="span" textTransform="capitalize" color={LABEL}>{a.status}</Text>
              </Text>
              {a.notes && <Text fontSize="0.75rem" color={MUTED} mt={1}>{a.notes}</Text>}
              {a.status === "proposed" && a.proposedBy !== currentUserId && (
                <Box display="flex" gap={2} mt={2}>
                  <AppButton size="sm" onClick={() => agreeAgreement(inquiryId, a.id).then(load)}>Agree</AppButton>
                  <AppButton size="sm" variant="danger" onClick={() => declineAgreement(inquiryId, a.id).then(load)}>Decline</AppButton>
                </Box>
              )}
            </Box>
          ))}
          {error && <Text fontSize="0.8125rem" color="#B91C1C">{error}</Text>}
          <Box display="flex" gap={2}>
            <AppButton size="sm" variant={billingType === "hourly" ? "primary" : "secondary"} onClick={() => setBillingType("hourly")}>Hourly</AppButton>
            <AppButton size="sm" variant={billingType === "project" ? "primary" : "secondary"} onClick={() => setBillingType("project")}>Project</AppButton>
          </Box>
          {billingType === "hourly" ? (
            <Box display="flex" gap={2}>
              <AppInput type="number" min="0" placeholder="Rate" controlSize="sm" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              <AppInput type="number" min="0" placeholder="Est. hours" controlSize="sm" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
            </Box>
          ) : (
            <AppInput type="number" min="0" placeholder="Project price" controlSize="sm" value={projectPrice} onChange={(e) => setProjectPrice(e.target.value)} />
          )}
          <AppInput placeholder="Notes (optional)" controlSize="sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <AppButton size="sm" loading={saving} onClick={propose}>
            Propose
          </AppButton>
        </Stack>
      )}
    </Card>
  )
}

export function HoursCard({
  inquiryId,
  canLog,
  refreshKey,
  onHoursLogged,
}: {
  inquiryId: string
  canLog: boolean
  refreshKey?: number
  onHoursLogged?: () => void
}) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [hours, setHours] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    listTimeEntries(inquiryId).then(setEntries).catch(() => setEntries([]))
  }, [inquiryId])
  useEffect(() => { load() }, [load, refreshKey])

  async function add() {
    const n = Number(hours)
    if (!(n > 0)) return
    setSaving(true)
    try {
      await logTime(inquiryId, { hours: n, note: note.trim() || undefined })
      setHours(""); setNote("")
      load()
      onHoursLogged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card label="Hours">
      <Stack gap={3}>
        {entries.length === 0 && <Text fontSize="0.875rem" color={MUTED}>No hours logged yet.</Text>}
        {entries.map((e) => (
          <Box key={e.id} display="flex" justifyContent="space-between" gap={3} py={2} borderBottom={`1px solid ${BORDER}`}>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK}>{e.hours} h</Text>
              <Text fontSize="0.75rem" color={LABEL}>
                {e.entryDate}
                {e.todoTitle ? ` · ${e.todoTitle}` : ""}
                {e.note && e.note !== e.todoTitle ? ` · ${e.note}` : ""}
              </Text>
            </Box>
            {canLog && (
              <Box as="button" color={MUTED} onClick={() => deleteTimeEntry(inquiryId, e.id).then(() => { load(); onHoursLogged?.() })}>
                <LuTrash2 size={13} />
              </Box>
            )}
          </Box>
        ))}
        {canLog && (
          <>
            <Box display="flex" gap={2}>
              <AppInput type="number" min="0.25" max="24" step="0.25" placeholder="Hours" controlSize="sm" w="90px" value={hours} onChange={(e) => setHours(e.target.value)} />
              <AppInput placeholder="Note" controlSize="sm" value={note} onChange={(e) => setNote(e.target.value)} />
            </Box>
            <AppButton size="sm" loading={saving} onClick={add} disabled={!hours}>
              Log hours
            </AppButton>
          </>
        )}
      </Stack>
    </Card>
  )
}

export function PaymentsCard({ inquiryId, canRecord }: { inquiryId: string; canRecord: boolean }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [status, setStatus] = useState<"unpaid" | "partial" | "paid">("paid")
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    listPayments(inquiryId).then(setPayments).catch(() => setPayments([]))
  }, [inquiryId])
  useEffect(() => { load() }, [load])

  async function add() {
    const n = Number(amount)
    if (!(n > 0)) return
    setSaving(true)
    try {
      await recordPayment(inquiryId, { amount: n, status, note: note.trim() || undefined })
      setAmount(""); setNote("")
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card label="Payments">
      <Stack gap={3}>
        {payments.length === 0 && <Text fontSize="0.875rem" color={MUTED}>No payments recorded.</Text>}
        {payments.map((p) => (
          <Box key={p.id} display="flex" justifyContent="space-between" gap={3} py={2} borderBottom={`1px solid ${BORDER}`}>
            <Box>
              <Text fontSize="0.875rem" fontWeight="600" color={INK}>{money(p.amount, p.currency)}</Text>
              <Text fontSize="0.75rem" color={LABEL} textTransform="capitalize">{p.status}{p.note ? ` · ${p.note}` : ""}</Text>
            </Box>
            {canRecord && p.status !== "paid" && (
              <AppButton size="sm" onClick={() => updatePayment(inquiryId, p.id, { status: "paid" }).then(load)}>
                Mark paid
              </AppButton>
            )}
          </Box>
        ))}
        {canRecord && (
          <>
            <Box display="flex" gap={2}>
              <AppInput type="number" min="0" placeholder="Amount" controlSize="sm" w="120px" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <AppSelect controlSize="sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </AppSelect>
            </Box>
            <AppInput placeholder="Note (optional)" controlSize="sm" value={note} onChange={(e) => setNote(e.target.value)} />
            <AppButton size="sm" loading={saving} onClick={add} disabled={!amount}>
              Record payment
            </AppButton>
          </>
        )}
      </Stack>
    </Card>
  )
}

export function FinanceSnapshot({ inquiryId, refreshKey }: { inquiryId: string; refreshKey?: number }) {
  const [snap, setSnap] = useState<JobFinance | null>(null)

  useEffect(() => {
    getJobFinance(inquiryId).then(setSnap).catch(() => setSnap(null))
  }, [inquiryId, refreshKey])

  if (!snap) return null

  return (
    <Card label="This job">
      <Stack gap={2}>
        <Text fontSize="0.875rem" color={INK}><Text as="span" color={LABEL}>Agreed </Text>{money(snap.agreedValue, snap.currency)}</Text>
        <Text fontSize="0.875rem" color={INK}><Text as="span" color={LABEL}>Paid </Text>{money(snap.paid, snap.currency)}</Text>
        <Text fontSize="0.875rem" color={INK}><Text as="span" color={LABEL}>Remaining </Text>{money(snap.remaining, snap.currency)}</Text>
        <Text fontSize="0.875rem" color={INK}><Text as="span" color={LABEL}>Hours </Text>{snap.billableHours.toFixed(1)} h</Text>
      </Stack>
    </Card>
  )
}
