import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import SiteLayout from "@/components/layout/SiteLayout";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { initializePlatformData } from "@/database/operations";
import { ProtectedRoute, PublicRoute, PendingRoute } from "@/components/layout/AuthGuards";

// Keep static imports for critical immediate paths
import Index from "./pages/public/Index";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// Lazy-loaded pages
const ProjectsPage = lazy(() => import("./pages/public/ProjectsPage"));
const ProjectDetailsPage = lazy(() => import("./pages/public/ProjectDetailsPage"));
const VolunteerSignupPage = lazy(() => import("./pages/auth/VolunteerSignupPage"));
const NgoSignupPage = lazy(() => import("./pages/auth/NgoSignupPage"));
const DonorSignupPage = lazy(() => import("./pages/auth/DonorSignupPage"));
const SuggestProjectPage = lazy(() => import("./pages/public/SuggestProjectPage"));
const DonatePage = lazy(() => import("./pages/public/DonatePage"));
const MediaPage = lazy(() => import("./pages/public/MediaPage"));
const PendingPage = lazy(() => import("./pages/auth/PendingPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/public/PrivacyPage"));
const AuthCallbackPage = lazy(() => import("./pages/auth/AuthCallbackPage"));
const CompleteProfileVolunteerPage = lazy(() => import("./pages/auth/CompleteProfileVolunteerPage"));

// Volunteer Dashboard
const VolunteerOverviewPage = lazy(() => import("./pages/dashboard/volunteer/VolunteerOverviewPage"));
const VolunteerProfilePage = lazy(() => import("./pages/dashboard/volunteer/VolunteerProfilePage"));
const VolunteerPortfolioPage = lazy(() => import("./pages/dashboard/volunteer/VolunteerPortfolioPage"));
const VolunteerLogHoursPage = lazy(() => import("./pages/dashboard/volunteer/VolunteerLogHoursPage"));
const VolunteerHoursHistoryPage = lazy(() => import("./pages/dashboard/volunteer/VolunteerHoursHistoryPage"));
const VolunteerBadgesPage = lazy(() => import("./pages/dashboard/volunteer/VolunteerBadgesPage"));

// NGO Dashboard
const NgoOverviewPage = lazy(() => import("./pages/dashboard/ngo/NgoOverviewPage"));
const NgoProfilePage = lazy(() => import("./pages/dashboard/ngo/NgoProfilePage"));
const NgoProjectsPage = lazy(() => import("./pages/dashboard/ngo/NgoProjectsPage"));
const NgoVerifyHoursPage = lazy(() => import("./pages/dashboard/ngo/NgoVerifyHoursPage"));

// Donor Dashboard
const DonorOverviewPage = lazy(() => import("./pages/dashboard/donor/DonorOverviewPage"));
const DonorProfilePage = lazy(() => import("./pages/dashboard/donor/DonorProfilePage"));
const DonorHistoryPage = lazy(() => import("./pages/dashboard/donor/DonorHistoryPage"));
const DonorImpactPage = lazy(() => import("./pages/dashboard/donor/DonorImpactPage"));

// Admin Dashboard
const AdminOverviewPage = lazy(() => import("./pages/admin/AdminOverviewPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminProjectsPage = lazy(() => import("./pages/admin/AdminProjectsPage"));
const AdminPortfolioPage = lazy(() => import("./pages/admin/AdminPortfolioPage"));
const AdminHoursPage = lazy(() => import("./pages/admin/AdminHoursPage"));
const AdminSuggestionsPage = lazy(() => import("./pages/admin/AdminSuggestionsPage"));
const AdminMediaPage = lazy(() => import("./pages/admin/AdminMediaPage"));
const AdminMediaFormPage = lazy(() => import("./pages/admin/AdminMediaFormPage"));
const AdminDonationsPage = lazy(() => import("./pages/admin/AdminDonationsPage"));

const NotFound = lazy(() => import("./pages/public/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex h-[60vh] w-full items-center justify-center bg-slate-50/50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[#D4A017]" />
      <p className="text-muted-foreground text-xs font-medium animate-pulse">Loading view...</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    initializePlatformData().catch((error) => {
      console.error("Platform initialization failed:", error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
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

                  {/* Auth OAuth Callback and Profile Completion */}
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/complete-profile/volunteer" element={<CompleteProfileVolunteerPage />} />

                  <Route path="/suggest-project" element={<SuggestProjectPage />} />
                  <Route path="/donate" element={<DonatePage />} />
                  <Route path="/media" element={<MediaPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
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
                    <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
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
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
