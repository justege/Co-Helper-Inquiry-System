import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Flex, Spinner } from "@chakra-ui/react";
import { useAuthContext } from "../components/auth/AuthContext";
import { PAPER } from "@/theme/tokens";

export default function PublicLayout() {
  const { user, loading } = useAuthContext();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg={PAPER}>
        <Spinner size="lg" color="green.500" borderWidth="3px" />
      </Flex>
    );
  }

  const authGateRoutes = ["/login", "/register", "/partner/login", "/partner/register"];
  if (user && authGateRoutes.includes(pathname)) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
