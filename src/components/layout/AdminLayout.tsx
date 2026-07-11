import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OnboardingTutorial } from "@/components/layout/OnboardingTutorial";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Heart,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  FolderHeart,
  Clock,
  MessageSquare,
  Newspaper,
  HelpCircle,
} from "lucide-react";

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

const sidebarItems: SidebarItem[] = [
  { name: "Overview", path: "/admin", icon: LayoutDashboard },
  { name: "User Management", path: "/admin/users", icon: Users },
  { name: "Projects", path: "/admin/projects", icon: FolderOpen },
  { name: "Portfolio Review", path: "/admin/portfolio", icon: FolderHeart },
  { name: "Hours Verification", path: "/admin/hours", icon: Clock },
  { name: "Project Suggestions", path: "/admin/suggestions", icon: MessageSquare },
  { name: "Media Manager", path: "/admin/media", icon: Newspaper },
  { name: "Donations", path: "/admin/donations", icon: Heart },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("bih-admin-sidebar-collapsed") === "true";
  });
  const [adminName, setAdminName] = useState("Administrator");

  useEffect(() => {
    const fetchAdminProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.full_name) {
          setAdminName(profile.full_name);
        }
      }
    };
    fetchAdminProfile();
  }, []);

  // Inactivity timeout handler (15 minutes = 900,000 milliseconds)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleAutoSignOut, 15 * 60 * 1000);
    };

    const handleAutoSignOut = async () => {
      try {
        await supabase.auth.signOut();
        toast({
          title: "Session Expired",
          description: "You have been signed out due to 15 minutes of inactivity.",
          variant: "destructive",
        });
        navigate("/login");
      } catch (err: any) {
        console.error("Auto signout error:", err);
      }
    };

    // Events to monitor for activity
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    // Initialize timer
    resetTimer();

    // Attach listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup listeners and timer
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("bih-admin-sidebar-collapsed", String(next));
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "Admin session terminated.",
      });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Error signing out",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  const SidebarContent = ({ isMobile = false }) => {
    const isCollapsed = !isMobile && collapsed;
    return (
      <div className="flex flex-col h-full bg-[#1E3A5F] text-white">
        {/* Header */}
        <div className={`p-6 border-b border-slate-700 flex items-center justify-center ${isCollapsed ? "px-2" : "px-6"}`}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-[#D4A017] flex items-center justify-center text-white flex-shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-serif font-bold text-sm tracking-wide">BIH Ecosystem</h2>
                <p className="text-[10px] text-slate-300 font-sans">Admin Console</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav List */}
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
                      ? "bg-[#243d5c] text-white border-l-[#D4A017]"
                      : "text-slate-300 hover:bg-[#243d5c]/50 hover:text-white border-l-transparent"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name} delayDuration={50}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-[#1E3A5F] text-white border-slate-700 font-sans text-xs">
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
              className="h-7 w-7 rounded-full bg-[#1E3A5F] border border-[#243d5c] text-white flex items-center justify-center hover:bg-[#243d5c] transition-colors focus:outline-none"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Footer Profile & Sign out */}
        <div className={`p-4 border-t border-slate-700 bg-slate-900/50 space-y-3 ${isCollapsed ? "p-2" : "p-4"}`}>
          <div className={`flex items-center gap-2.5 ${isCollapsed ? "justify-center" : "px-2"}`}>
            <div className="h-7 w-7 rounded-full bg-slate-750 flex items-center justify-center font-bold text-xs uppercase text-slate-200 flex-shrink-0">
              {adminName.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{adminName}</p>
                <p className="text-[10px] text-slate-400 truncate">Super Admin</p>
              </div>
            )}
          </div>
          <Button
            onClick={() => window.dispatchEvent(new CustomEvent("bih-restart-tour"))}
            variant="ghost"
            className={`w-full text-xs text-[#1E3A5F] hover:text-[#D4A017] hover:bg-slate-100/50 flex gap-2 h-9 ${
              isCollapsed ? "justify-center px-0" : "justify-start px-3"
            }`}
          >
            <HelpCircle className="h-4 w-4 flex-shrink-0 text-[#D4A017]" />
            {!isCollapsed && <span className="font-medium">Restart Tour</span>}
          </Button>

          <Button
            onClick={handleSignOut}
            variant="ghost"
            className={`w-full text-xs text-rose-450 hover:text-rose-300 hover:bg-rose-500/10 flex gap-2 h-9 ${
              isCollapsed ? "justify-center px-0" : "justify-start px-3"
            }`}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Sign out</span>}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col lg:flex-row">
      {/* Onboarding Tutorial */}
      <OnboardingTutorial role="admin" userName={adminName} />

      {/* Mobile Top Header */}
      <header className="lg:hidden bg-[#1E3A5F] text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[#D4A017]" />
          <span className="font-serif font-bold text-sm tracking-wide">BIH Admin</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setMobileOpen(true)}
          className="text-white hover:bg-slate-800"
          aria-label="Open administration navigation sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Sidebar Desktop */}
      <aside
        className={`hidden lg:block border-r border-slate-200/60 flex-shrink-0 transition-all duration-200 ease-in-out ${
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
          className={`absolute top-0 left-0 bottom-0 w-64 max-w-[80vw] bg-[#1E3A5F] flex flex-col transform transition-transform duration-250 ease-in-out ${
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

export default AdminLayout;
