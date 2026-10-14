import { useState } from "react"
import { Box, Text } from "@chakra-ui/react"
import { LuSparkles } from "react-icons/lu"
import { AppButton } from "@/components/ui/AppButton"
import { AppInput } from "@/components/ui/AppInput"
import { GREEN } from "@/theme/tokens"
import {
  draftPlain,
  draftWithAssistant,
  polishText,
  type AssistantContextInput,
  type AssistantDraft,
} from "@/api/assistant"

export function AiWrite({
  kind,
  value = "",
  onText,
  onDraft,
  context,
  hint,
  mode = "both",
  draftKind,
}: {
  kind: string
  value?: string
  onText?: (text: string) => void
  onDraft?: (draft: AssistantDraft) => void
  context?: AssistantContextInput
  hint?: string
  mode?: "both" | "write" | "polish"
  draftKind?: string
}) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasText = value.trim().length > 0

  async function polish() {
    if (!hasText || !onText) return
    setBusy(true)
    setError(null)
    try {
      const text = await polishText({ kind, text: value.trim(), hint, context })
      onText(text)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not polish this")
    } finally {
      setBusy(false)
    }
  }

  async function write() {
    const instruction = prompt.trim()
    const source = value.trim()
    if (!instruction && !source) {
      setError("Add a few words first")
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (onDraft) {
        onDraft(await draftWithAssistant({
          kind: draftKind || kind,
          prompt: instruction || "Rewrite this so it is clear and specific.",
          text: source,
          context,
        }))
      } else if (onText) {
        const draft = await draftWithAssistant({
          kind: draftKind || kind,
          prompt: instruction || "Rewrite this so it is clear and specific.",
          text: source,
          context,
        })
        onText(draftPlain(draft))
      }
      setPrompt("")
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not write this")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box mt={1.5}>
      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={3} flexWrap="wrap">
        {error && (
          <Text fontSize="0.75rem" color="#B91C1C" mr="auto" lineHeight="1.4">
            {error}
          </Text>
        )}
        {mode !== "write" && hasText && onText && (
          <Box
            as="button"
            type="button"
            display="inline-flex"
            alignItems="center"
            gap={1}
            color={GREEN}
            fontSize="0.75rem"
            fontWeight="700"
            disabled={busy}
            opacity={busy ? 0.5 : 1}
            onClick={() => void polish()}
          >
            <LuSparkles size={12} /> {busy && !open ? "Polishing" : "Polish"}
          </Box>
        )}
        {mode !== "polish" && (
          <Box
            as="button"
            type="button"
            display="inline-flex"
            alignItems="center"
            gap={1}
            color={GREEN}
            fontSize="0.75rem"
            fontWeight="700"
            onClick={() => { setError(null); setOpen((current) => !current) }}
          >
            <LuSparkles size={12} /> {open ? "Close" : "Write with assistant"}
          </Box>
        )}
      </Box>
      {open && (
        <Box display="flex" gap={2} mt={2} alignItems="center">
          <AppInput
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={hasText ? "How should this change?" : "Rough notes — the assistant will write this"}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void write()
              }
            }}
          />
          <AppButton size="sm" loading={busy} onClick={() => void write()}>Write</AppButton>
        </Box>
      )}
    </Box>
  )
}
