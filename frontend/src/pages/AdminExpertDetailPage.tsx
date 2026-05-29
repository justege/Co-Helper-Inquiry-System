import { useEffect, useState, useCallback } from "react"
import { Link, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import {
  Box,
  Button,
  Grid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react"
import { FormInput } from "@/components/ui/form-controls"
import {
  LuArrowLeft,
  LuBuilding2,
  LuDownload,
  LuMail,
  LuPhone,
  LuStar,
} from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { Field } from "@/components/ui/field"
import { getMe } from "@/api/users"
import {
  getAdminExpert,
  getPartnerDocumentUrl,
  updateExpertScore,
  type AdminExpertDetail,
} from "@/api/adminExperts"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_BTN_GHOST,
  APP_BTN_GHOST_ISLAND,
  APP_BTN_PRIMARY,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
  AppCard,
  AppRow,
} from "@/components/ui/appUi"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogCloseTrigger,
} from "@/components/ui/dialog"

type ScoreForm = { score: string; notes: string }

const CONTACT_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  both: "Email & phone",
}

export default function AdminExpertDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [expert, setExpert] = useState<AdminExpertDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ScoreForm>({ defaultValues: { score: "", notes: "" } })

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([getAdminExpert(id), getMe()])
      .then(([data, me]) => {
        setExpert(data)
        setMyRole(me.role)
        reset({
          score: data.profile?.score?.toString() ?? "",
          notes: data.profile?.scoreNotes ?? "",
        })
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, reset])

  useEffect(() => { load() }, [load])

  async function onScoreSubmit(data: ScoreForm) {
    if (!id) return
    const val = parseFloat(data.score)
    if (isNaN(val) || val < 0 || val > 10) {
      setScoreError("Score must be between 0 and 10")
      return
    }
    setScoreError(null)
    try {
      await updateExpertScore(id, val, data.notes)
      setScoreOpen(false)
      load()
    } catch (e: unknown) {
      setScoreError(e instanceof Error ? e.message : "Failed to save score")
    }
  }

  async function handleDownload(docId: string) {
    if (!id) return
    try {
      const { url } = await getPartnerDocumentUrl(id, docId)
      window.open(url, "_blank")
    } catch {
      // ignore
    }
  }

  const name = expert
    ? [expert.firstName, expert.lastName].filter(Boolean).join(" ") || expert.email
    : "Partner"

  return (
    <PageShell
      eyebrow="Administration"
      title={loading ? "Partner details" : name}
      subtitle={expert?.companyName ?? expert?.email}
      wide
      action={
        <Link to="/app/admin/experts" style={{ textDecoration: "none" }}>
          <Button {...APP_BTN_GHOST_ISLAND} size="sm" h="34px" px={4} display="inline-flex" gap={1.5}>
            <LuArrowLeft size={14} /> Back to partners
          </Button>
        </Link>
      }
    >
      {loading && (
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="gray.500" />
          <Text fontSize="sm" color={APP_MUTED}>Loading partner…</Text>
        </Box>
      )}

      {error && (
        <Box {...APP_CARD} p={5}>
          <Text fontSize="sm" color={APP_INK}>{error}</Text>
        </Box>
      )}

      {!loading && !error && expert && (
        <Stack gap={5}>
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={5}>
            <AppCard label="Company">
              <Stack gap={0}>
                <AppRow label="Company" value={expert.companyName ?? "—"} />
                <AppRow label="Location" value={expert.profile?.locationCity ?? "—"} />
                <AppRow label="Availability" value={expert.profile?.isAvailable ? "Available" : "Not available"} />
                {expert.profile?.score != null && (
                  <AppRow label="Score" value={`${expert.profile.score.toFixed(1)} / 10`} />
                )}
              </Stack>
            </AppCard>

            <AppCard
              label="Contact"
              action={
                myRole === "superadmin" ? (
                  <Button {...APP_BTN_PRIMARY} size="xs" onClick={() => setScoreOpen(true)}>
                    <LuStar size={12} /> Update score
                  </Button>
                ) : undefined
              }
            >
              <Stack gap={0}>
                <AppRow label="Email" value={expert.email} />
                <AppRow label="Phone" value={expert.phone ?? "—"} />
                <AppRow label="Preferred contact" value={CONTACT_LABELS[expert.contactPref] ?? expert.contactPref} />
                <AppRow
                  label="Member since"
                  value={new Date(expert.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                />
              </Stack>
            </AppCard>
          </Grid>

          {expert.profile?.bio && (
            <AppCard label="About">
              <Text fontSize="0.875rem" color={APP_MUTED} lineHeight="1.75" whiteSpace="pre-wrap">
                {expert.profile.bio}
              </Text>
            </AppCard>
          )}

          {expert.profile?.capacityNotes && (
            <AppCard label="Capacity notes">
              <Text fontSize="0.875rem" color={APP_MUTED} lineHeight="1.75" whiteSpace="pre-wrap">
                {expert.profile.capacityNotes}
              </Text>
            </AppCard>
          )}

          {expert.profile?.scoreNotes && myRole === "superadmin" && (
            <AppCard label="Internal score notes">
              <Text fontSize="0.875rem" color={APP_MUTED} lineHeight="1.75" whiteSpace="pre-wrap">
                {expert.profile.scoreNotes}
              </Text>
            </AppCard>
          )}

          <AppCard label="Categories">
            {expert.categories.length === 0 ? (
              <Text fontSize="0.875rem" color={APP_MUTED}>No categories assigned.</Text>
            ) : (
              <Box display="flex" gap={3} flexWrap="wrap">
                {expert.categories.map((cat) => (
                  <Text key={cat.id} fontSize="0.8125rem" color={APP_INK} fontWeight="500">
                    {cat.name}
                  </Text>
                ))}
              </Box>
            )}
          </AppCard>

          <AppCard label={`Services (${expert.services.length})`}>
            {expert.services.length === 0 ? (
              <Text fontSize="0.875rem" color={APP_MUTED}>No services listed.</Text>
            ) : (
              <Stack gap={3}>
                {expert.services.map((svc) => (
                  <Box key={svc.id} p={4} border={`1px solid ${APP_BORDER}`} borderRadius="8px" bg={APP_BG_SUBTLE}>
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={3}>
                      <Box>
                        <Text fontSize="0.9375rem" fontWeight="600" color={APP_INK}>{svc.title}</Text>
                        {svc.description && (
                          <Text fontSize="0.8125rem" color={APP_MUTED} mt={1} lineHeight="1.6">{svc.description}</Text>
                        )}
                      </Box>
                      <Text fontSize="0.75rem" color={APP_LABEL}>
                        {svc.isActive ? "Active" : "Inactive"}
                      </Text>
                    </Box>
                    {(svc.priceFrom != null || svc.priceTo != null) && (
                      <Text fontSize="0.8125rem" color={APP_INK} fontWeight="500" mt={2}>
                        {svc.priceFrom != null && svc.priceTo != null
                          ? `${svc.priceFrom}–${svc.priceTo} ${svc.currency} / ${svc.priceUnit}`
                          : svc.priceFrom != null
                            ? `From ${svc.priceFrom} ${svc.currency} / ${svc.priceUnit}`
                            : `Up to ${svc.priceTo} ${svc.currency} / ${svc.priceUnit}`}
                      </Text>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </AppCard>

          <AppCard label={`Documents (${expert.documents.length})`}>
            {expert.documents.length === 0 ? (
              <Text fontSize="0.875rem" color={APP_MUTED}>No documents uploaded.</Text>
            ) : (
              <Stack gap={0}>
                {expert.documents.map((doc, i) => (
                  <Box
                    key={doc.id}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={3}
                    py={3}
                    borderBottom={i < expert.documents.length - 1 ? `1px solid ${APP_BORDER}` : undefined}
                  >
                    <Box minW={0}>
                      <Text fontSize="0.875rem" fontWeight="500" color={APP_INK}>{doc.title}</Text>
                      <Text fontSize="0.75rem" color={APP_LABEL} mt={0.5}>
                        {doc.fileName} · {doc.docType}
                      </Text>
                    </Box>
                    <Button
                      size="xs"
                      variant="outline"
                      borderColor={APP_BORDER}
                      color={APP_MUTED}
                      onClick={() => handleDownload(doc.id)}
                    >
                      <LuDownload size={13} />
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
          </AppCard>

          <Box display="flex" gap={3} flexWrap="wrap">
            <Box display="flex" alignItems="center" gap={2} color={APP_MUTED} fontSize="0.8125rem">
              <LuBuilding2 size={14} />
              <span>{expert.companyName ?? "No company set"}</span>
            </Box>
            {expert.phone && (
              <Box display="flex" alignItems="center" gap={2} color={APP_MUTED} fontSize="0.8125rem">
                <LuPhone size={14} />
                <span>{expert.phone}</span>
              </Box>
            )}
            <Box display="flex" alignItems="center" gap={2} color={APP_MUTED} fontSize="0.8125rem">
              <LuMail size={14} />
              <span>{expert.email}</span>
            </Box>
          </Box>
        </Stack>
      )}

      <DialogRoot open={scoreOpen} onOpenChange={({ open }) => { if (!open) setScoreOpen(false) }} size="md">
        <DialogContent style={{ borderRadius: "12px", border: `1px solid ${APP_BORDER}` }}>
          <DialogHeader px={5} pt={5} pb={0}>
            <DialogTitle fontSize="1rem" fontWeight="600" color={APP_INK}>Update partner score</DialogTitle>
            <DialogCloseTrigger />
          </DialogHeader>
          <DialogBody px={5} py={5}>
            <Box as="form" onSubmit={handleSubmit(onScoreSubmit)}>
              <Stack gap={4}>
                <Field label="Score (0 – 10)">
                  <FormInput
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    {...register("score", { required: true })}
                  />
                </Field>
                <Field label="Internal notes (optional)">
                  <FormInput placeholder="Scoring context" {...register("notes")} />
                </Field>
                {scoreError && <Text fontSize="sm" color="#B91C1C">{scoreError}</Text>}
                <Box display="flex" gap={2}>
                  <Button {...APP_BTN_PRIMARY} type="submit" loading={isSubmitting} flex={1}>Save score</Button>
                  <Button {...APP_BTN_GHOST} color={APP_MUTED} onClick={() => setScoreOpen(false)}>Cancel</Button>
                </Box>
              </Stack>
            </Box>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </PageShell>
  )
}
