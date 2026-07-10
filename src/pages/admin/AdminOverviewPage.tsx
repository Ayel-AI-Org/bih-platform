import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, FolderOpen, Heart, Check, ShieldAlert, Loader2, FolderHeart, MessageSquare, Eye } from "lucide-react";

interface PendingUserItem {
  id: string; // user_id
  fullName: string;
  role: "volunteer" | "ngo" | "donor";
  email: string;
  createdAt: string;
}

interface PendingPortfolioItem {
  id: string;
  title: string;
  submitterName: string;
}

const AdminOverviewPage = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalProjects: 0,
    totalDonations: 0,
    pendingPortfolios: 0,
    pendingSuggestions: 0,
  });
  const [pendingList, setPendingList] = useState<PendingUserItem[]>([]);
  const [recentPortfolios, setRecentPortfolios] = useState<PendingPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchOverviewData = async () => {
    try {
      // 1. Fetch total users count
      const { count: usersCount, error: usersErr } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (usersErr) throw usersErr;

      // 2. Fetch counts of pending approvals across all 3 tables
      const [volPending, ngoPending, donorPending] = await Promise.all([
        supabase.from("volunteer_profiles").select("user_id", { count: "exact" }).eq("approval_status", "pending"),
        supabase.from("ngo_profiles").select("user_id", { count: "exact" }).eq("approval_status", "pending"),
        supabase.from("donor_profiles").select("user_id", { count: "exact" }).eq("approval_status", "pending"),
      ]);

      const pendingCount =
        (volPending.count || 0) + (ngoPending.count || 0) + (donorPending.count || 0);

      // 3. Fetch projects count
      const { count: projectsCount, error: projErr } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });

      if (projErr) throw projErr;

      // 4. Fetch sum of successful donations
      const { data: donationsData, error: donErr } = await supabase
        .from("donations")
        .select("amount")
        .eq("status", "success");

      if (donErr) throw donErr;

      const donationsSum = (donationsData || []).reduce((acc, row) => acc + Number(row.amount), 0);

      // 5. Fetch pending portfolio entries count
      const { count: portfolioCount, error: portCountErr } = await supabase
        .from("portfolio_entries")
        .select("id", { count: "exact" })
        .eq("status", "pending");

      if (portCountErr) throw portCountErr;

      // 6. Fetch pending suggestions count
      const { count: suggestionCount, error: sugCountErr } = await supabase
        .from("project_suggestions")
        .select("id", { count: "exact" })
        .in("status", ["pending", "reviewing"]);

      if (sugCountErr) throw sugCountErr;

      setStats({
        totalUsers: usersCount || 0,
        pendingApprovals: pendingCount,
        totalProjects: projectsCount || 0,
        totalDonations: donationsSum,
        pendingPortfolios: portfolioCount || 0,
        pendingSuggestions: suggestionCount || 0,
      });

      // 7. Fetch details of pending users for the quick list (top 5)
      // Volunteers pending
      const { data: vols, error: volsErr } = await supabase
        .from("volunteer_profiles")
        .select("user_id, created_at, profiles(full_name, email)")
        .eq("approval_status", "pending");

      if (volsErr) throw volsErr;

      // NGOs pending
      const { data: ngos, error: ngosErr } = await supabase
        .from("ngo_profiles")
        .select("user_id, created_at, profiles(full_name, email)")
        .eq("approval_status", "pending");

      if (ngosErr) throw ngosErr;

      // Donors pending
      const { data: donors, error: donorsErr } = await supabase
        .from("donor_profiles")
        .select("user_id, created_at, profiles(full_name, email)")
        .eq("approval_status", "pending");

      if (donorsErr) throw donorsErr;

      const combined: PendingUserItem[] = [
        ...(vols || []).map((v: any) => ({
          id: v.user_id,
          fullName: v.profiles?.full_name || "Volunteer",
          role: "volunteer" as const,
          email: v.profiles?.email || "",
          createdAt: v.created_at,
        })),
        ...(ngos || []).map((n: any) => ({
          id: n.user_id,
          fullName: n.profiles?.full_name || "NGO Partner",
          role: "ngo" as const,
          email: n.profiles?.email || "",
          createdAt: n.created_at,
        })),
        ...(donors || []).map((d: any) => ({
          id: d.user_id,
          fullName: d.profiles?.full_name || "Donor Member",
          role: "donor" as const,
          email: d.profiles?.email || "",
          createdAt: d.created_at,
        })),
      ];

      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPendingList(combined.slice(0, 5));

      // 8. Fetch last 3 pending portfolio entries
      const { data: pendingPorts, error: portsErr } = await supabase
        .from("portfolio_entries")
        .select("id, title, profiles!user_id(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      if (portsErr) throw portsErr;

      setRecentPortfolios(
        (pendingPorts || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          submitterName: p.profiles?.full_name || "Unknown Submitter",
        }))
      );
    } catch (err: any) {
      toast({
        title: "Failed to fetch stats",
        description: err.message || "An unexpected database error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const handleApproveInline = async (userId: string, role: "volunteer" | "ngo" | "donor") => {
    setApprovingId(userId);
    try {
      const roleTableMap = {
        volunteer: "volunteer_profiles",
        ngo: "ngo_profiles",
        donor: "donor_profiles",
      };

      const tableName = roleTableMap[role];
      const { error } = await supabase
        .from(tableName)
        .update({ approval_status: "approved" })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "User approved",
        description: "Status successfully updated to approved in the registry.",
      });

      await fetchOverviewData();
    } catch (err: any) {
      toast({
        title: "Approval failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Registered Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-indigo-500",
      path: "/admin/users",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Clock,
      color: "text-[#D4A017]",
      path: "/admin/users",
    },
    {
      title: "Active Projects",
      value: stats.totalProjects,
      icon: FolderOpen,
      color: "text-emerald-500",
      path: "/admin/projects",
    },
    {
      title: "Fundraising Total",
      value: `GHS ${stats.totalDonations.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: Heart,
      color: "text-rose-500",
      path: "/admin/donations",
    },
    {
      title: "Pending Portfolios",
      value: stats.pendingPortfolios,
      icon: FolderHeart,
      color: "text-[#1E3A5F]",
      path: "/admin/portfolio",
    },
    {
      title: "Pending Suggestions",
      value: stats.pendingSuggestions,
      icon: MessageSquare,
      color: "text-[#C8601A]",
      path: "/admin/suggestions",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Administration Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ecosystem health, registrations, and transaction metrics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.path}
              className="block transition-all hover:scale-[1.02] active:scale-[0.98] h-full"
              title={`Go to ${card.title} page`}
            >
              <Card className="shadow-sm border-slate-200 hover:border-slate-350 hover:shadow-md transition-all h-full cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {card.title}
                  </span>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono text-[#1E3A5F]">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Two Columns List Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending approvals quick list */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-[#1E3A5F]">Recent Pending Approvals</CardTitle>
            <CardDescription>
              Most recent applicant submissions awaiting profile activation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {pendingList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">
                All registration applications are fully processed. No pending reviews.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingList.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 text-xs">
                      <TableCell className="font-semibold text-slate-800">
                        <div>{item.fullName}</div>
                        <div className="text-[9px] text-muted-foreground font-mono mt-0.5">{item.email}</div>
                      </TableCell>
                      <TableCell className="capitalize">
                        <Badge variant="outline" className="text-[9px]">
                          {item.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleApproveInline(item.id, item.role)}
                          disabled={approvingId === item.id}
                          className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white gap-1 h-7 text-[10px] px-2.5"
                        >
                          {approvingId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent portfolio submissions */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-[#1E3A5F]">Recent Portfolio Submissions</CardTitle>
            <CardDescription>
              Volunteer and NGO showcases awaiting moderator review checks.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentPortfolios.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">
                No portfolio entries awaiting review.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Submitter Name</TableHead>
                    <TableHead>Entry Title</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPortfolios.map((port) => (
                    <TableRow key={port.id} className="hover:bg-slate-50/50 text-xs">
                      <TableCell className="font-semibold text-slate-800">{port.submitterName}</TableCell>
                      <TableCell className="text-slate-655 font-medium truncate max-w-[150px]" title={port.title}>
                        {port.title}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline" className="h-7 text-[10px] px-2.5 border-[#1E3A5F] text-[#1E3A5F] hover:bg-slate-50">
                          <Link to="/admin/portfolio" className="flex gap-1 items-center">
                            <Eye className="h-3.5 w-3.5" /> Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
