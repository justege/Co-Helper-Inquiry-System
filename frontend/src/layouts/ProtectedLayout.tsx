import { Navigate, Outlet, NavLink, useNavigate } from "react-router-dom"
import { Box, Button, Flex, Heading, Spinner, Text, VStack } from "@chakra-ui/react"
import { useAuthContext } from "../components/auth/AuthContext"

export default function ProtectedLayout() {
  const { user, loading, logout } = useAuthContext()
  const navigate = useNavigate()

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Spinner size="lg" color="orange.400" borderWidth="3px" />
      </Flex>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <Flex minH="100vh">
      {/* Sidebar */}
      <Box
        as="aside"
        w="230px"
        flexShrink={0}
        bg="white"
        borderRight="1px solid"
        borderColor="gray.100"
        display="flex"
        flexDir="column"
      >
        <Box px={6} py={6} borderBottom="1px solid" borderColor="gray.100">
          <Heading fontSize="1.375rem" fontWeight="800" letterSpacing="-0.04em" color="gray.900">
            Payd
          </Heading>
        </Box>

        <VStack as="nav" flex="1" align="stretch" px={3} py={4} gap={1}>
          <SidebarLink to="/app/dashboard">Dashboard</SidebarLink>
          <SidebarLink to="/app/profile">Profile</SidebarLink>
          <SidebarLink to="/app/settings">Settings</SidebarLink>
        </VStack>

        <Box px={5} py={4} borderTop="1px solid" borderColor="gray.100">
          <Text
            fontSize="0.8rem"
            color="gray.400"
            fontWeight="500"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            mb={2}
          >
            {user.email}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            colorPalette="gray"
            fontWeight="500"
            fontSize="sm"
            px={2}
            onClick={handleLogout}
          >
            Sign out
          </Button>
        </Box>
      </Box>

      {/* Main content */}
      <Box as="main" flex="1" overflowY="auto" bg="#fcfcfc">
        <Outlet />
      </Box>
    </Flex>
  )
}

function SidebarLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink to={to}>
      {({ isActive }: { isActive: boolean }) => (
        <Box
          as="span"
          display="flex"
          alignItems="center"
          px={3}
          py="0.55rem"
          borderRadius="lg"
          fontSize="0.875rem"
          fontWeight={isActive ? "600" : "500"}
          color={isActive ? "orange.500" : "gray.500"}
          bg={isActive ? "orange.50" : "transparent"}
          cursor="pointer"
          transition="all 0.12s"
          _hover={{
            bg: isActive ? "orange.50" : "gray.50",
            color: isActive ? "orange.500" : "gray.700",
            textDecoration: "none",
          }}
        >
          {children}
        </Box>
      )}
    </NavLink>
  )
}
