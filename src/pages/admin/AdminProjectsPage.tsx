import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from "@/components/admin/FileUploader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ProjectStatusBadge, ProjectCategoryBadge } from "@/components/admin/ProjectBadges";
import { StandardFilterTabs } from "@/components/admin/StandardFilterTabs";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Info,
  Search,
  X,
  FilterX,
  MoreHorizontal,
  Eye,
  ExternalLink,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { canDeleteProject, deleteProject, type ProjectDeletionEligibility } from "@/database/operations";

export interface AdminProjectItem {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: "proposed" | "ongoing" | "completed";
  timeline: string;
  imageUrl: string;
  partners: string[];
  createdAt: string;
  completedAt?: string | null;
  completionSummary?: string | null;
  beneficiariesReached?: number | null;
  galleryUrls?: string[];
  reportUrl?: string | null;
}

const COMMON_SECTORS = [
  "Education & Skills",
  "Healthcare & Wellbeing",
  "Water & Sanitation",
  "Environment & Forestry",
  "Agriculture & Livelihoods",
  "Renewable Energy & Tech",
  "Community Development",
];

const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  category: z.string().optional().or(z.literal("")),
  status: z.enum(["proposed", "ongoing", "completed"]),
  timeline: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  partners: z.string().optional().or(z.literal("")),
  completedAt: z.string().optional().or(z.literal("")),
  completionSummary: z.string().optional().or(z.literal("")),
  beneficiariesReached: z.union([z.number(), z.string()]).optional().nullable(),
  galleryUrls: z.array(z.string()).default([]),
  reportUrl: z.string().optional().or(z.literal("")),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const AdminProjectsPage = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<AdminProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ongoing" | "proposed" | "completed">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Project Inspection / Overview Modal
  const [previewProject, setPreviewProject] = useState<AdminProjectItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<AdminProjectItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<AdminProjectItem | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [deletionEligibility, setDeletionEligibility] = useState<ProjectDeletionEligibility | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Inline Status Change & Completion Confirmation State
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completingProject, setCompletingProject] = useState<AdminProjectItem | null>(null);
  const [completionDate, setCompletionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      category: "",
      status: "proposed",
      timeline: "",
      imageUrl: "",
      partners: "",
      completedAt: "",
      completionSummary: "",
      beneficiariesReached: "",
      galleryUrls: [],
      reportUrl: "",
    },
  });

  const watchTitle = watch("title");
  const watchDescription = watch("description");
  const watchLocation = watch("location");
  const watchCategory = watch("category");
  const watchStatus = watch("status");
  const watchTimeline = watch("timeline");
  const watchImageUrl = watch("imageUrl");

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProjects(
        (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          location: row.location,
          category: row.category || "",
          status: row.status as any,
          timeline: row.timeline || "",
          imageUrl: row.image_url || "",
          partners: row.partners || [],
          createdAt: row.created_at,
          completedAt: row.completed_at || null,
          completionSummary: row.completion_summary || null,
          beneficiariesReached: row.beneficiaries_reached ?? null,
          galleryUrls: Array.isArray(row.gallery_urls) ? row.gallery_urls : [],
          reportUrl: row.report_url || null,
        }))
      );
    } catch (err: any) {
      toast({
        title: "Failed to fetch projects",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();

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

  useEffect(() => {
    const title = searchParams.get("title");
    const description = searchParams.get("description");
    const location = searchParams.get("location");
    const timeline = searchParams.get("timeline");
    const category = searchParams.get("category");

    if (title || description || location || timeline || category) {
      reset({
        title: title || "",
        description: description || "",
        location: location || "",
        category: category || "",
        status: "proposed",
        timeline: timeline || "",
        imageUrl: "",
        partners: "",
        completedAt: "",
        completionSummary: "",
        beneficiariesReached: "",
        galleryUrls: [],
        reportUrl: "",
      });
      setModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams, reset, setSearchParams]);

  const handleOpenCreate = () => {
    setEditingProject(null);
    reset({
      title: "",
      description: "",
      location: "",
      category: "",
      status: "proposed",
      timeline: "",
      imageUrl: "",
      partners: "",
      completedAt: "",
      completionSummary: "",
      beneficiariesReached: "",
      galleryUrls: [],
      reportUrl: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (project: AdminProjectItem) => {
    setEditingProject(project);
    reset({
      title: project.title,
      description: project.description,
      location: project.location,
      category: project.category,
      status: project.status,
      timeline: project.timeline,
      imageUrl: project.imageUrl,
      partners: project.partners.join(", "),
      completedAt: project.completedAt ? project.completedAt.slice(0, 10) : "",
      completionSummary: project.completionSummary || "",
      beneficiariesReached:
        project.beneficiariesReached !== null && project.beneficiariesReached !== undefined
          ? project.beneficiariesReached
          : "",
      galleryUrls: project.galleryUrls || [],
      reportUrl: project.reportUrl || "",
    });
    setModalOpen(true);
  };

  const handleOpenPreview = (project: AdminProjectItem) => {
    setPreviewProject(project);
    setPreviewOpen(true);
  };

  const handleSaveProject = async (values: ProjectFormValues) => {
    setSaving(true);
    try {
      const partnerArray = values.partners
        ? values.partners.split(",").map((p) => p.trim()).filter((p) => p.length > 0)
        : [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active session detected.");

      const beneficiaries =
        values.beneficiariesReached !== undefined &&
        values.beneficiariesReached !== "" &&
        values.beneficiariesReached !== null
          ? Number(values.beneficiariesReached)
          : null;

      let completedAtDate: string | null = null;
      if (values.status === "completed") {
        completedAtDate = values.completedAt
          ? new Date(values.completedAt).toISOString()
          : new Date().toISOString();
      }

      const payload: Record<string, any> = {
        title: values.title,
        description: values.description,
        location: values.location,
        category: values.category || null,
        status: values.status,
        timeline: values.timeline || null,
        image_url: values.imageUrl || null,
        partners: partnerArray,
        created_by: user.id,
        completed_at: completedAtDate,
        completion_summary: values.status === "completed" ? (values.completionSummary || null) : null,
        beneficiaries_reached: values.status === "completed" ? beneficiaries : null,
        gallery_urls: values.status === "completed" ? (values.galleryUrls || []) : [],
        report_url: values.status === "completed" ? (values.reportUrl || null) : null,
      };

      if (editingProject) {
        const { data, error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", editingProject.id)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Permission denied: check your admin role");
        }

        toast({
          title: "Project updated",
          description: `"${values.title}" has been successfully updated.`,
        });
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert(payload)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Permission denied: check your admin role");
        }

        toast({
          title: "Project created",
          description: `"${values.title}" has been successfully registered.`,
        });
      }

      setModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInlineStatusChange = async (
    project: AdminProjectItem,
    newStatus: "proposed" | "ongoing" | "completed"
  ) => {
    if (newStatus === project.status) return;

    if (newStatus === "completed") {
      setCompletingProject(project);
      setCompletionDate(new Date().toISOString().slice(0, 10));
      setCompletionModalOpen(true);
      return;
    }

    setUpdatingStatusId(project.id);
    try {
      const updatePayload: Record<string, any> = { status: newStatus };

      const { data, error } = await supabase
        .from("projects")
        .update(updatePayload)
        .eq("id", project.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: check your admin role");
      }

      toast({
        title: "Status updated",
        description: `"${project.title}" status changed to ${newStatus}.`,
      });
      fetchProjects();
    } catch (err: any) {
      toast({
        title: "Status update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleConfirmComplete = async () => {
    if (!completingProject) return;

    setUpdatingStatusId(completingProject.id);
    try {
      const dateToSave = completionDate
        ? new Date(completionDate).toISOString()
        : new Date().toISOString();

      const { data, error } = await supabase
        .from("projects")
        .update({
          status: "completed",
          completed_at: dateToSave,
        })
        .eq("id", completingProject.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: check your admin role");
      }

      toast({
        title: "Project completed",
        description: `"${completingProject.title}" marked as completed. You may edit the project to attach gallery photos and report evidence.`,
      });

      setCompletionModalOpen(false);
      setCompletingProject(null);
      fetchProjects();
    } catch (err: any) {
      toast({
        title: "Completion update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleOpenDelete = async (project: AdminProjectItem) => {
    setDeletingProject(project);
    setDeleteDialogOpen(true);
    setCheckingEligibility(true);
    try {
      const eligibility = await canDeleteProject(project.id);
      setDeletionEligibility(eligibility);
    } catch (err: any) {
      toast({
        title: "Dependency check failed",
        description: err.message,
        variant: "destructive",
      });
      setDeletionEligibility({
        canDelete: false,
        reason: "Could not verify project dependencies. Deletion is blocked as a precaution.",
        linkedHoursCount: 0,
        linkedPortfolioCount: 0,
      });
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    if (currentUserRole !== "super_admin" && currentUserRole !== "admin") {
      toast({
        title: "Unauthorized action",
        description: "Only an authorized Administrator has clearance to delete project blueprints.",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      return;
    }
    setDeleting(true);
    try {
      await deleteProject(deletingProject.id);

      toast({
        title: "Project deleted",
        description: `"${deletingProject.title}" has been permanently removed.`,
      });

      setDeleteDialogOpen(false);
      setDeletingProject(null);
      setDeletionEligibility(null);
      fetchProjects();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Extract unique categories present in the dataset
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    COMMON_SECTORS.forEach((s) => set.add(s));
    return Array.from(set).sort();
  }, [projects]);

  // Dynamic Metrics Calculation
  const metrics = useMemo(() => {
    const total = projects.length;
    const ongoing = projects.filter((p) => p.status === "ongoing").length;
    const proposed = projects.filter((p) => p.status === "proposed").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const totalBeneficiaries = projects.reduce(
      (sum, p) => sum + (Number(p.beneficiariesReached) || 0),
      0
    );
    return { total, ongoing, proposed, completed, totalBeneficiaries };
  }, [projects]);

  // Filtered dataset
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Status filter
      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all") {
        if (!p.category || p.category.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesLoc = p.location.toLowerCase().includes(q);
        const matchesCat = p.category?.toLowerCase().includes(q);
        const matchesPartners = p.partners?.some((partner) => partner.toLowerCase().includes(q));

        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesCat && !matchesPartners) {
          return false;
        }
      }

      return true;
    });
  }, [projects, statusFilter, categoryFilter, searchQuery]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoryFilter, searchQuery]);

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
  };

  const getExportCSVData = () => {
    const exportData = filteredProjects.length > 0 ? filteredProjects : projects;
    if (exportData.length === 0) {
      toast({
        title: "No data to export",
        description: "Add projects or adjust your active filters before downloading.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Title",
      "Location",
      "Category",
      "Status",
      "Timeline",
      "Date Created",
      "Partners",
      "Beneficiaries Reached",
      "Completed Date",
    ];
    const rows = exportData.map((p) => [
      p.title,
      p.location,
      p.category || "Unassigned",
      p.status,
      p.timeline || "",
      new Date(p.createdAt).toISOString().split("T")[0],
      p.partners.join("; "),
      p.beneficiariesReached ?? "",
      p.completedAt ? new Date(p.completedAt).toISOString().split("T")[0] : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bih-projects-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Generated",
      description: `Downloaded ${exportData.length} project blueprints as CSV.`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-56" />
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
      {/* 1. Refined Page Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D4A017] font-sans">
            Operations / Cause Initiatives
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#1E3A5F] font-bold tracking-tight">
            Projects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-sans max-w-2xl">
            Manage initiatives, track progress, and coordinate community impact across Ghana.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={getExportCSVData}
            variant="outline"
            size="sm"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 h-9 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export (.csv)
          </Button>

          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white gap-1.5 h-9 text-xs font-medium shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Button>
        </div>
      </div>

      {/* 2. Restrained Project Overview Metrics Row */}
      <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 sm:p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-xs">
        <div className="pt-2 sm:pt-0 sm:px-2 first:pt-0 first:pl-0">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Total Initiatives
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[#1E3A5F] mt-0.5">{metrics.total}</p>
          <span className="text-[10px] text-slate-400">All registered blueprints</span>
        </div>

        <div className="pt-2 sm:pt-0 sm:px-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Ongoing
            </span>
            {metrics.ongoing > 0 && (
              <span className="h-2 w-2 rounded-full bg-[#1E3A5F] animate-pulse" title="Active operations" />
            )}
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[#1E3A5F] mt-0.5">{metrics.ongoing}</p>
          <span className="text-[10px] text-slate-400">Active field projects</span>
        </div>

        <div className="pt-2 sm:pt-0 sm:px-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Proposed
            </span>
            {metrics.proposed > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500" title="Awaiting assignment" />
            )}
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-amber-700 mt-0.5">{metrics.proposed}</p>
          <span className="text-[10px] text-slate-400">Awaiting NGO partners</span>
        </div>

        <div className="pt-2 sm:pt-0 sm:px-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Completed
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 mt-0.5">{metrics.completed}</p>
          <span className="text-[10px] text-slate-400">Archived in impact gallery</span>
        </div>

        <div className="pt-2 sm:pt-0 sm:px-4">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Impact Reach
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-[#1E3A5F] mt-0.5">
            {metrics.totalBeneficiaries > 0 ? metrics.totalBeneficiaries.toLocaleString() : "—"}
          </p>
          <span className="text-[10px] text-slate-400">Citizens directly supported</span>
        </div>
      </div>

      {/* 3. Search & Filtering Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200/80 p-3 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search initiatives by title, location, sector, or partners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white"
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

          {/* Status Tabs and Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Standard Filter Tabs with Gold Underline */}
            <StandardFilterTabs
              value={statusFilter}
              onChange={setStatusFilter}
              ariaLabel="Filter projects by operational status"
              options={[
                { value: "all", label: "All", count: metrics.total },
                { value: "ongoing", label: "Ongoing", count: metrics.ongoing },
                { value: "proposed", label: "Proposed", count: metrics.proposed },
                { value: "completed", label: "Completed", count: metrics.completed },
              ]}
            />

            {/* Category Sector Dropdown */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200 bg-white">
                <SelectValue placeholder="Filter by sector" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">All Sectors</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 gap-1"
                title="Reset all filters"
              >
                <FilterX className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Counter bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-700 font-semibold">{filteredProjects.length}</strong> of{" "}
            {projects.length} cause initiatives
          </span>
          {hasActiveFilters && (
            <span className="text-[#1E3A5F] font-medium">Filtered subset active</span>
          )}
        </div>
      </div>

      {/* 4. Desktop & Tablet Redesigned Table View */}
      <div className="hidden md:block">
        <Card className="shadow-xs border-slate-200/90 overflow-hidden">
          <CardContent className="p-0">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-700">No matching projects found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting your search query, selecting another sector, or clearing filters.
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
                  <TableRow className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-700 tracking-wider">
                    <TableHead className="py-3 px-4 w-[42%] text-slate-700">Cause Initiative / Scope</TableHead>
                    <TableHead className="py-3 px-3 w-[18%] text-slate-700">Location</TableHead>
                    <TableHead className="py-3 px-3 w-[16%] text-slate-700">Operational Status</TableHead>
                    <TableHead className="py-3 px-3 w-[14%] text-slate-700">Timeline / Created</TableHead>
                    <TableHead className="py-3 px-4 text-right w-[10%] text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {paginatedProjects.map((p) => {
                    const isCompleted = p.status === "completed";
                    const isUpdating = updatingStatusId === p.id;

                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                        {/* 1. Combined Identity Cell: Title + Category Pill + Partners */}
                        <TableCell className="py-3 px-4">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleOpenPreview(p)}
                                className="font-semibold text-slate-900 hover:text-[#1E3A5F] hover:underline text-left text-sm leading-snug line-clamp-1"
                                title="Click to view full project dossier"
                              >
                                {p.title}
                              </button>
                              {p.category && (
                                <ProjectCategoryBadge category={p.category} />
                              )}
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {p.description}
                            </p>

                            {p.partners && p.partners.length > 0 && (
                              <p className="text-xs text-slate-600 flex items-center gap-1.5 truncate mt-0.5">
                                <Users className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                <span>Partners: <strong className="text-slate-800 font-medium">{p.partners.join(", ")}</strong></span>
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* 2. Concise Location */}
                        <TableCell className="py-3 px-3 text-slate-800 font-medium text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="h-3.5 w-3.5 text-[#D4A017] shrink-0" />
                            <span className="truncate">{p.location}</span>
                          </div>
                        </TableCell>

                        {/* 3. Refined Status Control (Compact Dropdown Affordance) */}
                        <TableCell className="py-3 px-3">
                          <div className="flex items-center">
                            {isUpdating ? (
                              <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 font-sans">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1E3A5F]" />
                                <span className="text-xs">Updating...</span>
                              </div>
                            ) : (
                              <Select
                                value={p.status}
                                onValueChange={(val: "proposed" | "ongoing" | "completed") =>
                                  handleInlineStatusChange(p, val)
                                }
                              >
                                <SelectTrigger
                                  className="h-7 w-[120px] text-xs font-medium border-slate-200/90 bg-white hover:bg-slate-50 shadow-2xs gap-1 focus:ring-1 focus:ring-[#1E3A5F] px-2"
                                  title="Change operational status"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                                    <span
                                      className={`h-2 w-2 rounded-full shrink-0 ${
                                        p.status === "completed"
                                          ? "bg-emerald-600"
                                          : p.status === "ongoing"
                                          ? "bg-[#1E3A5F]"
                                          : "bg-amber-500"
                                      }`}
                                    />
                                    <span className="capitalize truncate text-slate-900 text-xs font-medium">
                                      {p.status}
                                    </span>
                                  </div>
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                  <SelectItem value="proposed" className="text-xs cursor-pointer font-medium">
                                    <span className="inline-flex items-center gap-1.5 text-amber-900">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                      Proposed
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="ongoing" className="text-xs cursor-pointer font-medium">
                                    <span className="inline-flex items-center gap-1.5 text-[#1E3A5F]">
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#1E3A5F]" />
                                      Ongoing
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="completed" className="text-xs cursor-pointer font-medium">
                                    <span className="inline-flex items-center gap-1.5 text-emerald-900">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                      Completed
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>

                        {/* 4. Timeline / Created */}
                        <TableCell className="py-3 px-3 text-slate-600 font-sans">
                          <div className="space-y-0.5">
                            {p.timeline ? (
                              <span className="block font-semibold text-slate-800 text-xs truncate">
                                {p.timeline}
                              </span>
                            ) : null}
                            <span className="block text-xs text-slate-500">
                              Created {new Date(p.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </TableCell>

                        {/* 5. Contextual Action Menu */}
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(p)}
                              className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1 font-medium"
                              title="Edit project details"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                  aria-label={`Actions for ${p.title}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 text-xs font-sans">
                                <DropdownMenuItem
                                  onClick={() => handleOpenPreview(p)}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                                  View Project Dossier
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleOpenEdit(p)}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                  Edit Full Blueprint
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                  <Link
                                    to={`/projects/${p.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="gap-2 cursor-pointer flex items-center"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                                    View Live Public Page
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                  <Link
                                    to="/admin/hours"
                                    className="gap-2 cursor-pointer flex items-center"
                                  >
                                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                                    Verify Linked Hours
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                  <Link
                                    to="/admin/portfolio"
                                    className="gap-2 cursor-pointer flex items-center"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                                    Review Portfolio Entries
                                  </Link>
                                </DropdownMenuItem>

                                {(currentUserRole === "super_admin" || currentUserRole === "admin") && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleOpenDelete(p)}
                                      className="gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete Project Blueprint
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

            {/* Pagination Controls */}
            {filteredProjects.length > pageSize && (
              <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50/50 text-xs">
                <span className="text-slate-500">
                  Page <strong className="text-slate-700">{currentPage}</strong> of {totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2 text-xs"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Mobile Native Card Stack View (< 768px) */}
      <div className="md:hidden space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400 space-y-2">
            <AlertCircle className="h-7 w-7 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-700">No matching projects found</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs h-8">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          paginatedProjects.map((p) => {
            const isUpdating = updatingStatusId === p.id;

            return (
              <div
                key={p.id}
                className="bg-white rounded-lg border border-slate-200/90 p-4 space-y-3 shadow-xs"
              >
                {/* Header: Title, Category & Contextual Action Menu */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(p)}
                      className="font-serif font-bold text-slate-900 text-base leading-snug text-left hover:text-[#1E3A5F]"
                    >
                      {p.title}
                    </button>
                    <div className="flex items-center gap-2 flex-wrap">
                      <ProjectStatusBadge status={p.status} />
                      {p.category && <ProjectCategoryBadge category={p.category} />}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 p-0 text-slate-500 hover:text-slate-800 shrink-0"
                        aria-label={`Actions for ${p.title}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 text-xs font-sans">
                      <DropdownMenuItem
                        onClick={() => handleOpenPreview(p)}
                        className="gap-2 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        View Dossier
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleOpenEdit(p)}
                        className="gap-2 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        Edit Blueprint
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          to={`/projects/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="gap-2 cursor-pointer flex items-center"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                          View Live Public Page
                        </Link>
                      </DropdownMenuItem>

                      {(currentUserRole === "super_admin" || currentUserRole === "admin") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenDelete(p)}
                            className="gap-2 text-rose-600 focus:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Blueprint
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description snippet */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>

                {/* Metadata Row: Location & Timeline */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-y-1 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-[#D4A017] shrink-0" />
                    {p.location}
                  </span>
                  {p.timeline && (
                    <span className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                      <Calendar className="h-3 w-3 text-slate-500 shrink-0" />
                      {p.timeline}
                    </span>
                  )}
                </div>

                {/* Partners List */}
                {p.partners && p.partners.length > 0 && (
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50/80 p-2 rounded border border-slate-200/60 truncate">
                    <Users className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Partners: <strong className="text-slate-800 font-medium">{p.partners.join(", ")}</strong></span>
                  </p>
                )}

                {/* Action Buttons & Status Selector */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex-1">
                    {isUpdating ? (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1E3A5F]" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <Select
                        value={p.status}
                        onValueChange={(val: "proposed" | "ongoing" | "completed") =>
                          handleInlineStatusChange(p, val)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs border-slate-200 bg-white">
                          <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="proposed">Proposed</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(p)}
                    className="h-8 text-xs px-3 border-slate-300 gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenPreview(p)}
                    className="h-8 text-xs px-2 text-slate-600 hover:text-slate-900"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> Details
                  </Button>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {filteredProjects.length > pageSize && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Comprehensive Project Overview / Inspection Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {previewProject && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ProjectStatusBadge status={previewProject.status} />
                      {previewProject.category && (
                        <ProjectCategoryBadge category={previewProject.category} />
                      )}
                    </div>
                    <DialogTitle className="font-serif text-[#1E3A5F] text-xl font-bold leading-snug">
                      {previewProject.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-[#D4A017] shrink-0" />
                      <span>{previewProject.location}</span>
                      {previewProject.timeline && (
                        <>
                          <span className="text-slate-300">•</span>
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{previewProject.timeline}</span>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                {/* Cover Image */}
                {previewProject.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 h-48 bg-slate-100">
                    <img
                      src={previewProject.imageUrl}
                      alt={previewProject.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80";
                      }}
                    />
                  </div>
                )}

                {/* Description Dossier */}
                <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Initiative Description
                  </span>
                  <p className="text-slate-700 leading-relaxed text-xs whitespace-pre-line">
                    {previewProject.description}
                  </p>
                </div>

                {/* Partners List */}
                {previewProject.partners && previewProject.partners.length > 0 && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Cooperating Partners
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewProject.partners.map((partner, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-[11px]"
                        >
                          {partner}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completion Data if completed */}
                {previewProject.status === "completed" && (
                  <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200/80 space-y-3">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-semibold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Concluded Impact Assessment</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Official Completion Date
                        </span>
                        <span className="font-medium">
                          {previewProject.completedAt
                            ? new Date(previewProject.completedAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "Recorded as completed"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Beneficiaries Reached
                        </span>
                        <strong className="text-emerald-800 text-sm font-semibold">
                          {previewProject.beneficiariesReached
                            ? `${previewProject.beneficiariesReached.toLocaleString()} citizens`
                            : "Unspecified"}
                        </strong>
                      </div>
                    </div>

                    {previewProject.completionSummary && (
                      <div className="pt-2 border-t border-emerald-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                          Impact Summary
                        </span>
                        <p className="text-slate-700 leading-relaxed text-xs">
                          {previewProject.completionSummary}
                        </p>
                      </div>
                    )}

                    {previewProject.reportUrl && (
                      <div className="pt-1">
                        <a
                          href={previewProject.reportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-900 font-medium underline text-xs"
                        >
                          <FileText className="h-3.5 w-3.5 text-emerald-700" /> Download Concluded Project Report (.pdf)
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Associated Admin Modules Quicklinks */}
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Associated Operations:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs border-slate-300">
                      <Link to="/admin/hours">
                        <Clock className="h-3 w-3 mr-1 text-[#D4A017]" /> Verified Hours
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs border-slate-300">
                      <Link to="/admin/portfolio">
                        <FileText className="h-3 w-3 mr-1 text-[#1E3A5F]" /> Portfolios
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs border-slate-300">
                      <Link to={`/projects/${previewProject.id}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1 text-slate-500" /> Public Page
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100 mt-2">
                <Button
                  onClick={() => {
                    const p = previewProject;
                    setPreviewOpen(false);
                    if (p) handleOpenEdit(p);
                  }}
                  className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs h-9 gap-1.5 font-medium"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Project
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewOpen(false)}
                  className="text-xs h-9"
                >
                  Close Dossier
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. Slide-over Form Modal with Responsive Two-Column Workspace */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">
              {editingProject ? "Edit Project Details" : "Register New Project"}
            </DialogTitle>
            <DialogDescription>
              Complete the project dossier details. Reconcile timelines, sectors, and NGO coordinators with real-time card preview.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSaveProject)} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Fields (approx 65%) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    disabled={saving}
                    className={errors.title ? "border-destructive" : ""}
                    {...register("title")}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive font-medium">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Project Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    disabled={saving}
                    className={errors.description ? "border-destructive" : ""}
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive font-medium">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="location">Geographic Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g. Tamale, Ghana"
                      disabled={saving}
                      className={errors.location ? "border-destructive" : ""}
                      {...register("location")}
                    />
                    {errors.location && (
                      <p className="text-xs text-destructive font-medium">{errors.location.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category / Sector</Label>
                    <Input
                      id="category"
                      placeholder="e.g. Water & Sanitation"
                      disabled={saving}
                      {...register("category")}
                    />
                    {/* Common sector suggestions */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {COMMON_SECTORS.map((sector) => (
                        <button
                          key={sector}
                          type="button"
                          onClick={() => setValue("category", sector, { shouldDirty: true })}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                            watchCategory === sector
                              ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {sector}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="status">Project Phase / Status</Label>
                    <Select
                      disabled={saving}
                      value={watch("status")}
                      onValueChange={(val: any) => setValue("status", val, { shouldValidate: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proposed">Proposed</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="timeline">Timeline Scope</Label>
                    <Input
                      id="timeline"
                      placeholder="e.g. Q3 2026 - Q2 2027"
                      disabled={saving}
                      {...register("timeline")}
                    />
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-1.5">
                  <Label>Project Cover Image</Label>
                  <FileUploader
                    bucket="bih-media"
                    folder="projects"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    multiple={false}
                    maxSizeMB={25}
                    value={watch("imageUrl") ? [watch("imageUrl")!] : []}
                    onChange={(urls) => setValue("imageUrl", urls[0] || "", { shouldDirty: true })}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="partners">Cooperating Partners (Comma-separated)</Label>
                  <Input
                    id="partners"
                    placeholder="e.g. UNICEF, WaterAid, Local Assembly"
                    disabled={saving}
                    {...register("partners")}
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Separate partner names with commas to list them under metadata metrics.
                  </p>
                </div>

                {/* Conditional Completion Section */}
                {watch("status") === "completed" && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#6B8E3E] text-white">Project Completion Details</Badge>
                      <span className="text-xs text-muted-foreground">Capture impact metrics and evidence</span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="completedAt">Completion Date</Label>
                        <Input
                          id="completedAt"
                          type="date"
                          disabled={saving}
                          {...register("completedAt")}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="beneficiariesReached">Beneficiaries Reached</Label>
                        <Input
                          id="beneficiariesReached"
                          type="number"
                          min="0"
                          placeholder="e.g. 1500"
                          disabled={saving}
                          {...register("beneficiariesReached")}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="completionSummary">Completion & Impact Summary</Label>
                      <Textarea
                        id="completionSummary"
                        rows={3}
                        placeholder="Detail the project's achievements, key outcomes, and lasting community impact..."
                        disabled={saving}
                        {...register("completionSummary")}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Project Evidence Gallery (Images)</Label>
                      <FileUploader
                        bucket="bih-media"
                        folder="projects/gallery"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        multiple={true}
                        maxSizeMB={25}
                        value={watch("galleryUrls") || []}
                        onChange={(urls) => setValue("galleryUrls", urls, { shouldDirty: true })}
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Final Report (PDF)</Label>
                      <FileUploader
                        bucket="bih-media"
                        folder="projects/reports"
                        accept="application/pdf,.pdf"
                        multiple={false}
                        maxSizeMB={25}
                        value={watch("reportUrl") ? [watch("reportUrl")!] : []}
                        onChange={(urls) => setValue("reportUrl", urls[0] || "", { shouldDirty: true })}
                        disabled={saving}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live Project Card Preview & Context (approx 35%) */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-pulse" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                        Live Public Card Preview
                      </h4>
                    </div>
                
                  </div>

                  {/* Public Project Card */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
                    <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                      <img
                        src={watchImageUrl || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80"}
                        alt={watchTitle || "Project"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80";
                        }}
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <ProjectStatusBadge status={watchStatus} />
                      </div>
                      {watchCategory && (
                        <div className="absolute top-2.5 right-2.5">
                          <ProjectCategoryBadge category={watchCategory} className="bg-white/95 shadow-2xs" />
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 space-y-2 text-xs">
                      <h5 className="font-serif font-bold text-[#1E3A5F] text-sm leading-snug line-clamp-1">
                        {watchTitle?.trim() || "Untitled Project (Draft)"}
                      </h5>
                      <p className="text-slate-600 line-clamp-2 leading-relaxed text-[11px]">
                        {watchDescription?.trim() || "Project description will appear here..."}
                      </p>
                      <div className="space-y-1 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3 w-3 text-[#D4A017] shrink-0" />
                          <span>{watchLocation || "Location"}</span>
                        </p>
                        {watchTimeline && (
                          <p className="flex items-center gap-1.5 truncate">
                            <Calendar className="h-3 w-3 text-[#D4A017] shrink-0" />
                            <span>{watchTimeline}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contextual Workflow Guidance */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-[11px]">
                    <Info className="h-3.5 w-3.5 text-[#D4A017]" />
                    <span>Workflow & Lifecycle Status</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {watchStatus === "proposed" && "Proposed projects are visible in the public community review queue for volunteer expressions of interest."}
                    {watchStatus === "ongoing" && "Ongoing projects accept volunteer hour logs and NGO coordinator endorsements."}
                    {watchStatus === "completed" && "Completed projects update public impact metrics and are archived in the historical impact gallery."}
                  </p>
                  <p className="text-[10px] text-slate-400 border-t border-slate-200/60 pt-1.5">
                    Recommended cover image: 16:9 landscape aspect ratio (JPG, PNG, WebP up to 25MB).
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs h-9 flex gap-1.5 font-medium shadow-2xs"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 8. Completion Confirmation Dialog */}
      <Dialog open={completionModalOpen} onOpenChange={setCompletionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">
              Mark Project as Completed
            </DialogTitle>
            <DialogDescription className="text-xs">
              Marking <span className="font-semibold text-slate-800">"{completingProject?.title}"</span> as completed.
              Please specify the official project completion date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="completionDateInput">Completion Date</Label>
              <Input
                id="completionDateInput"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Defaults to today ({new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}).
              </p>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Next Step:</p>
              <p>
                After confirming, edit the project anytime to attach completion summaries, beneficiary reach counts, gallery photos, and final report PDFs.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="ghost"
              onClick={() => setCompletionModalOpen(false)}
              className="text-xs h-9"
              disabled={updatingStatusId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={updatingStatusId !== null || !completionDate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 flex gap-1.5 font-medium"
            >
              {updatingStatusId !== null && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Delete Confirmation Alert with Active Records Safeguard */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteDialogOpen(open);
            if (!open) {
              setDeletingProject(null);
              setDeletionEligibility(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Delete Project Blueprint
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-xs pt-1">
              {deletingProject ? (
                <>Target: <span className="font-semibold text-slate-900">{deletingProject.title}</span></>
              ) : (
                "Project deletion safeguard"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3">
            {checkingEligibility ? (
              <div className="flex items-center justify-center gap-2 py-6 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#1E3A5F]" />
                <span>Checking volunteer hours and portfolio dependencies...</span>
              </div>
            ) : deletionEligibility && !deletionEligibility.canDelete ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-900 text-xs">Deletion Blocked: Project Has Linked Records</p>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      {deletionEligibility.reason}
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 bg-white/80 p-2.5 rounded border border-amber-150">
                  <p className="font-medium text-slate-700">Audit & Recognition Protection:</p>
                  <p className="mt-0.5">To preserve volunteer hours and showcase entries for community recognition, mark this project as <strong>"Completed"</strong> instead of deleting it.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-3 text-rose-900 text-xs space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="h-4 w-4 text-rose-600" /> Irreversible Action
                  </p>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    This project has zero linked volunteer hours or portfolio records. Deleting it will permanently erase the project dossier and all milestones from the system.
                  </p>
                </div>
                <p className="text-slate-500 text-[11px] italic">
                  Are you sure you want to permanently delete <strong>"{deletingProject?.title}"</strong>?
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingProject(null);
                setDeletionEligibility(null);
              }}
              className="text-xs h-9"
              disabled={deleting}
            >
              Cancel
            </Button>

            {deletionEligibility && !deletionEligibility.canDelete ? (
              <Button
                onClick={() => {
                  const target = deletingProject;
                  setDeleteDialogOpen(false);
                  setDeletingProject(null);
                  setDeletionEligibility(null);
                  if (target) {
                    handleInlineStatusChange(target, "completed");
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-medium"
              >
                Mark as Completed Instead
              </Button>
            ) : (
              <Button
                onClick={handleDeleteConfirm}
                disabled={deleting || checkingEligibility || (deletionEligibility ? !deletionEligibility.canDelete : false)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex gap-1.5 font-medium"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete Project
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProjectsPage;
