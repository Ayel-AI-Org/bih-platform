import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/database/client";
import { sendRegistrationDecisionEmail } from "@/database/operations";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandardFilterTabs } from "@/components/admin/StandardFilterTabs";
import { AccountStatusBadge, AccountRoleBadge } from "@/components/admin/UserBadges";
import {
  Search,
  Check,
  X,
  Shield,
  Download,
  AlertCircle,
  Loader2,
  Clock,
  MoreHorizontal,
  Eye,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Award,
  FilterX,
} from "lucide-react";

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  avatarUrl?: string | null;
  country?: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  // Volunteer details
  hasVolunteerHistory: boolean;
  volunteerVerifiedHours: number;
  volunteerLocation?: string | null;
  volunteerPhone?: string | null;
  volunteerSkills?: string[];
  volunteerAvailability?: string | null;
  volunteerBadgeLevel?: string | null;
  volunteerLinkedIn?: string | null;
  // NGO details
  ngoName?: string | null;
  ngoContactPerson?: string | null;
  ngoPhone?: string | null;
  ngoFocusArea?: string | null;
  ngoRegNumber?: string | null;
  ngoWebsite?: string | null;
  // Donor details
  donorType?: string | null;
  donorPhone?: string | null;
  donorInterests?: string[];
  donorTotalDonated?: number;
}

const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Profile Details Modal
  const [detailsUser, setDetailsUser] = useState<AdminUserItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Rejection Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<{ id: string; role: "volunteer" | "ngo" | "donor" } | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [processing, setProcessing] = useState(false);

  // Delete User Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<{ id: string; role: "volunteer" | "ngo" | "donor"; name: string } | null>(null);

  // Role Management state
  const [manageRoleOpen, setManageRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchUsersData = async () => {
    try {
      const [profilesRes, volsRes, ngosRes, donorsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, role, created_at, avatar_url, country")
          .order("created_at", { ascending: false }),
        supabase
          .from("volunteer_profiles")
          .select("user_id, approval_status, total_verified_hours, phone, location, skills, availability, badge_level, linkedin_url"),
        supabase
          .from("ngo_profiles")
          .select("user_id, approval_status, organization_name, contact_person, phone, focus_area, registration_number, website_url"),
        supabase
          .from("donor_profiles")
          .select("user_id, approval_status, donor_type, phone, interests, total_donated"),
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
          fullName: p.full_name || "Community Member",
          email: p.email || "",
          role: p.role || "volunteer",
          createdAt: p.created_at,
          avatarUrl: p.avatar_url,
          country: p.country,
          approvalStatus,
          hasVolunteerHistory: !!v,
          volunteerVerifiedHours: Number(v?.total_verified_hours) || 0,
          volunteerLocation: v?.location,
          volunteerPhone: v?.phone,
          volunteerSkills: Array.isArray(v?.skills) ? v.skills : [],
          volunteerAvailability: v?.availability,
          volunteerBadgeLevel: v?.badge_level,
          volunteerLinkedIn: v?.linkedin_url,
          ngoName: n?.organization_name,
          ngoContactPerson: n?.contact_person,
          ngoPhone: n?.phone,
          ngoFocusArea: n?.focus_area,
          ngoRegNumber: n?.registration_number,
          ngoWebsite: n?.website_url,
          donorType: d?.donor_type,
          donorPhone: d?.phone,
          donorInterests: Array.isArray(d?.interests) ? d.interests : [],
          donorTotalDonated: Number(d?.total_donated) || 0,
        };
      });

      setUsers(mappedUsers);
    } catch (err: any) {
      toast({
        title: "Database connection notice",
        description: err.message || "Failed to retrieve directory records.",
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

      const userItem = users.find((u) => u.id === userId);
      if (userItem && userItem.email) {
        try {
          const capitalizedRole = role === "volunteer" ? "Volunteer" : role === "ngo" ? "NGO Partner" : "Donor";
          await sendRegistrationDecisionEmail({
            to: userItem.email,
            name: userItem.fullName,
            role: capitalizedRole,
            status: "approved",
          });
        } catch (emailErr: any) {
          console.error("Failed to send approval email:", emailErr);
        }
      }

      toast({
        title: "Registration Approved",
        description: `${userItem?.fullName || "Account"} has been granted full platform clearance.`,
      });

      // Update local state smoothly
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, approvalStatus: "approved" } : u))
      );
      if (detailsUser?.id === userId) {
        setDetailsUser((prev) => (prev ? { ...prev, approvalStatus: "approved" } : null));
      }
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
          const capitalizedRole = rejectingUser.role === "volunteer" ? "Volunteer" : rejectingUser.role === "ngo" ? "NGO Partner" : "Donor";
          await sendRegistrationDecisionEmail({
            to: userItem.email,
            name: userItem.fullName,
            role: capitalizedRole,
            status: "rejected",
            adminNote: rejectFeedback || undefined,
          });
        } catch (emailErr: any) {
          console.error("Failed to send rejection email:", emailErr);
        }
      }

      toast({
        title: "Registration Rejected",
        description: `Status updated for ${userItem?.fullName || "account"}.`,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === rejectingUser.id ? { ...u, approvalStatus: "rejected" } : u))
      );
      if (detailsUser?.id === rejectingUser.id) {
        setDetailsUser((prev) => (prev ? { ...prev, approvalStatus: "rejected" } : null));
      }
      setRejectModalOpen(false);
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

  const handleOpenDelete = (user: AdminUserItem) => {
    setDeletingUser({ id: user.id, role: user.role as any, name: user.fullName });
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
        title: "Account Removed",
        description: `Account record for ${deletingUser.name} has been permanently deleted.`,
      });

      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      if (detailsUser?.id === deletingUser.id) {
        setDetailsOpen(false);
        setDetailsUser(null);
      }
      setDeleteModalOpen(false);
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

      if (error) throw error;

      if (!data || data.role !== newRole) {
        throw new Error(`Role update returned "${data?.role || "none"}", expected "${newRole}".`);
      }

      toast({
        title: "Role Updated Successfully",
        description: `Updated ${selectedUser.fullName}'s clearance to ${newRole}.`,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole } : u))
      );
      if (detailsUser?.id === selectedUser.id) {
        setDetailsUser((prev) => (prev ? { ...prev, role: newRole } : null));
      }
      setManageRoleOpen(false);
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

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Role filter
      if (roleFilter === "volunteers" && user.role !== "volunteer") return false;
      if (roleFilter === "ngos" && user.role !== "ngo") return false;
      if (roleFilter === "donors" && user.role !== "donor") return false;
      if (roleFilter === "admins" && user.role !== "admin" && user.role !== "super_admin") return false;

      // Status filter
      if (statusFilter === "pending" && user.approvalStatus !== "pending") return false;
      if (statusFilter === "approved" && user.approvalStatus !== "approved") return false;
      if (statusFilter === "rejected" && user.approvalStatus !== "rejected") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = user.fullName.toLowerCase().includes(q);
        const matchesEmail = user.email.toLowerCase().includes(q);
        const matchesRole = user.role.toLowerCase().includes(q);
        const matchesOrg = user.ngoName?.toLowerCase().includes(q);
        const matchesSkills = user.volunteerSkills?.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesRole && !matchesOrg && !matchesSkills) {
          return false;
        }
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Operational metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.approvalStatus === "pending").length;
    const volunteers = users.filter((u) => u.role === "volunteer").length;
    const totalHours = users.reduce((acc, u) => acc + (u.volunteerVerifiedHours || 0), 0);
    const ngos = users.filter((u) => u.role === "ngo").length;
    const donors = users.filter((u) => u.role === "donor").length;
    return { total, pending, volunteers, totalHours, ngos, donors };
  }, [users]);

  const hasActiveFilters = searchQuery.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast({
        title: "No data to export",
        description: "Adjust your active filters before downloading.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Full Name", "Email", "Role", "Approval Status", "Registration Date", "Context Info"];
    const rows = filteredUsers.map((u) => [
      u.fullName,
      u.email,
      u.role,
      u.approvalStatus,
      new Date(u.createdAt).toISOString().split("T")[0],
      u.role === "volunteer"
        ? `${u.volunteerVerifiedHours} verified hrs`
        : u.role === "ngo"
        ? u.ngoName || ""
        : u.donorType || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bih-people-directory-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Generated",
      description: `Downloaded ${filteredUsers.length} directory records as CSV.`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Hierarchy */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D4A017] font-sans">
            Operations / Access Control
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#1E3A5F] font-bold tracking-tight">
            People & Access
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-sans max-w-2xl">
            Review incoming registrations, manage clearance levels, and verify community members across the BIH ecosystem.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 h-9 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export Directory (.csv)
          </Button>
        </div>
      </div>

      {/* 2. Restrained Operations Metrics Row */}
      <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 sm:p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-xs">
        <div className="pt-2 sm:pt-0 sm:px-2 first:pt-0 first:pl-0">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Total Registry</span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[#1E3A5F] mt-0.5">{metrics.total}</p>
          <span className="text-xs text-slate-500">All registered accounts</span>
        </div>

        <div className="pt-2 sm:pt-0 sm:px-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Pending Review</span>
            {metrics.pending > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Actions required" />
            )}
          </div>
          <p className={`text-xl sm:text-2xl font-serif font-bold mt-0.5 ${metrics.pending > 0 ? "text-amber-700" : "text-slate-700"}`}>
            {metrics.pending}
          </p>
          <span className="text-xs text-slate-500">Awaiting clearance decision</span>
        </div>

        <div className="pt-2 sm:pt-0 sm:px-4">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Volunteers</span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[#1E3A5F] mt-0.5">{metrics.volunteers}</p>
          <span className="text-xs text-slate-500">{metrics.totalHours} verified hrs logged</span>
        </div>

        <div className="pt-2 sm:pt-0 sm:px-4">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Partner NGOs</span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[#1E3A5F] mt-0.5">{metrics.ngos}</p>
          <span className="text-xs text-slate-500">Civil society partners</span>
        </div>

        <div className="pt-2 sm:pt-0 sm:px-4">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">Donors</span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[#1E3A5F] mt-0.5">{metrics.donors}</p>
          <span className="text-xs text-slate-500">Active supporters</span>
        </div>
      </div>

      {/* 3. Purposeful Search & Filter Controls */}
      <div className="bg-white rounded-lg border border-slate-200/80 p-3 space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Standard Status Filter Tabs with Gold Underline */}
          <StandardFilterTabs
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filter members by approval clearance"
            options={[
              { value: "all", label: "All Accounts", count: metrics.total },
              { value: "pending", label: "Pending Review", count: metrics.pending },
              { value: "approved", label: "Approved", count: users.filter((u) => u.approvalStatus === "approved").length },
              { value: "rejected", label: "Rejected", count: users.filter((u) => u.approvalStatus === "rejected").length },
            ]}
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Search Box */}
            <div className="relative w-full sm:w-60 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, organization, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Role Filter Dropdown */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs border-slate-200 bg-white">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="volunteers">Volunteers</SelectItem>
                <SelectItem value="ngos">NGO Partners</SelectItem>
                <SelectItem value="donors">Donors</SelectItem>
                <SelectItem value="admins">Staff & Admins</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 gap-1 shrink-0"
                title="Reset all filters"
              >
                <FilterX className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Directory Counter Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800 font-semibold">{filteredUsers.length}</strong> of{" "}
            {users.length} accounts
          </span>
          {hasActiveFilters && (
            <span className="text-[#1E3A5F] font-semibold">Filters active</span>
          )}
        </div>
      </div>

      {/* 4. Desktop Directory View (Hidden on mobile) */}
      <div className="hidden md:block">
        <Card className="shadow-xs border-slate-200/90 overflow-hidden">
          <CardContent className="p-0">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-700">No matching accounts found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting your search criteria or resetting filters to see active records.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-3 text-xs h-8">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 border-b border-slate-200/80 text-xs uppercase font-semibold text-slate-700 tracking-wider">
                    <TableHead className="py-3 px-4 w-[40%] text-slate-700 font-semibold text-xs">Community Member</TableHead>
                    <TableHead className="py-3 px-3 w-[18%] text-slate-700 font-semibold text-xs">Role / Clearance</TableHead>
                    <TableHead className="py-3 px-3 w-[18%] text-slate-700 font-semibold text-xs">Status</TableHead>
                    <TableHead className="py-3 px-3 w-[14%] text-slate-700 font-semibold text-xs">Registered</TableHead>
                    <TableHead className="py-3 px-4 text-right w-[10%] text-slate-700 font-semibold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isAdmin = user.role === "admin" || user.role === "super_admin";
                    const isPending = user.approvalStatus === "pending";

                    return (
                      <TableRow key={user.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                        {/* Combined Identity Cell */}
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-[#1E3A5F] flex items-center justify-center font-bold text-xs shrink-0">
                                {getInitials(user.fullName)}
                              </div>
                            )}

                            {/* Name, Email & Sub-metadata */}
                            <div className="min-w-0 truncate">
                              <p className="font-semibold text-slate-900 truncate leading-tight">
                                {user.fullName}
                              </p>
                              <p className="text-xs text-slate-600 font-mono truncate leading-tight mt-0.5">
                                {user.email}
                              </p>

                              {/* Secondary contextual metadata */}
                              {user.role === "volunteer" && user.volunteerVerifiedHours > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200/80 rounded px-2 py-0.5 mt-1">
                                  <Clock className="h-2.5 w-2.5 text-emerald-600" />
                                  {user.volunteerVerifiedHours} verified hrs
                                </span>
                              )}

                              {user.role === "ngo" && user.ngoName && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 rounded px-2 py-0.5 mt-1 truncate">
                                  <Building2 className="h-2.5 w-2.5 text-amber-700 shrink-0" />
                                  {user.ngoName}
                                </span>
                              )}

                              {user.role === "donor" && user.donorType && (
                                <span className="text-[11px] font-semibold text-teal-900 bg-teal-50 border border-teal-200/80 rounded px-2 py-0.5 mt-1 inline-block">
                                  Type: {user.donorType}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Role Cell */}
                        <TableCell className="py-3 px-3">
                          <AccountRoleBadge role={user.role} />
                        </TableCell>

                        {/* Status Cell */}
                        <TableCell className="py-3 px-3">
                          <AccountStatusBadge status={isAdmin ? "active" : user.approvalStatus} />
                        </TableCell>

                        {/* Registration Date */}
                        <TableCell className="py-3 px-3 text-slate-600 font-sans">
                          <span className="block text-slate-800 font-medium">
                            {new Date(user.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </TableCell>

                        {/* Contextual Action Menu */}
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Fast-track Approve Button for pending accounts */}
                            {isPending && !isAdmin && (
                              <Button
                                size="sm"
                                onClick={() => handleApprove(user.id, user.role)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-[11px] font-medium shadow-2xs gap-1"
                                title="Approve this registration request"
                              >
                                <Check className="h-3 w-3" />
                                Approve
                              </Button>
                            )}

                            {/* Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                  aria-label={`Actions for ${user.fullName}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs font-sans">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDetailsUser(user);
                                    setDetailsOpen(true);
                                  }}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                                  View Full Profile
                                </DropdownMenuItem>

                                {!isAdmin && user.approvalStatus !== "approved" && (
                                  <DropdownMenuItem
                                    onClick={() => handleApprove(user.id, user.role)}
                                    className="gap-2 text-emerald-700 focus:text-emerald-800 cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    Approve Registration
                                  </DropdownMenuItem>
                                )}

                                {!isAdmin && user.approvalStatus !== "rejected" && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenReject(user.id, user.role)}
                                    className="gap-2 text-rose-700 focus:text-rose-800 cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5 text-rose-600" />
                                    Reject Application
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setNewRole(user.role || "volunteer");
                                    setManageRoleOpen(true);
                                  }}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Shield className="h-3.5 w-3.5 text-amber-600" />
                                  Manage System Role
                                </DropdownMenuItem>

                                {!isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleOpenDelete(user)}
                                      className="gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete Account
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Mobile Directory View (Card-Based, no horizontal scroll) */}
      <div className="md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400 space-y-2">
            <AlertCircle className="h-7 w-7 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-700">No matching accounts found</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs h-8">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isAdmin = user.role === "admin" || user.role === "super_admin";
            const isPending = user.approvalStatus === "pending";

            return (
              <div
                key={user.id}
                className="bg-white rounded-lg border border-slate-200/90 p-3.5 space-y-3 shadow-xs"
              >
                {/* Header: Avatar, Name, Email, Contextual Action Menu */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 text-[#1E3A5F] flex items-center justify-center font-bold text-xs shrink-0">
                        {getInitials(user.fullName)}
                      </div>
                    )}
                    <div className="min-w-0 truncate">
                      <p className="font-semibold text-slate-900 text-sm truncate">{user.fullName}</p>
                      <p className="text-xs text-slate-600 font-mono truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Contextual Menu Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 p-0 text-slate-500 hover:text-slate-800 shrink-0"
                        aria-label={`Actions for ${user.fullName}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-xs">
                      <DropdownMenuItem
                        onClick={() => {
                          setDetailsUser(user);
                          setDetailsOpen(true);
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        View Full Profile
                      </DropdownMenuItem>

                      {!isAdmin && user.approvalStatus !== "approved" && (
                        <DropdownMenuItem
                          onClick={() => handleApprove(user.id, user.role)}
                          className="gap-2 text-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve Registration
                        </DropdownMenuItem>
                      )}

                      {!isAdmin && user.approvalStatus !== "rejected" && (
                        <DropdownMenuItem
                          onClick={() => handleOpenReject(user.id, user.role)}
                          className="gap-2 text-rose-700"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject Application
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role || "volunteer");
                          setManageRoleOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Shield className="h-3.5 w-3.5 text-amber-600" />
                        Manage System Role
                      </DropdownMenuItem>

                      {!isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenDelete(user)}
                            className="gap-2 text-rose-600 focus:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Account
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Badges & Joined Date */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <AccountRoleBadge role={user.role} />
                    <AccountStatusBadge status={isAdmin ? "active" : user.approvalStatus} />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Context Sub-row */}
                {user.role === "volunteer" && user.volunteerVerifiedHours > 0 && (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-emerald-600" />
                    <strong>{user.volunteerVerifiedHours} verified volunteer hours</strong>
                  </p>
                )}

                {user.role === "ngo" && user.ngoName && (
                  <p className="text-[11px] text-amber-900 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-amber-700" />
                    <strong>{user.ngoName}</strong>
                    {user.ngoFocusArea && <span className="text-slate-500">• {user.ngoFocusArea}</span>}
                  </p>
                )}

                {/* Primary Action Button on card if pending */}
                {isPending && !isAdmin && (
                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.id, user.role)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-medium gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve Registration
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReject(user.id, user.role)}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs h-8 px-3"
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 6. Comprehensive User Profile Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 pt-1">
              {detailsUser?.avatarUrl ? (
                <img
                  src={detailsUser.avatarUrl}
                  alt={detailsUser.fullName}
                  className="h-12 w-12 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-slate-100 border border-slate-200 text-[#1E3A5F] flex items-center justify-center font-bold text-base">
                  {detailsUser ? getInitials(detailsUser.fullName) : "U"}
                </div>
              )}
              <div>
                <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">
                  {detailsUser?.fullName}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-slate-500">
                  {detailsUser?.email}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {detailsUser && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Clearance & Status Badges */}
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-slate-500 font-medium">Clearance:</span>
                <AccountRoleBadge role={detailsUser.role} />
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-medium">Status:</span>
                <AccountStatusBadge status={detailsUser.approvalStatus} />
              </div>

              {/* General Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-slate-200/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration Date</span>
                  <span className="font-medium text-slate-700">
                    {new Date(detailsUser.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Country Location</span>
                  <span className="font-medium text-slate-700">{detailsUser.country || "Ghana"}</span>
                </div>
              </div>

              {/* Role-Specific Information */}
              {detailsUser.role === "volunteer" && (
                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#1E3A5F] block">Volunteer Profile</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block">Verified Hours:</span>
                      <strong className="text-emerald-700 font-semibold">{detailsUser.volunteerVerifiedHours} hrs</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Badge Level:</span>
                      <span className="capitalize">{detailsUser.volunteerBadgeLevel || "Newcomer"}</span>
                    </div>
                    {detailsUser.volunteerPhone && (
                      <div>
                        <span className="text-slate-400 block">Contact Phone:</span>
                        <span>{detailsUser.volunteerPhone}</span>
                      </div>
                    )}
                    {detailsUser.volunteerLocation && (
                      <div>
                        <span className="text-slate-400 block">Residence:</span>
                        <span>{detailsUser.volunteerLocation}</span>
                      </div>
                    )}
                  </div>

                  {detailsUser.volunteerSkills && detailsUser.volunteerSkills.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-200">
                      <span className="text-slate-400 block mb-1">Declared Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {detailsUser.volunteerSkills.map((s, idx) => (
                          <span key={idx} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailsUser.volunteerLinkedIn && (
                    <div className="pt-1">
                      <a
                        href={detailsUser.volunteerLinkedIn}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1E3A5F] hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="h-3 w-3" /> View LinkedIn Profile
                      </a>
                    </div>
                  )}
                </div>
              )}

              {detailsUser.role === "ngo" && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-amber-900 block">NGO Organization Blueprint</span>
                  <div className="space-y-1.5 text-slate-700">
                    <div>
                      <span className="text-slate-400 block">Organization Name:</span>
                      <strong className="text-slate-900 text-sm">{detailsUser.ngoName || "Unspecified"}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block">Focus Sector:</span>
                        <span>{detailsUser.ngoFocusArea || "General Community"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Contact Person:</span>
                        <span>{detailsUser.ngoContactPerson || "Not listed"}</span>
                      </div>
                      {detailsUser.ngoPhone && (
                        <div>
                          <span className="text-slate-400 block">Phone:</span>
                          <span>{detailsUser.ngoPhone}</span>
                        </div>
                      )}
                      {detailsUser.ngoRegNumber && (
                        <div>
                          <span className="text-slate-400 block">Registration #:</span>
                          <span className="font-mono">{detailsUser.ngoRegNumber}</span>
                        </div>
                      )}
                    </div>
                    {detailsUser.ngoWebsite && (
                      <div className="pt-1">
                        <a
                          href={detailsUser.ngoWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-900 hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          <ExternalLink className="h-3 w-3" /> Official Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailsUser.role === "donor" && (
                <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-200/60 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-teal-900 block">Donor Member Profile</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block">Donor Classification:</span>
                      <strong className="text-teal-900 capitalize">{detailsUser.donorType || "Individual"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Total Contributions:</span>
                      <strong className="text-slate-900">GHS {detailsUser.donorTotalDonated?.toLocaleString() || 0}</strong>
                    </div>
                  </div>
                  {detailsUser.donorInterests && detailsUser.donorInterests.length > 0 && (
                    <div className="pt-1 border-t border-teal-100">
                      <span className="text-slate-400 block mb-1">Causes of Interest:</span>
                      <div className="flex flex-wrap gap-1">
                        {detailsUser.donorInterests.map((cause, idx) => (
                          <span key={idx} className="bg-white border border-teal-200 px-1.5 py-0.5 rounded text-[10px] text-teal-900">
                            {cause}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
            {detailsUser && detailsUser.approvalStatus === "pending" && detailsUser.role !== "admin" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleOpenReject(detailsUser.id, detailsUser.role);
                  }}
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs h-9"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Reject Request
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleApprove(detailsUser.id, detailsUser.role);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve Clearance
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (detailsUser) {
                  setSelectedUser(detailsUser);
                  setNewRole(detailsUser.role || "volunteer");
                  setManageRoleOpen(true);
                }
              }}
              className="text-xs h-9 border-slate-300"
            >
              <Shield className="h-3.5 w-3.5 mr-1 text-amber-600" />
              Manage Role
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailsOpen(false)}
              className="text-xs h-9"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Reject Application</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to reject this registration request? You may provide constructive feedback notes for the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Label htmlFor="rejectReason" className="text-xs font-semibold text-slate-700">
              Rejection Feedback Notes (Optional)
            </Label>
            <Textarea
              id="rejectReason"
              placeholder="e.g. Incomplete details, invalid contact channels, mismatch in focus area..."
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              className="text-xs"
              rows={3}
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

      {/* 8. Role Management Modal (Secure Definitive RPC) */}
      <Dialog open={manageRoleOpen} onOpenChange={setManageRoleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Manage User Role</DialogTitle>
            <DialogDescription className="text-xs">
              Update clearance privileges through security-definer administrative RPC.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Account</span>
                <p className="text-sm font-semibold text-slate-900">{selectedUser.fullName}</p>
                <p className="text-xs font-mono text-slate-500">{selectedUser.email}</p>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Current Role:</span>
                  <AccountRoleBadge role={selectedUser.role} />
                </div>
              </div>

              {selectedUser.role === "super_admin" && currentUserRole !== "super_admin" ? (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>This user has Super Admin privileges. Only a Super Admin can modify or revoke their clearance level.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="roleSelect" className="text-xs font-semibold text-slate-700">
                    Select New System Role
                  </Label>
                  <select
                    id="roleSelect"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                  >
                    <option value="volunteer">Volunteer (Standard Contributor)</option>
                    <option value="ngo">NGO Partner / Coordinator</option>
                    <option value="donor">Donor Member</option>
                    <option value="admin">Staff Admin (Moderator Clearance)</option>
                    {currentUserRole === "super_admin" && (
                      <option value="super_admin">Super Admin (Highest System Clearance)</option>
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
              className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs h-9 flex gap-1.5 font-medium shadow-2xs"
            >
              {processing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Clearance Level
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-rose-700 text-lg font-bold">Delete Account Permanently</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to permanently delete the account for{" "}
              <strong className="text-slate-900">{deletingUser?.name}</strong>? All associated profiles, logs, and files will be permanently purged. This action cannot be undone.
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
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex gap-1.5 font-medium"
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
