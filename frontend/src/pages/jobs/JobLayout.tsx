import { NavLink, Outlet, useParams } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { getInquiry, type Inquiry } from "@/api/inquiries"
import { PageBody, PageHeader } from "@/components/ui/PageHeader"
import { GREEN, MUTED, RULE, SURFACE } from "@/theme/tokens"
import { clientDisplayName } from "@/lib/boardStatus"

const tabs = [
  { to: "", label: "Overview" },
  { to: "messages", label: "Messages" },
  { to: "tasks", label: "Tasks" },
  { to: "files", label: "Files" },
  { to: "agreements", label: "Agreements" },
  { to: "activity", label: "Activity" },
]

export default function JobLayout() {
  const { id } = useParams<{ id: string }>()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getInquiry(id).then(setInquiry).catch((e: Error) => setError(e.message))
  }, [id])

  if (error) {
    return (
      <PageBody wide>
        <PageHeader title="Job not found" backHref="/app/board" />
        <Text color="#B91C1C">{error}</Text>
      </PageBody>
    )
  }

  if (!inquiry) {
    return (
      <PageBody wide>
        <Box display="flex" alignItems="center" gap={2}><Spinner size="sm" /><Text color={MUTED}>Loading job…</Text></Box>
      </PageBody>
    )
  }

  const base = `/app/jobs/${inquiry.id}`

  return (
    <PageBody wide>
      <PageHeader
        title={inquiry.title}
        subtitle={`${clientDisplayName(inquiry.client)} · ${inquiry.project?.name ?? "No project"} · #${inquiry.id.slice(0, 8).toUpperCase()}`}
        backHref="/app/board"
        backLabel="Board"
      />
      <Box display="flex" gap={1} mb={5} overflowX="auto" p="4px" bg={SURFACE} border={`1px solid ${RULE}`} borderRadius="12px" w="fit-content">
        {tabs.map((tab) => (
          <NavLink key={tab.label} to={tab.to ? `${base}/${tab.to}` : base} end={!tab.to} style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <Box
                px="16px"
                py="10px"
                minH="36px"
                borderRadius="10px"
                fontSize="0.8125rem"
                fontWeight="600"
                color={isActive ? "white" : MUTED}
                bg={isActive ? GREEN : "transparent"}
                whiteSpace="nowrap"
              >
                {tab.label}
              </Box>
            )}
          </NavLink>
        ))}
      </Box>
      <Outlet context={{ inquiry, setInquiry }} />
    </PageBody>
  )
}
