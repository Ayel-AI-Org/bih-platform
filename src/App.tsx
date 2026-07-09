import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { initializePlatformData } from "@/database/operations";
import Index from "./pages/public/Index";
import ProjectsPage from "./pages/public/ProjectsPage";
import ProjectDetailsPage from "./pages/public/ProjectDetailsPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VolunteerSignupPage from "./pages/auth/VolunteerSignupPage";
import NgoSignupPage from "./pages/auth/NgoSignupPage";
import DonorSignupPage from "./pages/auth/DonorSignupPage";
import LoginPage from "./pages/auth/LoginPage";
import SuggestProjectPage from "./pages/public/SuggestProjectPage";
import DonatePage from "./pages/public/DonatePage";
import MediaPage from "./pages/public/MediaPage";
import PendingPage from "./pages/auth/PendingPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Dashboards & Layouts
import DashboardLayout from "@/components/layout/DashboardLayout";
import VolunteerOverviewPage from "./pages/dashboard/volunteer/VolunteerOverviewPage";
import VolunteerProfilePage from "./pages/dashboard/volunteer/VolunteerProfilePage";
import VolunteerPortfolioPage from "./pages/dashboard/volunteer/VolunteerPortfolioPage";
import VolunteerLogHoursPage from "./pages/dashboard/volunteer/VolunteerLogHoursPage";
import VolunteerHoursHistoryPage from "./pages/dashboard/volunteer/VolunteerHoursHistoryPage";
import VolunteerBadgesPage from "./pages/dashboard/volunteer/VolunteerBadgesPage";

import NgoOverviewPage from "./pages/dashboard/ngo/NgoOverviewPage";
import NgoProfilePage from "./pages/dashboard/ngo/NgoProfilePage";
import NgoProjectsPage from "./pages/dashboard/ngo/NgoProjectsPage";
import NgoVerifyHoursPage from "./pages/dashboard/ngo/NgoVerifyHoursPage";

import DonorOverviewPage from "./pages/dashboard/donor/DonorOverviewPage";
import DonorProfilePage from "./pages/dashboard/donor/DonorProfilePage";
import DonorHistoryPage from "./pages/dashboard/donor/DonorHistoryPage";
import DonorImpactPage from "./pages/dashboard/donor/DonorImpactPage";

import AdminLayout from "@/components/layout/AdminLayout";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminProjectsPage from "./pages/admin/AdminProjectsPage";
import AdminPortfolioPage from "./pages/admin/AdminPortfolioPage";
import AdminHoursPage from "./pages/admin/AdminHoursPage";
import AdminSuggestionsPage from "./pages/admin/AdminSuggestionsPage";
import AdminMediaPage from "./pages/admin/AdminMediaPage";
import AdminMediaFormPage from "./pages/admin/AdminMediaFormPage";
import AdminDonationsPage from "./pages/admin/AdminDonationsPage";
import NotFound from "./pages/public/NotFound";
import { ProtectedRoute, PublicRoute, PendingRoute } from "@/components/layout/AuthGuards";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initializePlatformData().catch((error) => {
      console.error("Platform initialization failed:", error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
              
              {/* Public Auth Routes (authenticated users are redirected away) */}
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
              <Route path="/register/volunteer" element={<PublicRoute><VolunteerSignupPage /></PublicRoute>} />
              <Route path="/register/ngo" element={<PublicRoute><NgoSignupPage /></PublicRoute>} />
              <Route path="/register/donor" element={<PublicRoute><DonorSignupPage /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              
              {/* Password Recovery Routes */}
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Pending Queue Route */}
              <Route path="/pending" element={<PendingRoute><PendingPage /></PendingRoute>} />

              <Route path="/suggest-project" element={<SuggestProjectPage />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/media" element={<MediaPage />} />
            </Route>

            {/* Protected Volunteer Dashboard (Outside public SiteLayout) */}
            <Route
              path="/dashboard/volunteer"
              element={
                <ProtectedRoute allowedRoles={["volunteer"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<VolunteerOverviewPage />} />
              <Route path="profile" element={<VolunteerProfilePage />} />
              <Route path="portfolio" element={<VolunteerPortfolioPage />} />
              <Route path="log-hours" element={<VolunteerLogHoursPage />} />
              <Route path="hours-history" element={<VolunteerHoursHistoryPage />} />
              <Route path="badges" element={<VolunteerBadgesPage />} />
            </Route>

            {/* Protected NGO Dashboard (Outside public SiteLayout) */}
            <Route
              path="/dashboard/ngo"
              element={
                <ProtectedRoute allowedRoles={["ngo"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<NgoOverviewPage />} />
              <Route path="profile" element={<NgoProfilePage />} />
              <Route path="projects" element={<NgoProjectsPage />} />
              <Route path="verify-hours" element={<NgoVerifyHoursPage />} />
            </Route>

            {/* Protected Donor Dashboard (Outside public SiteLayout) */}
            <Route
              path="/dashboard/donor"
              element={
                <ProtectedRoute allowedRoles={["donor"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DonorOverviewPage />} />
              <Route path="profile" element={<DonorProfilePage />} />
              <Route path="history" element={<DonorHistoryPage />} />
              <Route path="impact" element={<DonorImpactPage />} />
            </Route>

            {/* Protected Administrator Dashboard (Outside public SiteLayout) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="projects" element={<AdminProjectsPage />} />
              <Route path="portfolio" element={<AdminPortfolioPage />} />
              <Route path="hours" element={<AdminHoursPage />} />
              <Route path="suggestions" element={<AdminSuggestionsPage />} />
              <Route path="media" element={<AdminMediaPage />} />
              <Route path="media/new" element={<AdminMediaFormPage />} />
              <Route path="media/edit/:id" element={<AdminMediaFormPage />} />
              <Route path="donations" element={<AdminDonationsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
