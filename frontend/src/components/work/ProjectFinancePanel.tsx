import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { LuReceipt } from "react-icons/lu"
import {
  getInvoices,
  getUnbilled,
  markInvoicePaid,
  sendInvoice,
  type Invoice,
  type TimeEntry,
  type WorkProject,
  type WorkTodo,
} from "@/api/work"
import { AppButton } from "@/components/ui/AppButton"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_INK,
  APP_MUTED,
  AppCard,
  AppStatCard,
} from "@/components/ui/appUi"
import { formatHours, formatMoney } from "@/lib/hours"
import { useTodoCard } from "./TodoCardContext"

function sumHours(entries: TimeEntry[]) {
  return entries.reduce((sum, entry) => sum + (entry.hours || 0), 0)
}

export function ProjectFinancePanel({
  project,
  todos,
  currency,
  canManage,
  onChanged,
  onCreateInvoice,
}: {
  project: WorkProject
  todos: WorkTodo[]
  currency: string
  canManage: boolean
  onChanged: () => void
  onCreateInvoice: () => void
}) {
  const { openTodo } = useTodoCard()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [unbilledEntries, setUnbilledEntries] = useState<TimeEntry[]>([])
  const [hourlyRate, setHourlyRate] = useState<number | null>(project.hourlyRate)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function loadFinance() {
    setLoading(true)
    Promise.all([getInvoices(), getUnbilled(project.id)])
      .then(([inv, unbilled]) => {
        setInvoices(inv.invoices.filter((row) => row.projectId === project.id))
        setUnbilledEntries(unbilled.entries)
        setHourlyRate(unbilled.hourlyRate ?? project.hourlyRate)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadFinance()
  }, [project.id, project.unbilledHours, todos.length])

  const doneTodos = useMemo(
    () => todos.filter((todo) => todo.status === "done"),
    [todos]
  )
  const invoicedTodos = useMemo(
    () => todos.filter((todo) => todo.status === "invoiced"),
    [todos]
  )

  const unbilledHours = project.unbilledHours ?? sumHours(unbilledEntries)
  const doneHours = doneTodos.reduce((sum, todo) => sum + (todo.loggedHours || 0), 0)
  const invoicedTodoHours = invoicedTodos.reduce((sum, todo) => sum + (todo.loggedHours || 0), 0)
  const rate = hourlyRate ?? project.hourlyRate ?? 0

  const awaitingInvoices = invoices.filter((inv) => inv.status === "draft" || inv.status === "sent")
  const paidInvoices = invoices.filter((inv) => inv.status === "paid")

  const awaitingTotal = awaitingInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const paidTotal = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)

  const unbilledAmount = rate > 0 ? unbilledHours * rate : null
  const readyAmount = rate > 0 ? Math.max(unbilledHours, doneHours) * rate : null

  const unbilledByTodo = useMemo(() => {
    const map = new Map<string, { title: string; hours: number }>()
    for (const entry of unbilledEntries) {
      const key = entry.todoId || entry.id
      const title = entry.todoTitle || entry.note || "General time"
      const current = map.get(key) || { title, hours: 0 }
      current.hours += entry.hours || 0
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => b.hours - a.hours)
  }, [unbilledEntries])

  async function markPaid(invoiceId: string) {
    setBusyId(invoiceId)
    try {
      await markInvoicePaid(invoiceId)
      loadFinance()
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  async function sendInv(invoiceId: string) {
    setBusyId(invoiceId)
    try {
      await sendInvoice(invoiceId)
      loadFinance()
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  if (loading && invoices.length === 0 && unbilledEntries.length === 0) {
    return (
      <Box py={10} display="flex" justifyContent="center">
        <Spinner />
      </Box>
    )
  }

  return (
    <Box display="grid" gap={4}>
      {error && <Text fontSize="0.8125rem" color="#B91C1C">{error}</Text>}

      <Box display="grid" gridTemplateColumns={{ base: "1fr 1fr", lg: "repeat(4, 1fr)" }} gap={3}>
        <AppStatCard
          label="Unbilled"
          value={formatHours(unbilledHours)}
          hint={unbilledAmount != null ? formatMoney(unbilledAmount, currency) : "Billable time not on an invoice yet"}
        />
        <AppStatCard
          label="Ready to invoice"
          value={formatHours(Math.max(unbilledHours, doneHours))}
          hint={
            doneTodos.length
              ? `${doneTodos.length} finished to-do${doneTodos.length === 1 ? "" : "s"}`
              : unbilledHours > 0
                ? "Billable time not invoiced yet"
                : "Finish work, then invoice from here"
          }
        />
        <AppStatCard
          label="Awaiting payment"
          value={formatMoney(awaitingTotal, currency)}
          hint={
            awaitingInvoices.length
              ? `${awaitingInvoices.length} invoice${awaitingInvoices.length === 1 ? "" : "s"} sent · not paid yet`
              : "Nothing waiting on the client"
          }
        />
        <AppStatCard
          label="Paid"
          value={formatMoney(paidTotal, currency)}
          hint={
            paidInvoices.length || invoicedTodoHours
              ? `${paidInvoices.length} invoice${paidInvoices.length === 1 ? "" : "s"}${invoicedTodoHours ? ` · ${formatHours(invoicedTodoHours)} on paid work` : ""}`
              : "Paid work shows here"
          }
        />
      </Box>

      {canManage && (unbilledHours > 0 || doneTodos.length > 0) && (
        <AppCard
          label="Ready to invoice"
          action={
            <AppButton size="sm" onClick={onCreateInvoice} disabled={!unbilledHours && doneTodos.length === 0}>
              <LuReceipt size={14} /> Create invoice
            </AppButton>
          }
        >
          <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
            {unbilledHours > 0
              ? `${formatHours(unbilledHours)} will be grouped by to-do${readyAmount != null ? ` · about ${formatMoney(readyAmount, currency)} at ${formatMoney(rate, currency)}/h` : ""}.`
              : "Done to-dos are ready — log billable time or invoice fixed-price work."}
          </Text>
          {unbilledByTodo.length > 0 && (
            <Box display="grid" gap={0} mb={doneTodos.length ? 4 : 0}>
              {unbilledByTodo.map((row, rowIndex) => (
                <Box
                  key={row.title}
                  display="flex"
                  justifyContent="space-between"
                  gap={3}
                  py={2.5}
                  borderTop={rowIndex === 0 ? "none" : `1px solid ${APP_BORDER}`}
                >
                  <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>{row.title}</Text>
                  <Text fontSize="0.875rem" color={APP_MUTED}>{formatHours(row.hours)}</Text>
                </Box>
              ))}
            </Box>
          )}
          {doneTodos.map((todo, index) => (
            <Box
              key={todo.id}
              as="button"
              w="100%"
              textAlign="left"
              display="flex"
              justifyContent="space-between"
              gap={3}
              py={2.5}
              borderTop={`1px solid ${APP_BORDER}`}
              borderTopWidth={index === 0 && unbilledByTodo.length === 0 ? 0 : undefined}
              onClick={() => openTodo(todo.id)}
            >
              <Box minW={0}>
                <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>{todo.title}</Text>
                <Text fontSize="0.75rem" color={APP_MUTED} mt="2px">Done · not on an invoice yet</Text>
              </Box>
              <Text fontSize="0.875rem" color={APP_MUTED} flexShrink={0}>
                {formatHours(todo.loggedHours)}
                {todo.estimatedHours != null ? ` / ${formatHours(todo.estimatedHours)}` : ""}
              </Text>
            </Box>
          ))}
        </AppCard>
      )}

      <AppCard label="Invoices">
        {invoices.length === 0 ? (
          <Text fontSize="0.875rem" color={APP_MUTED}>
            {canManage
              ? "No invoices yet. When work is done, create one from the unbilled hours above."
              : "No invoices for this project yet."}
          </Text>
        ) : (
          invoices.map((invoice, index) => (
            <Box
              key={invoice.id}
              display="flex"
              flexWrap="wrap"
              alignItems="center"
              justifyContent="space-between"
              gap={3}
              py={3}
              borderTop={index === 0 ? "none" : `1px solid ${APP_BORDER}`}
            >
              <Box minW={0}>
                <Link to={`/app/invoices/${invoice.id}`} style={{ textDecoration: "none" }}>
                  <Text fontWeight="700" fontSize="0.875rem" color={APP_ACCENT}>{invoice.number}</Text>
                </Link>
                <Text fontSize="0.75rem" color={APP_MUTED} mt="2px">
                  {invoice.status === "paid"
                    ? `Paid${invoice.paidAt ? ` · ${new Date(invoice.paidAt).toLocaleDateString()}` : ""}`
                    : invoice.status === "sent"
                      ? "Sent · awaiting client payment"
                      : invoice.status === "draft"
                        ? "Draft · not sent yet"
                        : invoice.status}
                  {invoice.sentAt && invoice.status !== "paid" ? ` · sent ${new Date(invoice.sentAt).toLocaleDateString()}` : ""}
                </Text>
              </Box>
              <Box display="flex" alignItems="center" gap={2} flexShrink={0}>
                <Text fontWeight="700" fontSize="0.875rem" color={APP_INK}>
                  {formatMoney(invoice.total, invoice.currency || currency)}
                </Text>
                {canManage && invoice.status === "draft" && (
                  <AppButton size="sm" variant="secondary" loading={busyId === invoice.id} onClick={() => void sendInv(invoice.id)}>
                    Send
                  </AppButton>
                )}
                {canManage && (invoice.status === "sent" || invoice.status === "draft") && (
                  <AppButton size="sm" loading={busyId === invoice.id} onClick={() => void markPaid(invoice.id)}>
                    Mark paid
                  </AppButton>
                )}
              </Box>
            </Box>
          ))
        )}
      </AppCard>

      {(invoicedTodos.length > 0 || paidInvoices.length > 0) && (
        <AppCard label="Paid work">
          <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
            To-dos move here after invoicing. Mark invoices paid when the client pays — manually or after they confirm.
          </Text>
          {invoicedTodos.map((todo, index) => (
            <Box
              key={todo.id}
              as="button"
              w="100%"
              textAlign="left"
              display="flex"
              justifyContent="space-between"
              gap={3}
              py={2.5}
              borderTop={index === 0 ? "none" : `1px solid ${APP_BORDER}`}
              onClick={() => openTodo(todo.id)}
            >
              <Box minW={0}>
                <Text fontSize="0.875rem" fontWeight="600" color={APP_MUTED}>{todo.title}</Text>
                <Text fontSize="0.75rem" color={APP_MUTED} mt="2px">Invoiced</Text>
              </Box>
              <Text fontSize="0.875rem" color={APP_MUTED}>{formatHours(todo.loggedHours)}</Text>
            </Box>
          ))}
        </AppCard>
      )}

      {!canManage && awaitingInvoices.length > 0 && (
        <Box bg={APP_BG_SUBTLE} border={`1px solid ${APP_BORDER}`} borderRadius="12px" p={4}>
          <Text fontSize="0.875rem" fontWeight="600" color={APP_INK} mb={1}>
            {formatMoney(awaitingTotal, currency)} awaiting your payment
          </Text>
          <Text fontSize="0.8125rem" color={APP_MUTED}>
            Open an invoice above to review line items. Your freelancer will mark it paid once received.
          </Text>
        </Box>
      )}
    </Box>
  )
}
