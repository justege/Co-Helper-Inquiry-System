import { createContext, useCallback, useContext, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { TodoCardDialog } from "./TodoCardDialog"

export const TODO_TABS = ["card", "discuss", "files", "hours"] as const
export type TodoTab = (typeof TODO_TABS)[number]

function parseTab(value: string | null): TodoTab {
  if (value && (TODO_TABS as readonly string[]).includes(value)) return value as TodoTab
  return "card"
}

const TodoCardContext = createContext<{
  openTodo: (id: string, tab?: TodoTab) => void
  closeTodo: () => void
  todoId: string | null
  tab: TodoTab
} | null>(null)

export function useTodoCard() {
  const ctx = useContext(TodoCardContext)
  if (!ctx) throw new Error("useTodoCard must be used within TodoCardProvider")
  return ctx
}

export function TodoCardProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const todoId = params.get("todo")
  const tab = parseTab(params.get("tab"))

  const openTodo = useCallback((id: string, nextTab?: TodoTab) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set("todo", id)
      if (nextTab && nextTab !== "card") next.set("tab", nextTab)
      else next.delete("tab")
      return next
    })
  }, [setParams])

  const closeTodo = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete("todo")
      next.delete("tab")
      return next
    }, { replace: true })
    window.dispatchEvent(new Event("cohelper:work-refresh"))
  }, [setParams])

  const setTab = useCallback((nextTab: TodoTab) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!next.get("todo")) return prev
      if (nextTab === "card") next.delete("tab")
      else next.set("tab", nextTab)
      return next
    }, { replace: true })
  }, [setParams])

  return (
    <TodoCardContext.Provider value={{ openTodo, closeTodo, todoId, tab }}>
      {children}
      <TodoCardDialog
        todoId={todoId}
        tab={tab}
        onTabChange={setTab}
        onClose={closeTodo}
      />
    </TodoCardContext.Provider>
  )
}
