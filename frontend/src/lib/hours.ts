export function formatHours(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—"
  const v = Math.round(Number(n) * 10) / 10
  return Number.isInteger(v) ? `${v}h` : `${v.toFixed(1)}h`
}

export function formatMoney(amount: number | null | undefined, currency = "EUR"): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—"
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(amount))
  } catch {
    return `${Number(amount).toFixed(2)} ${currency}`
  }
}

export function formatEta(remaining: number | null | undefined, weeklyPace: number | null | undefined): string | null {
  if (remaining == null || weeklyPace == null || weeklyPace <= 0) return null
  const weeks = remaining / weeklyPace
  if (weeks < 0.5) return "less than a week if pace holds"
  if (weeks < 1.5) return "about 1 week if pace holds"
  const lo = Math.floor(weeks)
  const hi = Math.ceil(weeks)
  if (lo === hi) return `about ${lo} weeks if pace holds`
  return `about ${lo}–${hi} weeks if pace holds`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const iso = value.length <= 10 ? `${value}T00:00:00` : value
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return "—"
  const diff = Date.now() - d.getTime()
  if (diff < 45_000) return "just now"
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`
  if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))}h ago`
  if (diff < 7 * 86_400_000) return `${Math.max(1, Math.round(diff / 86_400_000))}d ago`
  return formatDate(value)
}

export const TODO_STATUS_LABEL: Record<string, string> = {
  backlog: "To do",
  in_progress: "In progress",
  waiting_on_client: "Waiting",
  done: "Done",
  invoiced: "Paid",
}

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In progress",
  waiting_on_client: "Waiting on client",
  done: "Done",
}

export const PROJECT_PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

export const BLOCKER_KIND_LABEL: Record<string, string> = {
  client: "Waiting on client",
  scope: "Scope change",
  dependency: "External dependency",
  internal: "Internal",
  other: "Other",
}
