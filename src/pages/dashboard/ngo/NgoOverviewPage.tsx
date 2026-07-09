import { useState, useEffect } from "react";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Clock, Users, CheckCircle, AlertCircle, Check, Loader2 } from "lucide-react";

interface RecentLogItem {
  id: string;
  hours: number;
  logDate: string;
  projectTitle: string;
  volunteerName: string;
}

const NgoOverviewPage = () => {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    activeProjects: 0,
    totalHours: 0,
    pendingCount: 0,
    volunteersEngaged: 0,
  });
  const [recentLogs, setRecentLogs] = useState<RecentLogItem[]>([]);

  const fetchNgoOverviewData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch NGO Profile Details
      const { data: ngoProfile } = await supabase
        .from("ngo_profiles")
        .select("organization_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ngoProfile) {
        setOrgName(ngoProfile.organization_name);
      }

      // 2. Fetch Projects created by this NGO
      const { data: projectsData, error: projErr } = await supabase
        .from("projects")
        .select("id, status")
        .eq("created_by", user.id);

      if (projErr) throw projErr;

      const activeProjectsCount = (projectsData || []).filter((p) => p.status === "ongoing").length;
      const projectIds = (projectsData || []).map((p) => p.id);

      if (projectIds.length === 0) {
        setStats({
          activeProjects: 0,
          totalHours: 0,
          pendingCount: 0,
          volunteersEngaged: 0,
        });
        setRecentLogs([]);
        return;
      }

      // 3. Fetch all logs matching NGO projects
      const { data: logsData, error: logsErr } = await supabase
        .from("commitment_logs")
        .select("hours, status, volunteer_id")
        .in("project_id", projectIds);

      if (logsErr) throw logsErr;

      const verifiedHoursSum = (logsData || [])
        .filter((l) => l.status === "verified")
        .reduce((sum, l) => sum + Number(l.hours), 0);

      const pendingVerificationCount = (logsData || []).filter((l) => l.status === "logged").length;

      const distinctVolunteers = new Set((logsData || []).map((l) => l.volunteer_id));

      setStats({
        activeProjects: activeProjectsCount,
        totalHours: verifiedHoursSum,
        pendingCount: pendingVerificationCount,
        volunteersEngaged: distinctVolunteers.size,
      });

      // 4. Fetch 5 most recent unverified logs
      const { data: pendingFeed, error: feedErr } = await supabase
        .from("commitment_logs")
        .select(`
          id,
          hours,
          log_date,
          projects (title),
          volunteer:profiles!volunteer_id (full_name)
        `)
        .in("project_id", projectIds)
        .eq("status", "logged")
        .order("created_at", { ascending: false })
        .limit(5);

      if (feedErr) throw feedErr;

      setRecentLogs(
        (pendingFeed || []).map((row: any) => ({
          id: row.id,
          hours: Number(row.hours),
          logDate: row.log_date,
          projectTitle: row.projects?.title || "NGO Campaign",
          volunteerName: row.volunteer?.full_name || "Unknown Volunteer",
        }))
      );
    } catch (err: any) {
      toast({
        title: "Overview data load failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgoOverviewData();
  }, []);

  const handleVerifyLog = async (logId: string) => {
    setVerifyingId(logId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active user credentials found.");

      const { error } = await supabase
        .from("commitment_logs")
        .update({
          status: "verified",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", logId);

      if (error) throw error;

      toast({
        title: "Hours verified successfully",
        description: "The volunteer hours ledger has been successfully updated.",
      });

      // Refresh overview stats and pending list
      fetchNgoOverviewData();
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-64 mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Campaigns",
      value: stats.activeProjects,
      icon: FolderOpen,
      color: "text-[#1E3A5F] bg-[#1E3A5F]/10",
      description: "Ongoing campaign focus points",
    },
    {
      title: "Hours Verified",
      value: `${stats.totalHours.toFixed(1)} h`,
      icon: CheckCircle,
      color: "text-[#6B8E3E] bg-[#6B8E3E]/10",
      description: "Validated helper support time",
    },
    {
      title: "Logs to Verify",
      value: stats.pendingCount,
      icon: Clock,
      color: "text-[#C8601A] bg-[#C8601A]/10",
      description: "Entries awaiting review",
    },
    {
      title: "Volunteers Engaged",
      value: stats.volunteersEngaged,
      icon: Users,
      color: "text-[#D4A017] bg-[#D4A017]/10",
      description: "Helpers committed to your causes",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Welcome, {orgName || "Partner"}</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">NGO Partner Console</p>
      </div>

      {/* Stats cards strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-[#1E3A5F]">{card.value}</div>
                <p className="text-[10px] text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Verification List */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Awaiting Verification Queue
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Validate helper work records across campaigns</p>
          </div>
          <AlertCircle className="h-5 w-5 text-slate-400" />
        </CardHeader>
        <CardContent className="p-0">
          {recentLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              All hours logs verified. No unverified records in queue.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Volunteer Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/30 text-xs">
                        <TableCell className="font-semibold text-slate-800">{log.volunteerName}</TableCell>
                        <TableCell className="text-slate-600">{log.projectTitle}</TableCell>
                        <TableCell className="font-mono text-slate-700 font-bold">{log.hours.toFixed(1)} h</TableCell>
                        <TableCell className="text-slate-500 font-sans">
                          {new Date(log.logDate).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={verifyingId === log.id}
                            onClick={() => handleVerifyLog(log.id)}
                            className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white font-medium h-7 px-2 text-[10px] flex gap-1 items-center ml-auto"
                          >
                            {verifyingId === log.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Verify
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="md:hidden divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-4 space-y-3.5 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-800">{log.volunteerName}</h4>
                        <p className="text-[11px] text-slate-500 font-sans mt-0.5">{log.projectTitle}</p>
                      </div>
                      <Badge className="bg-[#C8601A] border-none text-[8px] uppercase tracking-wider text-white">
                        unverified
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 font-sans pt-1">
                      <span>Hours: <strong className="font-mono text-slate-700">{log.hours.toFixed(1)} h</strong></span>
                      <span>{new Date(log.logDate).toLocaleDateString()}</span>
                    </div>
                    <div className="pt-2 border-t flex justify-end">
                      <Button
                        size="sm"
                        disabled={verifyingId === log.id}
                        onClick={() => handleVerifyLog(log.id)}
                        className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white font-medium h-8 w-full sm:w-auto px-4 text-xs flex gap-1 items-center justify-center"
                      >
                        {verifyingId === log.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Verify Log
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NgoOverviewPage;
