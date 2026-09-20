import { Navigate, Outlet, NavLink, useNavigate, Link } from "react-router-dom"
import { Box, Flex, Spinner, Text } from "@chakra-ui/react"
import { useAuthContext } from "../components/auth/AuthContext"
import { getMe, type User } from "../api/users"
import { useEffect, useRef, useState } from "react"
import {
  LuSettings,
  LuLogOut,
  LuFolderKanban,
  LuUsers,
  LuHouse,
  LuEllipsis,
  LuBell,
  LuSearch,
  LuUser,
  LuReceipt,
  LuClock,
} from "react-icons/lu"
import type { IconType } from "react-icons"
import { GREEN, INK, MUTED, PAPER, RULE, SURFACE } from "@/theme/tokens"
import { AppInput } from "@/components/ui/AppInput"
import { searchWorkspace, type WorkspaceSearchResult } from "@/api/workspace"
import { getNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/api/notifications"
import { BrandMark } from "@/components/brand/BrandMark"
import { TodoCardProvider, useTodoCard } from "@/components/work/TodoCardContext"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DIALOG_PANEL_STYLE,
} from "@/components/ui/dialog"

interface NavItem {
  to: string
  icon: IconType
  label: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

function navGroups(isOwner: boolean): NavGroup[] {
  return [
    {
      label: "Overview",
      items: [{ to: "/app", icon: LuHouse, label: "Home" }],
    },
    {
      label: "Workspace",
      items: [
        { to: "/app/projects", icon: LuFolderKanban, label: "Projects" },
        { to: "/app/hours", icon: LuClock, label: "Hours" },
        { to: "/app/invoices", icon: LuReceipt, label: "Invoices" },
        ...(isOwner ? [{ to: "/app/clients", icon: LuUsers, label: "Clients" }] : []),
      ],
    },
    {
      label: "Account",
      items: [
        { to: "/app/profile", icon: LuUser, label: "Profile" },
        { to: "/app/settings", icon: LuSettings, label: "Settings" },
      ],
    },
  ]
}

export default function ProtectedLayout() {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg={PAPER}>
        <Spinner size="lg" color="green.500" borderWidth="3px" />
      </Flex>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <TodoCardProvider>
      <ProtectedApp />
    </TodoCardProvider>
  )
}

function ProtectedApp() {
  const { user, logout } = useAuthContext()
  const navigate = useNavigate()
  const { openTodo } = useTodoCard()
  const [profile, setProfile] = useState<User | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<WorkspaceSearchResult | null>(null)
  const [bellOpen, setBellOpen] = useState(false)
  const [notes, setNotes] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const searchTimer = useRef<number | null>(null)

  useEffect(() => {
    if (user) {
      getMe().then(setProfile).catch(() => null)
      getNotifications()
        .then((r) => { setNotes(r.notifications); setUnread(r.unread) })
        .catch(() => null)
    }
  }, [user])

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    if (query.trim().length < 2) {
      setResults(null)
      return
    }
    searchTimer.current = window.setTimeout(() => {
      searchWorkspace(query.trim()).then(setResults).catch(() => setResults(null))
    }, 220)
  }, [query])

  const isOwner = profile?.role === "expert"
  const groups = navGroups(isOwner)
  const mobileItems = groups.flatMap((g) => g.items)

  if (!user) return null

  async function handleLogout() {
    await logout()
    navigate(isOwner ? "/partner/login" : "/login", { replace: true })
  }

  return (
    <Flex minH="100vh" bg={PAPER}>
      <Box
        as="aside"
        display={{ base: "none", lg: "flex" }}
        flexDir="column"
        w="248px"
        flexShrink={0}
        bg={INK}
        position="fixed"
        top={0}
        left={0}
        h="100vh"
        zIndex={10}
      >
        <Box px={5} py={6} display="flex" alignItems="center">
          <BrandMark inverted to="/app" />
        </Box>

        <Box px={3} pb={4}>
          <Box
            as="button"
            w="100%"
            display="flex"
            alignItems="center"
            gap={2}
            h="40px"
            px="14px"
            border="1px solid rgba(255,255,255,0.08)"
            borderRadius="10px"
            bg="rgba(255,255,255,0.04)"
            color="rgba(255,255,255,0.48)"
            fontSize="0.8125rem"
            onClick={() => setSearchOpen(true)}
          >
            <LuSearch size={15} /> Search
          </Box>
        </Box>

        <Box flex="1" overflowY="auto" px={3} pb={4}>
          {groups.map((group) => (
            <Box key={group.label} mb={5}>
              <Text
                px={3}
                mb={1.5}
                fontSize="0.625rem"
                fontWeight="700"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="rgba(255,255,255,0.32)"
              >
                {group.label}
              </Text>
              {group.items.map((item) => (
                <SidebarItem key={item.to} item={item} />
              ))}
            </Box>
          ))}
        </Box>

        <Box px={5} py={5} borderTop="1px solid rgba(255,255,255,0.06)">
          <Text fontSize="0.75rem" color="rgba(255,255,255,0.45)" mb={2} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {user.email}
          </Text>
          <Box
            as="button"
            display="inline-flex"
            alignItems="center"
            gap={1.5}
            color="rgba(255,255,255,0.5)"
            fontSize="0.75rem"
            fontWeight="600"
            onClick={handleLogout}
            _hover={{ color: "white" }}
          >
            <LuLogOut size={13} /> Sign out
          </Box>
        </Box>
      </Box>

      <Box as="main" flex="1" ml={{ base: 0, lg: "248px" }} minH="100vh" position="relative">
        <Box
          display={{ base: "flex", lg: "none" }}
          alignItems="center"
          justifyContent="space-between"
          px={4}
          h="56px"
          bg={INK}
          position="sticky"
          top={0}
          zIndex={8}
        >
          <BrandMark inverted size="sm" to="/app" />
          <Box display="flex" gap={1}>
            <Box as="button" w="44px" h="44px" display="flex" alignItems="center" justifyContent="center" color="white" onClick={() => setSearchOpen(true)} aria-label="Search">
              <LuSearch size={18} />
            </Box>
            <Box as="button" w="44px" h="44px" display="flex" alignItems="center" justifyContent="center" color="white" position="relative" onClick={() => setBellOpen(true)} aria-label="Notifications">
              <LuBell size={18} />
              {unread > 0 && <Box position="absolute" top="10px" right="10px" w="7px" h="7px" bg={GREEN} rounded="full" />}
            </Box>
          </Box>
        </Box>

        <Box display={{ base: "none", lg: "flex" }} justifyContent="flex-end" px={8} pt={4}>
          <Box as="button" w="44px" h="44px" display="flex" alignItems="center" justifyContent="center" border={`1px solid ${RULE}`} borderRadius="10px" bg={SURFACE} position="relative" onClick={() => setBellOpen((v) => !v)} aria-label="Notifications">
            <LuBell size={18} />
            {unread > 0 && <Box position="absolute" top="8px" right="8px" w="7px" h="7px" bg={GREEN} rounded="full" />}
          </Box>
        </Box>

        <Outlet />
      </Box>

      <Box
        display={{ base: "flex", lg: "none" }}
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        zIndex={100}
        h="72px"
        alignItems="center"
        justifyContent="space-around"
        px={2}
        bg={INK}
      >
        {mobileItems.slice(0, 3).map((item) => (
          <MobileNavItem key={item.to} item={item} />
        ))}
        <Box as="button" flex="1" display="flex" flexDir="column" alignItems="center" gap="3px" onClick={() => setMoreOpen(true)}>
          <LuEllipsis size={21} color="rgba(255,255,255,0.45)" />
          <Text fontSize="0.6rem" fontWeight="500" color="rgba(255,255,255,0.45)">More</Text>
        </Box>
      </Box>

      {moreOpen && (
        <DialogRoot open={moreOpen} onOpenChange={({ open }) => setMoreOpen(open)} size="sm" placement="center">
          <DialogContent style={DIALOG_PANEL_STYLE}>
            <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
              <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>More</DialogTitle>
              <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
            </Box>
            <DialogHeader display="none" />
            <DialogBody px={6} py={2} pb={5}>
              {(isOwner ? [
                { to: "/app/invoices", label: "Invoices" },
                { to: "/app/clients", label: "Clients" },
                { to: "/app/profile", label: "Profile" },
                { to: "/app/settings", label: "Settings" },
              ] : [
                { to: "/app/invoices", label: "Invoices" },
                { to: "/app/profile", label: "Profile" },
                { to: "/app/settings", label: "Settings" },
              ]).map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMoreOpen(false)} style={{ textDecoration: "none" }}>
                  <Box py={3} borderBottom={`1px solid ${RULE}`} color={INK} fontWeight="600">{item.label}</Box>
                </Link>
              ))}
            </DialogBody>
          </DialogContent>
        </DialogRoot>
      )}

      <DialogRoot open={searchOpen} onOpenChange={({ open }) => { setSearchOpen(open); if (!open) { setQuery(""); setResults(null) } }} size="md" placement="center">
        <DialogContent style={DIALOG_PANEL_STYLE}>
          <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
            <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>Search</DialogTitle>
            <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
          </Box>
          <DialogHeader display="none" />
          <DialogBody px={6} py={5}>
            <AppInput autoFocus placeholder="To-dos, projects, clients…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {results && (
              <Box mt={4} display="flex" flexDir="column" gap={3}>
                {(results.todos ?? []).map((t) => (
                  <Box
                    key={t.id}
                    as="button"
                    textAlign="left"
                    onClick={() => { openTodo(t.id); setSearchOpen(false) }}
                  >
                    <Text fontWeight="600" color={INK}>{t.title}</Text>
                    <Text fontSize="0.75rem" color={MUTED}>To-do{t.projectName ? ` · ${t.projectName}` : ""}</Text>
                  </Box>
                ))}
                {results.projects.map((p) => (
                  <Link key={p.id} to={`/app/projects/${p.id}`} onClick={() => setSearchOpen(false)} style={{ textDecoration: "none" }}>
                    <Text fontWeight="600" color={INK}>{p.name}</Text>
                    <Text fontSize="0.75rem" color={MUTED}>Project</Text>
                  </Link>
                ))}
                {results.clients.map((c) => (
                  <Link key={c.id} to={`/app/clients/${c.id}`} onClick={() => setSearchOpen(false)} style={{ textDecoration: "none" }}>
                    <Text fontWeight="600" color={INK}>{c.companyName || c.email}</Text>
                    <Text fontSize="0.75rem" color={MUTED}>Client</Text>
                  </Link>
                ))}
                {results.projects.length === 0 && results.clients.length === 0 && (results.todos ?? []).length === 0 && (
                  <Text fontSize="0.875rem" color={MUTED}>No matches.</Text>
                )}
              </Box>
            )}
          </DialogBody>
        </DialogContent>
      </DialogRoot>

      {bellOpen && (
        <Box position="fixed" inset={0} zIndex={220} onClick={() => setBellOpen(false)}>
          <Box
            position="absolute"
            top={{ base: 12, lg: 16 }}
            right={{ base: 3, lg: 8 }}
            w={{ base: "calc(100% - 24px)", md: "360px" }}
            bg={SURFACE}
            border={`1px solid ${RULE}`}
            borderRadius="16px"
            boxShadow="0 12px 40px rgba(14,27,23,0.12)"
            onClick={(e) => e.stopPropagation()}
          >
            <Box px={4} py={3} display="flex" justifyContent="space-between" borderBottom={`1px solid ${RULE}`}>
              <Text fontWeight="700">Notifications</Text>
              <Box as="button" fontSize="0.75rem" color={GREEN} onClick={() => markAllNotificationsRead().then(() => { setUnread(0); setNotes((n) => n.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() }))) })}>
                Mark all read
              </Box>
            </Box>
            <Box maxH="360px" overflowY="auto">
              {notes.length === 0 ? (
                <Text p={4} color={MUTED} fontSize="0.875rem">You’re all caught up.</Text>
              ) : notes.map((n) => (
                <Box
                  key={n.id}
                  px={4}
                  py={3}
                  borderBottom={`1px solid ${RULE}`}
                  bg={n.readAt ? SURFACE : PAPER}
                  cursor="pointer"
                  onClick={() => {
                    markNotificationRead(n.id).catch(() => null)
                    setNotes((prev) => prev.map((x) => x.id === n.id ? { ...x, readAt: x.readAt ?? new Date().toISOString() } : x))
                    setUnread((u) => Math.max(0, u - (n.readAt ? 0 : 1)))
                    const todoId = n.payload?.todoId
                    const invoiceId = n.payload?.invoiceId
                    const projectId = n.payload?.projectId
                    if (typeof todoId === "string") openTodo(todoId, n.type === "todo.comment" ? "discuss" : "card")
                    else if (typeof invoiceId === "string") navigate(`/app/invoices/${invoiceId}`)
                    else if (typeof projectId === "string") navigate(`/app/projects/${projectId}`)
                    setBellOpen(false)
                  }}
                >
                  <Text fontWeight="600" fontSize="0.875rem">{n.title}</Text>
                  {n.body && <Text fontSize="0.75rem" color={MUTED}>{n.body}</Text>}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Flex>
  )
}

function SidebarItem({ item }: { item: NavItem }) {
  const Icon = item.icon
  const end = item.to === "/app"
  return (
    <NavLink to={item.to} end={end}>
      {({ isActive }: { isActive: boolean }) => (
        <Box
          as="span"
          display="flex"
          alignItems="center"
          gap={2.5}
          px={3}
          py="9px"
          mb="2px"
          borderRadius="10px"
          fontSize="0.875rem"
          fontWeight={isActive ? "600" : "500"}
          color={isActive ? "white" : "rgba(255,255,255,0.58)"}
          bg={isActive ? "rgba(15,110,86,0.55)" : "transparent"}
          _hover={{ bg: isActive ? "rgba(15,110,86,0.55)" : "rgba(255,255,255,0.05)", color: "white" }}
        >
          <Icon size={16} />
          {item.label}
        </Box>
      )}
    </NavLink>
  )
}

function MobileNavItem({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink to={item.to} end={item.to === "/app"} style={{ flex: 1 }}>
      {({ isActive }: { isActive: boolean }) => (
        <Box as="span" display="flex" flexDir="column" alignItems="center" gap="3px">
          <Icon size={21} color={isActive ? "#86efac" : "rgba(255,255,255,0.45)"} />
          <Text fontSize="0.6rem" fontWeight={isActive ? "700" : "500"} color={isActive ? "#86efac" : "rgba(255,255,255,0.45)"}>{item.label}</Text>
        </Box>
      )}
    </NavLink>
  )
}
