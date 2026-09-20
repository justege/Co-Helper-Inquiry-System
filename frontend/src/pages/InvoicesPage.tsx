import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { PageShell } from "@/components/ui/PageShell"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { getInvoices, type Invoice } from "@/api/work"
import { formatMoney } from "@/lib/hours"

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

  return (
    <PageShell eyebrow="Workspace" title="Invoices">
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
