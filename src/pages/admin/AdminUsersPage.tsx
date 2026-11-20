import { useState, useEffect } from "react";
import { supabase } from "@/database/client";
import { sendRegistrationDecisionEmail } from "@/database/operations";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Check,
  X,
  Shield,
  Download,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";

interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  approvalStatus: "pending" | "approved" | "rejected";
  hasVolunteerHistory: boolean;
  volunteerVerifiedHours: number;
  ngoName?: string;
  donorType?: string;
}

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Rejection Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<{ id: string; role: "volunteer" | "ngo" | "donor" } | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [processing, setProcessing] = useState(false);

  // Delete User Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<{ id: string; role: "volunteer" | "ngo" | "donor" } | null>(null);

  // Role Management state
  const [manageRoleOpen, setManageRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchUsersData = async () => {
    try {
      // Query profiles as the central source of truth, joining child profile tables
      const [profilesRes, volsRes, ngosRes, donorsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, role, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("volunteer_profiles")
          .select("user_id, approval_status, total_verified_hours"),
        supabase
          .from("ngo_profiles")
          .select("user_id, approval_status, organization_name"),
        supabase
          .from("donor_profiles")
          .select("user_id, approval_status, donor_type"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (volsRes.error) throw volsRes.error;
      if (ngosRes.error) throw ngosRes.error;
      if (donorsRes.error) throw donorsRes.error;

      const volMap = new Map((volsRes.data || []).map((v: any) => [v.user_id, v]));
      const ngoMap = new Map((ngosRes.data || []).map((n: any) => [n.user_id, n]));
      const donorMap = new Map((donorsRes.data || []).map((d: any) => [d.user_id, d]));

      const mappedUsers: AdminUserItem[] = (profilesRes.data || []).map((p: any) => {
        const v = volMap.get(p.id);
        const n = ngoMap.get(p.id);
        const d = donorMap.get(p.id);

        let approvalStatus: "pending" | "approved" | "rejected" = "approved";
        if (p.role === "volunteer" && v) {
          approvalStatus = v.approval_status || "pending";
        } else if (p.role === "ngo" && n) {
          approvalStatus = n.approval_status || "pending";
        } else if (p.role === "donor" && d) {
          approvalStatus = d.approval_status || "pending";
        }

        return {
          id: p.id,
          fullName: p.full_name || "User",
          email: p.email || "",
          role: p.role || "volunteer",
          createdAt: p.created_at,
          approvalStatus,
          hasVolunteerHistory: !!v,
          volunteerVerifiedHours: Number(v?.total_verified_hours) || 0,
          ngoName: n?.organization_name,
          donorType: d?.donor_type,
        };
      });

      setUsers(mappedUsers);
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

  const handleApprove = async (userId: string, role: string) => {
    try {
      const roleTableMap: Record<string, string> = {
        volunteer: "volunteer_profiles",
        ngo: "ngo_profiles",
        donor: "donor_profiles",
      };

      const tableName = roleTableMap[role] || "volunteer_profiles";
      const { data, error } = await supabase
        .from(tableName)
        .update({ approval_status: "approved" })
        .eq("user_id", userId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: check your admin role");
      }

      // Locate user details to send email notification
      const userItem = users.find((u) => u.id === userId);
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

  const handleOpenReject = (userId: string, role: string) => {
    setRejectingUser({ id: userId, role: role as any });
    setRejectFeedback("");
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingUser) return;
    setProcessing(true);
    try {
      const roleTableMap: Record<string, string> = {
        volunteer: "volunteer_profiles",
        ngo: "ngo_profiles",
        donor: "donor_profiles",
      };

      const tableName = roleTableMap[rejectingUser.role] || "volunteer_profiles";
      const { data, error } = await supabase
        .from(tableName)
        .update({ approval_status: "rejected" })
        .eq("user_id", rejectingUser.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: check your admin role");
      }

      const userItem = users.find((u) => u.id === rejectingUser.id);
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

  const handleOpenDelete = (userId: string, role: string) => {
    setDeletingUser({ id: userId, role: role as any });
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
        description: "The user account and associated child data have been permanently removed.",
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

  // Phase B Requirement 2: Call the security definer RPC
  const handleRoleUpdate = async () => {
    if (!selectedUser) return;
    setProcessing(true);
    try {
      if (newRole === "super_admin" && currentUserRole !== "super_admin") {
        throw new Error("Only a Super Admin can grant Super Admin privileges.");
      }
      if (selectedUser.role === "super_admin" && currentUserRole !== "super_admin") {
        throw new Error("Only a Super Admin can modify or revoke Super Admin privileges.");
      }

      const { data, error } = await supabase.rpc("admin_set_user_role", {
        target_user_id: selectedUser.id,
        new_role: newRole,
      });

      if (error) {
        throw error;
      }

      // Check returned role equals requested one
      if (!data || data.role !== newRole) {
        throw new Error(
          `Role change mismatch: server returned role "${data?.role || "none"}", expected "${newRole}".`
        );
      }

      toast({
        title: "Role Updated Successfully",
        description: `Successfully updated ${selectedUser.fullName}'s role to ${newRole}.`,
      });

      setManageRoleOpen(false);
      await fetchUsersData();
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

  // Driven strictly by profiles.role
  const getFilteredData = () => {
    let dataset = users;

    if (activeTab === "volunteers") {
      dataset = users.filter((u) => u.role === "volunteer");
    } else if (activeTab === "ngos") {
      dataset = users.filter((u) => u.role === "ngo");
    } else if (activeTab === "donors") {
      dataset = users.filter((u) => u.role === "donor");
    } else if (activeTab === "admins") {
      dataset = users.filter((u) => u.role === "admin" || u.role === "super_admin");
    }

    if (!searchQuery.trim()) return dataset;

    const query = searchQuery.toLowerCase();
    return dataset.filter(
      (user) =>
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
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

    const headers = ["Full Name", "Email", "Date Registered", "Role", "Approval Status", "Volunteer History"];
    const rows = dataset.map((user) => [
      user.fullName,
      user.email,
      new Date(user.createdAt).toLocaleDateString(),
      user.role,
      user.approvalStatus,
      user.hasVolunteerHistory ? `Yes (${user.volunteerVerifiedHours} verified hrs)` : "No",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bih-users-${activeTab}-export.csv`);
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

  const volunteerCount = users.filter((u) => u.role === "volunteer").length;
  const ngoCount = users.filter((u) => u.role === "ngo").length;
  const donorCount = users.filter((u) => u.role === "donor").length;
  const adminCount = users.filter((u) => u.role === "admin" || u.role === "super_admin").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">User Directory & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system clearance, view volunteer histories, and approve registration requests.
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

      {/* Tabs: All | Volunteers | NGOs | Donors | Admins, driven by profiles.role */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-200">
          <TabsList className="bg-slate-100/80 p-0 border-none w-fit rounded-b-none rounded-t-lg -mb-px flex flex-wrap gap-0.5">
            <TabsTrigger value="all">
              All ({users.length})
            </TabsTrigger>
            <TabsTrigger value="volunteers">
              Volunteers ({volunteerCount})
            </TabsTrigger>
            <TabsTrigger value="ngos">
              NGOs ({ngoCount})
            </TabsTrigger>
            <TabsTrigger value="donors">
              Donors ({donorCount})
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex gap-1">
              <Shield className="h-3.5 w-3.5" /> Admins & Staff ({adminCount})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-0">
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
                        <TableHead>Role</TableHead>
                        <TableHead>Date Registered</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDataset.map((user) => {
                        const isAdminUser = user.role === "admin" || user.role === "super_admin";
                        return (
                          <TableRow key={user.id} className="hover:bg-slate-50/50 text-xs">
                            {/* Full Name + Volunteer History Note */}
                            <TableCell className="font-semibold text-slate-800">
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-slate-800">{user.fullName}</span>
                                {user.hasVolunteerHistory && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 w-fit font-medium">
                                    <Clock className="h-2.5 w-2.5 text-emerald-600" />
                                    Volunteer history: {user.volunteerVerifiedHours} verified hrs
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="font-mono text-slate-500">
                              {user.email}
                            </TableCell>

                            {/* Role Badge */}
                            <TableCell>
                              <Badge
                                className={`text-[10px] uppercase font-bold tracking-wider font-sans border-none text-white ${
                                  user.role === "super_admin"
                                    ? "bg-purple-600 hover:bg-purple-700"
                                    : user.role === "admin"
                                    ? "bg-[#1E3A5F] hover:bg-[#1E3A5F]/90"
                                    : user.role === "ngo"
                                    ? "bg-[#D4A017] hover:bg-[#D4A017]/90"
                                    : user.role === "donor"
                                    ? "bg-teal-700 hover:bg-teal-800"
                                    : "bg-slate-600 hover:bg-slate-700"
                                }`}
                              >
                                {user.role}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-slate-500 font-sans">
                              {new Date(user.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <Badge
                                className={`text-[10px] uppercase font-bold tracking-wider font-sans border-none text-white ${
                                  isAdminUser
                                    ? "bg-[#6B8E3E]"
                                    : user.approvalStatus === "approved"
                                    ? "bg-[#6B8E3E]"
                                    : user.approvalStatus === "rejected"
                                    ? "bg-[#C0392B]"
                                    : "bg-[#C8601A]"
                                }`}
                              >
                                {isAdminUser ? "active" : user.approvalStatus}
                              </Badge>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-1.5">
                                {!isAdminUser && user.approvalStatus !== "approved" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(user.id, user.role)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-[10px] flex gap-1"
                                  >
                                    <Check className="h-3 w-3" /> Approve
                                  </Button>
                                )}
                                {!isAdminUser && user.approvalStatus !== "rejected" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenReject(user.id, user.role)}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-7 px-2 text-[10px] flex gap-1"
                                  >
                                    <X className="h-3 w-3" /> Reject
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setNewRole(user.role || "volunteer");
                                    setManageRoleOpen(true);
                                  }}
                                  className="border-amber-300 text-amber-700 hover:bg-amber-50 h-7 px-2 text-[10px] flex gap-1"
                                >
                                  Manage Role
                                </Button>
                                {!isAdminUser && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleOpenDelete(user.id, user.role)}
                                    className="h-7 px-2 text-[10px] flex gap-1"
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
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

      {/* Manage User Role Modal (Uses RPC) */}
      <Dialog open={manageRoleOpen} onOpenChange={setManageRoleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Manage User Role</DialogTitle>
            <DialogDescription>
              Update system clearance and access level via secure administrative RPC.
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
                {selectedUser.hasVolunteerHistory && (
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Verified Volunteer Hours: <span className="font-semibold">{selectedUser.volunteerVerifiedHours} hrs</span>
                  </p>
                )}
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
