import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { PageShell } from "@/components/ui/PageShell"
import { AppButton } from "@/components/ui/AppButton"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE, APP_BG_SUBTLE } from "@/components/ui/appUi"
import {
  cancelInvoice,
  downloadInvoicePdf,
  getInvoice,
  markInvoicePaid,
  sendInvoice,
  type Invoice,
  type InvoiceLine,
} from "@/api/work"
import { formatHours, formatMoney, formatSheetDate } from "@/lib/hours"
import { displayName } from "@/lib/people"

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [role, setRole] = useState<string>("")
  const [projectName, setProjectName] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientId, setClientId] = useState<string | null>(null)
  const [billing, setBilling] = useState<{ complete: boolean; missing: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
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
        setClientId(r.client?.id || r.invoice.clientId || null)
        setBilling(r.billing ? { complete: r.billing.complete, missing: r.billing.missing } : null)
      })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => { load() }, [id])

  if (error) return <PageShell eyebrow="Invoices" title="Invoice" backHref="/app/invoices"><Text color="#B91C1C">{error}</Text></PageShell>
  if (!invoice) return <PageShell eyebrow="Invoices" title="Invoice" backHref="/app/invoices"><Spinner /></PageShell>

  const owner = role === "owner" || role === "admin"
  const taxAmount = invoice.total - invoice.subtotal

  return (
    <PageShell
      eyebrow="Invoices"
      title={invoice.number}
      backHref="/app/invoices"
      stats={[
        { label: "Total", value: formatMoney(invoice.total, invoice.currency) },
        { label: "Status", value: invoice.status },
        { label: "VAT", value: formatMoney(taxAmount, invoice.currency) },
        { label: "Lines", value: String(lines.length) },
      ]}
    >
      {owner && billing && !billing.complete && (
        <Box bg="#FFFBEB" border="1px solid #FCD34D" borderRadius="14px" p={4} mb={4}>
          <Text fontWeight="700" color={APP_INK} mb={1}>ZUGFeRD details missing</Text>
          <Text fontSize="0.8125rem" color={APP_MUTED} mb={2}>
            A German e-invoice needs complete seller and client address data. Fill Settings and the client record before sending.
          </Text>
          <Text fontSize="0.75rem" color="#92400E">{billing.missing.join(" · ")}</Text>
          <Box display="flex" gap={2} mt={3} flexWrap="wrap">
            <Link to="/app/settings"><AppButton size="sm" variant="secondary">Your invoice details</AppButton></Link>
            {clientId && <Link to={`/app/clients/${clientId}`}><AppButton size="sm" variant="ghost">Client details</AppButton></Link>}
          </Box>
        </Box>
      )}
      {actionError && <Text color="#B91C1C" fontSize="0.8125rem" mb={3}>{actionError}</Text>}
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5} mb={5}>
        <Text fontWeight="700" color={APP_INK}>{projectName}</Text>
        <Text fontSize="0.8125rem" color={APP_MUTED} mb={1}>
          {clientName} · {invoice.status}
        </Text>
        <Text fontSize="0.75rem" color={APP_MUTED} mb={3}>
          Issued {formatSheetDate(invoice.issueDate || invoice.createdAt)}
          {invoice.serviceDate ? ` · Service ${formatSheetDate(invoice.serviceDate)}` : ""}
          {invoice.dueAt ? ` · Due ${formatSheetDate(invoice.dueAt)}` : ""}
          {billing?.complete ? " · ZUGFeRD EN 16931" : ""}
        </Text>
        <Box display="flex" gap={2} flexWrap="wrap">
          <AppButton size="sm" variant="secondary" onClick={async () => {
            setActionError(null)
            try { await downloadInvoicePdf(invoice.id, invoice.number) }
            catch (e: unknown) { setActionError(e instanceof Error ? e.message : "Could not download PDF") }
          }}>
            Download PDF
          </AppButton>
          {owner && invoice.status === "draft" && (
            <AppButton size="sm" loading={busy} onClick={async () => {
              setBusy(true)
              setActionError(null)
              try { await sendInvoice(invoice.id); load() }
              catch (e: unknown) { setActionError(e instanceof Error ? e.message : "Could not send") }
              finally { setBusy(false) }
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
              <Text fontSize="0.75rem" color={APP_MUTED}>
                {line.hours > 0
                  ? `${formatHours(line.hours)} · ${formatMoney(line.rate, invoice.currency)}/h`
                  : "Pass-through cost"}
              </Text>
            </Box>
            <Text fontWeight="700">{formatMoney(line.amount, invoice.currency)}</Text>
          </Box>
        ))}
        <Box px={5} py={3} bg={APP_BG_SUBTLE}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Text fontSize="0.8125rem" color={APP_MUTED}>Net</Text>
            <Text fontSize="0.8125rem">{formatMoney(invoice.subtotal, invoice.currency)}</Text>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Text fontSize="0.8125rem" color={APP_MUTED}>
              {invoice.taxPercent > 0 ? `VAT ${invoice.taxPercent}%` : invoice.taxNote || "VAT"}
            </Text>
            <Text fontSize="0.8125rem">{formatMoney(taxAmount, invoice.currency)}</Text>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Text fontWeight="700">Total</Text>
            <Text fontWeight="700">{formatMoney(invoice.total, invoice.currency)}</Text>
          </Box>
        </Box>
      </Box>
    </PageShell>
  )
}
