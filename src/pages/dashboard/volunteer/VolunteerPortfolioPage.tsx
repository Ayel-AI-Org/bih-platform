import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { uploadStorageFile } from "@/database/operations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash, Pencil, Send, Eye, ShieldAlert, Archive, Undo, Loader2, Upload } from "lucide-react";

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  rolePlayed: string;
  projectId: string | null;
  projectTitle: string;
  mediaUrls: string[];
  status: "draft" | "pending" | "published" | "archived";
  visibility: "public" | "internal";
  createdAt: string;
}

const portfolioFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  rolePlayed: z.string().min(1, "Role description is required"),
  projectId: z.string().optional().or(z.literal("")),
  visibility: z.boolean(), // true = public, false = internal
});

const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 25 * 1024 * 1024, "File size must be under 25MB")
  .refine(
    (file) => file.type.startsWith("image/") || file.type === "video/mp4",
    "Only images and MP4 videos are accepted"
  );

type PortfolioFormValues = z.infer<typeof portfolioFormSchema>;

const VolunteerPortfolioPage = () => {
  const { toast } = useToast();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal forms states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([""]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Details dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<PortfolioItem | null>(null);

  // Delete confirm dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: {
      title: "",
      description: "",
      rolePlayed: "",
      projectId: "",
      visibility: false,
    },
  });

  const fetchPortfolioData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Projects list
      const { data: projList } = await supabase
        .from("projects")
        .select("id, title")
        .in("status", ["ongoing", "completed"]);

      setProjects(projList || []);

      // 2. Fetch Portfolio entries
      const { data: portfolioList, error: portErr } = await supabase
        .from("portfolio_entries")
        .select("id, title, description, role_played, project_id, media_urls, status, visibility, created_at, projects(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (portErr) throw portErr;

      setPortfolio(
        (portfolioList || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          rolePlayed: row.role_played,
          projectId: row.project_id,
          projectTitle: row.projects?.title || "None (General Action)",
          mediaUrls: row.media_urls || [],
          status: row.status as any,
          visibility: row.visibility as any,
          createdAt: row.created_at,
        }))
      );
    } catch (err: any) {
      toast({
        title: "Database retrieval error",
        description: err.message || "Failed to load showcase portfolio entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setMediaUrls([""]);
    reset({
      title: "",
      description: "",
      rolePlayed: "",
      projectId: "",
      visibility: false,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setMediaUrls(item.mediaUrls.length > 0 ? [...item.mediaUrls] : [""]);
    reset({
      title: item.title,
      description: item.description,
      rolePlayed: item.rolePlayed,
      projectId: item.projectId || "",
      visibility: item.visibility === "public",
    });
    setModalOpen(true);
  };

  const handleSavePortfolio = async (values: PortfolioFormValues) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active credentials session found.");

      const filteredMedia = mediaUrls
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      const payload = {
        user_id: user.id,
        title: values.title,
        description: values.description,
        role_played: values.rolePlayed,
        project_id: values.projectId || null,
        media_urls: filteredMedia,
        visibility: values.visibility ? "public" : "internal",
      };

      if (editingItem) {
        const { error } = await supabase
          .from("portfolio_entries")
          .update(payload)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({
          title: "Entry updated",
          description: `"${values.title}" has been successfully updated.`,
        });
      } else {
        const { error } = await supabase.from("portfolio_entries").insert({
          ...payload,
          status: "draft",
        });

        if (error) throw error;
        toast({
          title: "Entry created",
          description: `"${values.title}" has been saved as draft.`,
        });
      }

      setModalOpen(false);
      fetchPortfolioData();
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
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("portfolio_entries")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;
      toast({
        title: "Entry deleted",
        description: "Portfolio showcase record removed successfully.",
      });

      setDeleteDialogOpen(false);
      fetchPortfolioData();
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

  const handleUpdateStatus = async (id: string, newStatus: string, successMessage: string) => {
    try {
      const { error } = await supabase
        .from("portfolio_entries")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Status updated",
        description: successMessage,
      });
      fetchPortfolioData();
    } catch (err: any) {
      toast({
        title: "Operation failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleAddMediaField = () => {
    if (mediaUrls.length >= 5) return;
    setMediaUrls((prev) => [...prev, ""]);
  };

  const handleRemoveMediaField = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMediaUrlChange = (index: number, value: string) => {
    setMediaUrls((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const validation = fileSchema.safeParse(file);
    if (!validation.success) {
      const errMsg = validation.error.errors[0].message;
      setUploadError(errMsg);
      toast({
        title: "Invalid file",
        description: errMsg,
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active session found.");

      const path = `portfolio/${user.id}/${Date.now()}_${file.name}`;
      const publicUrl = await uploadStorageFile("bih-media", path, file);

      setMediaUrls((prev) => {
        const firstEmptyIndex = prev.findIndex((url) => !url.trim());
        if (firstEmptyIndex !== -1) {
          const updated = [...prev];
          updated[firstEmptyIndex] = publicUrl;
          return updated;
        }
        if (prev.length < 5) {
          return [...prev, publicUrl];
        }
        return prev;
      });

      toast({
        title: "Upload complete",
        description: "File uploaded and added to your media attachments.",
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload file to storage.",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Portfolio Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and publish showcases of your volunteer impact contributions.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white gap-1.5 h-9"
        >
          <Plus className="h-4 w-4" /> New Showcase
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          {portfolio.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm">No portfolio items registered. Click "New Showcase" to begin.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Showcase Title</TableHead>
                      <TableHead>Linked Project</TableHead>
                      <TableHead>Date Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/30 text-xs">
                        <TableCell className="font-semibold text-slate-800">{item.title}</TableCell>
                        <TableCell className="text-slate-600 truncate max-w-[150px]">{item.projectTitle}</TableCell>
                        <TableCell className="text-slate-500 font-sans">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[9px] uppercase font-bold tracking-wider border-none text-white ${
                              item.status === "published"
                                ? "bg-[#1E3A5F]"
                                : item.status === "archived"
                                ? "bg-[#C0392B]"
                                : item.status === "pending"
                                ? "bg-[#D4A017]"
                                : "bg-slate-400"
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {/* View Action (All states) */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedViewItem(item);
                                setViewDialogOpen(true);
                              }}
                              className="h-8 w-8 text-slate-500 hover:text-slate-800"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Draft specific actions */}
                            {item.status === "draft" && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleOpenEdit(item)}
                                  className="h-8 w-8 text-[#1E3A5F] hover:text-[#1E3A5F]/85"
                                  title="Edit entry"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    handleUpdateStatus(
                                      item.id,
                                      "pending",
                                      `"${item.title}" submitted for review.`
                                    )
                                  }
                                  className="h-8 w-8 text-amber-600 hover:text-amber-800"
                                  title="Submit for review"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleOpenDelete(item.id)}
                                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                  title="Delete draft"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {/* Pending specific actions */}
                            {item.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleUpdateStatus(
                                    item.id,
                                    "draft",
                                    `"${item.title}" withdrawn back to draft status.`
                                  )
                                }
                                className="h-7 px-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] flex gap-1"
                              >
                                <Undo className="h-3 w-3" /> Withdraw
                              </Button>
                            )}

                            {/* Published specific actions */}
                            {item.status === "published" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleUpdateStatus(
                                    item.id,
                                    "archived",
                                    `"${item.title}" has been archived.`
                                  )
                                }
                                className="h-7 px-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-[10px] flex gap-1"
                              >
                                <Archive className="h-3 w-3" /> Archive
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="md:hidden divide-y divide-slate-100">
                {portfolio.map((item) => (
                  <div key={item.id} className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-slate-800">{item.title}</h4>
                      <Badge
                        className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                          item.status === "published"
                            ? "bg-[#1E3A5F]"
                            : item.status === "archived"
                            ? "bg-[#C0392B]"
                            : item.status === "pending"
                            ? "bg-[#D4A017]"
                            : "bg-slate-400"
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-slate-500 font-sans">
                      <span>Project: <strong className="text-slate-700 font-medium">{item.projectTitle}</strong></span>
                      <span>
                        Created:{" "}
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex justify-end items-center gap-1.5 pt-2 border-t border-slate-50">
                      {/* View Action (All states) */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedViewItem(item);
                          setViewDialogOpen(true);
                        }}
                        className="h-7 px-2 text-[10px] flex gap-1 border-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>

                      {/* Draft actions */}
                      {item.status === "draft" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7 px-2 text-[10px] flex gap-1 text-[#1E3A5F] border-slate-200"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleUpdateStatus(
                                item.id,
                                "pending",
                                `"${item.title}" submitted for review.`
                              )
                            }
                            className="h-7 px-2 text-[10px] flex gap-1 text-amber-600 border-slate-200 animate-pulse"
                          >
                            <Send className="h-3.5 w-3.5" /> Submit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDelete(item.id)}
                            className="h-7 px-2 text-[10px] flex gap-1 text-rose-600 border-rose-100 hover:bg-rose-50"
                          >
                            <Trash className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </>
                      )}

                      {/* Pending Action */}
                      {item.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(
                              item.id,
                              "draft",
                              `"${item.title}" withdrawn back to draft status.`
                            )
                          }
                          className="h-7 px-2 border-slate-200 text-slate-600 text-[10px] flex gap-1"
                        >
                          <Undo className="h-3 w-3" /> Withdraw
                        </Button>
                      )}

                      {/* Published Action */}
                      {item.status === "published" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUpdateStatus(
                              item.id,
                              "archived",
                              `"${item.title}" has been archived.`
                            )
                          }
                          className="h-7 px-2 border-rose-200 text-rose-600 text-[10px] flex gap-1"
                        >
                          <Archive className="h-3 w-3" /> Archive
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Slide-over Form Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">
              {editingItem ? "Edit Showcase Entry" : "Create Showcase Entry"}
            </DialogTitle>
            <DialogDescription>
              Complete the details below to add this showcase to your impact portfolio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleSavePortfolio)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Showcase Title</Label>
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
              <Label htmlFor="description">Showcase Description</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="rolePlayed">Role Played</Label>
              <Input
                id="rolePlayed"
                placeholder="e.g. Lead Facilitator, Materials Coordinator"
                disabled={saving}
                className={errors.rolePlayed ? "border-destructive" : ""}
                {...register("rolePlayed")}
              />
              {errors.rolePlayed && (
                <p className="text-xs text-destructive font-medium">{errors.rolePlayed.message}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="projectId">Linked Project (optional)</Label>
                <Select
                  disabled={saving}
                  defaultValue={editingItem?.projectId || ""}
                  onValueChange={(val) => setValue("projectId", val, { shouldValidate: true })}
                >
                  <SelectTrigger id="projectId">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (General Action)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center space-x-2 pb-2">
                  <Switch
                    id="visibility"
                    disabled={saving}
                    defaultChecked={editingItem?.visibility === "public"}
                    onCheckedChange={(val) => setValue("visibility", val, { shouldValidate: true })}
                  />
                  <Label htmlFor="visibility">Public Visibility</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Public entries can be viewed on public portfolios; internal only displays to NGO partners.
                </p>
              </div>
            </div>

            {/* Repeatable Media URL Inputs */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <Label>Media URLs (up to 5 links)</Label>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="file"
                      id="media-file-upload"
                      accept="image/*,video/mp4"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={saving || uploadingFile || mediaUrls.length >= 5}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-[#1E3A5F] hover:bg-slate-50 text-[10px] h-7 px-2 flex gap-1 items-center"
                      disabled={saving || uploadingFile || mediaUrls.length >= 5}
                    >
                      {uploadingFile ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Upload File
                    </Button>
                  </div>
                  {mediaUrls.length < 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleAddMediaField}
                      className="text-[#1E3A5F] hover:bg-slate-50 text-[10px] h-7 px-2 flex gap-1"
                      disabled={saving || uploadingFile}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Link
                    </Button>
                  )}
                </div>
              </div>
              {uploadError && (
                <p className="text-xs text-rose-600 font-medium pb-1">{uploadError}</p>
              )}
              <div className="space-y-2">
                {mediaUrls.map((url, index) => (
                  <div key={`media-url-${index}`} className="flex gap-2 items-center">
                    <Input
                      placeholder="https://images.unsplash.com/photo-..."
                      value={url}
                      disabled={saving}
                      onChange={(e) => handleMediaUrlChange(index, e.target.value)}
                      className="text-xs"
                    />
                    {mediaUrls.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemoveMediaField(index)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-9 w-9 p-0 flex-shrink-0"
                        title="Remove link"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
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
                {editingItem ? "Save Changes" : "Save as Draft"}
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
              Are you sure you want to permanently delete this portfolio draft? This action is irreversible.
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
              Delete Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md overflow-y-auto max-h-[85vh]">
          {selectedViewItem && (
            <div className="space-y-4 pt-2">
              <DialogHeader>
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <DialogTitle className="font-serif text-[#1E3A5F] text-xl font-bold">
                    {selectedViewItem.title}
                  </DialogTitle>
                  <Badge
                    className={`text-[9px] uppercase font-bold tracking-wider border-none text-white ${
                      selectedViewItem.status === "published"
                        ? "bg-[#1E3A5F]"
                        : selectedViewItem.status === "archived"
                        ? "bg-[#C0392B]"
                        : selectedViewItem.status === "pending"
                        ? "bg-[#D4A017]"
                        : "bg-slate-400"
                    }`}
                  >
                    {selectedViewItem.status}
                  </Badge>
                </div>
                <DialogDescription className="text-xs font-sans">
                  Project: {selectedViewItem.projectTitle} · Created{" "}
                  {new Date(selectedViewItem.createdAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-0.5">Role Played:</h4>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded border">{selectedViewItem.rolePlayed}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-0.5">Showcase Description:</h4>
                  <p className="text-slate-650 whitespace-pre-line">{selectedViewItem.description}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">Visibility Level:</h4>
                  <Badge variant="outline" className="capitalize text-[10px] px-2 py-0">
                    {selectedViewItem.visibility}
                  </Badge>
                </div>

                {selectedViewItem.mediaUrls.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <h4 className="font-semibold text-slate-800">Media Attachments</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedViewItem.mediaUrls.map((url, index) => (
                        <a
                          key={`attachment-${index}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded border hover:opacity-85 transition-opacity"
                        >
                          <img
                            src={url}
                            alt={`Attachment ${index + 1}`}
                            className="h-24 w-full object-cover bg-slate-100"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = "/placeholder.svg";
                            }}
                          />
                          <span className="block text-[8px] text-center p-1 bg-slate-50 text-slate-500 font-mono truncate">
                            {url}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="pt-2 border-t">
                <Button
                  onClick={() => setViewDialogOpen(false)}
                  className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs h-9"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VolunteerPortfolioPage;
