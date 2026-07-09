import { useState, useEffect } from "react";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Download, Check, X, Loader2, AlertCircle } from "lucide-react";

interface AdminUserItem {
  id: string; // user_id
  fullName: string;
  email: string;
  createdAt: string;
  approvalStatus: "pending" | "approved" | "rejected";
}

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<AdminUserItem[]>([]);
  const [ngos, setNgos] = useState<AdminUserItem[]>([]);
  const [donors, setDonors] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("volunteers");

  // Rejection Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<{ id: string; role: "volunteer" | "ngo" | "donor" } | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchUsersData = async () => {
    try {
      // 1. Fetch Volunteers
      const { data: vols, error: volsErr } = await supabase
        .from("volunteer_profiles")
        .select("user_id, created_at, approval_status, profiles(full_name, email)");

      if (volsErr) throw volsErr;

      setVolunteers(
        (vols || []).map((v: any) => ({
          id: v.user_id,
          fullName: v.profiles?.full_name || "Volunteer",
          email: v.profiles?.email || "",
          createdAt: v.created_at,
          approvalStatus: v.approval_status as any,
        }))
      );

      // 2. Fetch NGOs
      const { data: ngoList, error: ngoErr } = await supabase
        .from("ngo_profiles")
        .select("user_id, created_at, approval_status, profiles(full_name, email)");

      if (ngoErr) throw ngoErr;

      setNgos(
        (ngoList || []).map((n: any) => ({
          id: n.user_id,
          fullName: n.profiles?.full_name || "NGO Partner",
          email: n.profiles?.email || "",
          createdAt: n.created_at,
          approvalStatus: n.approval_status as any,
        }))
      );

      // 3. Fetch Donors
      const { data: donorList, error: donorErr } = await supabase
        .from("donor_profiles")
        .select("user_id, created_at, approval_status, profiles(full_name, email)");

      if (donorErr) throw donorErr;

      setDonors(
        (donorList || []).map((d: any) => ({
          id: d.user_id,
          fullName: d.profiles?.full_name || "Donor Member",
          email: d.profiles?.email || "",
          createdAt: d.created_at,
          approvalStatus: d.approval_status as any,
        }))
      );
    } catch (err: any) {
      toast({
        title: "Database error",
        description: err.message || "Failed to retrieve user registries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  const handleApprove = async (userId: string, role: "volunteer" | "ngo" | "donor") => {
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
        description: "Status successfully updated in registration record.",
      });

      fetchUsersData();
    } catch (err: any) {
      toast({
        title: "Operation failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenReject = (userId: string, role: "volunteer" | "ngo" | "donor") => {
    setRejectingUser({ id: userId, role });
    setRejectFeedback("");
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingUser) return;
    setProcessing(true);
    try {
      const roleTableMap = {
        volunteer: "volunteer_profiles",
        ngo: "ngo_profiles",
        donor: "donor_profiles",
      };

      const tableName = roleTableMap[rejectingUser.role];
      const { error } = await supabase
        .from(tableName)
        .update({ approval_status: "rejected" }) // We can write feedback if database supported it, but since schema doesn't have feedback column, we just update status to rejected.
        .eq("user_id", rejectingUser.id);

      if (error) throw error;

      // Note: We can also trigger the edge function sendRegistrationDecisionEmail if it was required, but the prompt says: "Updates approval_status = 'rejected' -> Shows success toast: 'User rejected'"
      toast({
        title: "User rejected",
        description: "Status successfully updated to rejected.",
      });

      setRejectModalOpen(false);
      fetchUsersData();
    } catch (err: any) {
      toast({
        title: "Operation failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getFilteredData = () => {
    const dataMap: Record<string, AdminUserItem[]> = {
      volunteers,
      ngos,
      donors,
    };
    const dataset = dataMap[activeTab] || [];
    if (!searchQuery) return dataset;

    const query = searchQuery.toLowerCase();
    return dataset.filter(
      (user) =>
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  };

  const getExportCSVData = () => {
    const dataset = getFilteredData();
    if (dataset.length === 0) {
      toast({
        title: "No data to export",
        description: "Configure search queries to match rows before downloading.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Full Name", "Email", "Date Registered", "Approval Status"];
    const rows = dataset.map((user) => [
      user.fullName,
      user.email,
      new Date(user.createdAt).toLocaleDateString(),
      user.approvalStatus,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bih-${activeTab}-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentDataset = getFilteredData();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-9 w-48 mb-2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Activate or reject volunteer, NGO coordinator, and donor registry requests.
          </p>
        </div>
        <Button
          onClick={getExportCSVData}
          variant="outline"
          className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-slate-50 gap-1.5 h-9"
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Tabs defaultValue="volunteers" onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="bg-slate-100 p-1 border border-slate-200/60">
            <TabsTrigger value="volunteers" className="data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
              Volunteers
            </TabsTrigger>
            <TabsTrigger value="ngos" className="data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
              NGOs
            </TabsTrigger>
            <TabsTrigger value="donors" className="data-[state=active]:bg-[#1E3A5F] data-[state=active]:text-white">
              Donors
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {["volunteers", "ngos", "donors"].map((roleKey) => (
          <TabsContent key={roleKey} value={roleKey} className="mt-0">
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-0">
                {currentDataset.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground space-y-2">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-sm">No registry accounts matched the filter query.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50">
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Date Registered</TableHead>
                          <TableHead>Approval Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentDataset.map((user) => (
                          <TableRow key={user.id} className="hover:bg-slate-50/50 text-xs">
                            <TableCell className="font-semibold text-slate-800">
                              {user.fullName}
                            </TableCell>
                            <TableCell className="font-mono text-slate-500">
                              {user.email}
                            </TableCell>
                            <TableCell className="text-slate-500 font-sans">
                              {new Date(user.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`text-[10px] uppercase font-bold tracking-wider font-sans border-none text-white ${
                                  user.approvalStatus === "approved"
                                    ? "bg-[#6B8E3E] hover:bg-[#6B8E3E]/90"
                                    : user.approvalStatus === "rejected"
                                    ? "bg-[#C0392B] hover:bg-[#C0392B]/90"
                                    : "bg-[#C8601A] hover:bg-[#C8601A]/90"
                                }`}
                              >
                                {user.approvalStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                {user.approvalStatus !== "approved" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(user.id, roleKey.slice(0, -1) as any)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-[10px] flex gap-1"
                                  >
                                    <Check className="h-3 w-3" /> Approve
                                  </Button>
                                )}
                                {user.approvalStatus !== "rejected" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenReject(user.id, roleKey.slice(0, -1) as any)}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-7 px-2 text-[10px] flex gap-1"
                                  >
                                    <X className="h-3 w-3" /> Reject
                                  </Button>
                                )}
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Reject Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this registration request? Describe the feedback reason below (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Label htmlFor="rejectReason">Rejection Feedback Notes</Label>
            <Textarea
              id="rejectReason"
              placeholder="Provide a constructive reason. e.g. Incomplete details, invalid contact channels, mismatch in focus area..."
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={processing}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex gap-1.5"
            >
              {processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
