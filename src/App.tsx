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
import AdminDashboardPage from "./pages/AdminDashboardPage";
import NotFound from "./pages/NotFound";

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
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/volunteer" element={<VolunteerSignupPage />} />
              <Route path="/register/ngo" element={<NgoSignupPage />} />
              <Route path="/register/donor" element={<DonorSignupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/suggest-project" element={<SuggestProjectPage />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/media" element={<MediaPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

