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
