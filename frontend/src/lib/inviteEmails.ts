const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const EMPTY_INVITE_EMAILS = ["", "", ""]
export const MAX_INVITE_EMAILS = 20

export function normalizeInviteEmails(values: string[]): { emails: string[]; error: string | null } {
  const filled = values.map((value) => value.trim().toLowerCase()).filter(Boolean)
  const emails: string[] = []
  for (const value of filled) {
    if (!EMAIL_RE.test(value)) return { emails: [], error: `"${value}" is not a valid email` }
    if (!emails.includes(value)) emails.push(value)
  }
  if (emails.length > MAX_INVITE_EMAILS) {
    return { emails: [], error: `Invite at most ${MAX_INVITE_EMAILS} people at a time` }
  }
  return { emails, error: null }
}
