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
import ActivityPage from "./pages/ActivityPage";
import DesignSystemPage from "./pages/DesignSystemPage";
import BoardPage from "./pages/BoardPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NewInquiryPage from "./pages/NewInquiryPage";
import InquiriesListPage from "./pages/InquiriesListPage";
import InquiryDetailPage from "./pages/InquiryDetailPage";
import TrelloPage from "./pages/TrelloPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import FinancePage from "./pages/FinancePage";
import SuperAdminPage from "./pages/SuperAdminPage";
import JobLayout from "./pages/jobs/JobLayout";
import JobOverview from "./pages/jobs/JobOverview";
import JobMessages from "./pages/jobs/JobMessages";
import JobTasks from "./pages/jobs/JobTasks";
import JobFiles from "./pages/jobs/JobFiles";
import JobAgreements from "./pages/jobs/JobAgreements";
import JobActivity from "./pages/jobs/JobActivity";

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
            <Route path="activity" element={<ActivityPage />} />
            <Route path="design-system" element={<DesignSystemPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="dashboard" element={<Navigate to="/app" replace />} />
            <Route path="inquiries" element={<InquiriesListPage />} />
            <Route path="inquiries/new" element={<NewInquiryPage />} />
            <Route path="inquiries/:id" element={<InquiryDetailPage />} />
            <Route path="jobs/:id" element={<JobLayout />}>
              <Route index element={<JobOverview />} />
              <Route path="messages" element={<JobMessages />} />
              <Route path="tasks" element={<JobTasks />} />
              <Route path="files" element={<JobFiles />} />
              <Route path="agreements" element={<JobAgreements />} />
              <Route path="activity" element={<JobActivity />} />
            </Route>
            <Route path="trello" element={<TrelloPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<SuperAdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
