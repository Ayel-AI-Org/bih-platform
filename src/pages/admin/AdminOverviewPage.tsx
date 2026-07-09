import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, FolderOpen, Heart, Check, ShieldAlert, Loader2 } from "lucide-react";

interface PendingUserItem {
  id: string; // user_id
  fullName: string;
  role: "volunteer" | "ngo" | "donor";
  email: string;
  createdAt: string;
}

const AdminOverviewPage = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalProjects: 0,
    totalDonations: 0,
  });
  const [pendingList, setPendingList] = useState<PendingUserItem[]>([]);
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

      setStats({
        totalUsers: usersCount || 0,
        pendingApprovals: pendingCount,
        totalProjects: projectsCount || 0,
        totalDonations: donationsSum,
      });

      // 5. Fetch details of pending users for the quick list (top 5)
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

      // Map and combine
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

      // Sort by created_at descending
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Limit to 5
      setPendingList(combined.slice(0, 5));
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

      // Refresh data
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
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ecosystem health, registrations, and transaction metrics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registered Users
            </span>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#1E3A5F]">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Approvals
            </span>
            <Clock className="h-4 w-4 text-[#D4A017]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#D4A017]">{stats.pendingApprovals}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Projects
            </span>
            <FolderOpen className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#1E3A5F]">{stats.totalProjects}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fundraising Total
            </span>
            <Heart className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-600">
              GHS {stats.totalDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals quick list */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-serif text-[#1E3A5F]">Recent Pending Approvals</CardTitle>
          <CardDescription>
            Most recent applicant submissions awaiting profile activation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              All registration applications are fully processed. No pending reviews.
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Requested Role</TableHead>
                    <TableHead>Date Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingList.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 text-xs">
                      <TableCell className="font-semibold text-slate-800">
                        <div>{item.fullName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.email}</div>
                      </TableCell>
                      <TableCell className="capitalize">
                        <Badge variant="outline" className="text-[10px]">
                          {item.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleApproveInline(item.id, item.role)}
                          disabled={approvingId === item.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-[11px]"
                        >
                          {approvingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverviewPage;
