import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { PageShell } from "@/components/ui/PageShell"
import { AppButton } from "@/components/ui/AppButton"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import {
  cancelInvoice,
  downloadInvoicePdf,
  getInvoice,
  markInvoicePaid,
  sendInvoice,
  type Invoice,
  type InvoiceLine,
} from "@/api/work"
import { formatHours, formatMoney } from "@/lib/hours"
import { displayName } from "@/lib/people"

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [role, setRole] = useState<string>("")
  const [projectName, setProjectName] = useState("")
  const [clientName, setClientName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function load() {
    if (!id) return
    getInvoice(id)
      .then((r) => {
        setInvoice(r.invoice)
        setLines(r.lines)
        setRole(r.role)
        setProjectName(r.projectName)
        setClientName(displayName(r.client))
      })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => { load() }, [id])

  if (error) return <PageShell eyebrow="Invoices" title="Invoice" backHref="/app/invoices"><Text color="#B91C1C">{error}</Text></PageShell>
  if (!invoice) return <PageShell eyebrow="Invoices" title="Invoice" backHref="/app/invoices"><Spinner /></PageShell>

  const owner = role === "owner" || role === "admin"

  return (
    <PageShell eyebrow="Invoices" title={invoice.number} backHref="/app/invoices">
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5} mb={5}>
        <Text fontWeight="700" color={APP_INK}>{projectName}</Text>
        <Text fontSize="0.8125rem" color={APP_MUTED} mb={3}>
          {clientName} · {invoice.status} · {formatMoney(invoice.total, invoice.currency)}
        </Text>
        <Box display="flex" gap={2} flexWrap="wrap">
          <AppButton size="sm" variant="secondary" onClick={() => downloadInvoicePdf(invoice.id, invoice.number)}>
            Download PDF
          </AppButton>
          {owner && invoice.status === "draft" && (
            <AppButton size="sm" loading={busy} onClick={async () => {
              setBusy(true)
              try { await sendInvoice(invoice.id); load() } finally { setBusy(false) }
            }}>Send</AppButton>
          )}
          {owner && (invoice.status === "sent" || invoice.status === "draft") && (
            <AppButton size="sm" loading={busy} onClick={async () => {
              setBusy(true)
              try { await markInvoicePaid(invoice.id); load() } finally { setBusy(false) }
            }}>Mark paid</AppButton>
          )}
          {owner && invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <AppButton size="sm" variant="ghost" color="#B91C1C" loading={busy} onClick={async () => {
              setBusy(true)
              try { await cancelInvoice(invoice.id); load() } finally { setBusy(false) }
            }}>Cancel</AppButton>
          )}
        </Box>
      </Box>
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        {lines.map((line) => (
          <Box key={line.id} px={5} py={3} borderBottom={`1px solid ${APP_BORDER}`} display="flex" justifyContent="space-between" gap={3}>
            <Box>
              <Text fontWeight="600" color={APP_INK}>{line.description}</Text>
              <Text fontSize="0.75rem" color={APP_MUTED}>{formatHours(line.hours)} · {formatMoney(line.rate, invoice.currency)}/h</Text>
            </Box>
            <Text fontWeight="700">{formatMoney(line.amount, invoice.currency)}</Text>
          </Box>
        ))}
        <Box px={5} py={4} display="flex" justifyContent="space-between">
          <Text fontWeight="700">Total</Text>
          <Text fontWeight="700">{formatMoney(invoice.total, invoice.currency)}</Text>
        </Box>
      </Box>
    </PageShell>
  )
}
