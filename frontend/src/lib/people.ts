export function displayName(
  person:
    | {
        firstName?: string | null
        lastName?: string | null
        companyName?: string | null
        username?: string | null
        email?: string | null
      }
    | null
    | undefined,
  fallback = "Someone"
): string {
  if (!person) return fallback
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ")
  return person.companyName || name || person.username || person.email || fallback
}

export function initials(
  person:
    | {
        firstName?: string | null
        lastName?: string | null
        companyName?: string | null
        username?: string | null
        email?: string | null
      }
    | null
    | undefined,
  fallback = "?"
): string {
  if (!person) return fallback
  const first = person.firstName?.trim()
  const last = person.lastName?.trim()
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  const label = displayName(person, "")
  if (!label) return fallback
  const cleaned = label.replace(/@.*/, "").trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return cleaned.slice(0, 2).toUpperCase()
}

export function peopleOnTodo(todo: {
  assignees?: Array<Parameters<typeof displayName>[0] & { id?: string }> | null
  assignee?: Parameters<typeof displayName>[0] | null
}) {
  if (todo.assignees && todo.assignees.length) return todo.assignees
  return todo.assignee ? [todo.assignee] : []
}

export function formatPeopleList(
  people: Array<Parameters<typeof displayName>[0]> | null | undefined,
  empty = "Unassigned"
): string {
  const list = (people || []).filter(Boolean)
  if (!list.length) return empty
  if (list.length === 1) return displayName(list[0])
  if (list.length === 2) return `${displayName(list[0])} & ${displayName(list[1])}`
  return `${displayName(list[0])} +${list.length - 1}`
}
