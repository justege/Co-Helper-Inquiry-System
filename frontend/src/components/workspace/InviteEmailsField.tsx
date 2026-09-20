import { Box, Text } from "@chakra-ui/react"
import { LuPlus, LuX } from "react-icons/lu"
import { FormInput } from "@/components/ui/form-controls"
import { APP_ACCENT, APP_INK, APP_MUTED } from "@/components/ui/appUi"
import { MAX_INVITE_EMAILS } from "@/lib/inviteEmails"

export function InviteEmailsField({
  emails,
  onChange,
  title = "Who should work on this with you?",
  helper = "Add colleagues by email so they can work on this project with you.",
  minRows = 3,
}: {
  emails: string[]
  onChange: (next: string[]) => void
  title?: string
  helper?: string
  minRows?: number
}) {
  function setAt(index: number, value: string) {
    const next = emails.slice()
    next[index] = value
    onChange(next)
  }

  return (
    <Box>
      <Text fontWeight="700" color={APP_INK} fontSize="0.875rem">{title}</Text>
      <Text fontSize="0.75rem" color={APP_MUTED} mt="4px" mb={3} lineHeight="1.5">
        {helper}
      </Text>
      <Box display="grid" gap={2}>
        {emails.map((email, index) => (
          <Box key={index} display="flex" gap={2} alignItems="center">
            <FormInput
              type="email"
              value={email}
              onChange={(e) => setAt(index, e.target.value)}
              placeholder="name@domain.com"
              autoComplete="off"
              aria-label={`Invite email ${index + 1}`}
            />
            {emails.length > minRows && (
              <Box
                as="button"
                type="button"
                aria-label="Remove email"
                color={APP_MUTED}
                display="inline-flex"
                flexShrink={0}
                cursor="pointer"
                onClick={() => onChange(emails.filter((_, i) => i !== index))}
              >
                <LuX size={16} />
              </Box>
            )}
          </Box>
        ))}
      </Box>
      {emails.length < MAX_INVITE_EMAILS && (
        <Box
          as="button"
          type="button"
          mt={2}
          display="inline-flex"
          alignItems="center"
          gap={1}
          color={APP_ACCENT}
          fontSize="0.8125rem"
          fontWeight="600"
          cursor="pointer"
          onClick={() => onChange([...emails, ""])}
        >
          <LuPlus size={14} /> Add another
        </Box>
      )}
    </Box>
  )
}
