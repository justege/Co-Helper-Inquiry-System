import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import {
  Badge,
  Box,
  Button,
  Grid,
  Input,
  NativeSelect,
  Spinner,
  Stack,
  Text,
  Textarea,
  Tabs,
} from "@chakra-ui/react"
import {
  LuBuilding2,
  LuCalendar,
  LuFileText,
  LuMessageSquare,
  LuPencil,
  LuSend,
  LuStar,
  LuTrash2,
  LuUser,
  LuUsers,
  LuX,
  LuZap,
} from "react-icons/lu"
import { createAdminOffer, updateAdminOffer, sendAdminOffer } from "@/api/adminInquiries"
import type { ProjectOfferSummary } from "@/api/inquiries"
import { InquiryDocumentsSection } from "@/components/inquiry/InquiryDocumentsSection"
import { PageShell } from "@/components/ui/PageShell"
import { Field } from "@/components/ui/field"
import { api } from "@/lib/api"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminInquiry {
  id: string
  title: string
  description: string
  type: string
  urgency: string
  status: string
  estimatedQuantity: number | null
  targetStartDate: string | null
  targetEndDate: string | null
  assignedExpertId: string | null
  createdAt: string
  updatedAt: string
  category: { id: string; name: string; type: string } | null
  projectOffers: ProjectOfferSummary[]
  client: { id: string; email: string; firstName: string | null; lastName: string | null; companyName: string | null }
}

interface InquiryNote {
  id: string
  content: string
  createdAt: string
  author: { id: string; email: string; firstName: string | null; lastName: string | null; role: string }
}

interface ExpertUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  categories: { id: string; name: string }[]
  profile: { isAvailable: boolean; score: number | null; bio: string | null } | null
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const CARD = { bg: "white", border: "1px solid #D8DCE8", borderRadius: "14px", overflow: "hidden" as const }

const INPUT_STYLE = {
  bg: "white",
  borderColor: "#D8DCE8",
  borderRadius: "8px",
  fontSize: "0.9375rem",
  _focusVisible: { borderColor: "#1563B2", boxShadow: "0 0 0 3px rgba(21,99,178,0.15)" },
  _placeholder: { color: "#B8C0D0" },
}

const BTN_PRIMARY = { bg: "#1563B2", color: "white", fontWeight: "600", borderRadius: "8px", _hover: { bg: "#1252A0" } }
const BTN_GHOST = { variant: "ghost" as const, fontWeight: "600", borderRadius: "8px" }

const INQUIRY_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: "#EFF2F8", color: "#374151", label: "Pending" },
  matching:    { bg: "#FEF3C7", color: "#92400E", label: "Matching" },
  offered:     { bg: "#EFF6FF", color: "#1E40AF", label: "Offered" },
  accepted:    { bg: "#ECFDF5", color: "#065F46", label: "Accepted" },
  in_progress: { bg: "#F0FDF4", color: "#15803D", label: "In Production" },
  delivered:   { bg: "#DCFCE7", color: "#166534", label: "Delivered" },
  escalated:   { bg: "#FFFBEB", color: "#B45309", label: "Escalated" },
  cancelled:   { bg: "#FEF2F2", color: "#991B1B", label: "Cancelled" },
}

const URGENCY_COLOR: Record<string, string> = {
  low: "#64748B", medium: "#92400E", high: "#B91C1C", critical: "#7F1D1D",
}

const OFFER_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  draft:    { bg: "#EFF2F8", color: "#374151", label: "Draft" },
  sent:     { bg: "#EFF6FF", color: "#1E40AF", label: "Sent" },
  accepted: { bg: "#ECFDF5", color: "#065F46", label: "Accepted" },
  declined: { bg: "#FEF2F2", color: "#991B1B", label: "Declined" },
}

const EUR = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)

// ── Form types ────────────────────────────────────────────────────────────────

type NoteForm    = { content: string }
type OfferForm   = { expertId: string; proposedPrice: string; clientPrice: string; leadTimeDays: string; notes: string; validUntil: string }

const URGENCY_LABELS: Record<string, string> = {
  low: "Low", medium: "Medium", high: "High", critical: "Critical",
}

const DATE_FMT = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminInquiryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [inquiry, setInquiry] = useState<AdminInquiry | null>(null)
  const [notes, setNotes] = useState<InquiryNote[]>([])
  const [experts, setExperts] = useState<ExpertUser[]>([])
  const [loading, setLoading] = useState(true)
  const [statusSaving, setStatusSaving] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null)
  const [sendingOfferId, setSendingOfferId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Note form ──
  const {
    register: regNote, handleSubmit: handleNoteSubmit, reset: resetNote,
    formState: { isSubmitting: noteSaving },
  } = useForm<NoteForm>({ defaultValues: { content: "" } })

  // ── Offer form ──
  const {
    register: regOffer, handleSubmit: handleOfferSubmit, reset: resetOffer,
    watch: watchOffer,
    setError: setOfferError,
    formState: { isSubmitting: offerSaving, errors: offerErrors },
  } = useForm<OfferForm>({ defaultValues: { expertId: "", proposedPrice: "", clientPrice: "", leadTimeDays: "", notes: "", validUntil: "" } })

  const selectedExpertId = watchOffer("expertId")
  const selectedExpert = experts.find((e) => e.id === selectedExpertId)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [inq, notesList, expertList] = await Promise.all([
        api.get<AdminInquiry>(`/api/admin/inquiries/${id}`),
        api.get<InquiryNote[]>(`/api/admin/inquiries/${id}/notes`),
        api.get<ExpertUser[]>("/api/admin/experts"),
      ])
      setInquiry(inq)
      setNotes(notesList)
      setExperts(expertList)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(status: string) {
    setStatusSaving(true)
    try {
      const updated = await api.put<AdminInquiry>(`/api/admin/inquiries/${id}/status`, { status })
      setInquiry(updated)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed") }
    finally { setStatusSaving(false) }
  }

  async function handleAssign(expertId: string | null) {
    setAssignSaving(true)
    try {
      const updated = await api.put<AdminInquiry>(`/api/admin/inquiries/${id}/assign`, { expertId })
      setInquiry(updated)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to assign") }
    finally { setAssignSaving(false) }
  }

  async function onAddNote(data: NoteForm) {
    try {
      const note = await api.post<InquiryNote>(`/api/admin/inquiries/${id}/notes`, { content: data.content })
      setNotes((prev) => [...prev, note])
      resetNote()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to add note") }
  }

  async function handleDeleteNote(noteId: string) {
    await api.delete(`/api/admin/inquiries/${id}/notes/${noteId}`)
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  function openCreateOffer() {
    setEditingOfferId(null)
    resetOffer({
      expertId: inquiry?.assignedExpertId ?? "",
      proposedPrice: "",
      clientPrice: "",
      leadTimeDays: "",
      notes: "",
      validUntil: "",
    })
    setOfferOpen(true)
  }

  function openEditOffer(offer: ProjectOfferSummary) {
    const expert = offer.experts?.[0]
    setEditingOfferId(offer.id)
    resetOffer({
      expertId: expert?.expert?.id ?? "",
      proposedPrice: expert ? String(expert.proposedPrice) : "",
      clientPrice: String(offer.totalClientPrice),
      leadTimeDays: offer.leadTimeDays ? String(offer.leadTimeDays) : "",
      notes: offer.notes ?? "",
      validUntil: offer.validUntil ? offer.validUntil.slice(0, 10) : "",
    })
    setOfferOpen(true)
  }

  function closeOfferModal() {
    setOfferOpen(false)
    setEditingOfferId(null)
    resetOffer()
  }

  async function onSubmitOffer(data: OfferForm, send: boolean) {
    if (!data.expertId) { setOfferError("expertId", { message: "Select an expert" }); return }
    const payload = {
      expertId: data.expertId,
      proposedPrice: Number(data.proposedPrice),
      clientPrice: Number(data.clientPrice),
      leadTimeDays: data.leadTimeDays ? Number(data.leadTimeDays) : null,
      notes: data.notes || null,
      validUntil: data.validUntil || null,
      send,
    }
    try {
      if (editingOfferId) {
        await updateAdminOffer(id!, editingOfferId, payload)
      } else {
        await createAdminOffer(id!, payload)
      }
      closeOfferModal()
      load()
    } catch (e: unknown) {
      setOfferError("root", { message: e instanceof Error ? e.message : "Failed" })
    }
  }

  async function handleSendOffer(offerId: string) {
    setSendingOfferId(offerId)
    try {
      await sendAdminOffer(id!, offerId)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send offer")
    } finally {
      setSendingOfferId(null)
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <PageShell eyebrow="Administration" title="Inquiry" backHref="/app/admin/inquiries" backLabel="Inquiries" wide>
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="blue.500" />
          <Text fontSize="sm" color="#64748B">Loading…</Text>
        </Box>
      </PageShell>
    )
  }

  if (!inquiry) {
    return (
      <PageShell eyebrow="Administration" title="Not Found" backHref="/app/admin/inquiries" backLabel="Inquiries" wide>
        <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="12px" p={5}>
          <Text fontSize="sm" color="#B91C1C">{error ?? "Inquiry not found"}</Text>
        </Box>
      </PageShell>
    )
  }

  const sc = INQUIRY_STATUS[inquiry.status] ?? INQUIRY_STATUS.pending
  const clientName = [inquiry.client.firstName, inquiry.client.lastName].filter(Boolean).join(" ") || inquiry.client.email
  const assignedExpert = experts.find((e) => e.id === inquiry.assignedExpertId)
  const offers = [...(inquiry.projectOffers ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const editingOffer = editingOfferId ? offers.find((o) => o.id === editingOfferId) : null
  const offerLocked = editingOffer?.status === "accepted"

  return (
    <PageShell
      eyebrow="Administration"
      title={inquiry.title}
      subtitle={`${inquiry.client.companyName ?? inquiry.client.email} · ${new Date(inquiry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
      backHref="/app/admin/inquiries"
      backLabel="Inquiries"
      wide
    >
      {error && (
        <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px" px={4} py={3} mb={4}
          display="flex" justifyContent="space-between" alignItems="center">
          <Text fontSize="sm" color="#B91C1C">{error}</Text>
          <Box as="button" onClick={() => setError(null)} color="#B91C1C" cursor="pointer" display="flex">
            <LuX size={14} />
          </Box>
        </Box>
      )}

      <Grid templateColumns={{ base: "1fr", xl: "1fr 340px" }} gap={5} alignItems="start">

        {/* ── LEFT: Tabs (Details · Notes · Offer) ───────────────────────── */}
        <Stack gap={4}>
          <Tabs.Root defaultValue="details" variant="enclosed">
            <Tabs.List bg="white" border="1px solid #D8DCE8" borderRadius="10px" p={1} gap={1}>
              {[
                { value: "details", label: "Details", icon: <LuUser size={13} /> },
                { value: "offers", label: `Offers (${offers.length})`, icon: <LuZap size={13} /> },
                { value: "notes", label: `Notes (${notes.length})`, icon: <LuMessageSquare size={13} /> },
                { value: "documents", label: "Documents", icon: <LuFileText size={13} /> },
              ].map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  style={{ flex: 1, borderRadius: "7px", fontWeight: 600, fontSize: "0.8375rem", display: "flex", alignItems: "center", gap: "5px", justifyContent: "center", padding: "6px 12px", cursor: "pointer" }}
                >
                  {tab.icon}{tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {/* ── Details tab (read-only — submitted by client) ── */}
            <Tabs.Content value="details">
              <Box {...CARD} mt={4}>
                <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6">
                  <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
                    Inquiry details
                  </Text>
                  <Text fontSize="0.8125rem" color="#64748B" mt={1}>
                    Submitted by the client — not editable by admin.
                  </Text>
                </Box>
                <Box p={5}>
                  <Stack gap={4}>
                    <DetailRow label="Title" value={inquiry.title} />
                    <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4}>
                      <DetailRow label="Category" value={inquiry.category?.name ?? "—"} />
                      <DetailRow label="Urgency" value={URGENCY_LABELS[inquiry.urgency] ?? inquiry.urgency} />
                    </Grid>
                    <Box>
                      <Text fontSize="0.8125rem" color="#8A96A8" fontWeight="500" mb={2}>Description</Text>
                      <Text fontSize="0.875rem" color="#374151" lineHeight="1.75" whiteSpace="pre-wrap">
                        {inquiry.description}
                      </Text>
                    </Box>
                    <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr 1fr" }} gap={4}>
                      <DetailRow label="Start date" value={inquiry.targetStartDate ? DATE_FMT(inquiry.targetStartDate) : "—"} />
                      <DetailRow label="End date" value={inquiry.targetEndDate ? DATE_FMT(inquiry.targetEndDate) : "—"} />
                      <DetailRow label="Est. quantity" value={inquiry.estimatedQuantity?.toLocaleString("tr-TR") ?? "—"} />
                    </Grid>
                  </Stack>
                </Box>
              </Box>
            </Tabs.Content>

            {/* ── Notes tab ── */}
            <Tabs.Content value="notes">
              <Box {...CARD} mt={4}>
                <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6" display="flex" alignItems="center" justifyContent="space-between">
                  <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
                    Team Notes
                  </Text>
                  <Text fontSize="0.75rem" color="#8A96A8">{notes.length} note{notes.length !== 1 ? "s" : ""}</Text>
                </Box>

                {/* Note list */}
                <Box maxH="380px" overflowY="auto">
                  {notes.length === 0 ? (
                    <Box px={5} py={8} textAlign="center">
                      <Box color="#D8DCE8" mb={2} display="flex" justifyContent="center">
                        <LuMessageSquare size={28} />
                      </Box>
                      <Text fontSize="sm" color="#8A96A8">No notes yet. Add the first team note below.</Text>
                    </Box>
                  ) : (
                    notes.map((note, i) => {
                      const authorName = [note.author.firstName, note.author.lastName].filter(Boolean).join(" ") || note.author.email
                      return (
                        <Box key={note.id} px={5} py={4} borderBottom={i < notes.length - 1 ? "1px solid #EFF1F6" : undefined}>
                          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={1.5}>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Box w="26px" h="26px" bg="#EFF6FF" rounded="full" flexShrink={0}
                                display="flex" alignItems="center" justifyContent="center"
                                fontSize="0.65rem" fontWeight="800" color="#1563B2">
                                {authorName.charAt(0).toUpperCase()}
                              </Box>
                              <Box>
                                <Text fontSize="0.8125rem" fontWeight="700" color="#0D1B2E">{authorName}</Text>
                                <Text fontSize="0.7rem" color="#8A96A8">
                                  {new Date(note.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </Text>
                              </Box>
                            </Box>
                            <Box
                              as="button"
                              onClick={() => handleDeleteNote(note.id)}
                              color="#D1D5DB" cursor="pointer" display="flex"
                              _hover={{ color: "#B91C1C" }} transition="color 0.1s"
                            >
                              <LuTrash2 size={13} />
                            </Box>
                          </Box>
                          <Text fontSize="0.875rem" color="#374151" lineHeight="1.6" whiteSpace="pre-wrap" pl="34px">
                            {note.content}
                          </Text>
                        </Box>
                      )
                    })
                  )}
                </Box>

                {/* Add note form */}
                <Box as="form" onSubmit={handleNoteSubmit(onAddNote)} px={5} py={4} borderTop="1px solid #EFF1F6">
                  <Textarea
                    {...INPUT_STYLE}
                    rows={3}
                    placeholder="Add an internal note…"
                    mb={3}
                    {...regNote("content", { required: true, minLength: 1 })}
                  />
                  <Button {...BTN_PRIMARY} type="submit" size="sm" display="inline-flex" gap={1.5} loading={noteSaving}>
                    <LuSend size={13} /> Add Note
                  </Button>
                </Box>
              </Box>
            </Tabs.Content>

            {/* ── Offers tab ── */}
            <Tabs.Content value="offers">
              <Stack gap={4} mt={4}>
                <Box {...CARD}>
                  <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6" display="flex" alignItems="center" justifyContent="space-between">
                    <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
                      Client Offers
                    </Text>
                    <Button {...BTN_PRIMARY} size="sm" display="inline-flex" gap={1.5} onClick={openCreateOffer}>
                      <LuZap size={12} /> New Offer
                    </Button>
                  </Box>
                  <Box p={5}>
                    {offers.length === 0 ? (
                      <Text fontSize="0.8125rem" color="#64748B">
                        No offers yet. Create a draft, refine pricing and notes, then send to the client.
                      </Text>
                    ) : (
                      <Stack gap={3}>
                        {offers.map((offer) => {
                          const osc = OFFER_STATUS[offer.status] ?? OFFER_STATUS.draft
                          const partner = offer.experts?.[0]
                          const partnerName = partner?.expert
                            ? [partner.expert.firstName, partner.expert.lastName].filter(Boolean).join(" ")
                              || partner.expert.companyName
                              || "Partner"
                            : null
                          const canEdit = offer.status !== "accepted"
                          const canSend = ["draft", "declined"].includes(offer.status)
                          return (
                            <Box key={offer.id} p={4} border="1px solid #D8DCE8" borderRadius="10px" bg="#F8F9FC">
                              <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={3} mb={3}>
                                <Box>
                                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                                    <Text fontSize="1.125rem" fontWeight="700" color="#0D1B2E">
                                      {EUR(offer.totalClientPrice)}
                                    </Text>
                                    <Badge bg={osc.bg} color={osc.color} rounded="full" px={2} py="2px" fontSize="0.65rem" fontWeight="700">
                                      {osc.label}
                                    </Badge>
                                  </Box>
                                  <Text fontSize="0.75rem" color="#8A96A8">
                                    Created {DATE_FMT(offer.createdAt)}
                                    {offer.validUntil ? ` · Valid until ${DATE_FMT(offer.validUntil)}` : ""}
                                    {offer.leadTimeDays ? ` · ${offer.leadTimeDays} days lead time` : ""}
                                  </Text>
                                </Box>
                                <Box display="flex" gap={1.5} flexShrink={0}>
                                  {canSend && (
                                    <Button
                                      size="xs" {...BTN_PRIMARY} display="inline-flex" gap={1}
                                      loading={sendingOfferId === offer.id}
                                      onClick={() => handleSendOffer(offer.id)}
                                    >
                                      <LuSend size={11} /> Send
                                    </Button>
                                  )}
                                  {canEdit && (
                                    <Button
                                      size="xs" {...BTN_GHOST} border="1px solid #D8DCE8" display="inline-flex" gap={1}
                                      onClick={() => openEditOffer(offer)}
                                    >
                                      <LuPencil size={11} /> Edit
                                    </Button>
                                  )}
                                </Box>
                              </Box>
                              {partnerName && (
                                <Box mb={2}>
                                  <Text fontSize="0.75rem" color="#8A96A8" fontWeight="600">Partner</Text>
                                  <Text fontSize="0.8125rem" color="#374151" fontWeight="500">
                                    {partnerName}
                                    {partner?.expert?.companyName ? ` · ${partner.expert.companyName}` : ""}
                                    {partner ? ` · Expert price ${EUR(partner.proposedPrice)}` : ""}
                                  </Text>
                                </Box>
                              )}
                              {offer.notes && (
                                <Box>
                                  <Text fontSize="0.75rem" color="#8A96A8" fontWeight="600" mb={1}>Offer details & notes</Text>
                                  <Text fontSize="0.8125rem" color="#374151" lineHeight="1.6" whiteSpace="pre-wrap">
                                    {offer.notes}
                                  </Text>
                                </Box>
                              )}
                            </Box>
                          )
                        })}
                      </Stack>
                    )}
                  </Box>
                </Box>

                {/* Expert assignment */}
                <Box {...CARD}>
                  <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6" display="flex" alignItems="center" justifyContent="space-between">
                    <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
                      Assign Partner
                    </Text>
                    {inquiry.assignedExpertId && (
                      <Button {...BTN_GHOST} size="xs" color="#B91C1C" onClick={() => handleAssign(null)} loading={assignSaving}>
                        <LuX size={11} /> Remove
                      </Button>
                    )}
                  </Box>
                  <Box p={5}>
                    {assignedExpert ? (
                      <Box display="flex" alignItems="center" gap={3} p={3} bg="#F0FDF4" border="1px solid #BBF7D0" borderRadius="10px">
                        <Box w="36px" h="36px" bg="#DCFCE7" rounded="9px" display="flex" alignItems="center" justifyContent="center"
                          fontSize="0.875rem" fontWeight="800" color="#047857" flexShrink={0}>
                          {([assignedExpert.firstName, assignedExpert.lastName].filter(Boolean).join(" ") || "?").charAt(0)}
                        </Box>
                        <Box>
                          <Text fontSize="0.875rem" fontWeight="700" color="#047857">
                            {[assignedExpert.firstName, assignedExpert.lastName].filter(Boolean).join(" ") || assignedExpert.email}
                          </Text>
                          <Text fontSize="0.75rem" color="#059669">{assignedExpert.email}</Text>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Text fontSize="0.8125rem" color="#64748B" mb={3}>
                          Assign a partner before building an offer. Status moves to Matching.
                        </Text>
                        <Stack gap={2} maxH="260px" overflowY="auto">
                          {experts.filter((e) => e.profile?.isAvailable !== false).map((expert) => {
                            const name = [expert.firstName, expert.lastName].filter(Boolean).join(" ") || expert.email
                            return (
                              <Box
                                key={expert.id}
                                display="flex" alignItems="center" justifyContent="space-between" gap={3}
                                p={3} borderRadius="10px" border="1px solid #D8DCE8" bg="#F8F9FC"
                                cursor="pointer" transition="all 0.1s"
                                _hover={{ borderColor: "#1563B2", bg: "#EFF6FF" }}
                                onClick={() => handleAssign(expert.id)}
                              >
                                <Box display="flex" alignItems="center" gap={2.5} flex="1" minW={0}>
                                  <Box w="32px" h="32px" bg="#EFF6FF" rounded="8px" display="flex" alignItems="center"
                                    justifyContent="center" fontSize="0.75rem" fontWeight="800" color="#1563B2" flexShrink={0}>
                                    {name.charAt(0).toUpperCase()}
                                  </Box>
                                  <Box minW={0}>
                                    <Text fontSize="0.8125rem" fontWeight="600" color="#0D1B2E" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                                      {name}
                                    </Text>
                                    <Box display="flex" gap={1.5} flexWrap="wrap" mt="1px">
                                      {expert.categories.slice(0, 2).map((c) => (
                                        <Badge key={c.id} bg="#EFF6FF" color="#1E40AF" rounded="full" px={1.5} py="0px" fontSize="0.6rem" fontWeight="700">
                                          {c.name}
                                        </Badge>
                                      ))}
                                    </Box>
                                  </Box>
                                </Box>
                                {expert.profile?.score != null && (
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <LuStar size={11} color="#1563B2" />
                                    <Text fontSize="0.75rem" fontWeight="700" color="#1563B2">{expert.profile.score.toFixed(1)}</Text>
                                  </Box>
                                )}
                              </Box>
                            )
                          })}
                        </Stack>
                      </>
                    )}
                  </Box>
                </Box>
              </Stack>
            </Tabs.Content>

            {/* ── Documents tab ── */}
            <Tabs.Content value="documents">
              <Box mt={4}>
                {id && <InquiryDocumentsSection inquiryId={id} />}
              </Box>
            </Tabs.Content>
          </Tabs.Root>
        </Stack>

        {/* ── RIGHT: Meta sidebar ─────────────────────────────────────────── */}
        <Stack gap={4}>
          {/* Status control */}
          <Box {...CARD}>
            <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6">
              <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
                Status
              </Text>
            </Box>
            <Box p={5}>
              <Box display="flex" alignItems="center" gap={2} mb={4}>
                <Badge bg={sc.bg} color={sc.color} rounded="full" px={2.5} py="2px" fontSize="0.75rem" fontWeight="700">
                  {sc.label}
                </Badge>
                <Text fontSize="0.75rem" color={URGENCY_COLOR[inquiry.urgency] ?? "#64748B"} fontWeight="600" textTransform="capitalize">
                  {inquiry.urgency} urgency
                </Text>
              </Box>
              <NativeSelect.Root {...INPUT_STYLE} opacity={statusSaving ? 0.6 : 1}>
                <NativeSelect.Field
                  value={inquiry.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{ pointerEvents: statusSaving ? "none" : "auto" }}
                >
                  {Object.entries(INQUIRY_STATUS).map(([key, conf]) => (
                    <option key={key} value={key}>{conf.label}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>
          </Box>

          {/* Client */}
          <Box {...CARD}>
            <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6">
              <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
                Client
              </Text>
            </Box>
            <Box p={5}>
              <Box display="flex" alignItems="center" gap={2.5} mb={2}>
                <Box w="36px" h="36px" bg="#EFF6FF" rounded="9px" display="flex" alignItems="center" justifyContent="center" color="#1563B2" flexShrink={0}>
                  <LuUser size={16} />
                </Box>
                <Box>
                  <Text fontSize="0.875rem" fontWeight="700" color="#0D1B2E">{clientName}</Text>
                  <Text fontSize="0.75rem" color="#8A96A8">{inquiry.client.email}</Text>
                </Box>
              </Box>
              {inquiry.client.companyName && (
                <Box display="flex" alignItems="center" gap={1.5}>
                  <LuBuilding2 size={12} color="#8A96A8" />
                  <Text fontSize="0.8rem" color="#64748B">{inquiry.client.companyName}</Text>
                </Box>
              )}
            </Box>
          </Box>

          {/* Timeline */}
          <Box {...CARD}>
            <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6">
              <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
                Timeline
              </Text>
            </Box>
            <Box p={5}>
              <Stack gap={2.5}>
                <MetaRow label="Submitted" value={new Date(inquiry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
                <MetaRow label="Updated" value={new Date(inquiry.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
                <MetaRow label="Type" value={inquiry.type === "tool_sourcing" ? "Tool / Sourcing" : "Service"} />
                {inquiry.targetStartDate && <MetaRow label="Start" value={inquiry.targetStartDate} />}
                {inquiry.targetEndDate && <MetaRow label="Deadline" value={inquiry.targetEndDate} />}
                {inquiry.estimatedQuantity && <MetaRow label="Quantity" value={inquiry.estimatedQuantity.toLocaleString("tr-TR")} />}
              </Stack>
            </Box>
          </Box>

          {/* Assigned expert (compact) */}
          {inquiry.assignedExpertId && (
            <Box {...CARD}>
              <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6" display="flex" alignItems="center" gap={2}>
                <LuUsers size={13} color="#1563B2" />
                <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
                  Assigned Expert
                </Text>
              </Box>
              <Box p={5}>
                {assignedExpert ? (
                  <Box display="flex" alignItems="center" gap={2.5}>
                    <Box w="30px" h="30px" bg="#EFF6FF" rounded="7px" display="flex" alignItems="center" justifyContent="center"
                      fontSize="0.75rem" fontWeight="800" color="#1563B2" flexShrink={0}>
                      {([assignedExpert.firstName, assignedExpert.lastName].filter(Boolean).join(" ") || "?").charAt(0)}
                    </Box>
                    <Box>
                      <Text fontSize="0.875rem" fontWeight="700" color="#0D1B2E">
                        {[assignedExpert.firstName, assignedExpert.lastName].filter(Boolean).join(" ") || assignedExpert.email}
                      </Text>
                      <Text fontSize="0.75rem" color="#8A96A8">{assignedExpert.email}</Text>
                    </Box>
                  </Box>
                ) : (
                  <Text fontSize="0.8rem" color="#8A96A8">Expert no longer found.</Text>
                )}
              </Box>
            </Box>
          )}
        </Stack>
      </Grid>

      {/* ── Offer create / edit modal ─────────────────────────────────────────── */}
      <DialogRoot open={offerOpen} onOpenChange={({ open }) => { if (!open) closeOfferModal() }} size="lg">
        <DialogContent style={{ borderRadius: "16px", border: "1px solid #D8DCE8", overflow: "hidden", boxShadow: "0 24px 64px rgba(11,21,40,0.2)" }}>
          <Box bg="#0B1528" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2.5}>
              <Box w="7px" h="7px" bg="#1563B2" rounded="full" />
              <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
                {editingOfferId ? "Edit Offer" : "Create Offer"}
              </DialogTitle>
            </Box>
            <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.45)" }} />
          </Box>
          <DialogHeader display="none" />

          <DialogBody px={6} py={5}>
            {offerLocked && (
              <Box bg="#FFFBEB" border="1px solid #FDE68A" borderRadius="8px" px={3} py={2} mb={4}>
                <Text fontSize="sm" color="#92400E">This offer was accepted and can no longer be edited.</Text>
              </Box>
            )}
            <Stack gap={4}>
              <Field label="" invalid={!!offerErrors.expertId} errorText={offerErrors.expertId?.message}>
                <OfferFieldLabel>Partner</OfferFieldLabel>
                <NativeSelect.Root {...INPUT_STYLE} opacity={offerLocked ? 0.6 : 1}>
                  <NativeSelect.Field {...regOffer("expertId", { required: "Select a partner" })} disabled={offerLocked}>
                    <option value="">— Select partner —</option>
                    {experts.map((e) => {
                      const name = [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email
                      return <option key={e.id} value={e.id}>{name} ({e.email})</option>
                    })}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field>

              {selectedExpert && (
                <Box p={3} bg="#F0F9FF" border="1px solid #BAE6FD" borderRadius="10px">
                  <Text fontSize="0.8rem" fontWeight="600" color="#0369A1">
                    {[selectedExpert.firstName, selectedExpert.lastName].filter(Boolean).join(" ") || selectedExpert.email}
                  </Text>
                  <Box display="flex" gap={1.5} mt={1} flexWrap="wrap">
                    {selectedExpert.categories.map((c) => (
                      <Badge key={c.id} bg="#E0F2FE" color="#0369A1" rounded="full" px={2} py="1px" fontSize="0.65rem" fontWeight="700">{c.name}</Badge>
                    ))}
                  </Box>
                </Box>
              )}

              <Grid templateColumns="1fr 1fr" gap={4}>
                <Field label="" invalid={!!offerErrors.proposedPrice} errorText={offerErrors.proposedPrice?.message}>
                  <OfferFieldLabel>Partner price (€)</OfferFieldLabel>
                  <Input {...INPUT_STYLE} type="number" min={0} step={0.01} placeholder="e.g. 4500"
                    disabled={offerLocked} {...regOffer("proposedPrice", { required: "Required" })} />
                </Field>
                <Field label="" invalid={!!offerErrors.clientPrice} errorText={offerErrors.clientPrice?.message}>
                  <OfferFieldLabel>Client price (€)</OfferFieldLabel>
                  <Input {...INPUT_STYLE} type="number" min={0} step={0.01} placeholder="e.g. 5500"
                    disabled={offerLocked} {...regOffer("clientPrice", { required: "Required" })} />
                </Field>
              </Grid>

              <Grid templateColumns="1fr 1fr" gap={4}>
                <Box>
                  <OfferFieldLabel>Lead time (days)</OfferFieldLabel>
                  <Input {...INPUT_STYLE} type="number" min={1} placeholder="e.g. 30"
                    disabled={offerLocked} {...regOffer("leadTimeDays")} />
                </Box>
                <Box>
                  <OfferFieldLabel>Offer valid until</OfferFieldLabel>
                  <Input type="date" {...INPUT_STYLE} disabled={offerLocked} {...regOffer("validUntil")} />
                </Box>
              </Grid>

              <Box>
                <OfferFieldLabel>Offer details & notes</OfferFieldLabel>
                <Textarea {...INPUT_STYLE} rows={4}
                  placeholder="Scope, materials, delivery terms, exclusions — visible to the client when sent…"
                  disabled={offerLocked} {...regOffer("notes")} />
              </Box>

              {offerErrors.root && (
                <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="8px" px={3} py={2}>
                  <Text fontSize="sm" color="#B91C1C">{offerErrors.root.message}</Text>
                </Box>
              )}
            </Stack>
          </DialogBody>

          <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2} flexWrap="wrap">
            {!offerLocked && (
              <>
                <Button
                  {...BTN_GHOST}
                  border="1px solid #D8DCE8"
                  loading={offerSaving}
                  flex={{ base: "1 1 100%", sm: 1 }}
                  onClick={handleOfferSubmit((d) => onSubmitOffer(d, false))}
                >
                  {editingOfferId
                    ? "Save changes"
                    : "Save as draft"}
                </Button>
                {(!editingOffer || ["draft", "declined"].includes(editingOffer.status)) && (
                  <Button
                    {...BTN_PRIMARY}
                    loading={offerSaving}
                    flex={{ base: "1 1 100%", sm: 1 }}
                    display="inline-flex"
                    gap={2}
                    onClick={handleOfferSubmit((d) => onSubmitOffer(d, true))}
                  >
                    <LuSend size={14} /> Send to client
                  </Button>
                )}
              </>
            )}
            <Button {...BTN_GHOST} color="#64748B" onClick={closeOfferModal}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </PageShell>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text fontSize="0.8125rem" color="#8A96A8" fontWeight="500" mb={1}>{label}</Text>
      <Text fontSize="0.875rem" color="#0D1B2E" fontWeight="500">{value}</Text>
    </Box>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="baseline" gap={2}>
      <Box display="flex" alignItems="center" gap={1.5}>
        <LuCalendar size={11} color="#8A96A8" />
        <Text fontSize="0.8rem" color="#8A96A8" fontWeight="500">{label}</Text>
      </Box>
      <Text fontSize="0.8rem" color="#0D1B2E" fontWeight="600">{value}</Text>
    </Box>
  )
}

function OfferFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="0.75rem" fontWeight="600" color="#4A5568" mb={1.5} letterSpacing="0.01em">{children}</Text>
  )
}
