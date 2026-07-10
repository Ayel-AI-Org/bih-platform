import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OnboardingTutorial } from "@/components/layout/OnboardingTutorial";
import {
  LayoutDashboard,
  User,
  FolderHeart,
  CalendarCheck,
  History,
  Award,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Heart,
} from "lucide-react";

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

const volunteerSidebarItems: SidebarItem[] = [
  { name: "My Dashboard", path: "/dashboard/volunteer", icon: LayoutDashboard },
  { name: "My Profile", path: "/dashboard/volunteer/profile", icon: User },
  { name: "Portfolio", path: "/dashboard/volunteer/portfolio", icon: FolderHeart },
  { name: "Log Hours", path: "/dashboard/volunteer/log-hours", icon: CalendarCheck },
  { name: "Hours History", path: "/dashboard/volunteer/hours-history", icon: History },
  { name: "My Badges", path: "/dashboard/volunteer/badges", icon: Award },
];

const ngoSidebarItems: SidebarItem[] = [
  { name: "Overview", path: "/dashboard/ngo", icon: LayoutDashboard },
  { name: "Our Profile", path: "/dashboard/ngo/profile", icon: User },
  { name: "Our Projects", path: "/dashboard/ngo/projects", icon: FolderHeart },
  { name: "Verify Hours", path: "/dashboard/ngo/verify-hours", icon: CalendarCheck },
];

const donorSidebarItems: SidebarItem[] = [
  { name: "Overview", path: "/dashboard/donor", icon: LayoutDashboard },
  { name: "My Profile", path: "/dashboard/donor/profile", icon: User },
  { name: "Donation History", path: "/dashboard/donor/history", icon: History },
  { name: "Impact", path: "/dashboard/donor/impact", icon: Heart },
];

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("bih-member-sidebar-collapsed") === "true";
  });

  const [role, setRole] = useState<"volunteer" | "ngo" | "donor" | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            setRole(profile.role as any);
            setFullName(profile.full_name);
          }
        }
      } catch (err) {
        console.error("Failed to retrieve user profile data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("bih-member-sidebar-collapsed", String(next));
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "Dashboard session terminated.",
      });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Error signing out",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => {
    if (path === "/dashboard/volunteer" || path === "/dashboard/ngo" || path === "/dashboard/donor") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getSidebarItems = (): SidebarItem[] => {
    if (role === "volunteer") return volunteerSidebarItems;
    if (role === "ngo") return ngoSidebarItems;
    if (role === "donor") return donorSidebarItems;
    return [];
  };

  const sidebarItems = getSidebarItems();

  const SidebarContent = ({ isMobile = false }) => {
    const isCollapsed = !isMobile && collapsed;
    return (
      <div className="flex flex-col h-full bg-white text-[#1E3A5F]">
        {/* Header */}
        <div className={`p-6 border-b border-slate-100 flex items-center justify-center ${isCollapsed ? "px-2" : "px-6"}`}>
          <Link to="/" title="Go to homepage" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
            <img
              src="/BIH_logo.jpeg"
              alt="BIH Logo"
              className="h-9 w-9 rounded-full border border-slate-205 object-cover bg-white flex-shrink-0"
            />
            {!isCollapsed && (
              <div>
                <h2 className="font-serif font-bold text-sm tracking-wide text-[#1E3A5F]">BIH Portal</h2>
                <p className="text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">{role}</p>
              </div>
            )}
          </Link>
        </div>

        {/* Nav list items */}
        <nav className={`flex-1 py-6 space-y-1.5 ${isCollapsed ? "px-0" : "px-4"}`}>
          <TooltipProvider>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const linkContent = (
                <Link
                  to={item.path}
                  onClick={() => isMobile && setMobileOpen(false)}
                  className={`flex items-center transition-all border-l-[3px] ${
                    isCollapsed
                      ? "w-full justify-center py-3 px-0 rounded-none"
                      : "gap-3 pl-4 pr-3 py-3 text-sm font-medium rounded-r-lg"
                  } ${
                    active
                      ? "bg-slate-50 text-[#1E3A5F] border-l-[#D4A017] font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#1E3A5F] border-l-transparent"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${active ? "text-[#D4A017]" : "text-slate-450"}`} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name} delayDuration={50}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-[#1E3A5F] text-white font-sans text-xs">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.name}>{linkContent}</div>;
            })}
          </TooltipProvider>
        </nav>

        {/* Collapse Button (Desktop Only, placed above profile footer) */}
        {!isMobile && (
          <div className="hidden md:flex justify-center pb-4 pt-2">
            <button
              onClick={handleToggleCollapse}
              className="h-7 w-7 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 transition-colors focus:outline-none"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Footer profile details */}
        <div className={`p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 ${isCollapsed ? "p-2" : "p-4"}`}>
          <div className={`flex items-center gap-2.5 ${isCollapsed ? "justify-center" : "px-2"}`}>
            <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs uppercase text-slate-700 flex-shrink-0">
              {fullName ? fullName.charAt(0) : "U"}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate text-[#1E3A5F]">{fullName || "User Account"}</p>
                <p className="text-[10px] text-slate-400 truncate capitalize">{role || "Member"}</p>
              </div>
            )}
          </div>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className={`w-full text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 flex gap-2 h-9 ${
              isCollapsed ? "justify-center px-0" : "justify-start px-3"
            }`}
          >
            <LogOut className="h-4 w-4 flex-shrink-0 text-rose-455" />
            {!isCollapsed && <span className="text-rose-550 font-medium">Sign out</span>}
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1E3A5F] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Onboarding Tutorial */}
      {role && <OnboardingTutorial role={role} userName={fullName} />}
      
      {/* Mobile Top Header */}
      <header className="lg:hidden bg-white text-[#1E3A5F] px-4 py-3 flex items-center justify-between border-b border-slate-150">
        <div className="flex items-center gap-2">
          <HandHeart className="h-5 w-5 text-[#D4A017]" />
          <span className="font-serif font-bold text-sm tracking-wide text-[#1E3A5F]">BIH Portal</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setMobileOpen(true)}
          className="text-[#1E3A5F] hover:bg-slate-100"
          aria-label="Open portal sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Sidebar Desktop */}
      <aside
        className={`hidden lg:block border-r border-slate-200/50 bg-white flex-shrink-0 transition-all duration-200 ease-in-out ${
          collapsed ? "w-16" : "w-[220px]"
        }`}
      >
        <div className="h-full sticky top-0">
          <SidebarContent isMobile={false} />
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer content */}
        <div
          className={`absolute top-0 left-0 bottom-0 w-64 max-w-[80vw] bg-white flex flex-col transform transition-transform duration-250 ease-in-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent isMobile={true} />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 bg-white p-6 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
