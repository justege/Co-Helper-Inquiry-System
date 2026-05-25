import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { Badge, Box, Button, Grid, Input, Spinner, Stack, Text, Textarea } from "@chakra-ui/react"
import {
  LuDownload, LuFileText, LuPaperclip, LuPencil, LuPlus, LuToggleLeft,
  LuToggleRight, LuTrash2, LuUpload,
} from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { api } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PartnerService {
  id: string
  title: string
  description: string | null
  priceFrom: number | null
  priceTo: number | null
  priceUnit: string
  currency: string
  isActive: boolean
  sortOrder: number
  createdAt: string
}

interface PartnerDocument {
  id: string
  title: string
  fileName: string
  fileSize: number | null
  mimeType: string | null
  docType: string
  createdAt: string
}

type ServiceForm = {
  title: string
  description: string
  priceFrom: string
  priceTo: string
  priceUnit: string
  currency: string
}

// ── Shared primitives ─────────────────────────────────────────────────────────

const CARD = {
  bg: "white" as const,
  border: "1px solid #D8DCE8",
  borderRadius: "14px",
  overflow: "hidden" as const,
}

const INPUT_STYLE = {
  size: "sm" as const,
  bg: "white",
  borderColor: "#D8DCE8",
  borderRadius: "8px",
  fontSize: "0.875rem",
  _focusVisible: { borderColor: "#1563B2", boxShadow: "0 0 0 2px rgba(21,99,178,0.15)" },
}

const UNITS = ["piece", "hour", "day", "project", "kg", "m2"]
const DOC_TYPES = [
  { value: "brochure",     label: "Company Brochure" },
  { value: "certification",label: "Certificate" },
  { value: "portfolio",    label: "Portfolio" },
  { value: "price_list",   label: "Price List" },
  { value: "other",        label: "Other" },
]

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text fontSize="0.6875rem" fontWeight="700" color="#4A5568" letterSpacing="0.07em" textTransform="uppercase" mb={1}>
      {children}{required && <Box as="span" color="#1563B2" ml={0.5}>*</Box>}
    </Text>
  )
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtPrice(from: number | null, to: number | null, unit: string, currency: string) {
  if (!from && !to) return null
  const fmt = (n: number) => n.toLocaleString("en-EU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const range = from && to ? `${fmt(from)} – ${fmt(to)}` : from ? `from ${fmt(from)}` : `up to ${fmt(to!)}`
  return `${currency} ${range} / ${unit}`
}

// ── Service form (add / edit) ─────────────────────────────────────────────────

function ServiceFormCard({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ServiceForm>
  onSave: (data: ServiceForm) => Promise<void>
  onCancel: () => void
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ServiceForm>({
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      priceFrom: initial?.priceFrom ?? "",
      priceTo: initial?.priceTo ?? "",
      priceUnit: initial?.priceUnit ?? "piece",
      currency: initial?.currency ?? "EUR",
    },
  })

  return (
    <Box as="form" onSubmit={handleSubmit(onSave)} {...CARD} p={5}>
      <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4} mb={4}>
        <Box gridColumn={{ sm: "1 / -1" }}>
          <FieldLabel required>Service title</FieldLabel>
          <Input {...INPUT_STYLE} placeholder="e.g. CNC Turning, Custom Textile Production"
            {...register("title", { required: "Title is required" })}
            borderColor={errors.title ? "#FECACA" : INPUT_STYLE.borderColor}
          />
          {errors.title && <Text fontSize="0.75rem" color="#B91C1C" mt={1}>{errors.title.message}</Text>}
        </Box>

        <Box>
          <FieldLabel>Price from</FieldLabel>
          <Input {...INPUT_STYLE} type="number" step="0.01" min="0" placeholder="0.00"
            {...register("priceFrom")} />
        </Box>
        <Box>
          <FieldLabel>Price to</FieldLabel>
          <Input {...INPUT_STYLE} type="number" step="0.01" min="0" placeholder="0.00"
            {...register("priceTo")} />
        </Box>

        <Box>
          <FieldLabel>Price unit</FieldLabel>
          <Box
            as="select" {...INPUT_STYLE}
            h="36px" w="full" px={3}
            border="1px solid" borderColor={INPUT_STYLE.borderColor}
            {...register("priceUnit")}
            style={{ borderRadius: "8px", background: "white", fontSize: "0.875rem" }}
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </Box>
        </Box>

        <Box>
          <FieldLabel>Currency</FieldLabel>
          <Box
            as="select" {...INPUT_STYLE}
            h="36px" w="full" px={3}
            border="1px solid" borderColor={INPUT_STYLE.borderColor}
            {...register("currency")}
            style={{ borderRadius: "8px", background: "white", fontSize: "0.875rem" }}
          >
            {["EUR", "USD", "GBP", "TRY"].map((c) => <option key={c} value={c}>{c}</option>)}
          </Box>
        </Box>

        <Box gridColumn={{ sm: "1 / -1" }}>
          <FieldLabel>Description</FieldLabel>
          <Textarea {...INPUT_STYLE} rows={3} placeholder="Describe your service, capabilities, MOQ, lead time…"
            {...register("description")} />
        </Box>
      </Grid>

      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button size="sm" h="34px" variant="ghost" colorPalette="gray" borderRadius="8px"
          fontWeight="600" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button size="sm" h="34px" bg="#1563B2" color="white" borderRadius="8px"
          fontWeight="700" loading={isSubmitting} type="submit"
          _hover={{ bg: "#1252A0" }}>
          Save service
        </Button>
      </Box>
    </Box>
  )
}

// ── Service card ──────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: PartnerService
  onEdit: (s: PartnerService) => void
  onToggle: (s: PartnerService) => void
  onDelete: (s: PartnerService) => void
}) {
  const priceStr = fmtPrice(service.priceFrom, service.priceTo, service.priceUnit, service.currency)
  return (
    <Box {...CARD} opacity={service.isActive ? 1 : 0.6} transition="opacity 0.15s">
      <Box px={5} py={4} display="flex" alignItems="flex-start" justifyContent="space-between" gap={4}>
        <Box flex="1" minW={0}>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Text fontSize="0.9375rem" fontWeight="700" color="#0D1B2E">{service.title}</Text>
            {!service.isActive && (
              <Badge bg="#EFF2F8" color="#64748B" rounded="full" px={2} py="1px" fontSize="0.65rem" fontWeight="700">
                Hidden
              </Badge>
            )}
          </Box>
          {priceStr && (
            <Text fontSize="0.875rem" color="#1563B2" fontWeight="600" mb={1}>{priceStr}</Text>
          )}
          {service.description && (
            <Text fontSize="0.8125rem" color="#64748B" lineHeight="1.6" mt={1}>
              {service.description}
            </Text>
          )}
        </Box>
        <Box display="flex" gap={1} flexShrink={0}>
          <Box as="button" type="button" w="30px" h="30px" borderRadius="7px" bg="#F8F9FC"
            border="1px solid #D8DCE8" display="flex" alignItems="center" justifyContent="center"
            cursor="pointer" color="#64748B" _hover={{ bg: "#EFF6FF", borderColor: "#BFDBFE", color: "#1563B2" }}
            onClick={() => onEdit(service)} title="Edit">
            <LuPencil size={13} />
          </Box>
          <Box as="button" type="button" w="30px" h="30px" borderRadius="7px" bg="#F8F9FC"
            border="1px solid #D8DCE8" display="flex" alignItems="center" justifyContent="center"
            cursor="pointer" color={service.isActive ? "#10B981" : "#9CA3AF"}
            _hover={{ bg: "#F0FDF4", borderColor: "#A7F3D0" }}
            onClick={() => onToggle(service)} title={service.isActive ? "Hide" : "Show"}>
            {service.isActive ? <LuToggleRight size={15} /> : <LuToggleLeft size={15} />}
          </Box>
          <Box as="button" type="button" w="30px" h="30px" borderRadius="7px" bg="#F8F9FC"
            border="1px solid #D8DCE8" display="flex" alignItems="center" justifyContent="center"
            cursor="pointer" color="#DC2626" _hover={{ bg: "#FEF2F2", borderColor: "#FECACA" }}
            onClick={() => onDelete(service)} title="Delete">
            <LuTrash2 size={13} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

// ── Documents section ─────────────────────────────────────────────────────────

function DocumentsSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<PartnerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [uploadDocType, setUploadDocType] = useState("brochure")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(() => {
    api.get<PartnerDocument[]>("/api/partner-services/me/documents")
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadErr(null)
    try {
      const { documentId, uploadUrl } = await api.post<{ documentId: string; uploadUrl: string; filePath: string }>(
        "/api/partner-services/me/documents/init-upload",
        { fileName: file.name, fileSize: file.size, mimeType: file.type, docType: uploadDocType }
      )
      const uploadRes = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })
      if (!uploadRes.ok) throw new Error("Upload to storage failed")
      await api.post(`/api/partner-services/me/documents/${documentId}/confirm`, {})
      load()
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleDownload(doc: PartnerDocument) {
    try {
      const { url, fileName } = await api.get<{ url: string; fileName: string }>(
        `/api/partner-services/me/documents/${doc.id}/url`
      )
      const a = document.createElement("a"); a.href = url; a.download = fileName; a.click()
    } catch {
      alert("Download failed — please try again.")
    }
  }

  async function handleDelete(doc: PartnerDocument) {
    if (!window.confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return
    setDeletingId(doc.id)
    try {
      await api.delete(`/api/partner-services/me/documents/${doc.id}`)
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    } catch {
      alert("Delete failed.")
    } finally {
      setDeletingId(null)
    }
  }

  const DOC_TYPE_LABEL: Record<string, string> = {
    brochure: "Brochure", certification: "Certificate", portfolio: "Portfolio",
    price_list: "Price List", other: "Document",
  }

  return (
    <Box>
      <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6" display="flex" alignItems="center" justifyContent="space-between">
        <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
          Documents & Brochures
        </Text>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            as="select" h="28px" px={2} borderRadius="7px" bg="white"
            border="1px solid #D8DCE8" fontSize="0.75rem" fontWeight="500" color="#374151"
            value={uploadDocType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadDocType(e.target.value)}
            style={{ cursor: "pointer" }}
          >
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Box>
          <input type="file" ref={fileRef} style={{ display: "none" }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
          />
          <Button size="xs" h="28px" px={3} borderRadius="7px" bg="#1563B2" color="white"
            fontSize="0.75rem" fontWeight="700" _hover={{ bg: "#1252A0" }}
            loading={uploading} onClick={() => fileRef.current?.click()}>
            <LuUpload size={12} /> Upload
          </Button>
        </Box>
      </Box>

      <Box p={5}>
        {uploadErr && (
          <Box mb={4} p={3} bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px">
            <Text fontSize="0.8125rem" color="#991B1B">{uploadErr}</Text>
          </Box>
        )}

        {loading ? (
          <Box display="flex" alignItems="center" gap={2}>
            <Spinner size="sm" color="blue.500" />
            <Text fontSize="0.875rem" color="#64748B">Loading…</Text>
          </Box>
        ) : docs.length === 0 ? (
          <Box textAlign="center" py={6}>
            <LuPaperclip size={28} color="#D8DCE8" style={{ margin: "0 auto 8px" }} />
            <Text fontSize="0.875rem" color="#8A96A8" fontWeight="500">No documents uploaded yet.</Text>
            <Text fontSize="0.75rem" color="#B8C0D0" mt={1}>
              Upload company brochures, certifications, portfolios and price lists.
            </Text>
          </Box>
        ) : (
          <Stack gap={2}>
            {docs.map((doc) => (
              <Box key={doc.id} display="flex" alignItems="center" gap={3} p={3}
                bg="#FAFBFD" border="1px solid #EFF1F6" borderRadius="10px"
                _hover={{ borderColor: "#D8DCE8" }} transition="border-color 0.1s">
                <Box flexShrink={0} color="#1563B2"><LuFileText size={20} /></Box>
                <Box flex="1" minW={0}>
                  <Text fontSize="0.875rem" fontWeight="600" color="#0D1B2E"
                    overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {doc.fileName}
                  </Text>
                  <Text fontSize="0.75rem" color="#8A96A8">
                    <Badge bg="#EFF2F8" color="#374151" rounded="full" px={2} py="1px" fontSize="0.6rem" fontWeight="700" mr={2}>
                      {DOC_TYPE_LABEL[doc.docType] ?? doc.docType}
                    </Badge>
                    {fmtSize(doc.fileSize)}{" "}· {new Date(doc.createdAt).toLocaleDateString("tr-TR")}
                  </Text>
                </Box>
                <Box display="flex" gap={1}>
                  <Box as="button" type="button" w="30px" h="30px" borderRadius="7px" bg="white"
                    border="1px solid #D8DCE8" display="flex" alignItems="center" justifyContent="center"
                    cursor="pointer" color="#1563B2" _hover={{ bg: "#EFF6FF", borderColor: "#BFDBFE" }}
                    onClick={() => handleDownload(doc)} title="Download">
                    <LuDownload size={13} />
                  </Box>
                  <Box as="button" type="button" w="30px" h="30px" borderRadius="7px" bg="white"
                    border="1px solid #D8DCE8" display="flex" alignItems="center" justifyContent="center"
                    cursor="pointer" color="#DC2626" _hover={{ bg: "#FEF2F2", borderColor: "#FECACA" }}
                    onClick={() => handleDelete(doc)} opacity={deletingId === doc.id ? 0.5 : 1} title="Delete">
                    <LuTrash2 size={13} />
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerServicesPage() {
  const [services, setServices] = useState<PartnerService[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingService, setEditingService] = useState<PartnerService | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get<PartnerService[]>("/api/partner-services/me?includeInactive=true")
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(data: ServiceForm) {
    await api.post("/api/partner-services", {
      title: data.title,
      description: data.description || null,
      priceFrom: data.priceFrom ? Number(data.priceFrom) : null,
      priceTo: data.priceTo ? Number(data.priceTo) : null,
      priceUnit: data.priceUnit,
      currency: data.currency,
    })
    setShowAdd(false)
    load()
  }

  async function handleEdit(data: ServiceForm) {
    if (!editingService) return
    await api.put(`/api/partner-services/${editingService.id}`, {
      title: data.title,
      description: data.description || null,
      priceFrom: data.priceFrom ? Number(data.priceFrom) : null,
      priceTo: data.priceTo ? Number(data.priceTo) : null,
      priceUnit: data.priceUnit,
      currency: data.currency,
    })
    setEditingService(null)
    load()
  }

  async function handleToggle(s: PartnerService) {
    await api.put(`/api/partner-services/${s.id}`, { isActive: !s.isActive })
    load()
  }

  async function handleDelete(s: PartnerService) {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/api/partner-services/${s.id}`)
      load()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Delete failed")
    }
  }

  return (
    <PageShell
      eyebrow="Partner Profile"
      title="My Services"
      subtitle="Showcase your capabilities, pricing and company documents to potential clients."
    >
      <Grid templateColumns={{ base: "1fr", lg: "1fr 360px" }} gap={4} alignItems="start">
        {/* Left — services list */}
        <Stack gap={3}>
          {err && (
            <Box p={3} bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px">
              <Text fontSize="0.8125rem" color="#991B1B">{err}</Text>
            </Box>
          )}

          {/* Header row */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
              Services ({services.filter((s) => s.isActive).length} active)
            </Text>
            {!showAdd && !editingService && (
              <Button size="sm" h="32px" px={3.5} bg="#1563B2" color="white" borderRadius="8px"
                fontWeight="700" fontSize="0.8rem" _hover={{ bg: "#1252A0" }}
                onClick={() => setShowAdd(true)} display="flex" gap={1.5}>
                <LuPlus size={13} /> Add service
              </Button>
            )}
          </Box>

          {/* Add form */}
          {showAdd && (
            <ServiceFormCard
              onSave={handleAdd}
              onCancel={() => setShowAdd(false)}
            />
          )}

          {/* Loading */}
          {loading && (
            <Box display="flex" alignItems="center" gap={2} py={6}>
              <Spinner size="sm" color="blue.500" />
              <Text fontSize="sm" color="#64748B">Loading your services…</Text>
            </Box>
          )}

          {/* Empty */}
          {!loading && services.length === 0 && !showAdd && (
            <Box {...CARD} p={10} textAlign="center">
              <Text fontSize="2rem" mb={3}>🏭</Text>
              <Text fontSize="0.9375rem" fontWeight="700" color="#0D1B2E" mb={2}>
                No services listed yet
              </Text>
              <Text fontSize="0.875rem" color="#8A96A8" maxW="360px" mx="auto" lineHeight="1.6" mb={5}>
                Add your manufacturing and service capabilities so buyers can find and contact you.
              </Text>
              <Button size="sm" h="36px" px={4} bg="#1563B2" color="white" borderRadius="8px"
                fontWeight="700" _hover={{ bg: "#1252A0" }} onClick={() => setShowAdd(true)}>
                <LuPlus size={14} /> Add your first service
              </Button>
            </Box>
          )}

          {/* Service cards */}
          {!loading && services.map((service) => (
            editingService?.id === service.id ? (
              <ServiceFormCard
                key={service.id}
                initial={{
                  title: service.title,
                  description: service.description ?? "",
                  priceFrom: service.priceFrom?.toString() ?? "",
                  priceTo: service.priceTo?.toString() ?? "",
                  priceUnit: service.priceUnit,
                  currency: service.currency,
                }}
                onSave={handleEdit}
                onCancel={() => setEditingService(null)}
              />
            ) : (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={setEditingService}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            )
          ))}
        </Stack>

        {/* Right — documents */}
        <Box {...CARD}>
          <DocumentsSection />
        </Box>
      </Grid>
    </PageShell>
  )
}
