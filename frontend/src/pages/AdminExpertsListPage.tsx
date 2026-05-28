import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
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
  LuArrowRight,
  LuRefreshCw,
  LuSearch,
  LuStar,
  LuBuilding2,
  LuUsers,
} from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { api } from "@/lib/api"
import {
  APP_ACCENT,
  APP_BORDER,
  APP_BG_SUBTLE,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
  AppFilterChip,
  AppStatCard,
} from "@/components/ui/appUi"

interface ExpertUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  createdAt: string
  profile: {
    bio: string | null
    locationCity: string
    isAvailable: boolean
    score: number | null
    scoreNotes: string | null
  } | null
  categories: { id: string; name: string; type: string }[]
}

export default function AdminExpertsListPage() {
  const navigate = useNavigate()
  const [experts, setExperts] = useState<ExpertUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [availFilter, setAvailFilter] = useState<"all" | "available" | "unavailable">("all")

  const load = useCallback(() => {
    setLoading(true)
    api.get<ExpertUser[]>("/api/admin/experts")
      .then(setExperts)
      .catch(() => setExperts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = experts.filter((e) => {
    if (availFilter === "available" && !e.profile?.isAvailable) return false
    if (availFilter === "unavailable" && e.profile?.isAvailable) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        e.email.toLowerCase().includes(q) ||
        (e.firstName ?? "").toLowerCase().includes(q) ||
        (e.lastName ?? "").toLowerCase().includes(q) ||
        (e.companyName ?? "").toLowerCase().includes(q) ||
        e.categories.some((c) => c.name.toLowerCase().includes(q))
      )
    }
    return true
  })

  const scored = experts.filter((e) => e.profile?.score != null)
  const avgScore = scored.length
    ? (scored.reduce((s, e) => s + (e.profile!.score ?? 0), 0) / scored.length).toFixed(1)
    : "—"

  return (
    <PageShell
      eyebrow="Administration"
      title="Partners"
      subtitle="Browse, score and assign partner service providers"
      wide
    >
      <Stack gap={4}>
        <Grid templateColumns={{ base: "repeat(2,1fr)", md: "repeat(4,1fr)" }} gap={3}>
          <AppStatCard label="Total partners" value={experts.length} />
          <AppStatCard label="Available now" value={experts.filter((e) => e.profile?.isAvailable).length} />
          <AppStatCard label="With a score" value={scored.length} />
          <AppStatCard label="Avg. score" value={avgScore} />
        </Grid>

        <Box display="flex" gap={3} alignItems="center" flexWrap="wrap">
          <Box position="relative" flex="1" minW="200px" maxW="360px">
            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color={APP_LABEL} zIndex={1}>
              <LuSearch size={14} />
            </Box>
            <FormInput
              pl={9}
              placeholder="Search by name, company, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            {(["all", "available", "unavailable"] as const).map((f) => (
              <AppFilterChip key={f} active={availFilter === f} onClick={() => setAvailFilter(f)}>
                {f === "all" ? "All" : f === "available" ? "Available" : "Unavailable"}
              </AppFilterChip>
            ))}
            <Button variant="ghost" size="sm" borderRadius="8px" color={APP_MUTED} fontWeight="600"
              onClick={load} display="inline-flex" gap={1.5}>
              <LuRefreshCw size={13} /> Refresh
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box display="flex" alignItems="center" gap={2} py={8}>
            <Spinner size="sm" color="gray.500" />
            <Text fontSize="sm" color={APP_MUTED}>Loading partners…</Text>
          </Box>
        ) : filtered.length === 0 ? (
          <Box {...APP_CARD} px={5} py={12} textAlign="center">
            <Box color={APP_BORDER} mb={3} display="flex" justifyContent="center">
              <LuUsers size={32} />
            </Box>
            <Text fontSize="sm" color={APP_LABEL} fontWeight="500">
              {search || availFilter !== "all" ? "No partners match your filters." : "No partner users yet. Assign the expert role in Control Panel → Users."}
            </Text>
          </Box>
        ) : (
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr", xl: "1fr 1fr 1fr" }} gap={4}>
            {filtered.map((expert) => {
              const name = [expert.firstName, expert.lastName].filter(Boolean).join(" ") || "—"
              return (
                <Box
                  key={expert.id}
                  {...APP_CARD}
                  p={5}
                  cursor="pointer"
                  _hover={{ borderColor: APP_ACCENT, bg: APP_BG_SUBTLE }}
                  transition="all 0.12s"
                  onClick={() => navigate(`/app/admin/experts/${expert.id}`)}
                >
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={3} mb={3}>
                    <Box display="flex" alignItems="flex-start" gap={3} flex="1" minW={0}>
                      <Box
                        w="40px" h="40px" flexShrink={0}
                        bg={APP_BG_SUBTLE} rounded="8px"
                        border={`1px solid ${APP_BORDER}`}
                        display="flex" alignItems="center" justifyContent="center"
                        fontSize="0.875rem" fontWeight="700" color={APP_INK}
                      >
                        {name.charAt(0).toUpperCase()}
                      </Box>
                      <Box flex="1" minW={0}>
                        <Text fontSize="0.9375rem" fontWeight="600" color={APP_INK} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                          {name}
                        </Text>
                        {expert.companyName && (
                          <Box display="flex" alignItems="center" gap={1} mt="1px">
                            <LuBuilding2 size={11} color={APP_LABEL} />
                            <Text fontSize="0.75rem" color={APP_MUTED} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                              {expert.companyName}
                            </Text>
                          </Box>
                        )}
                        <Text fontSize="0.75rem" color={APP_LABEL} mt="1px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                          {expert.email}
                        </Text>
                      </Box>
                    </Box>

                    <Box
                      display="flex" flexDir="column" alignItems="center"
                      bg={APP_BG_SUBTLE}
                      border={`1px solid ${APP_BORDER}`}
                      rounded="8px" px={2.5} py={2} flexShrink={0}
                    >
                      <LuStar size={12} color={APP_LABEL} />
                      <Text fontSize="0.875rem" fontWeight="700" color={APP_INK} lineHeight="1" mt={0.5}>
                        {expert.profile?.score?.toFixed(1) ?? "—"}
                      </Text>
                    </Box>
                  </Box>

                  {expert.categories.length > 0 && (
                    <Box display="flex" gap={1.5} flexWrap="wrap" mb={3}>
                      {expert.categories.slice(0, 4).map((cat) => (
                        <Text key={cat.id} fontSize="0.6875rem" color={APP_MUTED} fontWeight="500">
                          {cat.name}
                        </Text>
                      ))}
                      {expert.categories.length > 4 && (
                        <Text fontSize="0.6875rem" color={APP_LABEL}>+{expert.categories.length - 4}</Text>
                      )}
                    </Box>
                  )}

                  {expert.profile?.bio && (
                    <Text fontSize="0.8rem" color={APP_MUTED} lineClamp={2} mb={3}>{expert.profile.bio}</Text>
                  )}

                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Text fontSize="0.75rem" color={APP_MUTED} fontWeight="500">
                      {expert.profile?.isAvailable ? "Available" : "Not available"}
                    </Text>
                    <Box color={APP_LABEL} display="flex">
                      <LuArrowRight size={14} />
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Grid>
        )}
      </Stack>
    </PageShell>
  )
}
