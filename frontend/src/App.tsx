import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthContext";

import PublicLayout from "./layouts/PublicLayout";
import ProtectedLayout from "./layouts/ProtectedLayout";
import { SetupBanner } from "./components/ui/SetupBanner";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PartnerLoginPage from "./pages/PartnerLoginPage";
import PartnerRegisterPage from "./pages/PartnerRegisterPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import InvoicesPage from "./pages/InvoicesPage";
import HoursPage from "./pages/HoursPage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import TodoDetailPage from "./pages/TodoDetailPage";

import HowItWorksPage from "./pages/marketing/HowItWorksPage";
import PricingPage from "./pages/marketing/PricingPage";
import IntegrationsPage from "./pages/marketing/IntegrationsPage";
import ChangelogPage from "./pages/marketing/ChangelogPage";
import AboutPage from "./pages/marketing/AboutPage";
import BlogPage from "./pages/marketing/BlogPage";
import CareersPage from "./pages/marketing/CareersPage";
import PressPage from "./pages/marketing/PressPage";
import PrivacyPage from "./pages/marketing/PrivacyPage";
import TermsPage from "./pages/marketing/TermsPage";
import CookiesPage from "./pages/marketing/CookiesPage";
import HelpPage from "./pages/marketing/HelpPage";
import ContactPage from "./pages/marketing/ContactPage";
import StatusPage from "./pages/marketing/StatusPage";
import PartnersPage from "./pages/marketing/PartnersPage";

export default function App() {
  return (
    <AuthProvider>
      <SetupBanner />
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/partner/login" element={<PartnerLoginPage />} />
            <Route path="/partner/register" element={<PartnerRegisterPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/press" element={<PressPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/invite/:token" element={<AcceptInvitePage />} />
          </Route>

          <Route path="/app" element={<ProtectedLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<Navigate to="/app" replace />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="todos/:id" element={<TodoDetailPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="hours" element={<HoursPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
