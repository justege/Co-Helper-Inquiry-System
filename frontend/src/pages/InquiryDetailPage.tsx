import { useEffect, useRef, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import {
  Box, Button, Grid, Spinner, Stack, Text,
} from "@chakra-ui/react"
import {
  LuDownload, LuFileText, LuTrash2, LuUpload,
  LuCheck, LuSend, LuClock,
} from "react-icons/lu"
import {
  getInquiry, listDocuments, initUpload, confirmUpload,
  getDownloadUrl, deleteDocument,
  listMessages, sendMessage,
  listActivity, updateInquiry, updateInquiryStatus,
  type Inquiry, type InquiryStatus, type Urgency,
  type InquiryDocument, type ProjectOfferSummary,
  type InquiryMessage, type ActivityEvent,
} from "../api/inquiries"
import { workspaceBoardStatus } from "@/lib/boardStatus"
import { acceptOffer, declineOffer, escalateOffer } from "../api/projectOffers"
import { getMe, type User } from "../api/users"
import { PageShell } from "@/components/ui/PageShell"
import EditWithAI from "@/components/ai/EditWithAI"
import {
  AgreementCard,
  FinanceSnapshot,
  HoursCard,
  PaymentsCard,
  TodosCard,
} from "@/components/job/JobHub"
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

const WORKSPACE_STATUS_STEPS: { key: InquiryStatus; label: string }[] = [
  { key: "pending",     label: "Requested" },
  { key: "in_progress", label: "Doing" },
  { key: "waiting",     label: "Waiting" },
  { key: "delivered",   label: "Done" },
]

const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Low", medium: "Medium", high: "High", critical: "Critical",
}

// ── Status timeline ───────────────────────────────────────────────────────────

function StatusTimeline({
  status,
  workspace,
  onSelect,
  saving,
}: {
  status: InquiryStatus
  workspace?: boolean
  onSelect?: (status: InquiryStatus) => void
  saving?: boolean
}) {
  if (status === "cancelled") {
    return <StatusText label="Cancelled" />
  }
  if (status === "escalated") {
    return (
      <Box p={4} border={`1px solid ${BORDER}`} borderRadius="8px" bg={BG_SUBTLE}>
        <Text fontSize="0.875rem" fontWeight="600" color={INK}>Needs attention</Text>
        <Text fontSize="0.8125rem" color={MUTED} mt={1}>Check the chat or activity log for the latest note.</Text>
      </Box>
    )
  }

  const steps = workspace ? WORKSPACE_STATUS_STEPS : STATUS_STEPS
  const displayStatus = workspace ? workspaceBoardStatus(status) : status
  const activeIdx = steps.findIndex((s) => s.key === displayStatus)
  const clickable = Boolean(workspace && onSelect)

  return (
    <>
      {/* Vertical — mobile */}
      <Stack gap={0} display={{ base: "flex", md: "none" }}>
        {steps.map((step, i) => {
          const done = i < activeIdx
          const current = i === activeIdx
          return (
            <Box
              key={step.key}
              display="flex"
              gap={3}
              cursor={clickable ? "pointer" : "default"}
              opacity={saving ? 0.6 : 1}
              onClick={() => {
                if (!clickable || current || saving) return
                onSelect?.(step.key)
              }}
            >
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
                {i < steps.length - 1 && (
                  <Box w="1px" flex={1} minH="16px" bg={done ? INK : BORDER} my={1} />
                )}
              </Box>
              <Box pb={i < steps.length - 1 ? 3 : 0} pt={0.5}>
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
          {steps.map((step, i) => {
            const done = i < activeIdx
            const current = i === activeIdx
            return (
              <Box
                key={step.key}
                display="flex"
                alignItems="flex-start"
                cursor={clickable ? "pointer" : "default"}
                opacity={saving ? 0.6 : 1}
                onClick={() => {
                  if (!clickable || current || saving) return
                  onSelect?.(step.key)
                }}
              >
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
                {i < steps.length - 1 && (
                  <Box w={{ md: "24px", lg: "32px" }} h="1px" mt="14px" mx={1}
                    bg={done ? INK : BORDER} flexShrink={0} />
                )}
              </Box>
            )
          })}
        </Box>
      </Box>
      {clickable && (
        <Text fontSize="0.75rem" color={MUTED} mt={3}>
          Tap a step to move this work on the shared board.
        </Text>
      )}
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

// ── Requirements (editable brief + Edit with AI) ────────────────────────────

function RequirementsCard({ inquiry, onUpdated }: { inquiry: Inquiry; onUpdated: (i: Inquiry) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(inquiry.description)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { setDraft(inquiry.description) }, [inquiry.description])

  async function handleSave() {
    setSaving(true); setErr(null)
    try {
      const updated = await updateInquiry(inquiry.id, { description: draft.trim() })
      onUpdated(updated)
      setEditing(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      label="Description"
      action={
        editing ? (
          <EditWithAI
            inquiryId={inquiry.id}
            target="requirement"
            getText={() => draft}
            onApply={setDraft}
          />
        ) : (
          <Box
            as="button" onClick={() => setEditing(true)}
            fontSize="0.75rem" fontWeight="600" color={ACCENT} cursor="pointer"
          >
            Edit
          </Box>
        )
      }
    >
      {editing ? (
        <Stack gap={3}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            style={{
              width: "100%", padding: "10px 12px", fontSize: "0.875rem",
              border: `1px solid ${BORDER}`, borderRadius: "8px",
              fontFamily: "inherit", resize: "vertical", outline: "none",
              background: SURFACE, color: INK, lineHeight: 1.6,
            }}
          />
          {err && (
            <Box p={2.5} border={`1px solid ${BORDER}`} borderRadius="8px" bg={BG_SUBTLE}>
              <Text fontSize="0.8125rem" color={INK}>{err}</Text>
            </Box>
          )}
          <Box display="flex" gap={2}>
            <Button
              size="sm" h="34px" px={4} borderRadius="8px" fontWeight="600"
              bg={ACCENT} color="white" _hover={{ bg: "#0a5240" }}
              loading={saving}
              onClick={handleSave}
            >
              Save
            </Button>
            <Button
              size="sm" h="34px" px={4} borderRadius="8px" fontWeight="500"
              variant="outline" borderColor={BORDER} color={MUTED}
              onClick={() => { setEditing(false); setDraft(inquiry.description); setErr(null) }}
            >
              Cancel
            </Button>
          </Box>
        </Stack>
      ) : (
        <Text fontSize="0.875rem" color={MUTED} lineHeight="1.75" whiteSpace="pre-wrap">
          {inquiry.description}
        </Text>
      )}
    </Card>
  )
}

// ── Chat ─────────────────────────────────────────────────────────────────────

function personName(p: { firstName: string | null; lastName: string | null; companyName: string | null; email: string } | null) {
  if (!p) return "Someone"
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.companyName || p.email
}

const DATETIME_FMT = (d: string) => new Date(d).toLocaleString("tr-TR", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
})

function ChatSection({ inquiryId, currentUserId }: { inquiryId: string; currentUserId: string | null }) {
  const [messages, setMessages] = useState<InquiryMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback((silent = false) => {
    listMessages(inquiryId)
      .then(setMessages)
      .catch(() => {/* chat may not be available yet (legacy inquiry) */})
      .finally(() => { if (!silent) setLoading(false) })
  }, [inquiryId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onFocus = () => load(true)
    window.addEventListener("focus", onFocus)
    const timer = window.setInterval(() => load(true), 12000)
    return () => {
      window.removeEventListener("focus", onFocus)
      window.clearInterval(timer)
    }
  }, [load])
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "nearest" }) }, [messages.length])

  async function handleSend() {
    const body = draft.trim()
    if (!body) return
    setSending(true); setErr(null)
    try {
      const msg = await sendMessage(inquiryId, body)
      setMessages((prev) => [...prev, msg])
      setDraft("")
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <Card label="Chat">
      {loading ? (
        <Box display="flex" alignItems="center" gap={2}>
          <Spinner size="sm" color="gray.500" />
          <Text fontSize="0.875rem" color={MUTED}>Loading…</Text>
        </Box>
      ) : (
        <Stack gap={0}>
          <Box maxH="360px" overflowY="auto" mb={3} pr={1}>
            {messages.length === 0 ? (
              <Text fontSize="0.875rem" color={MUTED} py={2}>
                No messages yet. Say hello to get the job moving.
              </Text>
            ) : (
              <Stack gap={3} py={1}>
                {messages.map((m) => {
                  const mine = m.authorId === currentUserId
                  return (
                    <Box key={m.id} display="flex" flexDir="column" alignItems={mine ? "flex-end" : "flex-start"}>
                      <Box
                        maxW="80%"
                        bg={mine ? ACCENT : BG_SUBTLE}
                        color={mine ? "white" : INK}
                        borderRadius="12px"
                        px={3.5} py={2.5}
                      >
                        <Text fontSize="0.875rem" lineHeight="1.5" whiteSpace="pre-wrap">{m.body}</Text>
                      </Box>
                      <Text fontSize="0.6875rem" color={LABEL} mt={1}>
                        {personName(m.author)} · {DATETIME_FMT(m.createdAt)}
                      </Text>
                    </Box>
                  )
                })}
                <div ref={bottomRef} />
              </Stack>
            )}
          </Box>

          {err && (
            <Box mb={2} p={2.5} border={`1px solid ${BORDER}`} borderRadius="8px" bg={BG_SUBTLE}>
              <Text fontSize="0.8125rem" color={INK}>{err}</Text>
            </Box>
          )}

          {draft.trim() && (
            <Box mb={2} display="flex" justifyContent="flex-end">
              <EditWithAI
                inquiryId={inquiryId}
                target="message"
                getText={() => draft}
                onApply={setDraft}
                label="Clarify with AI"
              />
            </Box>
          )}

          <Box display="flex" gap={2}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Write a message…"
              rows={2}
              style={{
                flex: 1, padding: "10px 12px", fontSize: "0.875rem",
                border: `1px solid ${BORDER}`, borderRadius: "8px",
                fontFamily: "inherit", resize: "vertical", outline: "none",
                background: SURFACE, color: INK,
              }}
            />
            <Button
              alignSelf="flex-end" h="38px" px={4} borderRadius="8px" fontWeight="600"
              bg={ACCENT} color="white" _hover={{ bg: "#0a5240" }}
              loading={sending}
              onClick={handleSend}
              disabled={!draft.trim()}
            >
              <LuSend size={14} />
            </Button>
          </Box>
        </Stack>
      )}
    </Card>
  )
}

// ── Activity log ─────────────────────────────────────────────────────────────

const ACTIVITY_LABEL: Record<string, (payload: Record<string, unknown>) => string> = {
  "inquiry.created": () => "Job created",
  "message.sent": () => "sent a message",
  "invitation.sent": (p) => `invited ${p.email ?? "a client"}`,
  "invitation.accepted": () => "joined the workspace",
  "status.changed": (p) => {
    const labels: Record<string, string> = {
      pending: "Requested",
      in_progress: "Doing",
      waiting: "Waiting",
      delivered: "Done",
    }
    const to = typeof p.to === "string" ? labels[p.to] ?? p.to : "a new step"
    return `moved this to ${to}`
  },
  "ai.rewrite": (p) => `used AI to clarify a ${p.target ?? "text"}`,
  "trello.imported": (p) => `imported from Trello${p.list ? ` (${p.list})` : ""}`,
  "todo.created": (p) => `added a to-do${p.title ? `: ${p.title}` : ""}`,
  "todo.completed": (p) => `completed a to-do${p.title ? `: ${p.title}` : ""}`,
  "agreement.proposed": () => "proposed a price agreement",
  "agreement.agreed": () => "agreed on price",
  "agreement.declined": () => "declined a price agreement",
  "hours.logged": (p) => `logged ${p.hours ?? ""} hours${p.title ? ` on ${p.title}` : ""}`,
  "payment.recorded": () => "recorded a payment",
  "payment.updated": () => "updated a payment",
}

function ActivitySection({ inquiryId }: { inquiryId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listActivity(inquiryId)
      .then((data) => { if (!cancelled) setEvents(data) })
      .catch(() => { if (!cancelled) setEvents([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [inquiryId])

  return (
    <Card label="Activity">
      {loading ? (
        <Box display="flex" alignItems="center" gap={2}>
          <Spinner size="sm" color="gray.500" />
          <Text fontSize="0.875rem" color={MUTED}>Loading…</Text>
        </Box>
      ) : events.length === 0 ? (
        <Text fontSize="0.875rem" color={MUTED}>No activity recorded yet.</Text>
      ) : (
        <Stack gap={0}>
          {events.map((e, i) => (
            <Box key={e.id} display="flex" gap={2.5} py={2.5}
              borderBottom={i < events.length - 1 ? `1px solid ${BORDER}` : "none"}>
              <Box color={LABEL} flexShrink={0} mt="2px"><LuClock size={13} /></Box>
              <Box minW={0}>
                <Text fontSize="0.8125rem" color={INK}>
                  <Text as="span" fontWeight="600">{personName(e.actor)}</Text>{" "}
                  {(ACTIVITY_LABEL[e.type] ?? (() => e.type))(e.payload)}
                </Text>
                <Text fontSize="0.6875rem" color={LABEL} mt={0.5}>{DATETIME_FMT(e.createdAt)}</Text>
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
  const [me, setMe] = useState<User | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<"work" | "activity">("work")
  const [hoursTick, setHoursTick] = useState(0)

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    getInquiry(id)
      .then(setInquiry)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => { getMe().then(setMe).catch(() => null) }, [])

  if (loading) {
    return (
      <PageShell title="Loading…" backHref="/app/board" backLabel="Board">
        <Box display="flex" alignItems="center" gap={2} py={6}>
          <Spinner size="sm" color="green.600" />
          <Text fontSize="sm" color="#64748B">Loading inquiry…</Text>
        </Box>
      </PageShell>
    )
  }

  if (error || !inquiry) {
    return (
      <PageShell title="Not found" backHref="/app/board" backLabel="Board">
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

  const isFreelancer = me?.role === "expert"
  const isWorkspaceJob = Boolean(inquiry.workspaceId)
  const currentStatus = inquiry.status

  async function handleBoardStatus(next: InquiryStatus) {
    if (!id || statusSaving || currentStatus === next) return
    setStatusSaving(true)
    setStatusError(null)
    try {
      const updated = await updateInquiryStatus(id, next)
      setInquiry(updated)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Could not update status")
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <PageShell
      wide
      eyebrow="Work"
      title={inquiry.title}
      subtitle={`Ref #${inquiry.id.slice(0, 8).toUpperCase()} · ${DATE_FMT(inquiry.createdAt)}`}
      backHref={isWorkspaceJob ? "/app/board" : "/app/inquiries"}
      backLabel={isWorkspaceJob ? "Board" : "My jobs"}
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
          <MetaItem label={isWorkspaceJob ? "Project" : "Offers"} value={isWorkspaceJob ? (inquiry.project?.name ?? "—") : String(allOffers.length)} />
          <MetaItem label="Submitted" value={DATE_FMT(inquiry.createdAt)} />
          <MetaItem label="Updated" value={DATE_FMT(inquiry.updatedAt)} />
        </Grid>
      </Box>

      <Box display="flex" gap={1} mb={4} p="3px" bg={BG_SUBTLE} border={`1px solid ${BORDER}`} borderRadius="10px" w="fit-content">
        {([
          { id: "work" as const, label: "Work" },
          { id: "activity" as const, label: "Activity" },
        ]).map((tab) => (
          <Box
            key={tab.id}
            as="button"
            px={4}
            py={1.5}
            borderRadius="8px"
            fontSize="0.8125rem"
            fontWeight="600"
            color={detailTab === tab.id ? "white" : LABEL}
            bg={detailTab === tab.id ? ACCENT : "transparent"}
            cursor="pointer"
            onClick={() => setDetailTab(tab.id)}
          >
            {tab.label}
          </Box>
        ))}
      </Box>

      {detailTab === "activity" ? (
        id ? <ActivitySection inquiryId={id} /> : null
      ) : (
      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 340px" }}
        gap={{ base: 4, md: 5 }}
        alignItems="start"
      >

        {/* ── Main column ─────────────────────────────────────── */}
        <Stack gap={{ base: 4, md: 5 }} minW={0}>

          {/* Status timeline */}
          <Card label="Status">
            <StatusTimeline
              status={inquiry.status}
              workspace={isWorkspaceJob}
              onSelect={isWorkspaceJob ? handleBoardStatus : undefined}
              saving={statusSaving}
            />
            {statusError && (
              <Text fontSize="0.8125rem" color="#B91C1C" mt={3}>{statusError}</Text>
            )}
          </Card>

          {/* Active offer — marketplace inquiries only */}
          {!isWorkspaceJob && sentOffer && (
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
                {inquiry.project?.name && <Row label="Project" value={inquiry.project.name} />}
                {inquiry.targetStartDate && <Row label="Start date" value={DATE_FMT(inquiry.targetStartDate)} />}
                {inquiry.targetEndDate && <Row label="End date" value={DATE_FMT(inquiry.targetEndDate)} />}
                {inquiry.estimatedQuantity && (
                  <Row label="Quantity" value={inquiry.estimatedQuantity.toLocaleString("tr-TR")} />
                )}
              </Stack>
            </Card>

            <RequirementsCard inquiry={inquiry} onUpdated={setInquiry} />
          </Grid>

          {id && <TodosCard inquiryId={id} canLog={Boolean(isFreelancer)} refreshKey={hoursTick} onHoursLogged={() => setHoursTick((n) => n + 1)} />}

          {/* Documents */}
          {id && <DocumentsSection inquiryId={id} />}

          {/* Chat */}
          {id && <ChatSection inquiryId={id} currentUserId={me?.id ?? null} />}
        </Stack>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <Stack gap={{ base: 4, md: 5 }} minW={0}>
          {id && <FinanceSnapshot inquiryId={id} refreshKey={hoursTick} />}
          {id && <AgreementCard inquiryId={id} currentUserId={me?.id ?? null} />}
          {id && <HoursCard inquiryId={id} canLog={Boolean(isFreelancer)} refreshKey={hoursTick} onHoursLogged={() => setHoursTick((n) => n + 1)} />}
          {id && <PaymentsCard inquiryId={id} canRecord={Boolean(isFreelancer)} />}

          {!isWorkspaceJob && (
            <Card label={`Offers (${allOffers.length})`}>
              {allOffers.length === 0 ? (
                <Text fontSize="0.875rem" color={MUTED} lineHeight="1.6">
                  No offers yet.
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
          )}

          <Card label="Reference">
            <Stack gap={0}>
              <Row label="ID" value={`#${inquiry.id.slice(0, 8).toUpperCase()}`} />
              <Row label="Submitted" value={DATE_FMT(inquiry.createdAt)} />
              <Row label="Last update" value={DATE_FMT(inquiry.updatedAt)} />
              {inquiry.targetStartDate && <Row label="Start" value={DATE_FMT(inquiry.targetStartDate)} />}
              {inquiry.targetEndDate && <Row label="End" value={DATE_FMT(inquiry.targetEndDate)} />}
            </Stack>
          </Card>
        </Stack>
      </Grid>
      )}
    </PageShell>
  )
}
