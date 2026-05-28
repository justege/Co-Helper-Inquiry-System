import { useEffect, useRef, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import {
  Box, Button, Grid, Spinner, Stack, Text,
} from "@chakra-ui/react"
import {
  LuDownload, LuFileText, LuTrash2, LuUpload,
  LuCheck,
} from "react-icons/lu"
import {
  getInquiry, listDocuments, initUpload, confirmUpload,
  getDownloadUrl, deleteDocument,
  type Inquiry, type InquiryStatus, type Urgency,
  type InquiryDocument, type ProjectOfferSummary,
} from "../api/inquiries"
import { acceptOffer, declineOffer, escalateOffer } from "../api/projectOffers"
import { PageShell } from "@/components/ui/PageShell"
import {
  APP_ACCENT as ACCENT,
  APP_BG_SUBTLE as BG_SUBTLE,
  APP_BORDER as BORDER,
  APP_INK as INK,
  APP_LABEL as LABEL,
  APP_MUTED as MUTED,
  APP_SURFACE as SURFACE,
  AppCard as Card,
  AppMetaItem as MetaItem,
  AppRow as Row,
  AppStatusText as StatusText,
} from "@/components/ui/appUi"

const TRY_FMT = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" })
const DATE_FMT = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })

const STATUS_STEPS: { key: InquiryStatus; label: string }[] = [
  { key: "pending",     label: "Submitted" },
  { key: "matching",    label: "Matching" },
  { key: "offered",     label: "Offer received" },
  { key: "accepted",    label: "Accepted" },
  { key: "in_progress", label: "In production" },
  { key: "delivered",   label: "Delivered" },
]

const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Low", medium: "Medium", high: "High", critical: "Critical",
}

// ── Status timeline ───────────────────────────────────────────────────────────

function StatusTimeline({ status }: { status: InquiryStatus }) {
  if (status === "cancelled") {
    return <StatusText label="Cancelled" />
  }
  if (status === "escalated") {
    return (
      <Box p={4} border={`1px solid ${BORDER}`} borderRadius="8px" bg={BG_SUBTLE}>
        <Text fontSize="0.875rem" fontWeight="600" color={INK}>Escalated for review</Text>
        <Text fontSize="0.8125rem" color={MUTED} mt={1}>Our team will contact you shortly.</Text>
      </Box>
    )
  }

  const activeIdx = STATUS_STEPS.findIndex((s) => s.key === status)

  return (
    <>
      {/* Vertical — mobile */}
      <Stack gap={0} display={{ base: "flex", md: "none" }}>
        {STATUS_STEPS.map((step, i) => {
          const done = i < activeIdx
          const current = i === activeIdx
          return (
            <Box key={step.key} display="flex" gap={3}>
              <Box display="flex" flexDir="column" alignItems="center" flexShrink={0}>
                <Box
                  w="24px" h="24px" rounded="full"
                  display="flex" alignItems="center" justifyContent="center"
                  border={`1.5px solid ${current ? ACCENT : done ? INK : BORDER}`}
                  bg={current ? ACCENT : done ? INK : SURFACE}
                  color={current || done ? "white" : LABEL}
                  fontSize="0.625rem" fontWeight="700"
                >
                  {done ? <LuCheck size={10} /> : i + 1}
                </Box>
                {i < STATUS_STEPS.length - 1 && (
                  <Box w="1px" flex={1} minH="16px" bg={done ? INK : BORDER} my={1} />
                )}
              </Box>
              <Box pb={i < STATUS_STEPS.length - 1 ? 3 : 0} pt={0.5}>
                <Text
                  fontSize="0.8125rem"
                  fontWeight={current ? "600" : "500"}
                  color={current ? INK : done ? INK : LABEL}
                >
                  {step.label}
                </Text>
              </Box>
            </Box>
          )
        })}
      </Stack>

      {/* Horizontal — tablet+ */}
      <Box overflowX="auto" pb={1} display={{ base: "none", md: "block" }}>
        <Box display="flex" alignItems="flex-start" minW="max-content">
          {STATUS_STEPS.map((step, i) => {
            const done = i < activeIdx
            const current = i === activeIdx
            return (
              <Box key={step.key} display="flex" alignItems="flex-start">
                <Box display="flex" flexDir="column" alignItems="center" gap={2} minW="72px">
                  <Box
                    w="28px" h="28px" rounded="full"
                    display="flex" alignItems="center" justifyContent="center"
                    border={`1.5px solid ${current ? ACCENT : done ? INK : BORDER}`}
                    bg={current ? ACCENT : done ? INK : SURFACE}
                    color={current || done ? "white" : LABEL}
                    fontSize="0.6875rem" fontWeight="700"
                  >
                    {done ? <LuCheck size={12} /> : i + 1}
                  </Box>
                  <Text
                    fontSize="0.6875rem"
                    fontWeight={current ? "600" : "500"}
                    color={current ? INK : done ? INK : LABEL}
                    textAlign="center"
                    lineHeight="1.3"
                    px={1}
                  >
                    {step.label}
                  </Text>
                </Box>
                {i < STATUS_STEPS.length - 1 && (
                  <Box w={{ md: "24px", lg: "32px" }} h="1px" mt="14px" mx={1}
                    bg={done ? INK : BORDER} flexShrink={0} />
                )}
              </Box>
            )
          })}
        </Box>
      </Box>
    </>
  )
}

// ── Offer card ───────────────────────────────────────────────────────────────

function OfferCard({
  offer,
  onAccepted,
  onDeclinedOrEscalated,
}: {
  offer: ProjectOfferSummary
  inquiryId?: string
  onAccepted: () => void
  onDeclinedOrEscalated: () => void
}) {
  const [action, setAction] = useState<string | null>(null)
  const [escalateReason, setEscalateReason] = useState("")
  const [showEscalate, setShowEscalate] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isSent = offer.status === "sent"
  const OFFER_STATUS: Record<string, string> = {
    draft: "Draft",
    sent: "Awaiting response",
    accepted: "Accepted",
    declined: "Declined",
  }

  async function doAccept() {
    setAction("accept"); setErr(null)
    try {
      await acceptOffer(offer.id)
      onAccepted()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed"); setAction(null)
    }
  }

  async function doDecline() {
    setAction("decline"); setErr(null)
    try {
      await declineOffer(offer.id)
      onDeclinedOrEscalated()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed"); setAction(null)
    }
  }

  async function doEscalate() {
    setAction("escalate"); setErr(null)
    try {
      await escalateOffer(offer.id, escalateReason)
      onDeclinedOrEscalated()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed"); setAction(null)
    }
  }

  const leadDays = offer.leadTimeDays ?? null
  const adminNotes = offer.notes ?? null

  return (
    <Box border={`1px solid ${BORDER}`} borderRadius="12px" overflow="hidden" bg={SURFACE}>
      <Box px={4} py={3} borderBottom={`1px solid ${BORDER}`} bg={BG_SUBTLE}
        display="flex" alignItems="center" justifyContent="space-between">
        <Text fontSize="0.8125rem" fontWeight="600" color={INK}>
          {OFFER_STATUS[offer.status] ?? offer.status}
        </Text>
        <Text fontSize="0.75rem" color={LABEL}>{DATE_FMT(offer.createdAt)}</Text>
      </Box>

      <Box p={{ base: 4, md: 5 }}>
        <Box
          display="flex" alignItems="flex-end" justifyContent="space-between"
          flexWrap="wrap" gap={4} mb={4}
        >
          <Box>
            <Text fontSize="0.6875rem" fontWeight="500" color={LABEL} textTransform="uppercase"
              letterSpacing="0.05em" mb={1}>Total price</Text>
            <Text fontSize={{ base: "1.5rem", md: "1.75rem" }} fontWeight="700" color={INK} letterSpacing="-0.03em" lineHeight="1">
              {TRY_FMT.format(offer.totalClientPrice)}
            </Text>
          </Box>
          {offer.validUntil && (
            <Box textAlign={{ base: "left", sm: "right" }}>
              <Text fontSize="0.6875rem" color={LABEL}>Valid until</Text>
              <Text fontSize="0.875rem" fontWeight="600" color={INK} mt={0.5}>{DATE_FMT(offer.validUntil)}</Text>
            </Box>
          )}
        </Box>

        {(leadDays || adminNotes) && (
          <Stack gap={3} mb={isSent ? 5 : 0}>
            {leadDays && (
              <Box display="flex" justifyContent="space-between" py={2} borderTop={`1px solid ${BORDER}`}>
                <Text fontSize="0.8125rem" color={LABEL}>Lead time</Text>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK}>{leadDays} days</Text>
              </Box>
            )}
            {adminNotes && (
              <Box pt={leadDays ? 0 : 2} borderTop={leadDays ? "none" : `1px solid ${BORDER}`}>
                <Text fontSize="0.6875rem" fontWeight="500" color={LABEL} textTransform="uppercase"
                  letterSpacing="0.05em" mb={2}>Notes</Text>
                <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65" whiteSpace="pre-wrap">{adminNotes}</Text>
              </Box>
            )}
          </Stack>
        )}

        {err && (
          <Box mt={4} p={3} border={`1px solid ${BORDER}`} borderRadius="8px" bg={BG_SUBTLE}>
            <Text fontSize="0.8125rem" color={INK}>{err}</Text>
          </Box>
        )}

        {isSent && (
          <Box mt={5} pt={5} borderTop={`1px solid ${BORDER}`}>
            {showEscalate ? (
              <Box>
                <Text fontSize="0.8125rem" fontWeight="500" color={MUTED} mb={2}>
                  Reason for review (optional)
                </Text>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Price above budget, need shorter lead time"
                  style={{
                    width: "100%", padding: "10px 12px", fontSize: "0.875rem",
                    border: `1px solid ${BORDER}`, borderRadius: "8px",
                    fontFamily: "inherit", resize: "vertical", outline: "none",
                    background: SURFACE, color: INK,
                  }}
                />
                <Box display="flex" flexDir={{ base: "column", sm: "row" }} gap={2} mt={3}>
                  <Button
                    flex={1} size="sm" h="38px" borderRadius="8px" fontWeight="600"
                    bg={ACCENT} color="white" _hover={{ bg: "#0a5240" }}
                    loading={action === "escalate"}
                    onClick={doEscalate}
                  >
                    Submit review request
                  </Button>
                  <Button
                    size="sm" h="38px" borderRadius="8px" fontWeight="500"
                    variant="outline" borderColor={BORDER} color={MUTED}
                    onClick={() => setShowEscalate(false)}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Button
                  w="full" h="42px" borderRadius="8px" fontWeight="600" fontSize="0.875rem"
                  bg={ACCENT} color="white" _hover={{ bg: "#0a5240" }}
                  loading={action === "accept"}
                  disabled={action !== null}
                  onClick={doAccept}
                  mb={2}
                >
                  Accept offer
                </Button>
                <Box display="flex" flexDir={{ base: "column", sm: "row" }} gap={2}>
                  <Button
                    flex={1} h="38px" borderRadius="8px" fontWeight="500" fontSize="0.875rem"
                    variant="outline" borderColor={BORDER} color={MUTED}
                    loading={action === "decline"}
                    disabled={action !== null}
                    onClick={doDecline}
                  >
                    Decline
                  </Button>
                  <Button
                    flex={1} h="38px" borderRadius="8px" fontWeight="500" fontSize="0.875rem"
                    variant="outline" borderColor={BORDER} color={MUTED}
                    disabled={action !== null}
                    onClick={() => setShowEscalate(true)}
                  >
                    Request review
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ── Documents section ────────────────────────────────────────────────────────

function DocumentsSection({ inquiryId }: { inquiryId: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<InquiryDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(() => {
    listDocuments(inquiryId)
      .then(setDocs)
      .catch(() => {/* storage not set up yet — silently ignore */})
      .finally(() => setLoading(false))
  }, [inquiryId])

  useEffect(() => { load() }, [load])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadErr(null)
    try {
      // 1. Get signed upload URL
      const { documentId, uploadUrl } = await initUpload(inquiryId, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })

      // 2. Upload directly to Supabase Storage
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })
      if (!uploadRes.ok) throw new Error("Upload to storage failed")

      // 3. Confirm upload
      await confirmUpload(inquiryId, documentId)
      load()
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleDownload(doc: InquiryDocument) {
    try {
      const { url, fileName } = await getDownloadUrl(inquiryId, doc.id)
      const a = document.createElement("a")
      a.href = url; a.download = fileName; a.click()
    } catch {
      alert("Download failed — please try again.")
    }
  }

  async function handleDelete(doc: InquiryDocument) {
    if (!window.confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return
    setDeletingId(doc.id)
    try {
      await deleteDocument(inquiryId, doc.id)
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    } catch {
      alert("Delete failed — please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  function fmtSize(bytes: number | null) {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <Card
      label="Documents & Attachments"
      action={
        <Box>
          <input
            type="file"
            ref={fileRef}
            style={{ display: "none" }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg,.step,.stp"
            onChange={handleFileSelect}
          />
          <Button
            size="xs" h="28px" px={3} borderRadius="6px" fontWeight="600"
            bg={ACCENT} color="white" fontSize="0.75rem"
            _hover={{ bg: "#0a5240" }}
            loading={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <LuUpload size={12} /> Upload
          </Button>
        </Box>
      }
    >
      {uploadErr && (
        <Box mb={3} p={3} border={`1px solid ${BORDER}`} borderRadius="8px" bg={BG_SUBTLE}>
          <Text fontSize="0.8125rem" color={INK}>{uploadErr}</Text>
        </Box>
      )}

      {loading ? (
        <Box display="flex" alignItems="center" gap={2}>
          <Spinner size="sm" color="gray.500" />
          <Text fontSize="0.875rem" color={MUTED}>Loading…</Text>
        </Box>
      ) : docs.length === 0 ? (
        <Box py={4}>
          <Text fontSize="0.875rem" color={MUTED}>No documents attached.</Text>
          <Text fontSize="0.8125rem" color={LABEL} mt={1}>
            Upload specifications, drawings, or supporting files.
          </Text>
        </Box>
      ) : (
        <Stack gap={0}>
          {docs.map((doc) => (
            <Box
              key={doc.id}
              display="flex" alignItems={{ base: "flex-start", sm: "center" }}
              flexDir={{ base: "column", sm: "row" }}
              gap={3} py={3}
              borderBottom={`1px solid ${BORDER}`}
              _last={{ borderBottom: "none" }}
            >
              <Box display="flex" alignItems="center" gap={3} flex="1" minW={0} w={{ base: "full", sm: "auto" }}>
                <Box flexShrink={0} color={LABEL}>
                  <LuFileText size={18} />
                </Box>
                <Box flex="1" minW={0}>
                  <Text fontSize="0.875rem" fontWeight="500" color={INK}
                    overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {doc.fileName}
                  </Text>
                  <Text fontSize="0.75rem" color={LABEL} lineHeight="1.5">
                    {fmtSize(doc.fileSize)}
                    {doc.uploadedBy ? ` · ${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : ""}
                    {" · "}{DATE_FMT(doc.createdAt)}
                  </Text>
                </Box>
              </Box>
              <Box display="flex" gap={1} alignSelf={{ base: "flex-end", sm: "center" }} flexShrink={0}>
                <Box
                  as="button"
                  w="30px" h="30px" borderRadius="6px" bg={SURFACE} border={`1px solid ${BORDER}`}
                  display="flex" alignItems="center" justifyContent="center" cursor="pointer"
                  color={MUTED} _hover={{ bg: BG_SUBTLE, color: INK }}
                  onClick={() => handleDownload(doc)}
                  title="Download"
                >
                  <LuDownload size={13} />
                </Box>
                <Box
                  as="button"
                  w="30px" h="30px" borderRadius="6px" bg={SURFACE} border={`1px solid ${BORDER}`}
                  display="flex" alignItems="center" justifyContent="center" cursor="pointer"
                  color={MUTED} _hover={{ bg: BG_SUBTLE, color: INK }}
                  onClick={() => handleDelete(doc)}
                  title="Delete"
                  opacity={deletingId === doc.id ? 0.5 : 1}
                >
                  <LuTrash2 size={13} />
                </Box>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    getInquiry(id)
      .then(setInquiry)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <PageShell title="Loading…" backHref="/app/inquiries" backLabel="My inquiries">
        <Box display="flex" alignItems="center" gap={2} py={6}>
          <Spinner size="sm" color="green.600" />
          <Text fontSize="sm" color="#64748B">Loading inquiry…</Text>
        </Box>
      </PageShell>
    )
  }

  if (error || !inquiry) {
    return (
      <PageShell title="Not found" backHref="/app/inquiries" backLabel="My inquiries">
        <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="16px" p={5}>
          <Text fontSize="sm" color="#991B1B">{error ?? "Inquiry not found"}</Text>
        </Box>
      </PageShell>
    )
  }

  // Find the "sent" offer (the active one the buyer should respond to)
  const sentOffer = inquiry.projectOffers?.find((o) => o.status === "sent") ?? null
  const allOffers = (inquiry.projectOffers ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const activeOffer = sentOffer ?? allOffers.find((o) => o.status === "accepted") ?? null

  const pastOffers = allOffers.filter((o) => o.status !== "sent" && o.id !== activeOffer?.id)

  return (
    <PageShell
      wide
      eyebrow="Inquiry"
      title={inquiry.title}
      subtitle={`Ref #${inquiry.id.slice(0, 8).toUpperCase()} · ${DATE_FMT(inquiry.createdAt)}`}
      backHref="/app/inquiries"
      backLabel="My inquiries"
    >
      {/* Summary bar */}
      <Box
        mb={4} p={{ base: 4, md: 5 }}
        bg={SURFACE} border={`1px solid ${BORDER}`} borderRadius="12px"
      >
        <Grid templateColumns={{ base: "1fr 1fr", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }} gap={4}>
          <MetaItem label="Category" value={inquiry.category?.name ?? "—"} />
          <MetaItem label="Type" value={inquiry.type === "tool_sourcing" ? "Fixed Project" : "Ongoing Service"} />
          <MetaItem label="Urgency" value={URGENCY_LABEL[inquiry.urgency]} />
          <MetaItem label="Offers" value={String(allOffers.length)} />
          <MetaItem label="Submitted" value={DATE_FMT(inquiry.createdAt)} />
          <MetaItem label="Updated" value={DATE_FMT(inquiry.updatedAt)} />
        </Grid>
      </Box>

      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 340px" }}
        gap={{ base: 4, md: 5 }}
        alignItems="start"
      >

        {/* ── Main column ─────────────────────────────────────── */}
        <Stack gap={{ base: 4, md: 5 }} minW={0}>

          {/* Status timeline */}
          <Card label="Status">
            <StatusTimeline status={inquiry.status} />
          </Card>

          {/* Active offer — always near the top */}
          {sentOffer && (
            <Box>
              <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={3}>
                Offer awaiting your response
              </Text>
              <OfferCard
                offer={sentOffer}
                inquiryId={inquiry.id}
                onAccepted={load}
                onDeclinedOrEscalated={load}
              />
            </Box>
          )}

          {/* Details + description side-by-side on large screens */}
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={{ base: 4, md: 5 }}>
            <Card label="Details">
              <Stack gap={0}>
                <Row label="Category" value={inquiry.category?.name ?? "—"} />
                <Row label="Type" value={inquiry.type === "tool_sourcing" ? "Fixed Project" : "Ongoing Service"} />
                <Row label="Urgency" value={URGENCY_LABEL[inquiry.urgency]} />
                {inquiry.targetStartDate && <Row label="Start date" value={DATE_FMT(inquiry.targetStartDate)} />}
                {inquiry.targetEndDate && <Row label="End date" value={DATE_FMT(inquiry.targetEndDate)} />}
                {inquiry.estimatedQuantity && (
                  <Row label="Quantity" value={inquiry.estimatedQuantity.toLocaleString("tr-TR")} />
                )}
              </Stack>
            </Card>

            <Card label="Description">
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.75" whiteSpace="pre-wrap">
                {inquiry.description}
              </Text>
            </Card>
          </Grid>

          {/* Documents */}
          {id && <DocumentsSection inquiryId={id} />}
        </Stack>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <Stack gap={{ base: 4, md: 5 }} minW={0}>
          <Card label={`Offers (${allOffers.length})`}>
            {allOffers.length === 0 ? (
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.6">
                No offers yet. Our team is reviewing your inquiry.
              </Text>
            ) : sentOffer && pastOffers.length === 0 ? (
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.6">
                The active offer is shown in the main section.
              </Text>
            ) : activeOffer && !sentOffer ? (
              <OfferCard
                offer={activeOffer}
                inquiryId={inquiry.id}
                onAccepted={load}
                onDeclinedOrEscalated={load}
              />
            ) : (
              <Stack gap={3}>
                {pastOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    inquiryId={inquiry.id}
                    onAccepted={load}
                    onDeclinedOrEscalated={load}
                  />
                ))}
              </Stack>
            )}
          </Card>

          <Card label="Reference">
            <Stack gap={0}>
              <Row label="ID" value={`#${inquiry.id.slice(0, 8).toUpperCase()}`} />
              <Row label="Submitted" value={DATE_FMT(inquiry.createdAt)} />
              <Row label="Last update" value={DATE_FMT(inquiry.updatedAt)} />
              {inquiry.targetStartDate && <Row label="Start" value={DATE_FMT(inquiry.targetStartDate)} />}
              {inquiry.targetEndDate && <Row label="End" value={DATE_FMT(inquiry.targetEndDate)} />}
            </Stack>
            <Text fontSize="0.75rem" color={LABEL} lineHeight="1.6" mt={4} pt={4} borderTop={`1px solid ${BORDER}`}>
              Contact our team with the reference ID above for any questions.
            </Text>
          </Card>
        </Stack>
      </Grid>
    </PageShell>
  )
}
