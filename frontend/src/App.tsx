import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthContext";

import PublicLayout from "./layouts/PublicLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";
import { SetupBanner } from "./components/ui/SetupBanner";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <AuthProvider>
      <SetupBanner />
      <BrowserRouter>
        <Routes>
          {/* ── Public routes (redirect to /app if already signed in) ── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* ── Protected routes (redirect to /login if not signed in) ── */}
          <Route path="/app" element={<ProtectedLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
