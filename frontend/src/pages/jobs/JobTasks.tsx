import { useOutletContext } from "react-router-dom"
import { useEffect, useState } from "react"
import { Stack } from "@chakra-ui/react"
import { HoursCard, TodosCard } from "@/components/job/JobHub"
import { getMe } from "@/api/users"
import type { Inquiry } from "@/api/inquiries"

export default function JobTasks() {
  const { inquiry } = useOutletContext<{ inquiry: Inquiry }>()
  const [isSolo, setIsSolo] = useState(false)
  useEffect(() => { getMe().then((u) => setIsSolo(u.role === "expert")).catch(() => null) }, [])
  return (
    <Stack gap={5} maxW="720px">
      <TodosCard inquiryId={inquiry.id} canLog={isSolo} />
      <HoursCard inquiryId={inquiry.id} canLog={isSolo} />
    </Stack>
  )
}
