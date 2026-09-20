import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Box, Text } from "@chakra-ui/react"
import { LuChevronLeft, LuChevronRight, LuPlus, LuTrash2 } from "react-icons/lu"
import {
  createTimeEntry,
  deleteTimeEntry,
  updateTimeEntry,
  type TimeEntry,
  type TimesheetProject,
  type TimesheetTodo,
} from "@/api/work"
import { AppButton } from "@/components/ui/AppButton"
import { APP_INK, APP_MUTED } from "@/components/ui/appUi"
import {
  formatSheetDate,
  formatSheetHours,
  isWeekend,
  parseDecimal,
} from "@/lib/hours"
import { SheetFrame, sheetCellStyle, sheetInputStyle, sheetWrapStyle } from "./sheetUi"

type Col = "date" | "project" | "todo" | "hours"
const COLS: Col[] = ["date", "project", "todo", "hours"]

type SheetRow = {
  key: string
  date: string
  entryId: string | null
  projectId: string
  todoId: string
  hours: number | null
  locked: boolean
  weekend: boolean
}

function refreshWork() {
  window.dispatchEvent(new Event("cohelper:work-refresh"))
}

function buildRows(days: string[], entries: TimeEntry[], extras: Record<string, number>): SheetRow[] {
  const byDate = new Map<string, TimeEntry[]>()
  for (const entry of entries) {
    const date = entry.entryDate.slice(0, 10)
    const list = byDate.get(date) || []
    list.push(entry)
    byDate.set(date, list)
  }
  const rows: SheetRow[] = []
  for (const date of days) {
    const list = byDate.get(date) || []
    if (list.length === 0) {
      rows.push({
        key: `blank:${date}`,
        date,
        entryId: null,
        projectId: "",
        todoId: "",
        hours: null,
        locked: false,
        weekend: isWeekend(date),
      })
    } else {
      for (const entry of list) {
        rows.push({
          key: entry.id,
          date,
          entryId: entry.id,
          projectId: entry.projectId,
          todoId: entry.todoId || "",
          hours: entry.hours,
          locked: Boolean(entry.invoiceId),
          weekend: isWeekend(date),
        })
      }
    }
    const extra = extras[date] || 0
    for (let i = 0; i < extra; i++) {
      rows.push({
        key: `extra:${date}:${i}`,
        date,
        entryId: null,
        projectId: "",
        todoId: "",
        hours: null,
        locked: false,
        weekend: isWeekend(date),
      })
    }
  }
  return rows
}

export function TimesheetGrid({
  days,
  entries,
  projects,
  todos,
  canEdit,
  monthLabel,
  projectId,
  onProjectChange,
  onMonthChange,
  onChanged,
}: {
  days: string[]
  entries: TimeEntry[]
  projects: TimesheetProject[]
  todos: TimesheetTodo[]
  canEdit: boolean
  monthLabel: string
  projectId: string
  onProjectChange: (id: string) => void
  onMonthChange: (delta: number) => void
  onChanged: () => void
}) {
  const [extras, setExtras] = useState<Record<string, number>>({})
  const [overrides, setOverrides] = useState<Record<string, Partial<SheetRow>>>({})
  const [active, setActive] = useState<{ row: number; col: Col } | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  const rows = useMemo(
    () => buildRows(days, entries, extras).map((row) => ({ ...row, ...(overrides[row.key] || {}) })),
    [days, entries, extras, overrides]
  )
  const total = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0)

  useEffect(() => {
    setExtras({})
    setOverrides({})
  }, [days[0]])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing, active?.row, active?.col])

  function todosFor(project: string, currentId?: string) {
    return todos.filter((todo) => todo.projectId === project && (todo.status !== "invoiced" || todo.id === currentId))
  }

  function display(row: SheetRow, col: Col) {
    if (col === "date") return formatSheetDate(row.date)
    if (col === "project") return projects.find((p) => p.id === row.projectId)?.name || ""
    if (col === "todo") return todos.find((t) => t.id === row.todoId)?.title || ""
    return formatSheetHours(row.hours)
  }

  function startEdit(rowIndex: number, col: Col) {
    const row = rows[rowIndex]
    if (!canEdit || !row || row.locked) {
      setActive({ row: rowIndex, col })
      setEditing(false)
      return
    }
    setActive({ row: rowIndex, col })
    setEditing(true)
    if (col === "hours") setDraft(row.hours != null ? String(row.hours) : "")
    else if (col === "date") setDraft(row.date)
    else if (col === "project") setDraft(row.projectId)
    else setDraft(row.todoId)
  }

  async function commit(row: SheetRow, col: Col, value: string) {
    if (!canEdit || row.locked || busy) return
    setError(null)
    const patch: Partial<SheetRow> = {}
    if (col === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value === row.date) return
      patch.date = value
    } else if (col === "project") {
      if (value === row.projectId) return
      patch.projectId = value
      if (row.todoId && !todos.some((t) => t.id === row.todoId && t.projectId === value)) {
        patch.todoId = ""
      }
    } else if (col === "todo") {
      if (value === row.todoId) return
      patch.todoId = value
      const todo = todos.find((t) => t.id === value)
      if (todo && !row.projectId) patch.projectId = todo.projectId
    } else {
      const hours = parseDecimal(value)
      if ((hours == null && row.hours == null) || hours === row.hours) return
      if (hours != null && (hours <= 0 || hours > 24)) {
        setError("Hours must be between 0.25 and 24")
        return
      }
      patch.hours = hours
    }

    const next = { ...row, ...patch }
    const hasWork = Boolean(next.projectId && next.hours)
    setOverrides((prev) => ({ ...prev, [row.key]: { ...(prev[row.key] || {}), ...patch } }))
    setBusy(true)
    try {
      if (row.entryId && patch.hours === null) {
        await deleteTimeEntry(row.entryId)
        setOverrides((prev) => {
          const copy = { ...prev }
          delete copy[row.key]
          return copy
        })
        refreshWork()
        onChanged()
        return
      }
      if (!hasWork) {
        if (row.entryId && (patch.date || patch.projectId || patch.todoId)) {
          await updateTimeEntry(row.entryId, {
            entryDate: next.date,
            projectId: next.projectId || undefined,
            todoId: next.todoId || null,
          })
          refreshWork()
          onChanged()
        }
        return
      }
      if (row.entryId) {
        await updateTimeEntry(row.entryId, {
          entryDate: next.date,
          projectId: next.projectId,
          todoId: next.todoId || null,
          hours: next.hours as number,
        })
      } else {
        await createTimeEntry({
          projectId: next.projectId,
          todoId: next.todoId || null,
          hours: next.hours as number,
          entryDate: next.date,
        })
      }
      setOverrides((prev) => {
        const copy = { ...prev }
        delete copy[row.key]
        return copy
      })
      refreshWork()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save hours")
    } finally {
      setBusy(false)
    }
  }

  function move(rowIndex: number, col: Col, dRow: number, dCol: number) {
    const colIndex = COLS.indexOf(col)
    const nextCol = COLS[Math.max(0, Math.min(COLS.length - 1, colIndex + dCol))]
    const nextRow = Math.max(0, Math.min(rows.length - 1, rowIndex + dRow))
    startEdit(nextRow, nextCol)
  }

  async function onKeyDown(event: KeyboardEvent, row: SheetRow, rowIndex: number, col: Col) {
    if (event.key === "Escape") {
      setEditing(false)
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      if (editing) {
        await commit(row, col, draft)
        setEditing(false)
        move(rowIndex, col, 1, 0)
      } else {
        startEdit(rowIndex, col)
      }
      return
    }
    if (event.key === "Tab") {
      event.preventDefault()
      if (editing) await commit(row, col, draft)
      move(rowIndex, col, 0, event.shiftKey ? -1 : 1)
      return
    }
    if (!editing && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault()
      move(
        rowIndex,
        col,
        event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0,
        event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
      )
    }
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={3} mb={3} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={2}>
          <AppButton size="sm" variant="icon" onClick={() => onMonthChange(-1)} aria-label="Previous month">
            <LuChevronLeft size={16} />
          </AppButton>
          <Text fontWeight="700" color={APP_INK} minW="140px" textAlign="center">{monthLabel}</Text>
          <AppButton size="sm" variant="icon" onClick={() => onMonthChange(1)} aria-label="Next month">
            <LuChevronRight size={16} />
          </AppButton>
        </Box>
        <Box display="flex" alignItems="center" gap={3}>
          <select value={projectId} onChange={(e) => onProjectChange(e.target.value)} style={{ ...sheetInputStyle, width: 220, height: 36, border: "1px solid #E5E7EB", borderRadius: 10, padding: "0 10px", background: "white" }}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>{formatSheetHours(total) || "0,00"} Std.</Text>
        </Box>
      </Box>

      {error && <Text fontSize="0.8125rem" color="#B91C1C" mb={2}>{error}</Text>}

      <SheetFrame>
        <table style={sheetWrapStyle}>
          <colgroup>
            <col style={{ width: 132 }} />
            <col />
            <col />
            <col style={{ width: 110 }} />
            {canEdit ? <col style={{ width: 72 }} /> : null}
          </colgroup>
          <thead>
            <tr>
              <th style={sheetCellStyle({ header: true })}>Zeitraum</th>
              <th style={sheetCellStyle({ header: true })}>Arbeitspakete</th>
              <th style={sheetCellStyle({ header: true })}>Themen</th>
              <th style={sheetCellStyle({ header: true, align: "right" })}>Std.</th>
              {canEdit ? <th style={sheetCellStyle({ header: true })} /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.key}>
                {COLS.map((col) => {
                  const selected = active?.row === rowIndex && active?.col === col
                  const isEditing = selected && editing && !row.locked && canEdit
                  return (
                    <td
                      key={col}
                      style={sheetCellStyle({
                        selected,
                        weekend: row.weekend,
                        locked: row.locked,
                        align: col === "hours" ? "right" : "left",
                      })}
                      onClick={() => startEdit(rowIndex, col)}
                      onDoubleClick={() => startEdit(rowIndex, col)}
                    >
                      {isEditing && (col === "project" || col === "todo") ? (
                        <select
                          ref={(el) => { inputRef.current = el }}
                          value={draft}
                          style={{ ...sheetInputStyle, cursor: "pointer" }}
                          onChange={async (e) => {
                            const value = e.target.value
                            setDraft(value)
                            setEditing(false)
                            await commit(row, col, value)
                          }}
                          onKeyDown={(e) => void onKeyDown(e, row, rowIndex, col)}
                          onBlur={() => setEditing(false)}
                        >
                          <option value="">{col === "project" ? "Project" : "To-do"}</option>
                          {col === "project"
                            ? projects.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                              ))
                            : todosFor(row.projectId || draft, row.todoId).map((item) => (
                                <option key={item.id} value={item.id}>{item.title}</option>
                              ))}
                        </select>
                      ) : isEditing ? (
                        <input
                          ref={(el) => { inputRef.current = el }}
                          type={col === "date" ? "date" : "text"}
                          inputMode={col === "hours" ? "decimal" : undefined}
                          value={draft}
                          style={{ ...sheetInputStyle, textAlign: col === "hours" ? "right" : "left" }}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={async () => {
                            await commit(row, col, draft)
                            setEditing(false)
                          }}
                          onKeyDown={(e) => void onKeyDown(e, row, rowIndex, col)}
                        />
                      ) : (
                        <span style={{ opacity: display(row, col) ? 1 : 0.35 }}>
                          {display(row, col) || (col === "hours" ? "" : "\u00A0")}
                        </span>
                      )}
                    </td>
                  )
                })}
                {canEdit ? (
                  <td style={sheetCellStyle({ weekend: row.weekend, muted: true })}>
                    <Box display="flex" justifyContent="flex-end" gap={1}>
                      <Box
                        as="button"
                        aria-label="Add row"
                        color={APP_MUTED}
                        onClick={() => setExtras((prev) => ({ ...prev, [row.date]: (prev[row.date] || 0) + 1 }))}
                      >
                        <LuPlus size={14} />
                      </Box>
                      {row.entryId && !row.locked ? (
                        <Box
                          as="button"
                          aria-label="Delete hours"
                          color={APP_MUTED}
                          onClick={async () => {
                            setBusy(true)
                            try {
                              await deleteTimeEntry(row.entryId!)
                              refreshWork()
                              onChanged()
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Could not delete")
                            } finally {
                              setBusy(false)
                            }
                          }}
                        >
                          <LuTrash2 size={14} />
                        </Box>
                      ) : null}
                    </Box>
                  </td>
                ) : null}
              </tr>
            ))}
            <tr>
              <td style={sheetCellStyle({ header: true })}>Sum</td>
              <td style={sheetCellStyle({ header: true })} />
              <td style={sheetCellStyle({ header: true })} />
              <td style={sheetCellStyle({ header: true, align: "right" })}>{formatSheetHours(total) || "0,00"}</td>
              {canEdit ? <td style={sheetCellStyle({ header: true })} /> : null}
            </tr>
          </tbody>
        </table>
      </SheetFrame>
      <Text fontSize="0.75rem" color={APP_MUTED} mt={2}>
        Click a cell to edit, like a spreadsheet. Empty days stay visible. Invoiced hours stay locked.
      </Text>
    </Box>
  )
}
