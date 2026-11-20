import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash, Download, Loader2, AlertCircle, MapPin, Calendar, Info } from "lucide-react";

interface AdminProjectItem {
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

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<AdminProjectItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      // Clear parameters to prevent modal reopening on later operations
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
        // Update existing row
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
        // Insert new row
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

    // Moving to proposed or ongoing (including admin correction completed -> ongoing)
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
        description: `"${completingProject.title}" marked as completed. Use "Edit" to attach gallery photos and report evidence.`,
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

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    if (currentUserRole !== "super_admin") {
      toast({
        title: "Unauthorized action",
        description: "Only a Super Admin has the clearance to delete project blueprints.",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .delete()
        .eq("id", deletingId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: check your admin role");
      }

      toast({
        title: "Project deleted",
        description: "The project record has been removed.",
      });

      setDeleteDialogOpen(false);
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

  const getExportCSVData = () => {
    if (projects.length === 0) {
      toast({
        title: "No data to export",
        description: "Add projects before downloading registry details.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Title", "Location", "Category", "Status", "Date Created", "Partners", "Beneficiaries Reached"];
    const rows = projects.map((p) => [
      p.title,
      p.location,
      p.category,
      p.status,
      new Date(p.createdAt).toLocaleDateString(),
      p.partners.join(";"),
      p.beneficiariesReached ?? "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bih-projects-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-9 w-48" />
          <div className="h-9 w-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Projects Coordination</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and coordinate cause blueprints, timeline milestones, and organization partners.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button
            onClick={getExportCSVData}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 h-9"
          >
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm">No projects registered. Click "New Project" to register.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/50 text-xs">
                      <TableCell className="font-semibold text-slate-800">
                        {p.title}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {p.location}
                      </TableCell>
                      <TableCell className="capitalize text-slate-500">
                        {p.category || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {updatingStatusId === p.id ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 font-sans">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1E3A5F]" />
                              Updating...
                            </div>
                          ) : (
                            <Select
                              value={p.status}
                              onValueChange={(val: "proposed" | "ongoing" | "completed") =>
                                handleInlineStatusChange(p, val)
                              }
                            >
                              <SelectTrigger
                                className={`h-7 w-[110px] text-[11px] font-bold uppercase tracking-wider border-none text-white shadow-xs focus:ring-1 focus:ring-offset-1 ${
                                  p.status === "completed"
                                    ? "bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 focus:ring-[#6B8E3E]"
                                    : p.status === "ongoing"
                                    ? "bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 focus:ring-[#1E3A5F]"
                                    : "bg-[#C8601A] hover:bg-[#C8601A]/90 focus:ring-[#C8601A]"
                                }`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="proposed" className="text-xs">
                                  Proposed
                                </SelectItem>
                                <SelectItem value="ongoing" className="text-xs">
                                  Ongoing
                                </SelectItem>
                                <SelectItem value="completed" className="text-xs">
                                  Completed
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-sans">
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(p)}
                            className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900 border-slate-300 gap-1.5"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          {currentUserRole === "super_admin" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenDelete(p.id)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete project"
                            >
                              <Trash className="h-4 w-4" />
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

      {/* Slide-over Form Modal with Responsive Two-Column Workspace */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">
              {editingProject ? "Edit Project Details" : "Register New Project"}
            </DialogTitle>
            <DialogDescription>
              Complete the project dossier details. Reconcile timelines and NGO coordinators with real-time card preview.
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
                      placeholder="e.g. Water Sanitation"
                      disabled={saving}
                      {...register("category")}
                    />
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
                    <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300 bg-slate-50 font-sans">
                      Real-time Sync
                    </Badge>
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
                      <Badge
                        className={`absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-wider border-none text-white shadow-xs ${
                          watchStatus === "completed"
                            ? "bg-[#6B8E3E]"
                            : watchStatus === "ongoing"
                            ? "bg-[#1E3A5F]"
                            : "bg-[#C8601A]"
                        }`}
                      >
                        {watchStatus}
                      </Badge>
                      {watchCategory && (
                        <Badge variant="secondary" className="absolute top-2.5 right-2.5 text-[9px] bg-white/90 text-slate-700 font-sans shadow-xs">
                          {watchCategory}
                        </Badge>
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
                className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs h-9 flex gap-1.5"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Completion Confirmation Dialog */}
      <Dialog open={completionModalOpen} onOpenChange={setCompletionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">
              Mark Project as Completed
            </DialogTitle>
            <DialogDescription>
              Marking <span className="font-semibold text-slate-800">"{completingProject?.title}"</span> as completed.
              Please specify the official project completion date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="completionDateInput">Completion Date</Label>
              <Input
                id="completionDateInput"
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Defaults to today ({new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}).
              </p>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Next Step:</p>
              <p>
                After setting the date, you can edit the project at any time to attach completion summaries, beneficiary reach counts, gallery photos, and final report PDFs.
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
              className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white text-xs h-9 flex gap-1.5"
            >
              {updatingStatusId !== null && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this project record? This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex gap-1.5"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProjectsPage;
