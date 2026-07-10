import { useState, useEffect } from "react";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, History, CheckSquare, XSquare, ClipboardList } from "lucide-react";

interface LogHistoryItem {
  id: string;
  hours: number;
  activity: string;
  logDate: string;
  status: "logged" | "verified" | "voided";
  projectTitle: string;
  verifiedByName: string;
}

const VolunteerHoursHistoryPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHoursHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("commitment_logs")
        .select(`
          id,
          hours,
          activity_description,
          log_date,
          status,
          projects (title),
          verifier:profiles!verified_by (full_name)
        `)
        .eq("volunteer_id", user.id)
        .order("log_date", { ascending: false });

      if (error) throw error;

      setLogs(
        (data || []).map((row: any) => ({
          id: row.id,
          hours: Number(row.hours),
          activity: row.activity_description,
          logDate: row.log_date,
          status: row.status as any,
          projectTitle: row.projects?.title || "Community Project",
          verifiedByName: row.verifier?.full_name || "—",
        }))
      );
    } catch (err: any) {
      toast({
        title: "History retrieval failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoursHistory();
  }, []);

  const stats = logs.reduce(
    (acc, row) => {
      acc.total += row.hours;
      if (row.status === "verified") {
        acc.verified += row.hours;
      } else if (row.status === "voided") {
        acc.voided += row.hours;
      } else if (row.status === "logged") {
        acc.pending += row.hours;
      }
      return acc;
    },
    { total: 0, verified: 0, voided: 0, pending: 0 }
  );

  const truncateActivity = (text: string) => {
    if (text.length <= 60) return text;
    return text.substring(0, 60) + "...";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Hours History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audit ledger of all your registered volunteer commitments.
        </p>
      </div>

      {/* Summary Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Logged Hours</span>
            <ClipboardList className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#1E3A5F]">{stats.total.toFixed(1)} h</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total submitted hours</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Verified Hours</span>
            <CheckSquare className="h-4 w-4 text-[#6B8E3E]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#6B8E3E]">{stats.verified.toFixed(1)} h</div>
            <p className="text-[10px] text-muted-foreground mt-1">Approved by NGO partners</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Voided Hours</span>
            <XSquare className="h-4 w-4 text-[#C0392B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#C0392B]">{stats.voided.toFixed(1)} h</div>
            <p className="text-[10px] text-muted-foreground mt-1">Rejected or duplicate entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Ledger Table */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm">No historical log entries found in the ledger.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Activity Details</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50/30 text-xs">
                        <TableCell className="text-slate-500 font-sans">
                          {new Date(row.logDate).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">{row.projectTitle}</TableCell>
                        <TableCell className="text-slate-650 max-w-[200px] truncate" title={row.activity}>
                          {truncateActivity(row.activity)}
                        </TableCell>
                        <TableCell className="font-bold text-slate-700 font-mono">{row.hours.toFixed(1)} h</TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[9px] uppercase font-bold tracking-wider border-none text-white ${
                              row.status === "verified"
                                ? "bg-[#6B8E3E]"
                                : row.status === "voided"
                                ? "bg-[#C0392B]"
                                : "bg-slate-405 text-slate-700 bg-slate-100 hover:bg-slate-200"
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 font-sans">{row.verifiedByName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="md:hidden divide-y divide-slate-100">
                {logs.map((row) => (
                  <div key={row.id} className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-slate-800">{row.projectTitle}</h4>
                      <Badge
                        className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                          row.status === "verified"
                            ? "bg-[#6B8E3E]"
                            : row.status === "voided"
                            ? "bg-[#C0392B]"
                            : "bg-slate-400"
                        }`}
                      >
                        {row.status}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-slate-600">
                      <p className="font-sans italic">"{row.activity}"</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        <span>Date: <strong className="font-sans">{new Date(row.logDate).toLocaleDateString()}</strong></span>
                        <span>Hours: <strong className="font-mono text-slate-700">{row.hours.toFixed(1)} h</strong></span>
                      </div>
                      <p className="text-[10px] text-slate-400 pt-1">
                        Verified by: <span className="font-medium text-slate-500">{row.verifiedByName}</span>
                      </p>
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

export default VolunteerHoursHistoryPage;
