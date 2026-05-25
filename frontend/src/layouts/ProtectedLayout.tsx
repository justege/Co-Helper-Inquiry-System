import { Navigate, Outlet, NavLink, useNavigate } from "react-router-dom"
import { Box, Flex, Spinner, Text } from "@chakra-ui/react"
import { useAuthContext } from "../components/auth/AuthContext"
import { getMe, type User } from "../api/users"
import { useEffect, useState } from "react"
import {
  LuLayoutDashboard,
  LuPenLine,
  LuInbox,
  LuUser,
  LuSettings,
  LuLogOut,
  LuShieldCheck,
  LuClipboardList,
  LuUsers,
  LuSlidersHorizontal,
} from "react-icons/lu"
import type { IconType } from "react-icons"

const SIDEBAR_BG = "#0B1528"
const DIVIDER = "rgba(255,255,255,0.07)"
const ACTIVE_BG = "rgba(21,99,178,0.22)"
const ACTIVE_COLOR = "#93C5FD"
const MUTED = "rgba(255,255,255,0.42)"

// ── Desktop sidebar nav ──────────────────────────────────────────────────────

interface NavItem {
  to: string
  icon: IconType
  label: string
  adminOnly?: boolean
  partnerOnly?: boolean
}

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/app/dashboard", icon: LuLayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/app/inquiries/new", icon: LuPenLine, label: "New Inquiry" },
      { to: "/app/inquiries", icon: LuInbox, label: "My Inquiries" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/app/profile",           icon: LuUser,     label: "Profile" },
      { to: "/app/partner-services",  icon: LuShieldCheck, label: "My Services", partnerOnly: true },
      { to: "/app/settings",          icon: LuSettings, label: "Settings" },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/app/admin/inquiries", icon: LuClipboardList,    label: "Inquiry Dashboard", adminOnly: true },
      { to: "/app/admin/experts",   icon: LuUsers,            label: "Partners",      adminOnly: true },
      { to: "/app/admin",           icon: LuSlidersHorizontal, label: "Control Panel", adminOnly: true },
    ],
  },
]

// ── Mobile bottom nav (5 items max) ─────────────────────────────────────────

const mobileNav: (NavItem & { emphasis?: boolean })[] = [
  { to: "/app/dashboard",     icon: LuLayoutDashboard, label: "Home" },
  { to: "/app/inquiries",     icon: LuInbox,           label: "Inquiries" },
  { to: "/app/inquiries/new", icon: LuPenLine,         label: "New", emphasis: true },
  { to: "/app/settings",       icon: LuSettings,        label: "Settings" },
  { to: "/app/profile",       icon: LuUser,            label: "Profile" },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function ProtectedLayout() {
  const { user, loading, logout } = useAuthContext()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<User | null>(null)

  useEffect(() => {
    if (user) {
      getMe().then(setProfile).catch(() => null)
    }
  }, [user])

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="#EFF1F6">
        <Spinner size="lg" color="blue.500" borderWidth="3px" />
      </Flex>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const isSuperadminOrAdmin =
    profile?.role === "superadmin" || profile?.role === "admin"
  const isPartner = profile?.role === "expert"

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <Flex minH="100vh">
      {/* ── Desktop sidebar ── */}
      <Box
        as="aside"
        display={{ base: "none", lg: "flex" }}
        flexDir="column"
        w="220px"
        flexShrink={0}
        bg={SIDEBAR_BG}
        position="fixed"
        top={0}
        left={0}
        h="100vh"
        zIndex={10}
      >
        {/* Logo */}
        <Box
          px={5}
          py={5}
          borderBottom="1px solid"
          borderColor={DIVIDER}
          display="flex"
          alignItems="center"
          gap={2.5}
        >
          <Box
            w="28px"
            h="28px"
            bg="#1563B2"
            rounded="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Box w="9px" h="9px" bg="white" rounded="sm" transform="rotate(45deg)" />
          </Box>
          <Text fontSize="0.75rem" fontWeight="800" color="white" letterSpacing="0.05em" textTransform="uppercase">
            OutsourceSoft
          </Text>
        </Box>

        {/* Nav */}
        <Box flex="1" overflowY="auto" px={3} py={4}>
          {sections.map((section, si) => {
            const visibleItems = section.items.filter(
              (item) =>
                (!item.adminOnly || isSuperadminOrAdmin) &&
                (!item.partnerOnly || isPartner)
            )
            if (visibleItems.length === 0) return null
            return (
              <Box key={section.label} mb={si < sections.length - 1 ? 5 : 0}>
                <Text
                  fontSize="0.625rem"
                  fontWeight="700"
                  color="rgba(255,255,255,0.22)"
                  letterSpacing="0.1em"
                  textTransform="uppercase"
                  px={3}
                  mb={1.5}
                >
                  {section.label}
                </Text>
                {visibleItems.map((item) => (
                  <SidebarItem key={item.to} item={item} />
                ))}
              </Box>
            )
          })}
        </Box>

        {/* Footer */}
        <Box px={4} py={4} borderTop="1px solid" borderColor={DIVIDER}>
          {profile?.companyName && (
            <Text
              fontSize="0.6875rem"
              color="rgba(255,255,255,0.22)"
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing="0.06em"
              mb={0.5}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {profile.companyName}
            </Text>
          )}
          <Text
            fontSize="0.75rem"
            color="rgba(255,255,255,0.35)"
            fontWeight="400"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            mb={2.5}
          >
            {user.email}
          </Text>
          <Box
            as="button"
            display="inline-flex"
            alignItems="center"
            gap={1.5}
            color="rgba(255,255,255,0.28)"
            fontSize="0.75rem"
            fontWeight="600"
            cursor="pointer"
            _hover={{ color: "rgba(255,255,255,0.7)" }}
            transition="color 0.12s"
            onClick={handleLogout}
            type="button"
          >
            <LuLogOut size={13} />
            Sign out
          </Box>
        </Box>
      </Box>

      {/* ── Main content ── */}
      <Box
        as="main"
        flex="1"
        ml={{ base: 0, lg: "220px" }}
        bg="#EFF1F6"
        minH="100vh"
      >
        <Outlet />
      </Box>

      {/* ── Mobile bottom navigation ── */}
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
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {mobileNav.map((item) => (
          <MobileNavItem key={item.to} item={item} />
        ))}
      </Box>
    </Flex>
  )
}

// ── Desktop sidebar item ─────────────────────────────────────────────────────

function SidebarItem({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink to={item.to} end={item.to === "/app/inquiries" || item.to === "/app/admin"}>
      {({ isActive }: { isActive: boolean }) => (
        <Box
          as="span"
          display="flex"
          alignItems="center"
          gap={2.5}
          px={3}
          py="0.45rem"
          borderRadius="7px"
          fontSize="0.8375rem"
          fontWeight={isActive ? "600" : "500"}
          color={isActive ? ACTIVE_COLOR : MUTED}
          bg={isActive ? ACTIVE_BG : "transparent"}
          mb="1px"
          cursor="pointer"
          transition="all 0.12s"
          _hover={{ bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)", textDecoration: "none" }}
        >
          <Box as="span" display="flex" alignItems="center" opacity={isActive ? 1 : 0.7}>
            <Icon size={14} />
          </Box>
          {item.label}
        </Box>
      )}
    </NavLink>
  )
}

// ── Mobile bottom nav item ───────────────────────────────────────────────────

function MobileNavItem({ item }: { item: NavItem & { emphasis?: boolean } }) {
  const Icon = item.icon
  return (
    <NavLink to={item.to} end={item.to === "/app/inquiries"} style={{ flex: 1 }}>
      {({ isActive }: { isActive: boolean }) => (
        <Box
          as="span"
          display="flex"
          flexDir="column"
          alignItems="center"
          justifyContent="center"
          gap="3px"
          py={1}
          cursor="pointer"
          position="relative"
        >
          {item.emphasis ? (
            <Box
              w="42px"
              h="42px"
              rounded="full"
              bg={isActive ? "#1252A0" : "#1563B2"}
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              shadow="0 4px 12px rgba(21,99,178,0.4)"
              transform="translateY(-6px)"
              transition="all 0.15s"
            >
              <Icon size={17} />
            </Box>
          ) : (
            <Box
              as="span"
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="26px"
              h="26px"
              color={isActive ? "#1563B2" : "#8A96A8"}
              transition="color 0.1s"
            >
              <Icon size={21} />
            </Box>
          )}
          {!item.emphasis && (
            <Text
              as="span"
              fontSize="0.6rem"
              fontWeight={isActive ? "700" : "500"}
              color={isActive ? "#1563B2" : "#8A96A8"}
              letterSpacing="0.01em"
            >
              {item.label}
            </Text>
          )}
        </Box>
      )}
    </NavLink>
  )
}
