import { useState, useEffect } from "react";
import { supabase } from "@/database/client";
import { sendRegistrationDecisionEmail } from "@/database/operations";
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
import { Search, Download, Check, X, Loader2, AlertCircle, Shield } from "lucide-react";

interface AdminUserItem {
  id: string; // user_id
  fullName: string;
  email: string;
  createdAt: string;
  approvalStatus: "pending" | "approved" | "rejected";
  role?: string;
}

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<AdminUserItem[]>([]);
  const [ngos, setNgos] = useState<AdminUserItem[]>([]);
  const [donors, setDonors] = useState<AdminUserItem[]>([]);
  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("volunteers");

  // Rejection Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<{ id: string; role: "volunteer" | "ngo" | "donor" } | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [processing, setProcessing] = useState(false);

  // Deletion Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<{ id: string; role: "volunteer" | "ngo" | "donor" } | null>(null);

  // Role Management state
  const [manageRoleOpen, setManageRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchUsersData = async () => {
    try {
      // 1. Fetch Volunteers
      const { data: vols, error: volsErr } = await supabase
        .from("volunteer_profiles")
        .select("user_id, created_at, approval_status, profiles(full_name, email, role)");

      if (volsErr) throw volsErr;

      setVolunteers(
        (vols || []).map((v: any) => ({
          id: v.user_id,
          fullName: v.profiles?.full_name || "Volunteer",
          email: v.profiles?.email || "",
          createdAt: v.created_at,
          approvalStatus: v.approval_status as any,
          role: v.profiles?.role || "volunteer",
        }))
      );

      // 2. Fetch NGOs
      const { data: ngoList, error: ngoErr } = await supabase
        .from("ngo_profiles")
        .select("user_id, created_at, approval_status, profiles(full_name, email, role)");

      if (ngoErr) throw ngoErr;

      setNgos(
        (ngoList || []).map((n: any) => ({
          id: n.user_id,
          fullName: n.profiles?.full_name || "NGO Partner",
          email: n.profiles?.email || "",
          createdAt: n.created_at,
          approvalStatus: n.approval_status as any,
          role: n.profiles?.role || "ngo",
        }))
      );

      // 3. Fetch Donors
      const { data: donorList, error: donorErr } = await supabase
        .from("donor_profiles")
        .select("user_id, created_at, approval_status, profiles(full_name, email, role)");

      if (donorErr) throw donorErr;

      setDonors(
        (donorList || []).map((d: any) => ({
          id: d.user_id,
          fullName: d.profiles?.full_name || "Donor Member",
          email: d.profiles?.email || "",
          createdAt: d.created_at,
          approvalStatus: d.approval_status as any,
          role: d.profiles?.role || "donor",
        }))
      );

      // 4. Fetch Admins
      const { data: admList, error: admErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .in("role", ["admin", "super_admin"]);

      if (admErr) throw admErr;

      setAdmins(
        (admList || []).map((a: any) => ({
          id: a.id,
          fullName: a.full_name,
          email: a.email,
          createdAt: a.created_at,
          approvalStatus: "approved",
          role: a.role,
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

    const fetchCurrentUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role) {
          setCurrentUserRole(profile.role);
        }
      }
    };
    fetchCurrentUserRole();
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

      // Locate user details to send email notification
      let userItem: any = null;
      if (role === "volunteer") {
        userItem = volunteers.find((v) => v.id === userId);
      } else if (role === "ngo") {
        userItem = ngos.find((n) => n.id === userId);
      } else if (role === "donor") {
        userItem = donors.find((d) => d.id === userId);
      }

      if (userItem && userItem.email) {
        try {
          const capitalizedRole = role === "volunteer" ? "Volunteer" : role === "ngo" ? "NGO" : "Donor";
          await sendRegistrationDecisionEmail({
            to: userItem.email,
            name: userItem.fullName,
            role: capitalizedRole,
            status: "approved",
          });
        } catch (emailErr: any) {
          console.error("Failed to send approval confirmation email:", emailErr);
          toast({
            title: "Notification failed",
            description: emailErr.message || "Approval email failed to dispatch.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "User approved",
        description: "Status successfully updated in registration record and notification triggered.",
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
        .update({ approval_status: "rejected" })
        .eq("user_id", rejectingUser.id);

      if (error) throw error;

      // Locate user details to send email notification
      let userItem: any = null;
      if (rejectingUser.role === "volunteer") {
        userItem = volunteers.find((v) => v.id === rejectingUser.id);
      } else if (rejectingUser.role === "ngo") {
        userItem = ngos.find((n) => n.id === rejectingUser.id);
      } else if (rejectingUser.role === "donor") {
        userItem = donors.find((d) => d.id === rejectingUser.id);
      }

      if (userItem && userItem.email) {
        try {
          const capitalizedRole = rejectingUser.role === "volunteer" ? "Volunteer" : rejectingUser.role === "ngo" ? "NGO" : "Donor";
          await sendRegistrationDecisionEmail({
            to: userItem.email,
            name: userItem.fullName,
            role: capitalizedRole,
            status: "rejected",
            adminNote: rejectFeedback || undefined,
          });
        } catch (emailErr: any) {
          console.error("Failed to send rejection confirmation email:", emailErr);
          toast({
            title: "Notification failed",
            description: emailErr.message || "Rejection email failed to dispatch.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "User rejected",
        description: "Status successfully updated to rejected and notification triggered.",
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

  const handleOpenDelete = (userId: string, role: "volunteer" | "ngo" | "donor") => {
    setDeletingUser({ id: userId, role });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("account-deletion-email", {
        body: { userId: deletingUser.id },
      });

      if (error) throw error;

      toast({
        title: "User account deleted",
        description: "The user account and all associated child data have been permanently removed.",
      });

      setDeleteModalOpen(false);
      fetchUsersData();
    } catch (err: any) {
      toast({
        title: "Deletion failed",
        description: err.message || "Failed to remove the user account.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser) return;
    setProcessing(true);
    try {
      // Safety checks:
      if (newRole === "super_admin" && currentUserRole !== "super_admin") {
        throw new Error("Only a Super Admin can grant Super Admin privileges.");
      }
      if (selectedUser.role === "super_admin" && currentUserRole !== "super_admin") {
        throw new Error("Only a Super Admin can modify or revoke Super Admin privileges.");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Role Updated Successfully",
        description: `Successfully updated ${selectedUser.fullName}'s role to ${newRole}.`,
      });

      setManageRoleOpen(false);
      fetchUsersData();
    } catch (err: any) {
      toast({
        title: "Role update failed",
        description: err.message || "Failed to update profile role.",
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
      admins,
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

    const headers = ["Full Name", "Email", "Date Registered", activeTab === "admins" ? "System Role" : "Approval Status"];
    const rows = dataset.map((user) => [
      user.fullName,
      user.email,
      new Date(user.createdAt).toLocaleDateString(),
      activeTab === "admins" ? user.role || "" : user.approvalStatus,
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-200">
          <TabsList className="bg-slate-100/80 p-0 border-none w-fit rounded-b-none rounded-t-lg -mb-px flex gap-0.5">
            <TabsTrigger value="volunteers">
              Volunteers
            </TabsTrigger>
            <TabsTrigger value="ngos">
              NGOs
            </TabsTrigger>
            <TabsTrigger value="donors">
              Donors
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex gap-1">
              <Shield className="h-3.5 w-3.5" /> Admins & Staff
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

        {["volunteers", "ngos", "donors", "admins"].map((roleKey) => (
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
                          <TableHead>{roleKey === "admins" ? "System Role" : "Approval Status"}</TableHead>
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
                                  roleKey === "admins"
                                    ? (user.role === "super_admin" ? "bg-purple-600 hover:bg-purple-700" : "bg-indigo-600 hover:bg-indigo-700")
                                    : (user.approvalStatus === "approved"
                                      ? "bg-[#6B8E3E] hover:bg-[#6B8E3E]/90"
                                      : user.approvalStatus === "rejected"
                                      ? "bg-[#C0392B] hover:bg-[#C0392B]/90"
                                      : "bg-[#C8601A] hover:bg-[#C8601A]/90")
                                }`}
                              >
                                {roleKey === "admins" ? user.role : user.approvalStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                {roleKey !== "admins" && user.approvalStatus !== "approved" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(user.id, roleKey.slice(0, -1) as any)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-[10px] flex gap-1"
                                  >
                                    <Check className="h-3 w-3" /> Approve
                                  </Button>
                                )}
                                {roleKey !== "admins" && user.approvalStatus !== "rejected" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenReject(user.id, roleKey.slice(0, -1) as any)}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-7 px-2 text-[10px] flex gap-1"
                                  >
                                    <X className="h-3 w-3" /> Reject
                                  </Button>
                                )}
                                {(user.approvalStatus === "approved" || roleKey === "admins") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setNewRole(user.role || "");
                                      setManageRoleOpen(true);
                                    }}
                                    className="border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 h-7 px-2 text-[10px] flex gap-1"
                                  >
                                    Manage Role
                                  </Button>
                                )}
                                {roleKey !== "admins" && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleOpenDelete(user.id, roleKey.slice(0, -1) as any)}
                                    className="h-7 px-2 text-[10px] flex gap-1"
                                  >
                                    Delete
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

      {/* Manage User Role Modal */}
      <Dialog open={manageRoleOpen} onOpenChange={setManageRoleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Manage User Role</DialogTitle>
            <DialogDescription>
              Update system clearance and access level for the selected account.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground">User Details</Label>
                <p className="text-sm font-semibold text-slate-800">{selectedUser.fullName}</p>
                <p className="text-xs font-mono text-slate-500">{selectedUser.email}</p>
                <p className="text-xs mt-1">
                  Current Role: <span className="font-semibold uppercase text-amber-600">{selectedUser.role}</span>
                </p>
              </div>

              {selectedUser.role === "super_admin" && currentUserRole !== "super_admin" ? (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>This user has Super Admin privileges. Only another Super Admin can modify or revoke their clearance level.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="roleSelect">Select System Role</Label>
                  <select
                    id="roleSelect"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="volunteer">Volunteer</option>
                    <option value="ngo">NGO Partner / Coordinator</option>
                    <option value="donor">Donor Member</option>
                    <option value="admin">Standard Admin (Staff/Moderator)</option>
                    {currentUserRole === "super_admin" && (
                      <option value="super_admin">Super Admin (Highest Clearance)</option>
                    )}
                  </select>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => setManageRoleOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleUpdate}
              disabled={processing || (selectedUser?.role === "super_admin" && currentUserRole !== "super_admin")}
              className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs h-9 flex gap-1.5"
            >
              {processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Role Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-rose-700 text-lg font-bold">Delete Account Permanently</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this user account? All profile information, logs, portfolio entries, and uploaded files will be permanently purged. This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={processing}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex gap-1.5"
            >
              {processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
