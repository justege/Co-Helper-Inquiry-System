export const TODO_COLORS = [
  { id: "violet", hex: "#8B5CF6", label: "Violet" },
  { id: "blue", hex: "#3B82F6", label: "Blue" },
  { id: "teal", hex: "#0F6E56", label: "Teal" },
  { id: "green", hex: "#10B981", label: "Green" },
  { id: "yellow", hex: "#EAB308", label: "Yellow" },
  { id: "orange", hex: "#F59E0B", label: "Orange" },
  { id: "pink", hex: "#EC4899", label: "Pink" },
  { id: "slate", hex: "#64748B", label: "Slate" },
] as const

export type TodoColorId = (typeof TODO_COLORS)[number]["id"]

export const SUGGESTED_TAGS = ["Design", "Build", "Copy", "Review", "Bug", "Blocked"]

export function todoColor(id?: string | null): string {
  return TODO_COLORS.find((item) => item.id === id)?.hex || "#8B5CF6"
}

export function todoStatusTone(status?: string): { bg: string; color: string; border: string } {
  if (status === "in_progress") return { bg: "#F3E8FF", color: "#6D28D9", border: "#DDD6FE" }
  if (status === "waiting_on_client") return { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" }
  if (status === "done") return { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" }
  if (status === "invoiced") return { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" }
  return { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" }
}

export function isOverdue(dueAt?: string | null, status?: string): boolean {
  if (!dueAt || status === "done" || status === "invoiced") return false
  const due = new Date(`${dueAt.slice(0, 10)}T23:59:59`)
  return due.getTime() < Date.now()
}

export function addDaysIso(value: string, days: number): string {
  const d = new Date(`${value.slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function diffDays(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T12:00:00`).getTime()
  const b = new Date(`${to.slice(0, 10)}T12:00:00`).getTime()
  return Math.round((b - a) / 86400000)
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function startOfMonday(value: string): string {
  const d = new Date(`${value.slice(0, 10)}T12:00:00`)
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

export function isoWeekLabel(iso: string): { week: number; month: string } {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  const day = (d.getDay() + 6) % 7
  const thursday = new Date(d)
  thursday.setDate(d.getDate() - day + 3)
  const week1 = new Date(thursday.getFullYear(), 0, 4)
  const week = 1 + Math.round((thursday.getTime() - week1.getTime()) / 86400000 / 7)
  return {
    week,
    year: thursday.getFullYear(),
    month: d.toLocaleString("en-GB", { month: "short" }).toUpperCase(),
  }
}
