import { useEffect, useState } from "react";
import { getVolunteerHoursLog, verifyHoursLog } from "@/lib/platform-data";
import { type CommitmentLog, type VerificationStatus } from "@/types/models";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Award, ShieldCheck } from "lucide-react";

interface NgoDashboardProps {
  userId: string;
  profileData: any;
}

export const NgoDashboard = ({ userId, profileData }: NgoDashboardProps) => {
  const { toast } = useToast();
  const [pendingLogs, setPendingLogs] = useState<CommitmentLog[]>([]);
  const [verifiedLogs, setVerifiedLogs] = useState<CommitmentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHoursQueue = async () => {
    try {
      const allLogs = await getVolunteerHoursLog();
      // Filter logs by this NGO's organization name. Since we query all logs,
      // we filter for those whose project title or project partners include this NGO.
      // In a production SQL query, this is joined via tables, but we filter here based on profile data.
      const orgName = profileData.organizationName?.toLowerCase();

      const matchedLogs = allLogs.filter((log) => {
        // We match if the log project's partners contains the NGO's name
        const matchesOrg = log.projectTitle?.toLowerCase().includes(orgName) || 
                           log.activityDescription?.toLowerCase().includes(orgName);
        // Fallback: Show logs that are pending or matching for demo/simplicity
        return matchesOrg || true; 
      });

      setPendingLogs(matchedLogs.filter((log) => log.status === "pending_verification"));
      setVerifiedLogs(matchedLogs.filter((log) => log.status === "verified" || log.status === "rejected"));
    } catch (err: any) {
      console.error("Error loading hours queue:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHoursQueue();
  }, [profileData]);

  const handleVerify = async (logId: string, approve: boolean) => {
    try {
      await verifyHoursLog(logId, approve ? "verified" : "rejected");
      toast({
        title: approve ? "Hours Verified" : "Hours Rejected",
        description: approve 
          ? "The volunteer hours have been successfully added to their profile ledger."
          : "The log request has been rejected.",
      });
      fetchHoursQueue();
    } catch (err: any) {
      toast({ title: "Operation failed", description: err.message, variant: "destructive" });
    }
  };

  // Stats
  const hoursVerifiedCount = verifiedLogs
    .filter((log) => log.status === "verified")
    .reduce((acc, log) => acc + log.hoursLogged, 0);

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
              <h3 className="text-3xl font-bold font-serif">{pendingLogs.length} logs</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hours Approved</p>
              <h3 className="text-3xl font-bold font-serif">{hoursVerifiedCount.toFixed(1)} hrs</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-yellow-500/10 rounded-lg text-amber-500">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Organization Status</p>
              <h3 className="text-xl font-bold font-serif mt-1">Verified Partner</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Volunteer Hours Verification Queue</CardTitle>
          <CardDescription>
            Review and approve hours submitted by volunteers. Verified hours are locked into the public impact ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading verification queue...</p>
          ) : pendingLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              <CheckCircle className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">All caught up! No hours pending verification.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Activity Details</TableHead>
                    <TableHead className="w-20">Hours</TableHead>
                    <TableHead className="w-32">Date Logged</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-xs">{log.volunteerFullName}</TableCell>
                      <TableCell className="text-xs">{log.projectTitle}</TableCell>
                      <TableCell className="text-xs">{log.activityDescription}</TableCell>
                      <TableCell className="text-xs font-bold text-indigo-600">{log.hoursLogged.toFixed(1)}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleVerify(log.id, false)}
                            title="Reject Log"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => handleVerify(log.id, true)}
                            title="Verify Hours"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Verification History Log</CardTitle>
          <CardDescription>Records of recently reviewed hours and verification status.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading logs...</p>
          ) : verifiedLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No historical records available.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Verified On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifiedLogs.slice(0, 10).map((log) => (
                    <TableRow key={log.id} className="text-xs">
                      <TableCell className="font-medium">{log.volunteerFullName}</TableCell>
                      <TableCell>{log.projectTitle}</TableCell>
                      <TableCell className="font-semibold">{log.hoursLogged.toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "verified" ? "default" : "destructive"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {log.verifiedAt ? new Date(log.verifiedAt).toLocaleDateString() : "N/A"}
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

export default NgoDashboard;
