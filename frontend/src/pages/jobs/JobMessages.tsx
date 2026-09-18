import { useOutletContext } from "react-router-dom"
import { useEffect, useState } from "react"
import { Box, Spinner, Stack, Text } from "@chakra-ui/react"
import { listMessages, sendMessage, type InquiryMessage } from "@/api/inquiries"
import { getMe } from "@/api/users"
import { AppButton } from "@/components/ui/AppButton"
import { AppTextarea } from "@/components/ui/AppTextarea"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import type { Inquiry } from "@/api/inquiries"

export default function JobMessages() {
  const { inquiry } = useOutletContext<{ inquiry: Inquiry }>()
  const [messages, setMessages] = useState<InquiryMessage[]>([])
  const [body, setBody] = useState("")
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe().then((u) => setMeId(u.id)).catch(() => null)
    listMessages(inquiry.id).then(setMessages).finally(() => setLoading(false))
  }, [inquiry.id])

  async function send() {
    if (!body.trim()) return
    const msg = await sendMessage(inquiry.id, body.trim())
    setMessages((m) => [...m, msg])
    setBody("")
  }

  if (loading) return <Spinner size="sm" />

  return (
    <Stack gap={4} maxW="720px">
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" p={5} display="flex" flexDir="column" gap={3} maxH="480px" overflowY="auto">
        {messages.length === 0 && <Text color={APP_MUTED}>No messages yet.</Text>}
        {messages.map((m) => (
          <Box key={m.id} alignSelf={m.authorId === meId ? "flex-end" : "flex-start"} maxW="80%" bg={m.authorId === meId ? "#E8F5F0" : "#F4F1EA"} px="16px" py="12px" borderRadius="12px">
            <Text fontSize="0.75rem" color={APP_MUTED} mb={1}>{[m.author?.firstName, m.author?.lastName].filter(Boolean).join(" ") || m.author?.email}</Text>
            <Text color={APP_INK} fontSize="0.9375rem">{m.body}</Text>
          </Box>
        ))}
      </Box>
      <AppTextarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" />
      <AppButton onClick={send}>Send</AppButton>
    </Stack>
  )
}
