import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { Box, Button, Spinner, Stack, Text } from "@chakra-ui/react"
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

const TRY_FMT = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" })

function money(n: number, currency = "TRY") {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(n)
  } catch {
    return TRY_FMT.format(n)
  }
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
                    <input
                      autoFocus
                      type="number"
                      min="0.25"
                      max="24"
                      step="0.25"
                      placeholder="Hours"
                      value={logHours}
                      onChange={(e) => setLogHours(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addHours(todo) } }}
                      style={{
                        width: 90, padding: "8px 12px", fontSize: "0.875rem",
                        border: `1px solid ${BORDER}`, borderRadius: "8px",
                        fontFamily: "inherit", outline: "none", background: SURFACE, color: INK,
                      }}
                    />
                    <Button size="sm" h="38px" px={3} borderRadius="8px" bg={ACCENT} color="white"
                      _hover={{ bg: "#0a5240" }} loading={logging} onClick={() => void addHours(todo)} disabled={!logHours}>
                      Log
                    </Button>
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
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTodo() } }}
              placeholder="Add a to-do…"
              style={{
                flex: 1, padding: "8px 12px", fontSize: "0.875rem",
                border: `1px solid ${BORDER}`, borderRadius: "8px",
                fontFamily: "inherit", outline: "none", background: SURFACE, color: INK,
              }}
            />
            <Button size="sm" h="38px" px={3} borderRadius="8px" bg={ACCENT} color="white"
              _hover={{ bg: "#0a5240" }} loading={saving} onClick={addTodo} disabled={!draft.trim()}>
              <LuPlus size={14} />
            </Button>
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

  const inputStyle: CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "0.875rem",
    border: `1px solid ${BORDER}`, borderRadius: "8px",
    fontFamily: "inherit", outline: "none", background: SURFACE, color: INK,
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
                  <Button size="xs" bg={ACCENT} color="white" onClick={() => agreeAgreement(inquiryId, a.id).then(load)}>Agree</Button>
                  <Button size="xs" variant="outline" borderColor={BORDER} onClick={() => declineAgreement(inquiryId, a.id).then(load)}>Decline</Button>
                </Box>
              )}
            </Box>
          ))}
          {error && <Text fontSize="0.8125rem" color="#B91C1C">{error}</Text>}
          <Box display="flex" gap={2}>
            <Button size="xs" variant={billingType === "hourly" ? "solid" : "outline"} bg={billingType === "hourly" ? ACCENT : SURFACE}
              color={billingType === "hourly" ? "white" : INK} borderColor={BORDER} onClick={() => setBillingType("hourly")}>Hourly</Button>
            <Button size="xs" variant={billingType === "project" ? "solid" : "outline"} bg={billingType === "project" ? ACCENT : SURFACE}
              color={billingType === "project" ? "white" : INK} borderColor={BORDER} onClick={() => setBillingType("project")}>Project</Button>
          </Box>
          {billingType === "hourly" ? (
            <Box display="flex" gap={2}>
              <input style={inputStyle} type="number" min="0" placeholder="Rate" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              <input style={inputStyle} type="number" min="0" placeholder="Est. hours" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
            </Box>
          ) : (
            <input style={inputStyle} type="number" min="0" placeholder="Project price" value={projectPrice} onChange={(e) => setProjectPrice(e.target.value)} />
          )}
          <input style={inputStyle} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button size="sm" alignSelf="flex-start" bg={ACCENT} color="white" _hover={{ bg: "#0a5240" }}
            loading={saving} onClick={propose}>
            Propose
          </Button>
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

  const inputStyle: CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "0.875rem",
    border: `1px solid ${BORDER}`, borderRadius: "8px",
    fontFamily: "inherit", outline: "none", background: SURFACE, color: INK,
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
              <input style={{ ...inputStyle, width: 90 }} type="number" min="0.25" max="24" step="0.25" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} />
              <input style={inputStyle} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
            </Box>
            <Button size="sm" alignSelf="flex-start" bg={ACCENT} color="white" loading={saving} onClick={add} disabled={!hours}>
              Log hours
            </Button>
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

  const inputStyle: CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "0.875rem",
    border: `1px solid ${BORDER}`, borderRadius: "8px",
    fontFamily: "inherit", outline: "none", background: SURFACE, color: INK,
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
              <Button size="xs" bg={ACCENT} color="white" onClick={() => updatePayment(inquiryId, p.id, { status: "paid" }).then(load)}>
                Mark paid
              </Button>
            )}
          </Box>
        ))}
        {canRecord && (
          <>
            <Box display="flex" gap={2}>
              <input style={{ ...inputStyle, width: 110 }} type="number" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </Box>
            <input style={inputStyle} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" alignSelf="flex-start" bg={ACCENT} color="white" loading={saving} onClick={add} disabled={!amount}>
              Record payment
            </Button>
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
