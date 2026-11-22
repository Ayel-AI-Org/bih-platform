import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  FolderOpen,
  Heart,
  Check,
  Loader2,
  FolderHeart,
  MessageSquare,
  Eye,
  CheckCircle2,
  Mail,
  ChevronRight,
  Activity,
  ArrowUpRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface PendingUserItem {
  id: string; // user_id
  fullName: string;
  role: "volunteer" | "ngo" | "donor";
  email: string;
  createdAt: string;
}

interface RecentActivityItem {
  id: string;
  type: "registration" | "donation" | "suggestion" | "project";
  title: string;
  subtitle: string;
  timestamp: string;
  path: string;
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "Recently";
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const AdminOverviewPage = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalProjects: 0,
    ongoingProjects: 0,
    proposedProjects: 0,
    completedProjects: 0,
    totalDonations: 0,
    pendingPortfolios: 0,
    pendingSuggestions: 0,
  });
  const [pendingList, setPendingList] = useState<PendingUserItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sendingSummaries, setSendingSummaries] = useState(false);

  const fetchOverviewData = async () => {
    try {
      // 1. Fetch total users count
      const { count: usersCount, error: usersErr } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (usersErr) throw usersErr;

      // 2. Fetch counts of pending approvals across all 3 tables
      const [volPending, ngoPending, donorPending] = await Promise.all([
        supabase.from("volunteer_profiles").select("user_id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("ngo_profiles").select("user_id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("donor_profiles").select("user_id", { count: "exact", head: true }).eq("approval_status", "pending"),
      ]);

      const pendingCount =
        (volPending.count || 0) + (ngoPending.count || 0) + (donorPending.count || 0);

      // 3. Fetch projects with status breakdown
      const { data: projectsData, error: projErr } = await supabase
        .from("projects")
        .select("id, status, title, created_at");

      if (projErr) throw projErr;

      const totalProjectsCount = (projectsData || []).length;
      const ongoingCount = (projectsData || []).filter((p) => p.status === "ongoing").length;
      const proposedCount = (projectsData || []).filter((p) => p.status === "proposed").length;
      const completedCount = (projectsData || []).filter((p) => p.status === "completed").length;

      // 4. Fetch successful donations
      const { data: donationsData, error: donErr } = await supabase
        .from("donations")
        .select("id, full_name, amount, created_at")
        .eq("status", "success")
        .order("created_at", { ascending: false });

      if (donErr) throw donErr;

      const donationsSum = (donationsData || []).reduce((acc, row) => acc + Number(row.amount), 0);

      // 5. Fetch pending portfolio entries count
      const { count: portfolioCount, error: portCountErr } = await supabase
        .from("portfolio_entries")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (portCountErr) throw portCountErr;

      // 6. Fetch pending suggestions count
      const { count: suggestionCount, error: sugCountErr } = await supabase
        .from("project_suggestions")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "reviewing"]);

      if (sugCountErr) throw sugCountErr;

      setStats({
        totalUsers: usersCount || 0,
        pendingApprovals: pendingCount,
        totalProjects: totalProjectsCount,
        ongoingProjects: ongoingCount,
        proposedProjects: proposedCount,
        completedProjects: completedCount,
        totalDonations: donationsSum,
        pendingPortfolios: portfolioCount || 0,
        pendingSuggestions: suggestionCount || 0,
      });

      // 7. Fetch details of pending users for quick approval list
      const [volsRes, ngosRes, donorsRes] = await Promise.all([
        supabase
          .from("volunteer_profiles")
          .select("user_id, created_at, profiles(full_name, email)")
          .eq("approval_status", "pending")
          .limit(5),
        supabase
          .from("ngo_profiles")
          .select("user_id, created_at, profiles(full_name, email)")
          .eq("approval_status", "pending")
          .limit(5),
        supabase
          .from("donor_profiles")
          .select("user_id, created_at, profiles(full_name, email)")
          .eq("approval_status", "pending")
          .limit(5),
      ]);

      const combined: PendingUserItem[] = [
        ...(volsRes.data || []).map((v: any) => ({
          id: v.user_id,
          fullName: v.profiles?.full_name || "Volunteer",
          role: "volunteer" as const,
          email: v.profiles?.email || "",
          createdAt: v.created_at,
        })),
        ...(ngosRes.data || []).map((n: any) => ({
          id: n.user_id,
          fullName: n.profiles?.full_name || "NGO Partner",
          role: "ngo" as const,
          email: n.profiles?.email || "",
          createdAt: n.created_at,
        })),
        ...(donorsRes.data || []).map((d: any) => ({
          id: d.user_id,
          fullName: d.profiles?.full_name || "Donor Member",
          role: "donor" as const,
          email: d.profiles?.email || "",
          createdAt: d.created_at,
        })),
      ];

      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPendingList(combined.slice(0, 5));

      // 8. Fetch real recent activities across modules
      const [recentProfiles, recentSuggestions] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, role, created_at")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("project_suggestions")
          .select("id, title, submitted_by, created_at")
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      const activityFeed: RecentActivityItem[] = [
        ...(recentProfiles.data || []).map((p) => ({
          id: `profile-${p.id}`,
          type: "registration" as const,
          title: p.full_name || "New account registered",
          subtitle: `Joined community as ${p.role || "member"}`,
          timestamp: p.created_at,
          path: "/admin/users",
        })),
        ...(donationsData || []).slice(0, 4).map((d) => ({
          id: `donation-${d.id}`,
          type: "donation" as const,
          title: `GHS ${Number(d.amount).toFixed(0)} contribution`,
          subtitle: `From ${d.full_name || "Anonymous donor"}`,
          timestamp: d.created_at,
          path: "/admin/donations",
        })),
        ...(recentSuggestions.data || []).map((s) => ({
          id: `sug-${s.id}`,
          type: "suggestion" as const,
          title: s.title ? `Suggested: ${s.title}` : "New project suggestion",
          subtitle: `Submitted by ${s.submitted_by || "community member"}`,
          timestamp: s.created_at,
          path: "/admin/suggestions",
        })),
        ...(projectsData || []).slice(0, 4).map((pr) => ({
          id: `proj-${pr.id}`,
          type: "project" as const,
          title: pr.title || "Project dossier updated",
          subtitle: `Status: ${pr.status}`,
          timestamp: pr.created_at,
          path: "/admin/projects",
        })),
      ];

      activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activityFeed.slice(0, 5));
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
      const { data, error } = await supabase
        .from(tableName)
        .update({ approval_status: "approved" })
        .eq("user_id", userId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: check your admin role");
      }

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

  const handleSendQuarterlySummaries = async () => {
    setSendingSummaries(true);
    toast({
      title: "Generating Summaries",
      description: "Compiling impact metrics and sending emails to donors...",
    });
    try {
      const { data, error } = await supabase.functions.invoke("donor-impact-summary");
      if (error) throw error;

      toast({
        title: "Impact Summaries Dispatched",
        description: `Successfully sent quarterly impact summaries to ${data?.count || 0} donors.`,
      });
    } catch (err: any) {
      toast({
        title: "Dispatch failed",
        description: err.message || "Failed to send quarterly summaries.",
        variant: "destructive",
      });
    } finally {
      setSendingSummaries(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const totalPending = stats.pendingApprovals + stats.pendingPortfolios + stats.pendingSuggestions;

  const primaryMetrics = [
    {
      title: "Registered Users",
      value: stats.totalUsers,
      subtitle: "Total community accounts",
      icon: Users,
      color: "text-[#1E3A5F]",
      path: "/admin/users",
    },
    {
      title: "Active Projects",
      value: stats.ongoingProjects,
      subtitle: `${stats.totalProjects} total in portfolio`,
      icon: FolderOpen,
      color: "text-emerald-600",
      path: "/admin/projects",
    },
    {
      title: "Fundraising Total",
      value: `GHS ${stats.totalDonations.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtitle: "Verified direct contributions",
      icon: Heart,
      color: "text-rose-500",
      path: "/admin/donations",
    },
    {
      title: "Pending Actions",
      value: totalPending,
      subtitle: `${stats.pendingApprovals} reviews • ${stats.pendingPortfolios} portfolios • ${stats.pendingSuggestions} suggestions`,
      icon: Clock,
      color: "text-[#D4A017]",
      path: "/admin/users",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 2.1 Page Heading & Secondary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#1E3A5F] font-bold">Administration Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor ecosystem activity, outstanding reviews, and platform health.
          </p>
        </div>
        <Button
          id="admin-send-summaries-btn"
          variant="outline"
          onClick={handleSendQuarterlySummaries}
          disabled={sendingSummaries}
          className="border-slate-300 text-slate-700 hover:text-[#1E3A5F] hover:bg-slate-100 hover:border-slate-400 font-medium text-xs h-9 shadow-2xs gap-2 self-start sm:self-auto shrink-0 transition-colors"
          title="Compile and dispatch impact summaries to registered donors"
        >
          {sendingSummaries ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Sending Summaries...</span>
            </>
          ) : (
            <>
              <Mail className="h-3.5 w-3.5 text-[#D4A017]" />
              <span>Send Impact Summaries</span>
            </>
          )}
        </Button>
      </div>

      {/* 2.2 Reorganized Primary Metrics */}
      <div id="admin-stats-cards" className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        {primaryMetrics.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.path}
              className="block transition-all hover:scale-[1.01] active:scale-[0.99] h-full"
              title={`View ${card.title}`}
            >
              <Card className="shadow-xs border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all h-full cursor-pointer p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    {card.title}
                  </span>
                  <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#1E3A5F] tracking-tight">
                    {card.value}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5" title={card.subtitle}>
                    {card.subtitle}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
        {/* Left Column (Queues & Snapshot) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 2.3 Review Queue Section */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-serif text-[#1E3A5F] font-bold">Review Queue</CardTitle>
                <CardDescription className="text-xs">
                  Administrative queues requiring attention or action
                </CardDescription>
              </div>
              {totalPending > 0 ? (
                <Badge className="bg-[#D4A017] text-white text-[10px] font-bold tracking-wider px-2 py-0.5">
                  {totalPending} PENDING
                </Badge>
              ) : (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5">
                  CLEAR
                </Badge>
              )}
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {/* Queue Items Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Registration Queue */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">Registrations</span>
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.2 rounded ${
                          stats.pendingApprovals > 0
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        {stats.pendingApprovals}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">
                      Applicants awaiting review
                    </p>
                  </div>
                  <Button asChild size="sm" className="h-7 text-xs text-[#1E3A5F] bg-white border-slate-200/90 hover:bg-slate-100 hover:text-[#1E3A5F] hover:border-slate-300 px-2 justify-start font-semibold transition-colors">
                    <Link to="/admin/users">
                      Open Queue <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Link>
                  </Button>
                </div>

                {/* 2. Portfolio Queue */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">Portfolios</span>
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.2 rounded ${
                          stats.pendingPortfolios > 0
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        {stats.pendingPortfolios}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">
                      Showcases pending check
                    </p>
                  </div>
                  <Button asChild size="sm" className="h-7 text-xs text-[#1E3A5F] bg-white border-slate-200/90 hover:bg-slate-100 hover:text-[#1E3A5F] hover:border-slate-300 px-2 justify-start font-semibold transition-colors">
                    <Link to="/admin/portfolio">
                      Open Queue <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Link>
                  </Button>
                </div>

                {/* 3. Suggestions Queue */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">Suggestions</span>
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.2 rounded ${
                          stats.pendingSuggestions > 0
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        {stats.pendingSuggestions}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">
                      Project concepts submitted
                    </p>
                  </div>
                  <Button asChild size="sm" className="h-7 text-xs text-[#1E3A5F] bg-white border-slate-200/90 hover:bg-slate-100 hover:text-[#1E3A5F] hover:border-slate-300 px-2 justify-start font-semibold transition-colors">
                    <Link to="/admin/suggestions">
                      Open Queue <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* All Queues Clear State */}
              {totalPending === 0 ? (
                <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-3.5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-950">All queues clear</p>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Zero items currently awaiting administrative review across registrations, portfolios, or suggestions.
                    </p>
                  </div>
                </div>
              ) : (
                /* Compact Pending Applicants List if pending exist */
                pendingList.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-800">
                        Pending Registration Approvals ({pendingList.length})
                      </span>
                      <Link to="/admin/users" className="text-xs font-semibold text-[#1E3A5F] hover:underline flex items-center gap-0.5">
                        View Directory <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden bg-white">
                      {pendingList.map((item) => (
                        <div key={item.id} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50/50">
                          <div className="min-w-0 truncate">
                            <p className="font-semibold text-slate-900 truncate">{item.fullName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-600 font-mono truncate">{item.email}</span>
                              <Badge variant="outline" className="text-[10px] font-semibold capitalize px-1.5 py-0.2 h-auto text-slate-700">
                                {item.role}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleApproveInline(item.id, item.role)}
                            disabled={approvingId === item.id}
                            className="bg-[#6B8E3E] hover:bg-[#567431] active:bg-[#455d27] text-white gap-1 h-7 text-xs px-2.5 shrink-0 font-medium transition-colors"
                          >
                            {approvingId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Approve
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* 2.5 Project Snapshot */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-serif text-[#1E3A5F] font-bold">Project Snapshot</CardTitle>
                <CardDescription className="text-xs">
                  Status distribution across registered initiatives ({stats.totalProjects} total)
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs text-[#1E3A5F] bg-white border-slate-200/80 hover:bg-slate-100 hover:text-[#1E3A5F] hover:border-slate-300 px-2.5 gap-1 font-medium transition-colors">
                <Link to="/admin/projects">
                  Manage Projects <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* Distribution Bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-slate-100 flex overflow-hidden">
                  {stats.totalProjects > 0 ? (
                    <>
                      <div
                        style={{ width: `${(stats.ongoingProjects / stats.totalProjects) * 100}%` }}
                        className="bg-[#1E3A5F] transition-all"
                        title={`Ongoing: ${stats.ongoingProjects}`}
                      />
                      <div
                        style={{ width: `${(stats.proposedProjects / stats.totalProjects) * 100}%` }}
                        className="bg-[#C8601A] transition-all"
                        title={`Proposed: ${stats.proposedProjects}`}
                      />
                      <div
                        style={{ width: `${(stats.completedProjects / stats.totalProjects) * 100}%` }}
                        className="bg-[#6B8E3E] transition-all"
                        title={`Completed: ${stats.completedProjects}`}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-slate-200" />
                  )}
                </div>
              </div>

              {/* 3 Status Columns */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
                <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center justify-center gap-1.5 text-xs uppercase font-semibold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-[#1E3A5F]" />
                    Ongoing
                  </div>
                  <p className="text-lg font-bold text-[#1E3A5F] mt-0.5">{stats.ongoingProjects}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center justify-center gap-1.5 text-xs uppercase font-semibold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-[#C8601A]" />
                    Proposed
                  </div>
                  <p className="text-lg font-bold text-[#C8601A] mt-0.5">{stats.proposedProjects}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center justify-center gap-1.5 text-xs uppercase font-semibold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-[#6B8E3E]" />
                    Completed
                  </div>
                  <p className="text-lg font-bold text-[#6B8E3E] mt-0.5">{stats.completedProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (2.4 Recent Activity Stream) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#D4A017]" />
                <div>
                  <CardTitle className="text-base font-serif text-[#1E3A5F] font-bold">Recent Activity</CardTitle>
                  <CardDescription className="text-xs">Live platform milestones and member events</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No recent platform activities recorded.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivities.map((act) => (
                    <Link
                      key={act.id}
                      to={act.path}
                      className="flex items-start justify-between py-2.5 group hover:bg-slate-50/70 -mx-3 px-3 rounded-md transition-colors"
                      title={`Open related ${act.type} page`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-[#1E3A5F]/40 transition-colors">
                          {act.type === "registration" && <Users className="h-3.5 w-3.5 text-[#1E3A5F]" />}
                          {act.type === "donation" && <Heart className="h-3.5 w-3.5 text-rose-500" />}
                          {act.type === "suggestion" && <MessageSquare className="h-3.5 w-3.5 text-[#C8601A]" />}
                          {act.type === "project" && <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-[#1E3A5F] transition-colors">
                            {act.title}
                          </p>
                          <p className="text-xs text-slate-600 truncate mt-0.5">{act.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-xs text-slate-500 font-medium font-sans">{formatRelativeTime(act.timestamp)}</span>
                        <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
