import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { initializePlatformData } from "@/lib/platform-data";
import Index from "./pages/Index";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import RegisterPage from "./pages/RegisterPage";
import VolunteerSignupPage from "./pages/VolunteerSignupPage";
import NgoSignupPage from "./pages/NgoSignupPage";
import DonorSignupPage from "./pages/DonorSignupPage";
import LoginPage from "./pages/LoginPage";
import SuggestProjectPage from "./pages/SuggestProjectPage";
import DonatePage from "./pages/DonatePage";
import MediaPage from "./pages/MediaPage";
import PendingPage from "./pages/PendingPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VolunteerDashboardPlaceholder from "./pages/dashboard/VolunteerDashboardPlaceholder";
import NgoDashboardPlaceholder from "./pages/dashboard/NgoDashboardPlaceholder";
import DonorDashboardPlaceholder from "./pages/dashboard/DonorDashboardPlaceholder";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminProjectsPage from "./pages/admin/AdminProjectsPage";
import AdminDonationsPage from "./pages/admin/AdminDonationsPage";
import NotFound from "./pages/NotFound";
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

              {/* Protected Member Dashboards */}
              <Route path="/dashboard/volunteer" element={
                <ProtectedRoute allowedRoles={["volunteer"]}>
                  <VolunteerDashboardPlaceholder />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/ngo" element={
                <ProtectedRoute allowedRoles={["ngo"]}>
                  <NgoDashboardPlaceholder />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/donor" element={
                <ProtectedRoute allowedRoles={["donor"]}>
                  <DonorDashboardPlaceholder />
                </ProtectedRoute>
              } />

              <Route path="/suggest-project" element={<SuggestProjectPage />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/media" element={<MediaPage />} />
            </Route>

            {/* Protected Administrator Dashboard (Outside public SiteLayout) */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminOverviewPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="projects" element={<AdminProjectsPage />} />
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

