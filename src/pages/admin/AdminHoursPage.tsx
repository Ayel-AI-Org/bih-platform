import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Check, AlertTriangle, Info, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface HourLogItem {
  id: string;
  volunteerId: string;
  volunteerName: string;
  projectId: string | null;
  projectTitle: string;
  activityDescription: string;
  logDate: string;
  hours: number;
  status: "logged" | "verified" | "voided";
  verifiedByName: string;
}

const AdminHoursPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<HourLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Void Dialog states
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidingLog, setVoidingLog] = useState<HourLogItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const fetchHoursLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("commitment_logs")
        .select(`
          id,
          volunteer_id,
          project_id,
          hours,
          activity_description,
          log_date,
          status,
          project:projects (title),
          volunteer:profiles!volunteer_id (full_name),
          verifier:profiles!verified_by (full_name)
        `)
        .order("log_date", { ascending: false });

      if (error) throw error;

      setLogs(
        (data || []).map((row: any) => ({
          id: row.id,
          volunteerId: row.volunteer_id,
          volunteerName: row.volunteer?.full_name || "Unknown Volunteer",
          projectId: row.project_id,
          projectTitle: row.project?.title || "—",
          activityDescription: row.activity_description || "",
          logDate: row.log_date,
          hours: Number(row.hours),
          status: row.status,
          verifiedByName: row.verifier?.full_name || "—",
        }))
      );
    } catch (err: any) {
      toast({
        title: "Logs loading failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoursLogs();
  }, []);

  const recalculateVolunteerBadge = async (volunteerId: string) => {
    // 1. Sum up all verified hours for this volunteer
    const { data: verifiedLogs, error: sumErr } = await supabase
      .from("commitment_logs")
      .select("hours")
      .eq("volunteer_id", volunteerId)
      .eq("status", "verified");

    if (sumErr) throw sumErr;

    const totalHours = (verifiedLogs || []).reduce((sum, l) => sum + Number(l.hours), 0);

    // 2. Map badge level thresholds
    let badgeLevel = "newcomer";
    if (totalHours >= 500) badgeLevel = "legend";
    else if (totalHours >= 150) badgeLevel = "impact leader";
    else if (totalHours >= 50) badgeLevel = "champion";
    else if (totalHours >= 10) badgeLevel = "contributor";

    // 3. Update volunteer profile
    const { error: updateErr } = await supabase
      .from("volunteer_profiles")
      .update({
        total_verified_hours: totalHours,
        badge_level: badgeLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", volunteerId);

    if (updateErr) throw updateErr;
  };

  const handleVerify = async (log: HourLogItem) => {
    setProcessingId(log.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No admin session active.");

      // 1. Update log status
      const { error } = await supabase
        .from("commitment_logs")
        .update({
          status: "verified",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", log.id);

      if (error) throw error;

      // 2. Recalculate volunteer badge & total hours
      await recalculateVolunteerBadge(log.volunteerId);

      toast({
        title: "Hours verified",
        description: "Volunteer record successfully updated.",
      });

      fetchHoursLogs();
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenVoidDialog = (log: HourLogItem) => {
    setVoidingLog(log);
    setVoidReason("");
    setVoidDialogOpen(true);
  };

  const handleVoidConfirm = async () => {
    if (!voidingLog) return;
    setVoiding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No admin session active.");

      const nowIso = new Date().toISOString();

      // 1. Insert a new audit log entry with status = 'voided' and void_ref set
      const { error: insertErr } = await supabase
        .from("commitment_logs")
        .insert({
          volunteer_id: voidingLog.volunteerId,
          project_id: voidingLog.projectId,
          hours: voidingLog.hours,
          activity_description: `VOID AUDIT: ${voidReason}`,
          log_date: voidingLog.logDate,
          status: "voided",
          void_ref: voidingLog.id,
          verified_by: user.id,
          verified_at: nowIso,
        });

      if (insertErr) throw insertErr;

      // 2. Update the original log status to 'voided'
      const { error: updateOrigErr } = await supabase
        .from("commitment_logs")
        .update({
          status: "voided",
          verified_by: user.id,
          verified_at: nowIso,
        })
        .eq("id", voidingLog.id);

      if (updateOrigErr) throw updateOrigErr;

      // 3. Recompute volunteer hours and badge level (in case they drop)
      await recalculateVolunteerBadge(voidingLog.volunteerId);

      toast({
        title: "Log voided",
        description: "Hours removed. Audit record created successfully.",
      });

      setVoidDialogOpen(false);
      fetchHoursLogs();
    } catch (err: any) {
      toast({
        title: "Void action failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setVoiding(false);
    }
  };

  const stats = logs.reduce(
    (acc, log) => {
      if (log.status === "logged") acc.pending += log.hours;
      if (log.status === "verified") acc.verified += log.hours;
      if (log.status === "voided") acc.voided += log.hours;
      return acc;
    },
    { pending: 0, verified: 0, voided: 0 }
  );

  const filteredLogs = logs.filter((log) =>
    log.volunteerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const truncateText = (text: string, len: number = 80) => {
    if (text.length <= len) return text;
    return text.substring(0, len) + "...";
  };

  const renderTable = (statusGroup: string) => {
    const finalFiltered = filteredLogs.filter((l) => {
      if (statusGroup === "all") return true;
      return l.status === statusGroup;
    });

    if (finalFiltered.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Info className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm">No commitment logs matching current status filters.</p>
        </div>
      );
    }

    return (
      <TooltipProvider>
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Volunteer Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Activity Details</TableHead>
                <TableHead>Date Logged</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalFiltered.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/30 text-xs">
                  <TableCell className="font-semibold text-slate-800">{log.volunteerName}</TableCell>
                  <TableCell className="text-slate-655 truncate max-w-[120px]" title={log.projectTitle}>
                    {log.projectTitle}
                  </TableCell>
                  <TableCell className="text-slate-550 max-w-[200px]">
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger className="text-left truncate max-w-full block">
                        {truncateText(log.activityDescription)}
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#1E3A5F] text-white border-slate-700 max-w-xs font-sans text-xs p-3 leading-relaxed whitespace-pre-line">
                        {log.activityDescription}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-slate-500 font-sans">
                    {new Date(log.logDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-slate-700 font-bold">{log.hours.toFixed(1)} h</TableCell>
                  <TableCell>
                    <Badge className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                      log.status === "verified"
                        ? "bg-[#6B8E3E]"
                        : log.status === "voided"
                        ? "bg-[#C0392B]"
                        : "bg-[#C8601A]"
                    }`}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium">{log.verifiedByName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {log.status === "logged" && (
                        <>
                          <Button
                            size="sm"
                            disabled={processingId === log.id}
                            onClick={() => handleVerify(log)}
                            className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <Check className="h-3 w-3" /> Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenVoidDialog(log)}
                            className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <AlertTriangle className="h-3 w-3" /> Void
                          </Button>
                        </>
                      )}

                      {log.status === "verified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenVoidDialog(log)}
                          className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-7 px-2 text-[10px] flex gap-1 items-center"
                        >
                          <AlertTriangle className="h-3 w-3" /> Void
                        </Button>
                      )}

                      {log.status === "voided" && (
                        <span className="text-[10px] text-rose-500 font-semibold pr-2">Voided</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Stack Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {finalFiltered.map((log) => (
            <div key={log.id} className="p-4 space-y-3.5 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold text-slate-800">{log.volunteerName}</h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">{log.projectTitle}</p>
                </div>
                <Badge className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                  log.status === "verified"
                    ? "bg-[#6B8E3E]"
                    : log.status === "voided"
                    ? "bg-[#C0392B]"
                    : "bg-[#C8601A]"
                }`}>
                  {log.status}
                </Badge>
              </div>

              <div className="space-y-1 text-slate-655 font-sans leading-relaxed">
                <p className="italic">"{log.activityDescription}"</p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span>Logged: <strong>{new Date(log.logDate).toLocaleDateString()}</strong></span>
                  <span>Hours: <strong className="font-mono text-slate-700">{log.hours.toFixed(1)} h</strong></span>
                </div>
                {log.verifiedByName !== "—" && (
                  <p className="text-[10px] text-slate-400 pt-0.5">Verified by: <span className="font-medium text-slate-600">{log.verifiedByName}</span></p>
                )}
              </div>

              <div className="pt-2 border-t flex gap-1.5 justify-end">
                {log.status === "logged" && (
                  <>
                    <Button
                      size="sm"
                      disabled={processingId === log.id}
                      onClick={() => handleVerify(log)}
                      className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white h-8 text-xs flex-1 justify-center"
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenVoidDialog(log)}
                      className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-8 text-xs flex-1 justify-center"
                    >
                      Void
                    </Button>
                  </>
                )}

                {log.status === "verified" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenVoidDialog(log)}
                    className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-8 text-xs w-full justify-center"
                  >
                    Void Log
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </TooltipProvider>
    );
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
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Hours Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review, verify, or void volunteer commitment logs platform-wide.
        </p>
      </div>

      {/* Stats Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Verification</span>
            <Clock className="h-4 w-4 text-[#C8601A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#C8601A]">{stats.pending.toFixed(1)} h</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total hours awaiting administrator checks</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Platform-wide</span>
            <CheckCircle className="h-4 w-4 text-[#6B8E3E]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#6B8E3E]">{stats.verified.toFixed(1)} h</div>
            <p className="text-[10px] text-muted-foreground mt-1">Sum of all approved volunteer hours</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Voided / Audit Logs</span>
            <XCircle className="h-4 w-4 text-[#C0392B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-600">{stats.voided.toFixed(1)} h</div>
            <p className="text-[10px] text-muted-foreground mt-1">Sum of voided/flagged historical logs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Ledger card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Volunteer Hours Ledger</CardTitle>
            <CardDescription>Verify hours and update volunteer levels directly.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by volunteer name..."
              className="pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="pending" className="space-y-6">
            <div className="px-6 border-b">
              <TabsList className="bg-slate-100 p-1 border-none w-fit rounded-b-none rounded-t-lg -mb-px">
                <TabsTrigger value="all">All Logs</TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-[#C8601A] data-[state=active]:text-white">Pending</TabsTrigger>
                <TabsTrigger value="verified" className="data-[state=active]:bg-[#6B8E3E] data-[state=active]:text-white">Verified</TabsTrigger>
                <TabsTrigger value="voided" className="data-[state=active]:bg-[#C0392B] data-[state=active]:text-white">Voided</TabsTrigger>
              </TabsList>
            </div>

            <div className="pt-0">
              <TabsContent value="all" className="mt-0">
                {renderTable("all")}
              </TabsContent>
              <TabsContent value="pending" className="mt-0">
                {renderTable("pending")}
              </TabsContent>
              <TabsContent value="verified" className="mt-0">
                {renderTable("verified")}
              </TabsContent>
              <TabsContent value="voided" className="mt-0">
                {renderTable("voided")}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Void Dialogue Modal */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Void Hours Log</DialogTitle>
            <DialogDescription>
              A void reason is required to lock a new void transaction in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="voidReason">Reason for Void action</Label>
            <Input
              id="voidReason"
              placeholder="e.g. Duplicate entry, logs not matching timesheet..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setVoidDialogOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleVoidConfirm}
              disabled={voiding || !voidReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex gap-1.5"
            >
              {voiding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHoursPage;
