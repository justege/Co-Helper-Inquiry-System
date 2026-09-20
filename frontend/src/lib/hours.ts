export function formatHours(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—"
  const v = Math.round(Number(n) * 100) / 100
  if (Number.isInteger(v)) return `${v}h`
  return `${v}h`
}

export function formatSheetHours(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n)) || n === 0) return ""
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
}

export function parseDecimal(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null
  const n = Number(String(value).trim().replace(/\s/g, "").replace("€", "").replace(",", "."))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

export function formatSheetDate(value: string | null | undefined): string {
  if (!value) return ""
  const iso = value.length >= 10 ? value.slice(0, 10) : value
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}.${m}.${y}`
}

export function parseLocalDate(value: string): Date | null {
  const iso = value.length >= 10 ? value.slice(0, 10) : value
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function isWeekend(value: string): boolean {
  const d = parseLocalDate(value)
  if (!d) return false
  const day = d.getDay()
  return day === 0 || day === 6
}

export function monthRange(year: number, monthIndex: number): { from: string; to: string; days: string[] } {
  const pad = (n: number) => String(n).padStart(2, "0")
  const last = new Date(year, monthIndex + 1, 0).getDate()
  const days = Array.from({ length: last }, (_, i) => `${year}-${pad(monthIndex + 1)}-${pad(i + 1)}`)
  return { from: days[0], to: days[days.length - 1], days }
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
