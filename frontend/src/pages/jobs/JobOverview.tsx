import { useOutletContext } from "react-router-dom"
import { Box, Grid, Stack, Text } from "@chakra-ui/react"
import { useState } from "react"
import type { Inquiry, InquiryStatus } from "@/api/inquiries"
import { updateInquiryStatus } from "@/api/inquiries"
import { getMe, type User } from "@/api/users"
import { useEffect } from "react"
import { AgreementCard, FinanceSnapshot } from "@/components/job/JobHub"
import { ProjectField } from "@/components/job/ProjectField"
import { AppCard as Card, AppRow as Row } from "@/components/ui/appUi"
import { workspaceBoardStatus } from "@/lib/boardStatus"
import { AppButton } from "@/components/ui/AppButton"
import { downloadInvoice } from "@/api/job"

const STEPS: { key: InquiryStatus; label: string }[] = [
  { key: "pending", label: "Requested" },
  { key: "in_progress", label: "Doing" },
  { key: "waiting", label: "Waiting" },
  { key: "delivered", label: "Done" },
]

export default function JobOverview() {
  const { inquiry, setInquiry } = useOutletContext<{ inquiry: Inquiry; setInquiry: (i: Inquiry) => void }>()
  const [me, setMe] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { getMe().then(setMe).catch(() => null) }, [])

  const display = workspaceBoardStatus(inquiry.status)
  const activeIdx = STEPS.findIndex((s) => s.key === display)

  async function move(next: InquiryStatus) {
    setSaving(true)
    try {
      setInquiry(await updateInquiryStatus(inquiry.id, next))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid templateColumns={{ base: "1fr", xl: "minmax(0,1fr) 340px" }} gap={5}>
      <Stack gap={5}>
        <Card label="Status">
          <Box display="flex" gap={2} flexWrap="wrap">
            {STEPS.map((step, i) => (
              <AppButton
                key={step.key}
                size="sm"
                variant={i === activeIdx ? "primary" : "secondary"}
                disabled={saving}
                onClick={() => move(step.key)}
              >
                {step.label}
              </AppButton>
            ))}
          </Box>
        </Card>
        <Card label="Details">
          <Stack gap={0}>
            <Row label="Urgency" value={inquiry.urgency} />
            <Row label="Category" value={inquiry.category?.name ?? "—"} />
            <ProjectField inquiry={inquiry} canCreate={me?.role === "expert"} onUpdated={setInquiry} />
          </Stack>
        </Card>
        <Card label="Brief">
          <Text fontSize="0.9375rem" color="#0E1B17" whiteSpace="pre-wrap" lineHeight="1.6">{inquiry.description}</Text>
        </Card>
      </Stack>
      <Stack gap={5}>
        <FinanceSnapshot inquiryId={inquiry.id} />
        <AgreementCard inquiryId={inquiry.id} currentUserId={me?.id ?? null} />
        <AppButton variant="secondary" onClick={() => downloadInvoice(inquiry.id)}>Download invoice PDF</AppButton>
      </Stack>
    </Grid>
  )
}
