import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Grid,
  Input,
  NativeSelect,
  Spinner,
  Stack,
  Tabs,
  Text,
  Textarea,
} from "@chakra-ui/react"
import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuRefreshCw,
  LuStar,
  LuUser,
  LuBuilding2,
  LuArrowRight,
  LuX,
} from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { Field } from "@/components/ui/field"
import { getMe } from "@/api/users"
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from "@/api/categories"
import { api } from "@/lib/api"
import type { BusinessType } from "@/api/inquiries"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_BTN_GHOST,
  APP_BTN_PRIMARY,
  APP_CARD,
  APP_INPUT_STYLE,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
  AppFilterChip,
  AppStatusText,
  formatStatusLabel,
} from "@/components/ui/appUi"

const CARD = APP_CARD
const INPUT_STYLE = APP_INPUT_STYLE
const BTN_PRIMARY = APP_BTN_PRIMARY
const BTN_GHOST = APP_BTN_GHOST

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminInquiry {
  id: string
  title: string
  type: string
  urgency: string
  status: string
  createdAt: string
  category: { id: string; name: string } | null
  client: { id: string; email: string; firstName: string | null; lastName: string | null; companyName: string | null }
}

interface ExpertUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  role: string
  createdAt: string
  categories: Category[]
  profile: {
    bio: string | null
    locationCity: string
    isAvailable: boolean
    score: number | null
    scoreNotes: string | null
  } | null
}

interface AdminUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  role: string
  createdAt: string
}

const INQUIRY_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  matching: "Matching",
  offered: "Offered",
  converted: "Converted",
  cancelled: "Cancelled",
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const [role, setRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then((u) => setRole(u.role))
      .catch(() => setRole(null))
      .finally(() => setRoleLoading(false))
  }, [])

  if (roleLoading) {
    return (
      <PageShell eyebrow="Administration" title="Control Panel" wide>
        <Box display="flex" alignItems="center" gap={3} py={8}>
          <Spinner size="sm" color="blue.500" />
          <Text fontSize="sm" color="#64748B">Verifying access…</Text>
        </Box>
      </PageShell>
    )
  }

  if (role !== "superadmin" && role !== "admin") {
    return <Navigate to="/app/dashboard" replace />
  }

  return (
    <PageShell
      eyebrow="Administration"
      title="Control Panel"
      subtitle="Manage categories, inquiries, experts, and users across the platform."
      wide
    >
      <Tabs.Root defaultValue="categories" variant="line">
        <Box
          {...CARD}
          mb={5}
          px={{ base: 3, md: 5 }}
          overflowX="auto"
        >
          <Tabs.List
            borderBottom="none"
            gap={0}
          >
            {[
              { value: "categories", label: "Categories" },
              { value: "inquiries",  label: "Inquiries" },
              { value: "experts",    label: "Experts" },
              { value: "users",      label: "Users" },
            ].map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                fontSize="0.8375rem"
                fontWeight="600"
                px={4}
                py={3.5}
                color="#64748B"
                borderBottom="2px solid transparent"
                _selected={{ color: APP_ACCENT, borderBottomColor: APP_ACCENT }}
                _hover={{ color: "#1B3A6B" }}
                transition="all 0.12s"
                whiteSpace="nowrap"
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Box>

        <Tabs.Content value="categories" pt={0}>
          <CategoriesTab isSuperadmin={role === "superadmin"} />
        </Tabs.Content>
        <Tabs.Content value="inquiries" pt={0}>
          <InquiriesTab />
        </Tabs.Content>
        <Tabs.Content value="experts" pt={0}>
          <ExpertsTab isSuperadmin={role === "superadmin"} />
        </Tabs.Content>
        <Tabs.Content value="users" pt={0}>
          <UsersTab isSuperadmin={role === "superadmin"} />
        </Tabs.Content>
      </Tabs.Root>
    </PageShell>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ════════════════════════════════════════════════════════════════════════════

type CategoryForm = { name: string; type: BusinessType; description: string }

function CategoriesTab({ isSuperadmin }: { isSuperadmin: boolean }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset: resetForm,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({ defaultValues: { name: "", type: "service", description: "" } })

  const load = useCallback(() => {
    setLoading(true)
    getCategories().then(setCategories).catch(() => setCategories([])).finally(() => setLoading(false))
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const filtered = typeFilter === "all" ? categories : categories.filter((c) => c.type === typeFilter)

  function openAdd() {
    resetForm({ name: "", type: "service", description: "" })
    setAddOpen(true)
  }

  function openEdit(cat: Category) {
    resetForm({ name: cat.name, type: cat.type, description: cat.description ?? "" })
    setEditCat(cat)
  }

  function closeModal() {
    setAddOpen(false)
    setEditCat(null)
  }

  async function onSubmit(data: CategoryForm) {
    try {
      if (editCat) {
        await updateCategory(editCat.id, { name: data.name.trim(), type: data.type, description: data.description.trim() || undefined })
        setEditCat(null)
      } else {
        await createCategory({ name: data.name.trim(), type: data.type, description: data.description.trim() || undefined })
        setAddOpen(false)
      }
      load()
    } catch (e: unknown) {
      setError("root", { message: e instanceof Error ? e.message : "Failed" })
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete category "${name}"? This cannot be undone.`)) return
    try { await deleteCategory(id); load() }
    catch (e: unknown) { setDeleteError(e instanceof Error ? e.message : "Failed to delete") }
  }

  return (
    <Stack gap={4}>
      {deleteError && <ErrorBanner message={deleteError} onClose={() => setDeleteError(null)} />}

      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={3}>
        <Box display="flex" gap={2}>
          {(["all", "service", "tool_sourcing"] as const).map((t) => (
            <AppFilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {t === "all" ? "All" : t === "service" ? "Services" : "Tool Sourcing"}
            </AppFilterChip>
          ))}
        </Box>
        {isSuperadmin && (
          <Button {...BTN_PRIMARY} size="sm" onClick={openAdd} display="inline-flex" gap={1.5}>
            <LuPlus size={14} /> Add Category
          </Button>
        )}
      </Box>

      <Box {...CARD} overflow="hidden">
        <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6">
          <Grid templateColumns={isSuperadmin ? "2fr 1fr 3fr 100px" : "2fr 1fr 3fr"} gap={4}>
            {["Name", "Type", "Description", isSuperadmin ? "Actions" : ""].filter(Boolean).map((h) => (
              <Text key={h} fontSize="0.6875rem" fontWeight="700" color="#8A96A8" textTransform="uppercase" letterSpacing="0.07em">{h}</Text>
            ))}
          </Grid>
        </Box>

        {loading ? (
          <Box px={5} py={6} display="flex" alignItems="center" gap={2}>
            <Spinner size="sm" color="blue.500" /><Text fontSize="sm" color="#64748B">Loading…</Text>
          </Box>
        ) : filtered.length === 0 ? (
          <Box px={5} py={8} textAlign="center"><Text fontSize="sm" color="#8A96A8">No categories found.</Text></Box>
        ) : (
          filtered.map((cat, i) => (
            <Box key={cat.id} px={5} py={3.5}
              borderBottom={i < filtered.length - 1 ? "1px solid #EFF1F6" : undefined}
              _hover={{ bg: "#F8F9FC" }} transition="background 0.1s">
              <Grid templateColumns={isSuperadmin ? "2fr 1fr 3fr 100px" : "2fr 1fr 3fr"} gap={4} alignItems="center">
                <Text fontSize="0.875rem" fontWeight="600" color="#0D1B2E">{cat.name}</Text>
                <Text fontSize="0.8125rem" color={APP_MUTED} fontWeight="500">
                  {cat.type === "service" ? "Service" : "Tool Sourcing"}
                </Text>
                <Text fontSize="0.8125rem" color="#64748B" lineClamp={1}>{cat.description ?? "—"}</Text>
                {isSuperadmin && (
                  <Box display="flex" gap={1.5}>
                    <IconBtn icon={<LuPencil size={13} />} label="Edit" onClick={() => openEdit(cat)} />
                    <IconBtn icon={<LuTrash2 size={13} />} label="Delete" danger onClick={() => handleDelete(cat.id, cat.name)} />
                  </Box>
                )}
              </Grid>
            </Box>
          ))
        )}
      </Box>

      {/* ── Add / Edit Modal ────────────────────────────────────── */}
      <BrandModal
        open={addOpen || editCat !== null}
        title={editCat ? `Edit: ${editCat.name}` : "New Category"}
        onClose={closeModal}
      >
        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4}>
              <Field label="" invalid={!!errors.name} errorText={errors.name?.message}>
                <ModalFieldLabel>Name</ModalFieldLabel>
                <Input
                  {...INPUT_STYLE}
                  placeholder="e.g. CNC Machining"
                  {...register("name", { required: "Name is required" })}
                />
              </Field>
              <Box>
                <ModalFieldLabel>Type</ModalFieldLabel>
                <NativeSelect.Root {...INPUT_STYLE}>
                  <NativeSelect.Field {...register("type")}>
                    <option value="service">Service</option>
                    <option value="tool_sourcing">Tool Sourcing</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
            </Grid>
            <Box>
              <ModalFieldLabel>Description (optional)</ModalFieldLabel>
              <Textarea {...INPUT_STYLE} placeholder="Brief description of this category" rows={3} {...register("description")} />
            </Box>
            {errors.root && <Text fontSize="sm" color="#B91C1C">{errors.root.message}</Text>}
          </Stack>
          <Box display="flex" gap={2} mt={5}>
            <Button {...BTN_PRIMARY} type="submit" loading={isSubmitting} flex={1}>
              {editCat ? "Save Changes" : "Create Category"}
            </Button>
            <Button {...BTN_GHOST} color="#64748B" onClick={closeModal}>
              Cancel
            </Button>
          </Box>
        </Box>
      </BrandModal>
    </Stack>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// INQUIRIES TAB
// ════════════════════════════════════════════════════════════════════════════

function InquiriesTab() {
  const navigate = useNavigate()
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get<AdminInquiry[]>("/api/admin/inquiries")
      .then(setInquiries)
      .catch(() => setInquiries([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = statusFilter === "all"
    ? inquiries
    : inquiries.filter((i) => i.status === statusFilter)

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id)
    setError(null)
    try {
      await api.put(`/api/admin/inquiries/${id}/status`, { status })
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Stack gap={4}>
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={3}>
        <Box display="flex" gap={2} flexWrap="wrap">
          {(["all", "pending", "matching", "offered", "converted", "cancelled"] as const).map((s) => (
            <AppFilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : INQUIRY_STATUS_LABELS[s] ?? formatStatusLabel(s)}
            </AppFilterChip>
          ))}
        </Box>
        <Button {...BTN_GHOST} size="sm" color="#64748B" onClick={load} display="inline-flex" gap={1.5}>
          <LuRefreshCw size={13} /> Refresh
        </Button>
      </Box>

      <Box {...CARD} overflow="hidden">
        <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6">
          <Grid templateColumns="3fr 1fr 1fr 1fr 160px" gap={4}>
            {["Inquiry", "Category", "Urgency", "Status", "Change Status"].map((h) => (
              <Text key={h} fontSize="0.6875rem" fontWeight="700" color="#8A96A8" textTransform="uppercase" letterSpacing="0.07em">{h}</Text>
            ))}
          </Grid>
        </Box>

        {loading ? (
          <Box px={5} py={6} display="flex" alignItems="center" gap={2}>
            <Spinner size="sm" color="blue.500" />
            <Text fontSize="sm" color="#64748B">Loading inquiries…</Text>
          </Box>
        ) : filtered.length === 0 ? (
          <Box px={5} py={8} textAlign="center">
            <Text fontSize="sm" color="#8A96A8">No inquiries found.</Text>
          </Box>
        ) : (
          filtered.map((inq, i) => (
              <Box
                key={inq.id}
                px={5}
                py={3.5}
                borderBottom={i < filtered.length - 1 ? `1px solid ${APP_BORDER}` : undefined}
                _hover={{ bg: APP_BG_SUBTLE }}
                transition="background 0.1s"
              >
                <Grid templateColumns="3fr 1fr 1fr 1fr 160px 36px" gap={3} alignItems="center">
                  <Box minW={0}>
                    <Text fontSize="0.875rem" fontWeight="600" color={APP_INK} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                      {inq.title}
                    </Text>
                    <Text fontSize="0.75rem" color={APP_LABEL} mt="1px">
                      {inq.client.companyName ?? inq.client.email}
                    </Text>
                  </Box>
                  <Text fontSize="0.8rem" color={APP_MUTED}>{inq.category?.name ?? "—"}</Text>
                  <Text fontSize="0.8rem" fontWeight="500" color={APP_MUTED} textTransform="capitalize">
                    {inq.urgency}
                  </Text>
                  <AppStatusText label={INQUIRY_STATUS_LABELS[inq.status] ?? formatStatusLabel(inq.status)} />
                  <Box onClick={(e) => e.stopPropagation()}>
                    <NativeSelect.Root size="sm" borderRadius="7px" borderColor="#D8DCE8" bg="white" fontSize="0.8rem">
                      <NativeSelect.Field
                        value={inq.status}
                        onChange={(e) => handleStatusChange(inq.id, e.target.value)}
                        opacity={updatingId === inq.id ? 0.5 : 1}
                        style={{ pointerEvents: updatingId === inq.id ? "none" : "auto" }}
                      >
                        <option value="pending">Pending</option>
                        <option value="matching">Matching</option>
                        <option value="offered">Offered</option>
                        <option value="converted">Converted</option>
                        <option value="cancelled">Cancelled</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Box>
                  <Box
                    as="button"
                    onClick={() => navigate(`/app/admin/inquiries/${inq.id}`)}
                    display="flex" alignItems="center" justifyContent="center"
                    w="30px" h="30px" borderRadius="7px"
                    border="1px solid #D8DCE8" bg="#F8F9FC" color="#4A5568"
                    cursor="pointer" transition="all 0.12s"
                    _hover={{ bg: "#EFF1F6", borderColor: "#B8C0D0" }}
                    title="Open detail view"
                  >
                    <LuArrowRight size={13} />
                  </Box>
                </Grid>
              </Box>
            ))
        )}
      </Box>
    </Stack>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// EXPERTS TAB
// ════════════════════════════════════════════════════════════════════════════

type ScoreForm = { score: string; notes: string }

function ExpertsTab({ isSuperadmin }: { isSuperadmin: boolean }) {
  const [experts, setExperts] = useState<ExpertUser[]>([])
  const [loading, setLoading] = useState(true)
  const [scoringId, setScoringId] = useState<string | null>(null)

  const {
    register: registerScore,
    handleSubmit: handleScoreSubmit,
    reset: resetScore,
    setError: setScoreError,
    formState: { errors: scoreErrors, isSubmitting: scoreSaving },
  } = useForm<ScoreForm>({ defaultValues: { score: "", notes: "" } })

  const load = useCallback(() => {
    setLoading(true)
    api.get<ExpertUser[]>("/api/admin/experts")
      .then(setExperts)
      .catch(() => setExperts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openScore(expert: ExpertUser) {
    resetScore({ score: expert.profile?.score?.toString() ?? "", notes: expert.profile?.scoreNotes ?? "" })
    setScoringId(expert.id)
  }

  async function onScoreSubmit(data: ScoreForm) {
    const val = parseFloat(data.score)
    if (isNaN(val) || val < 0 || val > 10) {
      setScoreError("score", { message: "Must be between 0 and 10" })
      return
    }
    try {
      await api.put(`/api/admin/experts/${scoringId}/score`, { score: val, scoreNotes: data.notes })
      setScoringId(null)
      load()
    } catch (e: unknown) {
      setScoreError("root", { message: e instanceof Error ? e.message : "Failed to save score" })
    }
  }

  return (
    <Stack gap={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Text fontSize="0.8125rem" color="#64748B">
          {experts.length} expert{experts.length !== 1 ? "s" : ""} registered
        </Text>
        <Button {...BTN_GHOST} size="sm" color="#64748B" onClick={load} display="inline-flex" gap={1.5}>
          <LuRefreshCw size={13} /> Refresh
        </Button>
      </Box>

      {loading ? (
        <Box {...CARD} px={5} py={6} display="flex" alignItems="center" gap={2}>
          <Spinner size="sm" color="blue.500" />
          <Text fontSize="sm" color="#64748B">Loading experts…</Text>
        </Box>
      ) : experts.length === 0 ? (
        <Box {...CARD} px={5} py={8} textAlign="center">
          <Text fontSize="sm" color="#8A96A8">No experts found. Assign the "expert" role to users in the Users tab.</Text>
        </Box>
      ) : (
        <Stack gap={3}>
          {experts.map((expert) => (
            <Box key={expert.id} {...CARD} p={5}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={4} flexWrap="wrap">
                <Box display="flex" alignItems="flex-start" gap={3} flex="1" minW={0}>
                  <Box
                    w="40px" h="40px" flexShrink={0}
                    bg={APP_BG_SUBTLE} rounded="8px"
                    border={`1px solid ${APP_BORDER}`}
                    display="flex" alignItems="center" justifyContent="center"
                    color={APP_INK}
                  >
                    <LuUser size={18} />
                  </Box>
                  <Box flex="1" minW={0}>
                    <Text fontSize="0.9375rem" fontWeight="700" color="#0D1B2E">
                      {[expert.firstName, expert.lastName].filter(Boolean).join(" ") || "—"}
                    </Text>
                    {expert.companyName && (
                      <Box display="flex" alignItems="center" gap={1} mt="1px">
                        <LuBuilding2 size={11} color="#8A96A8" />
                        <Text fontSize="0.75rem" color="#64748B">{expert.companyName}</Text>
                      </Box>
                    )}
                    <Text fontSize="0.75rem" color="#8A96A8" mt="2px">{expert.email}</Text>
                    {expert.categories.length > 0 && (
                      <Box display="flex" gap={2} mt={2} flexWrap="wrap">
                        {expert.categories.map((cat) => (
                          <Text key={cat.id} fontSize="0.6875rem" color={APP_MUTED} fontWeight="500">
                            {cat.name}
                          </Text>
                        ))}
                      </Box>
                    )}
                    {expert.profile?.bio && (
                      <Text fontSize="0.8rem" color="#4A5568" mt={2} lineClamp={2}>{expert.profile.bio}</Text>
                    )}
                  </Box>
                </Box>

                <Box display="flex" flexDir="column" alignItems="flex-end" gap={2} flexShrink={0}>
                  {/* Score display */}
                  <Box
                    display="flex" alignItems="center" gap={1.5}
                    bg={APP_BG_SUBTLE}
                    border={`1px solid ${APP_BORDER}`}
                    rounded="8px" px={3} py={2}
                  >
                    <LuStar size={14} color={APP_LABEL} />
                    <Text
                      fontSize="1rem"
                      fontWeight="700"
                      color={APP_INK}
                      letterSpacing="-0.03em"
                    >
                      {expert.profile?.score != null ? expert.profile.score.toFixed(1) : "—"}
                    </Text>
                    <Text fontSize="0.7rem" color={APP_LABEL} fontWeight="500">/10</Text>
                  </Box>

                  {isSuperadmin && (
                    <Button {...BTN_PRIMARY} size="xs" onClick={() => openScore(expert)}>
                      <LuStar size={11} /> Score
                    </Button>
                  )}

                  <Text fontSize="0.7rem" color={APP_MUTED} fontWeight="500">
                    {expert.profile?.isAvailable ? "Available" : "Unavailable"}
                  </Text>
                </Box>
              </Box>

            </Box>
          ))}
        </Stack>
      )}

      {/* Score modal */}
      {scoringId && (
        <BrandModal
          open={!!scoringId}
          title="Update Expert Score"
          onClose={() => setScoringId(null)}
        >
          <Box as="form" onSubmit={handleScoreSubmit(onScoreSubmit)}>
            <Stack gap={4}>
              <Grid templateColumns={{ base: "1fr", sm: "140px 1fr" }} gap={4}>
                <Field label="" invalid={!!scoreErrors.score} errorText={scoreErrors.score?.message}>
                  <ModalFieldLabel>Score (0 – 10)</ModalFieldLabel>
                  <Input
                    {...INPUT_STYLE}
                    type="number"
                    min={0} max={10} step={0.1}
                    placeholder="e.g. 8.5"
                    {...registerScore("score", {
                      required: "Score is required",
                      min: { value: 0, message: "Min 0" },
                      max: { value: 10, message: "Max 10" },
                    })}
                  />
                </Field>
                <Box>
                  <ModalFieldLabel>Internal notes (optional)</ModalFieldLabel>
                  <Input {...INPUT_STYLE} placeholder="Scoring context or remarks" {...registerScore("notes")} />
                </Box>
              </Grid>
              {scoreErrors.root && <Text fontSize="sm" color="#B91C1C">{scoreErrors.root.message}</Text>}
              <Box display="flex" gap={2}>
                <Button {...BTN_PRIMARY} type="submit" loading={scoreSaving} flex={1}>Save Score</Button>
                <Button {...BTN_GHOST} color="#64748B" onClick={() => setScoringId(null)}>Cancel</Button>
              </Box>
            </Stack>
          </Box>
        </BrandModal>
      )}
    </Stack>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// USERS TAB
// ════════════════════════════════════════════════════════════════════════════

function UsersTab({ isSuperadmin }: { isSuperadmin: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get<AdminUser[]>("/api/admin/users")
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = roleFilter === "all"
    ? users
    : users.filter((u) => u.role === roleFilter)

  async function handleRoleChange(id: string, role: string) {
    if (!isSuperadmin) return
    setUpdatingId(id)
    setError(null)
    try {
      await api.put(`/api/users/${id}/role`, { role })
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update role")
    } finally {
      setUpdatingId(null)
    }
  }

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <Stack gap={4}>
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      {/* Stats */}
      <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={3}>
        {(["client", "expert", "admin", "superadmin"] as const).map((r) => (
            <Box key={r} {...CARD} p={4}>
              <Text fontSize="1.5rem" fontWeight="700" color={APP_INK} letterSpacing="-0.04em">{roleCounts[r] ?? 0}</Text>
              <Text fontSize="0.6875rem" color={APP_LABEL} fontWeight="500" mt={1} textTransform="capitalize">
                {r}
              </Text>
            </Box>
        ))}
      </Grid>

      {/* Filter + refresh */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={3}>
        <Box display="flex" gap={2} flexWrap="wrap">
          {(["all", "client", "expert", "admin", "superadmin"] as const).map((r) => (
            <AppFilterChip key={r} active={roleFilter === r} onClick={() => setRoleFilter(r)}>
              {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            </AppFilterChip>
          ))}
        </Box>
        <Button {...BTN_GHOST} size="sm" color="#64748B" onClick={load} display="inline-flex" gap={1.5}>
          <LuRefreshCw size={13} /> Refresh
        </Button>
      </Box>

      <Box {...CARD} overflow="hidden">
        <Box px={5} py={3.5} borderBottom="1px solid #EFF1F6">
          <Grid templateColumns={isSuperadmin ? "2fr 1fr 1fr 140px" : "2fr 1fr 1fr"} gap={4}>
            {["User", "Company", "Joined", isSuperadmin ? "Role" : ""].filter(Boolean).map((h) => (
              <Text key={h} fontSize="0.6875rem" fontWeight="700" color="#8A96A8" textTransform="uppercase" letterSpacing="0.07em">{h}</Text>
            ))}
          </Grid>
        </Box>

        {loading ? (
          <Box px={5} py={6} display="flex" alignItems="center" gap={2}>
            <Spinner size="sm" color="blue.500" />
            <Text fontSize="sm" color="#64748B">Loading users…</Text>
          </Box>
        ) : filtered.length === 0 ? (
          <Box px={5} py={8} textAlign="center">
            <Text fontSize="sm" color="#8A96A8">No users found.</Text>
          </Box>
        ) : (
          filtered.map((u, i) => (
              <Box
                key={u.id}
                px={5}
                py={3.5}
                borderBottom={i < filtered.length - 1 ? `1px solid ${APP_BORDER}` : undefined}
                _hover={{ bg: APP_BG_SUBTLE }}
                transition="background 0.1s"
              >
                <Grid templateColumns={isSuperadmin ? "2fr 1fr 1fr 140px" : "2fr 1fr 1fr"} gap={4} alignItems="center">
                  <Box minW={0}>
                    <Text fontSize="0.875rem" fontWeight="600" color={APP_INK} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                    </Text>
                    {([u.firstName, u.lastName].filter(Boolean).length > 0) && (
                      <Text fontSize="0.75rem" color={APP_LABEL} mt="1px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                        {u.email}
                      </Text>
                    )}
                  </Box>
                  <Text fontSize="0.8rem" color={APP_MUTED} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {u.companyName ?? "—"}
                  </Text>
                  <Text fontSize="0.8rem" color={APP_LABEL}>
                    {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                  </Text>
                  {isSuperadmin && (
                    <NativeSelect.Root size="sm" borderRadius="7px" borderColor={APP_BORDER} bg="white" fontSize="0.8rem">
                      <NativeSelect.Field
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        opacity={updatingId === u.id ? 0.5 : 1}
                        style={{ fontWeight: 500, pointerEvents: updatingId === u.id ? "none" : "auto" }}
                      >
                        <option value="client">Client</option>
                        <option value="expert">Expert</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  )}
                </Grid>
              </Box>
            ))
        )}
      </Box>
    </Stack>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ════════════════════════════════════════════════════════════════════════════

function IconBtn({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      w="28px"
      h="28px"
      borderRadius="7px"
      border="1px solid"
      borderColor={danger ? "#FECACA" : "#D8DCE8"}
      bg={danger ? "#FEF2F2" : "#F8F9FC"}
      color={danger ? "#B91C1C" : "#4A5568"}
      cursor="pointer"
      transition="all 0.12s"
      _hover={{
        bg: danger ? "#FEE2E2" : "#EFF1F6",
        borderColor: danger ? "#FCA5A5" : "#B8C0D0",
      }}
      aria-label={label}
    >
      {icon}
    </Box>
  )
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px" px={4} py={3}
      display="flex" alignItems="center" justifyContent="space-between" gap={3}>
      <Text fontSize="0.875rem" color="#B91C1C" fontWeight="500">{message}</Text>
      <Box as="button" onClick={onClose} color="#B91C1C" cursor="pointer" display="flex">
        <LuX size={15} />
      </Box>
    </Box>
  )
}

// ── Branded Modal ─────────────────────────────────────────────────────────────

function BrandModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <DialogRoot open={open} onOpenChange={({ open: o }) => { if (!o) onClose() }} size="md">
      <DialogContent
        style={{
          borderRadius: "16px",
          border: "1px solid #D8DCE8",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(11,21,40,0.2)",
        }}
      >
        {/* Dark brand header */}
        <Box bg="#0B1528" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2.5}>
            <Box w="7px" h="7px" bg={APP_ACCENT} rounded="full" />
            <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
              {title}
            </DialogTitle>
          </Box>
          <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.45)" }} />
        </Box>
        <DialogHeader display="none" />
        <DialogBody px={6} py={5}>{children}</DialogBody>
        <DialogFooter display="none" />
      </DialogContent>
    </DialogRoot>
  )
}

function ModalFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="0.75rem" fontWeight="600" color="#4A5568" mb={1.5} letterSpacing="0.01em">
      {children}
    </Text>
  )
}
