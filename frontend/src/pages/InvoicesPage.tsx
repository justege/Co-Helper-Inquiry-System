import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { PageShell } from "@/components/ui/PageShell"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { getInvoices, type Invoice } from "@/api/work"
import { formatMoney } from "@/lib/hours"
import { AppButton } from "@/components/ui/AppButton"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInvoices()
      .then((r) => setInvoices(r.invoices))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const currency = invoices[0]?.currency || "EUR"
  const open = invoices.filter((inv) => inv.status === "sent")
  const drafts = invoices.filter((inv) => inv.status === "draft")
  const paid = invoices.filter((inv) => inv.status === "paid")
  const openAmount = open.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
  const paidAmount = paid.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
  const empty = !loading && invoices.length === 0

  return (
    <PageShell
      eyebrow="Workspace"
      title="Invoices"
      stats={[
        { label: "Open", value: formatMoney(openAmount, currency) },
        { label: "Drafts", value: String(drafts.length) },
        { label: "Paid", value: formatMoney(paidAmount, currency) },
        { label: "Invoices", value: String(invoices.length) },
      ]}
      intro={empty ? {
        title: "Invoices from hours and expenses",
        bullets: [
          "Create an invoice from a project’s unbilled hours",
          "German ZUGFeRD details are pulled from Settings and the client",
          "Sent invoices keep a frozen snapshot of seller and buyer",
        ],
        cta: (
          <Link to="/app/projects" style={{ textDecoration: "none" }}>
            <AppButton>Open a project</AppButton>
          </Link>
        ),
      } : undefined}
    >
      {loading && <Spinner />}
      {error && <Text color="#B91C1C">{error}</Text>}
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        {invoices.map((inv) => (
          <Link key={inv.id} to={`/app/invoices/${inv.id}`} style={{ textDecoration: "none" }}>
            <Box px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`} _hover={{ bg: "#F7F8FA" }}>
              <Text fontWeight="700" color={APP_INK}>{inv.number} · {inv.projectName}</Text>
              <Text fontSize="0.75rem" color={APP_MUTED}>
                {inv.clientName} · {inv.status} · {formatMoney(inv.total, inv.currency)}
              </Text>
            </Box>
          </Link>
        ))}
        {!loading && invoices.length === 0 && (
          <Text p={5} color={APP_MUTED}>No invoices yet. Create one from a project’s unbilled hours.</Text>
        )}
      </Box>
    </PageShell>
  )
}
