import { useState, useEffect } from "react";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Clock, FileHeart, CalendarRange, CheckCircle2, RefreshCw } from "lucide-react";

interface ActivityItem {
  id: string;
  hours: number;
  logDate: string;
  status: "logged" | "verified" | "voided";
  projectTitle: string;
}

const VolunteerOverviewPage = () => {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVerifiedHours: 0,
    pendingHoursCount: 0,
    portfolioCount: 0,
    badgeLevel: "Newcomer",
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const fetchOverviewData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user's full name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setFullName(profile.full_name);
      }

      // 2. Fetch commitment logs for stats
      const { data: logs } = await supabase
        .from("commitment_logs")
        .select("hours, status")
        .eq("volunteer_id", user.id);

      const verifiedHours = (logs || [])
        .filter((l) => l.status === "verified")
        .reduce((sum, l) => sum + Number(l.hours), 0);

      const pendingCount = (logs || []).filter((l) => l.status === "logged").length;

      // 3. Fetch portfolio count
      const { count: portfolioCount } = await supabase
        .from("portfolio_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // 4. Fetch volunteer profile details
      const { data: volProfile } = await supabase
        .from("volunteer_profiles")
        .select("badge_level")
        .eq("user_id", user.id)
        .maybeSingle();

      setStats({
        totalVerifiedHours: verifiedHours,
        pendingHoursCount: pendingCount,
        portfolioCount: portfolioCount || 0,
        badgeLevel: volProfile?.badge_level || "Newcomer",
      });

      // 5. Fetch last 5 logs for activity feed
      const { data: recentLogs, error: logErr } = await supabase
        .from("commitment_logs")
        .select("id, hours, log_date, status, projects(title)")
        .eq("volunteer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (logErr) throw logErr;

      setActivities(
        (recentLogs || []).map((row: any) => ({
          id: row.id,
          hours: Number(row.hours),
          logDate: row.log_date,
          status: row.status as any,
          projectTitle: row.projects?.title || "Community Project",
        }))
      );
    } catch (err: any) {
      toast({
        title: "Overview retrieval failed",
        description: err.message || "Could not retrieve statistics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

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
      title: "Verified Hours",
      value: `${stats.totalVerifiedHours.toFixed(1)} h`,
      icon: CheckCircle2,
      color: "text-[#6B8E3E] bg-[#6B8E3E]/10",
      description: "Hours checked & validated",
    },
    {
      title: "Pending Logs",
      value: stats.pendingHoursCount,
      icon: Clock,
      color: "text-[#C8601A] bg-[#C8601A]/10",
      description: "Entries awaiting review",
    },
    {
      title: "Portfolio Items",
      value: stats.portfolioCount,
      icon: FileHeart,
      color: "text-[#1E3A5F] bg-[#1E3A5F]/10",
      description: "Showcases in dashboard",
    },
    {
      title: "Badge Level",
      value: stats.badgeLevel,
      icon: Award,
      color: "text-[#D4A017] bg-[#D4A017]/10",
      description: "Current experience tier",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Welcome back, {fullName || "Partner"}</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">Volunteer Dashboard</p>
      </div>

      {/* Stats Cards */}
      <div id="volunteer-stats-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Recent Activity */}
      <Card id="volunteer-recent-logs" className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Commitment Log Entries
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Logs audit summary timeline</p>
          </div>
          <CalendarRange className="h-5 w-5 text-slate-400" />
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No recent hours logged. Click "Log Hours" in the sidebar to register volunteer work.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Project</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Verification Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((act) => (
                      <TableRow key={act.id} className="hover:bg-slate-50/30 text-xs">
                        <TableCell className="font-semibold text-slate-800">{act.projectTitle}</TableCell>
                        <TableCell className="font-mono text-slate-600">{act.hours.toFixed(1)} h</TableCell>
                        <TableCell className="text-slate-500 font-sans">
                          {new Date(act.logDate).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className={`text-[9px] uppercase font-bold tracking-wider border-none text-white ${
                              act.status === "verified"
                                ? "bg-[#6B8E3E]"
                                : act.status === "voided"
                                ? "bg-[#C0392B]"
                                : "bg-[#C8601A]"
                            }`}
                          >
                            {act.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="md:hidden divide-y divide-slate-100">
                {activities.map((act) => (
                  <div key={act.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-slate-800">{act.projectTitle}</h4>
                      <Badge
                        className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                          act.status === "verified"
                            ? "bg-[#6B8E3E]"
                            : act.status === "voided"
                            ? "bg-[#C0392B]"
                            : "bg-[#C8601A]"
                        }`}
                      >
                        {act.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-slate-500 font-sans">
                      <span>Hours: <strong className="font-mono text-slate-700">{act.hours.toFixed(1)} h</strong></span>
                      <span>
                        {new Date(act.logDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
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

export default VolunteerOverviewPage;
