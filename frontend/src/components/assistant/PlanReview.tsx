import { useMemo, useState, type CSSProperties } from "react"
import { Box, Text } from "@chakra-ui/react"
import { AppButton } from "@/components/ui/AppButton"
import { GREEN, INK, MUTED, PAPER, RULE, SURFACE } from "@/theme/tokens"
import { applyProjectPlan, type PlanChange, type PlanSurface, type ProjectPlan } from "@/api/assistant"

function linkButton(color: string): CSSProperties {
  return {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: 600,
    color,
  }
}

const SURFACES: { id: PlanSurface; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "board", label: "Board" },
  { id: "plan", label: "Plan" },
  { id: "timeline", label: "Timeline" },
]

export function PlanReview({
  projectId,
  plan,
  stale,
  onSaved,
}: {
  projectId: string
  plan: ProjectPlan
  stale?: boolean
  onSaved?: () => void
}) {
  const [selected, setSelected] = useState<string[]>(() =>
    plan.changes.filter((change) => change.recommended).map((change) => change.key)
  )
  const [savedKeys, setSavedKeys] = useState<string[]>([])
  const [skipped, setSkipped] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const suggested = useMemo(
    () => plan.changes.filter((change) => change.recommended).length,
    [plan.changes]
  )
  const remaining = plan.changes.filter((change) => selected.includes(change.key) && !savedKeys.includes(change.key))

  function toggle(key: string) {
    if (stale || busy || savedKeys.includes(key)) return
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
  }

  function selectKeys(keys: string[]) {
    if (stale || busy) return
    const locked = savedKeys
    setSelected([...new Set([...locked, ...keys])])
  }

  async function save() {
    if (!remaining.length || busy || stale) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await applyProjectPlan({ projectId, changes: remaining })
      const saved = result.saved.map((item) => item.key)
      setSavedKeys((current) => [...new Set([...current, ...saved])])
      setSkipped(Object.fromEntries(result.skipped.map((item) => [item.key, item.error])))
      if (saved.length) {
        setNotice(saved.length === 1 ? "Saved 1 change to this project." : `Saved ${saved.length} changes to this project.`)
        window.dispatchEvent(new Event("cohelper:work-refresh"))
        onSaved?.()
      }
      if (!saved.length && result.skipped.length) {
        setError(result.skipped[0]?.error || "Couldn't save those changes")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save those changes")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box mt={2} w="100%" p={3} border={`1px solid ${RULE}`} borderRadius="12px" bg={SURFACE}>
      <Text fontSize="0.8125rem" color={INK} fontWeight="600" lineHeight="1.45">{plan.summary}</Text>
      <Text fontSize="0.75rem" color={MUTED} mt={1}>
        {suggested} suggested · {plan.changes.length - suggested} also possible. Nothing is saved until you approve it.
      </Text>
      {!stale && (
        <Box display="flex" gap={3} mt={2}>
          <button type="button" onClick={() => selectKeys(plan.changes.filter((change) => change.recommended).map((change) => change.key))} style={linkButton(GREEN)}>
            Suggested
          </button>
          <button type="button" onClick={() => selectKeys(plan.changes.map((change) => change.key))} style={linkButton(INK)}>
            All
          </button>
          <button type="button" onClick={() => selectKeys([])} style={linkButton(MUTED)}>
            None
          </button>
        </Box>
      )}
      {SURFACES.map((surface) => {
        const items = plan.changes.filter((change) => change.surface === surface.id)
        if (!items.length) return null
        return (
          <Box key={surface.id} mt={3}>
            <Text fontSize="0.6875rem" fontWeight="700" letterSpacing="0.08em" textTransform="uppercase" color={MUTED} mb={1.5}>
              {surface.label}
            </Text>
            {items.map((change) => (
              <PlanRow
                key={change.key}
                change={change}
                checked={selected.includes(change.key)}
                saved={savedKeys.includes(change.key)}
                stale={Boolean(stale)}
                busy={busy}
                error={skipped[change.key]}
                onToggle={() => toggle(change.key)}
              />
            ))}
          </Box>
        )
      })}
      {stale && (
        <Text fontSize="0.75rem" color={MUTED} mt={3}>This proposal was replaced by a later one.</Text>
      )}
      {notice && <Text fontSize="0.75rem" color="#047857" fontWeight="600" mt={3}>{notice}</Text>}
      {error && <Text fontSize="0.75rem" color="#B91C1C" mt={2}>{error}</Text>}
      {!stale && (
        <Box mt={3}>
          <AppButton size="sm" disabled={!remaining.length} loading={busy} onClick={() => void save()}>
            {remaining.length ? `Save ${remaining.length} selected` : savedKeys.length ? "Saved" : "Save selected"}
          </AppButton>
        </Box>
      )}
    </Box>
  )
}

function PlanRow({
  change,
  checked,
  saved,
  stale,
  busy,
  error,
  onToggle,
}: {
  change: PlanChange
  checked: boolean
  saved: boolean
  stale: boolean
  busy: boolean
  error?: string
  onToggle: () => void
}) {
  const writing = change.body || change.description
  const locked = saved || stale || busy
  return (
    <Box
      as="label"
      display="flex"
      gap={2.5}
      py={2}
      borderTop={`1px solid ${RULE}`}
      cursor={locked ? "default" : "pointer"}
      opacity={stale && !saved ? 0.55 : 1}
    >
      <input
        type="checkbox"
        checked={checked || saved}
        disabled={locked}
        onChange={onToggle}
        aria-label={change.label}
        style={{ marginTop: 3, accentColor: GREEN }}
      />
      <Box minW={0} flex="1">
        <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={2}>
          <Text fontSize="0.8125rem" fontWeight="600" color={INK} lineHeight="1.4">{change.label}</Text>
          <Text fontSize="0.6875rem" fontWeight="700" color={saved ? "#047857" : change.recommended ? GREEN : MUTED} flexShrink={0}>
            {saved ? "Saved" : change.recommended ? "Suggested" : "Optional"}
          </Text>
        </Box>
        {change.detail && (
          <Text fontSize="0.75rem" color={MUTED} mt="2px" lineHeight="1.4">{change.detail}</Text>
        )}
        {change.reason && (
          <Text fontSize="0.75rem" color={INK} mt="2px" lineHeight="1.4">{change.reason}</Text>
        )}
        {writing && (
          <Text fontSize="0.75rem" color={INK} mt={1} lineHeight="1.45" whiteSpace="pre-wrap" maxH="88px" overflowY="auto" bg={PAPER} borderRadius="8px" px={2} py={1.5}>
            {writing}
          </Text>
        )}
        {error && <Text fontSize="0.75rem" color="#B91C1C" mt={1}>{error}</Text>}
      </Box>
    </Box>
  )
}
