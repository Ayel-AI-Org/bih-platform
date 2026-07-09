import { useState, useEffect } from "react";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, AlertTriangle, Info, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface LogDetailItem {
  id: string;
  hours: number;
  activity: string;
  logDate: string;
  status: "logged" | "verified" | "voided";
  projectTitle: string;
  volunteerName: string;
}

const NgoVerifyHoursPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Void/Flag dialog states
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidingLogId, setVoidingLogId] = useState<string | null>(null);
  const [voidNotes, setVoidNotes] = useState("");
  const [voiding, setVoiding] = useState(false);

  const fetchLogsLedger = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch NGO's Projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id")
        .eq("created_by", user.id);

      const projectIds = (projectsData || []).map((p) => p.id);

      if (projectIds.length === 0) {
        setLogs([]);
        return;
      }

      // 2. Fetch commitment logs across these projects
      const { data, error } = await supabase
        .from("commitment_logs")
        .select(`
          id,
          hours,
          activity_description,
          log_date,
          status,
          projects (title),
          volunteer:profiles!volunteer_id (full_name)
        `)
        .in("project_id", projectIds)
        .order("log_date", { ascending: false });

      if (error) throw error;

      setLogs(
        (data || []).map((row: any) => ({
          id: row.id,
          hours: Number(row.hours),
          activity: row.activity_description,
          logDate: row.log_date,
          status: row.status as any,
          projectTitle: row.projects?.title || "NGO Campaign",
          volunteerName: row.volunteer?.full_name || "Unknown Volunteer",
        }))
      );
    } catch (err: any) {
      toast({
        title: "Failed to load logs ledger",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsLedger();
  }, []);

  const handleVerify = async (logId: string) => {
    setProcessingId(logId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active credentials session found.");

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
        title: "Log verified",
        description: "Volunteer hours approved and marked in audit ledger.",
      });

      fetchLogsLedger();
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

  const handleOpenVoidDialog = (logId: string) => {
    setVoidingLogId(logId);
    setVoidNotes("");
    setVoidDialogOpen(true);
  };

  const handleVoidLog = async () => {
    if (!voidingLogId) return;
    setVoiding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active credentials session found.");

      const { error } = await supabase
        .from("commitment_logs")
        .update({
          status: "voided",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", voidingLogId);

      if (error) throw error;

      toast({
        title: "Log voided / flagged",
        description: "Volunteer hours marked as voided. Notes logged.",
      });

      setVoidDialogOpen(false);
      fetchLogsLedger();
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

  const truncateActivity = (text: string) => {
    if (text.length <= 80) return text;
    return text.substring(0, 80) + "...";
  };

  // Summarize stats
  const stats = logs.reduce(
    (acc, log) => {
      if (log.status === "logged") acc.pending += log.hours;
      if (log.status === "verified") acc.verified += log.hours;
      return acc;
    },
    { pending: 0, verified: 0 }
  );

  const renderTable = (filteredLogs: LogDetailItem[]) => {
    if (filteredLogs.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Info className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm">No commitment logs matching this status type.</p>
        </div>
      );
    }

    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Volunteer Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Activity Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/30 text-xs">
                  <TableCell className="font-semibold text-slate-800">{log.volunteerName}</TableCell>
                  <TableCell className="text-slate-650 truncate max-w-[120px]" title={log.projectTitle}>
                    {log.projectTitle}
                  </TableCell>
                  <TableCell className="text-slate-500 max-w-[180px] truncate" title={log.activity}>
                    {truncateActivity(log.activity)}
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
                    <Badge
                      className={`text-[9px] uppercase font-bold tracking-wider border-none text-white ${
                        log.status === "verified"
                          ? "bg-[#6B8E3E]"
                          : log.status === "voided"
                          ? "bg-[#C0392B]"
                          : "bg-[#C8601A]"
                      }`}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {log.status === "logged" && (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          disabled={processingId === log.id}
                          onClick={() => handleVerify(log.id)}
                          className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white font-medium h-7 px-2 text-[10px] flex gap-1 items-center"
                        >
                          <Check className="h-3 w-3" /> Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenVoidDialog(log.id)}
                          className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 hover:text-[#C0392B]/90 font-medium h-7 px-2 text-[10px] flex gap-1 items-center"
                        >
                          <AlertTriangle className="h-3 w-3" /> Flag / Void
                        </Button>
                      </div>
                    )}
                    {log.status === "verified" && (
                      <span className="text-[10px] text-emerald-600 font-medium font-sans">Verified by you</span>
                    )}
                    {log.status === "voided" && (
                      <span className="text-[10px] text-rose-600 font-medium font-sans">Voided</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card Stack View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 space-y-3 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold text-slate-800">{log.volunteerName}</h4>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">{log.projectTitle}</p>
                </div>
                <Badge
                  className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                    log.status === "verified"
                      ? "bg-[#6B8E3E]"
                      : log.status === "voided"
                      ? "bg-[#C0392B]"
                      : "bg-[#C8601A]"
                  }`}
                >
                  {log.status}
                </Badge>
              </div>
              <div className="space-y-1 text-slate-650">
                <p className="font-sans italic">"{log.activity}"</p>
                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                  <span>Date: <strong className="font-sans">{new Date(log.logDate).toLocaleDateString()}</strong></span>
                  <span>Hours: <strong className="font-mono text-slate-700">{log.hours.toFixed(1)} h</strong></span>
                </div>
              </div>

              {log.status === "logged" && (
                <div className="pt-2.5 border-t flex gap-2 justify-end">
                  <Button
                    size="sm"
                    disabled={processingId === log.id}
                    onClick={() => handleVerify(log.id)}
                    className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white font-medium h-8 px-4 text-xs flex gap-1 items-center flex-1 justify-center"
                  >
                    <Check className="h-3.5 w-3.5" /> Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenVoidDialog(log.id)}
                    className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-8 px-4 text-xs flex gap-1 items-center flex-1 justify-center"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Void Log
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </>
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
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Verify Hours</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review, approve, or void logged volunteer hours across organization projects.
        </p>
      </div>

      {/* Summary Stats Stripe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Hours Pending</span>
            <Clock className="h-4 w-4 text-[#C8601A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#C8601A]">{stats.pending.toFixed(1)} h</div>
            <p className="text-[10px] text-muted-foreground mt-1">Awaiting coordinator verification checks</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Hours Verified</span>
            <CheckCircle className="h-4 w-4 text-[#6B8E3E]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#6B8E3E]">{stats.verified.toFixed(1)} h</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total approved commitment hours ledger sum</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs Ledger */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="pt-6">
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 border border-slate-200 w-fit">
              <TabsTrigger value="all">All Logs</TabsTrigger>
              <TabsTrigger value="logged" className="data-[state=active]:bg-[#C8601A] data-[state=active]:text-white">Pending</TabsTrigger>
              <TabsTrigger value="verified" className="data-[state=active]:bg-[#6B8E3E] data-[state=active]:text-white">Verified</TabsTrigger>
              <TabsTrigger value="voided" className="data-[state=active]:bg-[#C0392B] data-[state=active]:text-white">Voided</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              {renderTable(logs)}
            </TabsContent>
            <TabsContent value="logged" className="mt-0">
              {renderTable(logs.filter((l) => l.status === "logged"))}
            </TabsContent>
            <TabsContent value="verified" className="mt-0">
              {renderTable(logs.filter((l) => l.status === "verified"))}
            </TabsContent>
            <TabsContent value="voided" className="mt-0">
              {renderTable(logs.filter((l) => l.status === "voided"))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Flag / Void Input notes Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Void Hours Log</DialogTitle>
            <DialogDescription>
              Marking this hours log as void removes these hours from the volunteer's badge counts. Please provide a reason below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="voidNotes">Reason / Flag notes (optional)</Label>
            <Textarea
              id="voidNotes"
              rows={3}
              placeholder="e.g. Duplicate entry, incorrect project context..."
              value={voidNotes}
              onChange={(e) => setVoidNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => setVoidDialogOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVoidLog}
              disabled={voiding}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex gap-1.5"
            >
              {voiding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Void Hours Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NgoVerifyHoursPage;
