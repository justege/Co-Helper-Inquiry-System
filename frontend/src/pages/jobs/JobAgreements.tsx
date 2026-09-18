import { useOutletContext } from "react-router-dom"
import { useEffect, useState } from "react"
import { Stack } from "@chakra-ui/react"
import { AgreementCard, FinanceSnapshot, PaymentsCard } from "@/components/job/JobHub"
import { AppButton } from "@/components/ui/AppButton"
import { downloadInvoice } from "@/api/job"
import { getMe } from "@/api/users"
import type { Inquiry } from "@/api/inquiries"

export default function JobAgreements() {
  const { inquiry } = useOutletContext<{ inquiry: Inquiry }>()
  const [meId, setMeId] = useState<string | null>(null)
  const [isSolo, setIsSolo] = useState(false)
  useEffect(() => {
    getMe().then((u) => { setMeId(u.id); setIsSolo(u.role === "expert") }).catch(() => null)
  }, [])
  return (
    <Stack gap={5} maxW="640px">
      <FinanceSnapshot inquiryId={inquiry.id} />
      <AgreementCard inquiryId={inquiry.id} currentUserId={meId} />
      <PaymentsCard inquiryId={inquiry.id} canRecord={isSolo} />
      <AppButton variant="secondary" onClick={() => downloadInvoice(inquiry.id)}>Download invoice PDF</AppButton>
    </Stack>
  )
}
