import { useMemo, useRef, useState, type RefObject } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Text } from "@chakra-ui/react"
import { LuPlus, LuTrash2 } from "react-icons/lu"
import {
  createExpense,
  createExpenseInvoice,
  createExpenseVendor,
  deleteExpense,
  deleteExpenseVendor,
  updateExpense,
  type Expense,
  type ExpenseProject,
  type ExpenseVendor,
  type ExpenseVendorKind,
} from "@/api/expenses"
import { AppButton } from "@/components/ui/AppButton"
import { FormInput } from "@/components/ui/form-controls"
import { APP_ACCENT, APP_INK, APP_MUTED } from "@/components/ui/appUi"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DIALOG_PANEL_STYLE,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { formatMoney, formatSheetDate, parseDecimal } from "@/lib/hours"
import { GREEN } from "@/theme/tokens"
import { SheetFrame, sheetCellStyle, sheetInputStyle, sheetWrapStyle } from "./sheetUi"

function todayIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function moneyLabel(n: number, currency: string) {
  if (!n) return ""
  return formatMoney(n, currency)
}

function statusLabel(status: string | null) {
  if (status === "paid") return "paid"
  if (status === "sent") return "sent"
  if (status === "draft") return "draft"
  return ""
}

export function ExpensesBoard({
  vendors,
  projects,
  currency,
  onChanged,
}: {
  vendors: ExpenseVendor[]
  projects: ExpenseProject[]
  currency: string
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const grand = vendors.reduce((sum, vendor) => sum + vendor.expenses.reduce((s, e) => s + e.amount, 0), 0)
  const unbilledByProject = useMemo(() => {
    const map = new Map<string, { amount: number; ids: string[] }>()
    for (const vendor of vendors) {
      for (const expense of vendor.expenses) {
        for (const allocation of expense.allocations) {
          if (allocation.invoiceId || allocation.amount <= 0) continue
          const current = map.get(allocation.projectId) || { amount: 0, ids: [] }
          current.amount += allocation.amount
          current.ids.push(allocation.id)
          map.set(allocation.projectId, current)
        }
      }
    }
    return map
  }, [vendors])

  async function invoiceProject(projectId: string, allocationIds?: string[]) {
    setBusy(true)
    setError(null)
    try {
      const result = await createExpenseInvoice(projectId, allocationIds?.length ? { allocationIds } : {})
      onChanged()
      navigate(`/app/invoices/${result.invoice.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invoice")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box display="grid" gap={5}>
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={3} flexWrap="wrap">
        <Text fontSize="0.875rem" color={APP_MUTED}>
          Log pass-through costs, split them across projects, then invoice the client their share.
        </Text>
        <AppButton size="sm" onClick={() => setCreateOpen(true)}>
          <LuPlus size={14} /> Add vendor
        </AppButton>
      </Box>

      {error && <Text fontSize="0.8125rem" color="#B91C1C">{error}</Text>}

      {projects.some((project) => (unbilledByProject.get(project.id)?.amount || 0) > 0) && (
        <Box display="flex" gap={2} flexWrap="wrap">
          {projects.map((project) => {
            const row = unbilledByProject.get(project.id)
            if (!row || row.amount <= 0) return null
            return (
              <AppButton
                key={project.id}
                size="sm"
                variant="secondary"
                loading={busy}
                onClick={() => void invoiceProject(project.id, row.ids)}
              >
                Invoice {project.name} · {formatMoney(row.amount, currency)}
              </AppButton>
            )
          })}
        </Box>
      )}

      {vendors.length === 0 && (
        <Box border="1px dashed #E5E7EB" borderRadius="14px" p={8} textAlign="center">
          <Text fontWeight="700" color={APP_INK} mb={1}>No expenses yet</Text>
          <Text fontSize="0.875rem" color={APP_MUTED}>
            Add Supabase, Railway, or any vendor. Shared costs can split by percent; per-project costs get their own columns.
          </Text>
        </Box>
      )}

      {vendors.map((vendor) => (
        <VendorSheet
          key={vendor.id}
          vendor={vendor}
          currency={currency}
          canBusy={busy}
          onError={setError}
          onChanged={onChanged}
          onInvoice={(projectId, ids) => void invoiceProject(projectId, ids)}
          onDelete={() => setDeleteVendorId(vendor.id)}
        />
      ))}

      {vendors.length > 0 && (
        <Box display="flex" justifyContent="flex-end">
          <Text fontWeight="800" color={APP_INK} fontSize="1rem">Total {formatMoney(grand, currency)}</Text>
        </Box>
      )}

      <VendorDialog
        open={createOpen}
        projects={projects}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); onChanged() }}
      />

      <ConfirmDialog
        open={Boolean(deleteVendorId)}
        title="Delete vendor"
        body="This removes the vendor and any costs that have not been invoiced."
        confirmLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleteVendorId(null)}
        onConfirm={async () => {
          if (!deleteVendorId) return
          setBusy(true)
          try {
            await deleteExpenseVendor(deleteVendorId)
            setDeleteVendorId(null)
            onChanged()
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete vendor")
          } finally {
            setBusy(false)
          }
        }}
      />
    </Box>
  )
}

function VendorSheet({
  vendor,
  currency,
  onError,
  onChanged,
  onInvoice,
  onDelete,
}: {
  vendor: ExpenseVendor
  currency: string
  canBusy: boolean
  onError: (message: string | null) => void
  onChanged: () => void
  onInvoice: (projectId: string, ids: string[]) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState<{ key: string; col: string } | null>(null)
  const [draft, setDraft] = useState("")
  const [newRow, setNewRow] = useState({ date: todayIso(), amount: "", reference: "" })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const blank: Expense = {
    id: "",
    vendorId: vendor.id,
    incurredAt: newRow.date,
    amount: parseDecimal(newRow.amount) || 0,
    currency,
    reference: newRow.reference || null,
    note: null,
    createdAt: "",
    allocations: [],
  }
  const rows = [blank, ...vendor.expenses]
  const projectCols = vendor.splits
  const sum = vendor.expenses.reduce((s, e) => s + e.amount, 0)
  const splitNote = vendor.kind === "split"
    ? vendor.splits.map((s) => `${s.percent ?? 0}% ${s.clientName || s.projectName}`).join(" · ")
    : null

  function allocAmount(expense: Expense, projectId: string) {
    return expense.allocations.find((a) => a.projectId === projectId)?.amount || 0
  }

  function alloc(expense: Expense, projectId: string) {
    return expense.allocations.find((a) => a.projectId === projectId) || null
  }

  async function save(expense: Expense, col: string, value: string) {
    onError(null)
    const isNew = !expense.id
    try {
      if (col === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
        if (isNew) {
          setNewRow((prev) => ({ ...prev, date: value }))
          return
        }
        await updateExpense(expense.id, { incurredAt: value })
        onChanged()
        return
      }
      if (col === "reference") {
        if (isNew) {
          setNewRow((prev) => ({ ...prev, reference: value }))
          return
        }
        await updateExpense(expense.id, { reference: value || null })
        onChanged()
        return
      }
      if (col === "amount") {
        const amount = parseDecimal(value) ?? 0
        if (isNew) {
          setNewRow((prev) => ({ ...prev, amount: value }))
          if (amount <= 0) return
          await createExpense(vendor.id, {
            incurredAt: newRow.date,
            amount,
            reference: newRow.reference || undefined,
          })
          setNewRow({ date: todayIso(), amount: "", reference: "" })
        } else {
          await updateExpense(expense.id, { amount })
        }
        onChanged()
        return
      }
      if (col.startsWith("project:")) {
        const projectId = col.slice(8)
        const amount = parseDecimal(value) ?? 0
        const allocations = projectCols.map((split) => ({
          projectId: split.projectId,
          amount: split.projectId === projectId ? amount : allocAmount(expense, split.projectId),
        }))
        if (isNew) {
          const total = allocations.reduce((s, row) => s + row.amount, 0)
          if (total <= 0) return
          await createExpense(vendor.id, {
            incurredAt: newRow.date,
            amount: vendor.kind === "split" ? (parseDecimal(newRow.amount) || total) : total,
            reference: newRow.reference || undefined,
            allocations,
          })
          setNewRow({ date: todayIso(), amount: "", reference: "" })
        } else {
          await updateExpense(expense.id, { allocations })
        }
        onChanged()
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save expense")
    }
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" gap={3} mb={2}>
        <Box>
          <Text fontWeight="800" color={APP_INK}>{vendor.name}</Text>
          <Text fontSize="0.75rem" color={APP_MUTED}>{vendor.note || splitNote || (vendor.kind === "columns" ? "Amounts per project" : "Shared cost")}</Text>
        </Box>
        <Box as="button" fontSize="0.75rem" fontWeight="600" color="#B91C1C" onClick={onDelete}>
          Delete vendor
        </Box>
      </Box>
      <SheetFrame>
        <table style={sheetWrapStyle}>
          <thead>
            <tr>
              <th style={{ ...sheetCellStyle({ header: true }), width: 140 }}>Date</th>
              {vendor.kind === "split" ? (
                <th style={{ ...sheetCellStyle({ header: true }), width: 120, textAlign: "right" }}>Amount</th>
              ) : null}
              <th style={{ ...sheetCellStyle({ header: true }), width: 140 }}>Reference</th>
              {projectCols.map((split) => (
                <th key={split.projectId} style={{ ...sheetCellStyle({ header: true, align: "right" }), minWidth: 130 }}>
                  {split.clientName || split.projectName}
                  {vendor.kind === "split" && split.percent != null ? ` (${split.percent}%)` : ""}
                </th>
              ))}
              <th style={{ ...sheetCellStyle({ header: true }), width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((expense) => {
              const key = expense.id || "new"
              return (
                <tr key={key} style={{ opacity: expense.id ? 1 : 0.85 }}>
                  <SheetEditCell
                    col="date"
                    rowKey={key}
                    selected={editing?.key === key && editing.col === "date"}
                    editing={editing?.key === key && editing.col === "date"}
                    display={formatSheetDate(expense.incurredAt)}
                    placeholder="Date"
                    draft={draft}
                    inputRef={inputRef}
                    inputType="date"
                    start={() => { setEditing({ key, col: "date" }); setDraft(expense.incurredAt) }}
                    setDraft={setDraft}
                    commit={() => { void save(expense, "date", draft); setEditing(null) }}
                  />
                  {vendor.kind === "split" ? (
                    <SheetEditCell
                      col="amount"
                      rowKey={key}
                      selected={editing?.key === key && editing.col === "amount"}
                      editing={editing?.key === key && editing.col === "amount"}
                      display={moneyLabel(expense.amount, currency)}
                      align="right"
                      draft={draft}
                      inputRef={inputRef}
                      start={() => {
                        if (expense.allocations.some((a) => a.invoiceId)) return
                        setEditing({ key, col: "amount" })
                        setDraft(expense.amount ? String(expense.amount) : "")
                      }}
                      setDraft={setDraft}
                      commit={() => { void save(expense, "amount", draft); setEditing(null) }}
                    />
                  ) : null}
                  <SheetEditCell
                    col="reference"
                    rowKey={key}
                    selected={editing?.key === key && editing.col === "reference"}
                    editing={editing?.key === key && editing.col === "reference"}
                    display={expense.reference || ""}
                    draft={draft}
                    inputRef={inputRef}
                    start={() => { setEditing({ key, col: "reference" }); setDraft(expense.reference || "") }}
                    setDraft={setDraft}
                    commit={() => { void save(expense, "reference", draft); setEditing(null) }}
                  />
                  {projectCols.map((split) => {
                    const allocation = alloc(expense, split.projectId)
                    const locked = Boolean(allocation?.invoiceId)
                    const col = `project:${split.projectId}`
                    return (
                      <td
                        key={split.projectId}
                        style={sheetCellStyle({
                          selected: editing?.key === key && editing.col === col,
                          locked,
                          align: "right",
                        })}
                        onClick={() => {
                          if (locked) return
                          setEditing({ key, col })
                          setDraft(allocation?.amount ? String(allocation.amount) : "")
                        }}
                      >
                        {editing?.key === key && editing.col === col && !locked ? (
                          <input
                            ref={inputRef}
                            autoFocus
                            value={draft}
                            inputMode="decimal"
                            style={{ ...sheetInputStyle, textAlign: "right" }}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => { void save(expense, col, draft); setEditing(null) }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.currentTarget.blur() }
                              if (e.key === "Escape") setEditing(null)
                            }}
                          />
                        ) : (
                          <Box>
                            <Text as="span">{moneyLabel(allocAmount(expense, split.projectId), currency)}</Text>
                            {allocation?.invoiceId && (
                              <Text fontSize="0.65rem" color={allocation.invoiceStatus === "paid" ? GREEN : APP_MUTED}>
                                {statusLabel(allocation.invoiceStatus)}
                              </Text>
                            )}
                          </Box>
                        )}
                      </td>
                    )
                  })}
                  <td style={sheetCellStyle({ muted: true })}>
                    {expense.id && expense.allocations.every((a) => !a.invoiceId) ? (
                      <Box as="button" color={APP_MUTED} onClick={async () => {
                        try {
                          await deleteExpense(expense.id)
                          onChanged()
                        } catch (err) {
                          onError(err instanceof Error ? err.message : "Could not delete")
                        }
                      }}>
                        <LuTrash2 size={14} />
                      </Box>
                    ) : null}
                  </td>
                </tr>
              )
            })}
            <tr>
              <td style={sheetCellStyle({ header: true })}>Sum</td>
              {vendor.kind === "split" ? (
                <td style={sheetCellStyle({ header: true, align: "right" })}>{formatMoney(sum, currency)}</td>
              ) : null}
              <td style={sheetCellStyle({ header: true })} />
              {projectCols.map((split) => {
                const total = vendor.expenses.reduce((s, e) => s + allocAmount(e, split.projectId), 0)
                const ids = vendor.expenses.flatMap((e) => e.allocations.filter((a) => a.projectId === split.projectId && !a.invoiceId && a.amount > 0).map((a) => a.id))
                return (
                  <td key={split.projectId} style={sheetCellStyle({ header: true, align: "right" })}>
                    <Box>
                      {formatMoney(total, currency)}
                      {ids.length > 0 && (
                        <Box
                          as="button"
                          display="block"
                          w="100%"
                          textAlign="right"
                          fontSize="0.65rem"
                          color={APP_ACCENT}
                          onClick={() => onInvoice(split.projectId, ids)}
                        >
                          Invoice
                        </Box>
                      )}
                    </Box>
                  </td>
                )
              })}
              <td style={sheetCellStyle({ header: true })} />
            </tr>
          </tbody>
        </table>
      </SheetFrame>
    </Box>
  )
}

function SheetEditCell({
  selected,
  editing,
  display,
  placeholder,
  align,
  draft,
  inputRef,
  inputType,
  start,
  setDraft,
  commit,
}: {
  col: string
  rowKey: string
  selected?: boolean
  editing?: boolean
  display: string
  placeholder?: string
  align?: "left" | "right"
  draft: string
  inputRef: RefObject<HTMLInputElement | null>
  inputType?: string
  start: () => void
  setDraft: (value: string) => void
  commit: () => void
}) {
  return (
    <td style={sheetCellStyle({ selected, align })} onClick={start}>
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          type={inputType || "text"}
          value={draft}
          inputMode={align === "right" ? "decimal" : undefined}
          style={{ ...sheetInputStyle, textAlign: align || "left" }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
            if (e.key === "Escape") (e.currentTarget as HTMLInputElement).blur()
          }}
        />
      ) : (
        <span style={{ opacity: display ? 1 : 0.4 }}>{display || placeholder || "\u00A0"}</span>
      )}
    </td>
  )
}

function VendorDialog({
  open,
  projects,
  onClose,
  onCreated,
}: {
  open: boolean
  projects: ExpenseProject[]
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [kind, setKind] = useState<ExpenseVendorKind>("split")
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reset() {
    setName("")
    setNote("")
    setKind("split")
    setPicked({})
    setError(null)
  }

  async function submit() {
    const splits = Object.entries(picked)
      .filter(([, percent]) => percent !== "off")
      .map(([projectId, percent]) => ({
        projectId,
        percent: kind === "split" ? Number(percent) : null,
      }))
    if (!name.trim()) {
      setError("Give this vendor a name")
      return
    }
    if (!splits.length) {
      setError("Pick at least one project")
      return
    }
    if (kind === "split" && splits.some((s) => !Number.isFinite(s.percent as number))) {
      setError("Enter a percent for each selected project")
      return
    }
    setBusy(true)
    try {
      await createExpenseVendor({ name: name.trim(), note: note.trim() || undefined, kind, splits })
      reset()
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create vendor")
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={({ open: next }) => { if (!next) { reset(); onClose() } }}
      size="md"
      placement="center"
    >
      <DialogContent style={DIALOG_PANEL_STYLE}>
        <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
          <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>Add vendor</DialogTitle>
          <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
        </Box>
        <DialogHeader display="none" />
        <DialogBody px={6} py={5} display="grid" gap={3}>
          <FormInput placeholder="Supabase" value={name} onChange={(e) => setName(e.target.value)} />
          <FormInput placeholder="Note, e.g. 30% Sennheiser / 70% PushRecruit" value={note} onChange={(e) => setNote(e.target.value)} />
          <Box display="flex" gap={2}>
            {(["split", "columns"] as const).map((value) => (
              <Box
                key={value}
                as="button"
                flex={1}
                h="40px"
                borderRadius="10px"
                border={`1px solid ${kind === value ? GREEN : "#E5E7EB"}`}
                bg={kind === value ? "rgba(15,110,86,0.08)" : "white"}
                fontWeight="600"
                fontSize="0.8125rem"
                onClick={() => setKind(value)}
              >
                {value === "split" ? "Shared, split by %" : "Amount per project"}
              </Box>
            ))}
          </Box>
          <Box>
            {projects.map((project) => {
              const selected = picked[project.id] != null && picked[project.id] !== "off"
              return (
                <Box key={project.id} display="flex" alignItems="center" gap={3} py={2} borderBottom="1px solid #E5E7EB">
                  <Box
                    as="button"
                    w="18px"
                    h="18px"
                    borderRadius="4px"
                    border={`1px solid ${selected ? GREEN : "#E5E7EB"}`}
                    bg={selected ? GREEN : "white"}
                    onClick={() => {
                      setPicked((prev) => {
                        const next = { ...prev }
                        if (selected) delete next[project.id]
                        else next[project.id] = kind === "split" ? "" : "0"
                        return next
                      })
                    }}
                  />
                  <Box flex="1">
                    <Text fontSize="0.875rem" fontWeight="600">{project.name}</Text>
                    <Text fontSize="0.75rem" color={APP_MUTED}>{project.clientName}</Text>
                  </Box>
                  {kind === "split" && selected && (
                    <FormInput
                      w="88px"
                      h="36px"
                      placeholder="%"
                      value={picked[project.id] === "0" ? "" : picked[project.id]}
                      onChange={(e) => setPicked((prev) => ({ ...prev, [project.id]: e.target.value }))}
                    />
                  )}
                </Box>
              )
            })}
            {projects.length === 0 && <Text fontSize="0.875rem" color={APP_MUTED}>Create a project first.</Text>}
          </Box>
          {error && <Text fontSize="0.8125rem" color="#B91C1C">{error}</Text>}
        </DialogBody>
        <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
          <AppButton flex={1} loading={busy} onClick={() => void submit()}>Add vendor</AppButton>
          <AppButton variant="ghost" onClick={onClose}>Cancel</AppButton>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
