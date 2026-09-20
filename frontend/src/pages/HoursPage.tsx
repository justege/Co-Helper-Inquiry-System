import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { getExpenses, type ExpensesBoard as ExpensesData } from "@/api/expenses"
import { getTimesheet, type Timesheet } from "@/api/work"
import { PageShell } from "@/components/ui/PageShell"
import { AppTabs } from "@/components/ui/AppTabs"
import { TimesheetGrid } from "@/components/work/TimesheetGrid"
import { ExpensesBoard } from "@/components/work/ExpensesBoard"
import { formatHours, formatMoney, monthRange } from "@/lib/hours"

const TABS = ["timesheet", "expenses"] as const
type Tab = (typeof TABS)[number]

function parseTab(value: string | null): Tab {
  if (value && (TABS as readonly string[]).includes(value)) return value as Tab
  return "timesheet"
}

function monthFromParam(value: string | null): { year: number; month: number } {
  const now = new Date()
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number)
    return { year, month: month - 1 }
  }
  return { year: now.getFullYear(), month: now.getMonth() }
}

export default function HoursPage() {
  const [params, setParams] = useSearchParams()
  const tab = parseTab(params.get("tab"))
  const month = monthFromParam(params.get("month"))
  const projectId = params.get("project") || ""
  const range = useMemo(() => monthRange(month.year, month.month), [month.year, month.month])
  const [sheet, setSheet] = useState<Timesheet | null>(null)
  const [expenses, setExpenses] = useState<ExpensesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function setTab(next: string) {
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      if (next === "timesheet") nextParams.delete("tab")
      else nextParams.set("tab", next)
      return nextParams
    }, { replace: true })
  }

  function setMonth(delta: number) {
    const d = new Date(month.year, month.month + delta, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set("month", value)
      return nextParams
    }, { replace: true })
  }

  function setProject(id: string) {
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      if (id) nextParams.set("project", id)
      else nextParams.delete("project")
      return nextParams
    }, { replace: true })
  }

  function load(quiet = false) {
    if (!quiet) setLoading(true)
    getTimesheet({ from: range.from, to: range.to, projectId: projectId || undefined })
      .then(async (data) => {
        setSheet(data)
        setError(null)
        if (data.role === "owner") {
          try {
            setExpenses(await getExpenses())
          } catch {
            setExpenses(null)
          }
        } else {
          setExpenses(null)
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [range.from, range.to, projectId])

  const showExpenses = !sheet || sheet.role === "owner" || tab === "expenses"
  const monthLabel = new Date(month.year, month.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
  const monthHours = sheet?.entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0) ?? 0
  const billableHours = sheet?.entries.filter((entry) => entry.billable).reduce((sum, entry) => sum + Number(entry.hours || 0), 0) ?? 0
  const daysLogged = new Set(sheet?.entries.map((entry) => entry.entryDate.slice(0, 10)) ?? []).size
  const expenseAmount = expenses?.vendors.reduce(
    (sum, vendor) => sum + vendor.expenses.reduce((inner, expense) => inner + Number(expense.amount || 0), 0),
    0
  ) ?? 0

  return (
    <PageShell
      eyebrow="Workspace"
      title="Hours"
      stats={[
        { label: "This month", value: formatHours(monthHours) },
        { label: "Billable", value: formatHours(billableHours) },
        { label: "Days", value: String(daysLogged) },
        sheet?.role === "owner"
          ? { label: "Expenses", value: formatMoney(expenseAmount, expenses?.currency || sheet?.workspace?.currency || "EUR") }
          : { label: "Projects", value: String(sheet?.projects.length ?? 0) },
      ]}
    >
      <Box mb={4}>
        <AppTabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "timesheet", label: "Timesheet" },
            ...(showExpenses ? [{ value: "expenses", label: "Expenses" }] : []),
          ]}
        />
      </Box>

      {error && <Text color="#B91C1C" mb={3}>{error}</Text>}
      {loading && !sheet && tab === "timesheet" && <Spinner />}
      {loading && !expenses && tab === "expenses" && <Spinner />}

      {tab === "timesheet" && sheet && (
        <TimesheetGrid
          days={range.days}
          entries={sheet.entries}
          projects={sheet.projects}
          todos={sheet.todos}
          canEdit={sheet.canEdit}
          monthLabel={monthLabel}
          projectId={projectId}
          onProjectChange={setProject}
          onMonthChange={setMonth}
          onChanged={() => load(true)}
        />
      )}

      {tab === "expenses" && expenses && (
        <ExpensesBoard
          vendors={expenses.vendors}
          projects={expenses.projects}
          currency={expenses.currency}
          onChanged={() => load(true)}
        />
      )}
    </PageShell>
  )
}
