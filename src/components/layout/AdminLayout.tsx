import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, FolderOpen, Heart, LogOut, Menu, X, ShieldAlert } from "lucide-react";

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

const sidebarItems: SidebarItem[] = [
  { name: "Overview", path: "/admin", icon: LayoutDashboard },
  { name: "User Management", path: "/admin/users", icon: Users },
  { name: "Projects", path: "/admin/projects", icon: FolderOpen },
  { name: "Donations", path: "/admin/donations", icon: Heart },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#1E3A5F] text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-[#D4A017] flex items-center justify-center text-white">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-serif font-bold text-sm tracking-wide">BIH Ecosystem</h2>
          <p className="text-[10px] text-slate-300 font-sans">Admin Console</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-800 text-[#D4A017] border-l-4 border-[#D4A017]"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-[#D4A017]" : "text-slate-400"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Sign out */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50 space-y-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs uppercase text-slate-200">
            {adminName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{adminName}</p>
            <p className="text-[10px] text-slate-400 truncate">Super Admin</p>
          </div>
        </div>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex gap-2 h-9 px-3"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-[#1E3A5F] text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[#D4A017]" />
          <span className="font-serif font-bold text-sm tracking-wide">BIH Admin</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white hover:bg-slate-800"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Sidebar Desktop */}
      <aside className="hidden md:block w-64 flex-shrink-0 border-r border-slate-200">
        <div className="h-full sticky top-0">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-xs flex-col bg-[#1E3A5F]">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 bg-white p-6 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
