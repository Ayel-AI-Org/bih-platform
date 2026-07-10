import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash, Download, Loader2, AlertCircle } from "lucide-react";

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

  const {
    register,
    handleSubmit,
    setValue,
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
    },
  });

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
      });
      setModalOpen(true);
      // Clear parameters to prevent modal reopening on later operations
      setSearchParams({});
    }
  }, [searchParams]);

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

      const payload = {
        title: values.title,
        description: values.description,
        location: values.location,
        category: values.category || null,
        status: values.status,
        timeline: values.timeline || null,
        image_url: values.imageUrl || null,
        partners: partnerArray,
        created_by: user.id,
      };

      if (editingProject) {
        // Update existing row
        const { error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", editingProject.id);

        if (error) throw error;

        toast({
          title: "Project updated",
          description: `"${values.title}" has been successfully updated.`,
        });
      } else {
        // Insert new row
        const { error } = await supabase.from("projects").insert(payload);
        if (error) throw error;

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
      const { error } = await supabase.from("projects").delete().eq("id", deletingId);
      if (error) throw error;

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

    const headers = ["Title", "Location", "Category", "Status", "Date Created", "Partners"];
    const rows = projects.map((p) => [
      p.title,
      p.location,
      p.category,
      p.status,
      new Date(p.createdAt).toLocaleDateString(),
      p.partners.join(";"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

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
                        <Badge
                          className={`text-[10px] uppercase font-bold tracking-wider font-sans border-none text-white ${
                            p.status === "completed"
                              ? "bg-[#6B8E3E] hover:bg-[#6B8E3E]/90"
                              : p.status === "ongoing"
                              ? "bg-[#1E3A5F] hover:bg-[#1E3A5F]/90"
                              : "bg-[#C8601A] hover:bg-[#C8601A]/90"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 font-sans">
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(p)}
                            className="h-8 w-8 text-slate-500 hover:text-slate-800"
                            title="Edit project"
                          >
                            <Pencil className="h-4 w-4" />
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

      {/* Slide-over Form Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">
              {editingProject ? "Edit Project Details" : "Register New Project"}
            </DialogTitle>
            <DialogDescription>
              Complete the project dossier details. Reconcile timelines and NGO coordinators.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSaveProject)} className="space-y-4 pt-2">
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
                  defaultValue={editingProject?.status || "proposed"}
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

            <div className="space-y-1.5">
              <Label htmlFor="imageUrl">Project Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://images.unsplash.com/..."
                disabled={saving}
                {...register("imageUrl")}
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
