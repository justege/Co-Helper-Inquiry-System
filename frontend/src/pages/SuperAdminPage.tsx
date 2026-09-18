import { useEffect, useState } from "react"
import { Navigate, Link } from "react-router-dom"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { getMe, getUsers, updateUserRole, type Role, type User } from "@/api/users"
import { PageShell } from "@/components/ui/PageShell"
import { AppSelect } from "@/components/ui/AppSelect"
import { AppButton } from "@/components/ui/AppButton"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"

export default function SuperAdminPage() {
  const [me, setMe] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe().then((u) => {
      setMe(u)
      if (u.role === "superadmin" || u.role === "admin") {
        return getUsers().then(setUsers)
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageShell title="Admin"><Spinner /></PageShell>
  if (!me || (me.role !== "superadmin" && me.role !== "admin")) return <Navigate to="/app" replace />

  return (
    <PageShell
      title="Admin"
      subtitle="Platform users"
      action={
        <Link to="/app/design-system">
          <AppButton variant="secondary" size="sm">Brand DNA</AppButton>
        </Link>
      }
    >
      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        {users.map((u) => (
          <Box key={u.id} px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`} display="flex" justifyContent="space-between" gap={4} alignItems="center">
            <Box>
              <Text fontWeight="600" color={APP_INK}>{u.email}</Text>
              <Text fontSize="0.75rem" color={APP_MUTED}>{u.companyName || u.username || "—"}</Text>
            </Box>
            {me.role === "superadmin" ? (
              <AppSelect
                value={u.role}
                controlSize="sm"
                onChange={(e) => {
                  const role = e.target.value as Role
                  updateUserRole(u.id, role).then((updated) => setUsers((prev) => prev.map((x) => x.id === u.id ? updated : x)))
                }}
              >
                <option value="client">client</option>
                <option value="expert">expert</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </AppSelect>
            ) : (
              <Text fontSize="0.8125rem">{u.role}</Text>
            )}
          </Box>
        ))}
      </Box>
    </PageShell>
  )
}
