import type { InquiryStatus } from "../api/inquiries"

export type BoardColumnId = "requested" | "doing" | "waiting" | "done"

export interface BoardColumn {
  id: BoardColumnId
  label: string
  hint: string
  statuses: readonly InquiryStatus[]
  writeStatus: InquiryStatus
}

export const BOARD_COLUMNS: readonly BoardColumn[] = [
  {
    id: "requested",
    label: "Requested",
    hint: "New work",
    statuses: ["pending", "matching", "offered"],
    writeStatus: "pending",
  },
  {
    id: "doing",
    label: "Doing",
    hint: "In motion",
    statuses: ["accepted", "in_progress"],
    writeStatus: "in_progress",
  },
  {
    id: "waiting",
    label: "Waiting",
    hint: "Parked",
    statuses: ["waiting"],
    writeStatus: "waiting",
  },
  {
    id: "done",
    label: "Done",
    hint: "Delivered",
    statuses: ["delivered"],
    writeStatus: "delivered",
  },
] as const

const STATUS_TO_COLUMN = new Map<InquiryStatus, BoardColumnId>(
  BOARD_COLUMNS.flatMap((col) => col.statuses.map((status) => [status, col.id] as const))
)

export function columnForStatus(status: InquiryStatus): BoardColumnId | null {
  return STATUS_TO_COLUMN.get(status) ?? null
}

export function writeStatusForColumn(columnId: BoardColumnId): InquiryStatus {
  const col = BOARD_COLUMNS.find((c) => c.id === columnId)
  return col?.writeStatus ?? "pending"
}

export function workspaceBoardStatus(status: InquiryStatus): InquiryStatus {
  if (status === "delivered" || status === "cancelled" || status === "escalated") return status
  if (status === "waiting") return "waiting"
  if (status === "accepted" || status === "in_progress") return "in_progress"
  return "pending"
}

export function clientDisplayName(
  client:
    | {
        firstName?: string | null
        lastName?: string | null
        companyName?: string | null
        email?: string | null
      }
    | null
    | undefined
): string {
  if (!client) return "Client"
  const name = [client.firstName, client.lastName].filter(Boolean).join(" ")
  return client.companyName || name || client.email || "Client"
}
