import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Eye, Trash, Pin, Calendar, MapPin, ExternalLink, FileText, Info, Loader2, Download, Video } from "lucide-react";
import { type UpdateType } from "@/database/types";
import { VideoEmbed } from "@/components/common/VideoEmbed";

interface AdminMediaItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  category: string;
  imageUrl: string;
  fullStoryUrl: string;
  publishedAt: string | null;
  isPublished: boolean;
  type: UpdateType;
  eventDate?: string | null;
  eventLocation?: string | null;
  eventLink?: string | null;
  galleryUrls: string[];
  attachmentUrl?: string | null;
  videoUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
}

const AdminMediaPage = () => {
  const { toast } = useToast();
  const [articles, setArticles] = useState<AdminMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | UpdateType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const [togglingPublishId, setTogglingPublishId] = useState<string | null>(null);
  const [togglingPinId, setTogglingPinId] = useState<string | null>(null);

  // Dialog States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<AdminMediaItem | null>(null);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("media_articles")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setArticles(
        (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          summary: row.summary || "",
          content: row.content || "",
          author: row.author || "Administrator",
          category: row.category || "News",
          imageUrl: row.image_url || "",
          fullStoryUrl: row.full_story_url || "",
          publishedAt: row.published_at || null,
          isPublished: row.is_published || false,
          type: (row.type as UpdateType) || "media",
          eventDate: row.event_date || null,
          eventLocation: row.event_location || null,
          eventLink: row.event_link || null,
          galleryUrls: Array.isArray(row.gallery_urls) ? row.gallery_urls : [],
          attachmentUrl: row.attachment_url || null,
          videoUrl: row.video_url || null,
          isPinned: row.is_pinned || false,
          createdAt: row.created_at,
        }))
      );
    } catch (err: any) {
      toast({
        title: "Failed to fetch updates",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleTogglePublish = async (item: AdminMediaItem) => {
    setTogglingPublishId(item.id);
    try {
      const newPublishedState = !item.isPublished;
      const { data, error } = await supabase
        .from("media_articles")
        .update({
          is_published: newPublishedState,
          published_at: newPublishedState
            ? item.publishedAt || new Date().toISOString().split("T")[0]
            : item.publishedAt,
        })
        .eq("id", item.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: check your admin role");
      }

      toast({
        title: newPublishedState ? "Update published" : "Moved to drafts",
        description: `"${item.title}" is now ${newPublishedState ? "live" : "in draft mode"}.`,
      });

      fetchArticles();
    } catch (err: any) {
      toast({
        title: "Publish toggle failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTogglingPublishId(null);
    }
  };

  const handleTogglePin = async (item: AdminMediaItem) => {
    setTogglingPinId(item.id);
    try {
      const newPinState = !item.isPinned;
      const { data, error } = await supabase
        .from("media_articles")
        .update({ is_pinned: newPinState })
        .eq("id", item.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: check your admin role");
      }

      toast({
        title: newPinState ? "Pinned to top" : "Unpinned",
        description: `"${item.title}" ${newPinState ? "is now pinned to the top of feeds" : "unpinned"}.`,
      });

      fetchArticles();
    } catch (err: any) {
      toast({
        title: "Pin action failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTogglingPinId(null);
    }
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase
        .from("media_articles")
        .delete()
        .eq("id", deletingId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Permission denied: check your admin role");
      }

      toast({
        title: "Update deleted",
        description: "The item has been permanently removed.",
      });

      setDeleteOpen(false);
      fetchArticles();
    } catch (err: any) {
      toast({
        title: "Deletion failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenPreview = (item: AdminMediaItem) => {
    setPreviewArticle(item);
    setPreviewOpen(true);
  };

  const filteredArticles = articles.filter((art) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      art.title.toLowerCase().includes(q) ||
      art.author.toLowerCase().includes(q) ||
      art.category.toLowerCase().includes(q);

    const matchesType = typeFilter === "all" || art.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && art.isPublished) ||
      (statusFilter === "draft" && !art.isPublished);

    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadge = (type: UpdateType) => {
    switch (type) {
      case "announcement":
        return <Badge className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90 text-[10px] uppercase font-bold tracking-wider border-none">Announcement</Badge>;
      case "event":
        return <Badge className="bg-[#D4A017] text-white hover:bg-[#D4A017]/90 text-[10px] uppercase font-bold tracking-wider border-none">Event</Badge>;
      case "media":
      default:
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-wider border-slate-300">Media</Badge>;
    }
  };

  const getExportCSVData = () => {
    if (articles.length === 0) {
      toast({
        title: "No data to export",
        description: "Add updates before exporting.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Title", "Type", "Category", "Author", "Status", "Pinned", "Event Date", "Publish Date"];
    const rows = articles.map((a) => [
      a.title,
      a.type,
      a.category,
      a.author,
      a.isPublished ? "Published" : "Draft",
      a.isPinned ? "Yes" : "No",
      a.eventDate ? new Date(a.eventDate).toLocaleDateString() : "",
      a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bih-updates-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-9 w-48 bg-slate-200 rounded" />
          <div className="h-9 w-32 bg-slate-200 rounded" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Platform Updates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish announcements, organize community events, and share media impact stories.
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
            asChild
            className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white gap-1.5 h-9"
          >
            <Link to="/admin/media/new">
              <Plus className="h-4 w-4" /> New Update
            </Link>
          </Button>
        </div>
      </div>

      {/* Type Tabs & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Type Tabs */}
        <Tabs
          value={typeFilter}
          onValueChange={(val) => setTypeFilter(val as any)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="all" className="text-xs">
              All Types ({articles.length})
            </TabsTrigger>
            <TabsTrigger value="announcement" className="text-xs">
              Announcements ({articles.filter((a) => a.type === "announcement").length})
            </TabsTrigger>
            <TabsTrigger value="event" className="text-xs">
              Events ({articles.filter((a) => a.type === "event").length})
            </TabsTrigger>
            <TabsTrigger value="media" className="text-xs">
              Media ({articles.filter((a) => a.type === "media").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search & Draft Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search title, category, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === "all" ? "bg-[#1E3A5F] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === "published" ? "bg-[#6B8E3E] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Published
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === "draft" ? "bg-amber-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Drafts ({articles.filter((a) => !a.isPublished).length})
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <Info className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-medium">No updates found matching your filter criteria.</p>
              <p className="text-xs text-slate-400">Click "New Update" or clear active search and filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-10">Pin</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category / Timing</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((art) => (
                    <TableRow key={art.id} className="hover:bg-slate-50/40 text-xs">
                      {/* Pin Toggle */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleTogglePin(art)}
                          disabled={togglingPinId === art.id}
                          className={`p-1.5 rounded-md transition-colors ${
                            art.isPinned
                              ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                              : "text-slate-300 hover:text-slate-600 hover:bg-slate-100"
                          }`}
                          title={art.isPinned ? "Pinned to top. Click to unpin." : "Click to pin to top"}
                        >
                          {togglingPinId === art.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Pin className={`h-3.5 w-3.5 ${art.isPinned ? "fill-amber-500" : ""}`} />
                          )}
                        </button>
                      </TableCell>

                      {/* Title */}
                      <TableCell className="font-semibold text-slate-800 max-w-[240px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate" title={art.title}>
                            {art.title}
                          </span>
                          {art.isPinned && (
                            <span className="shrink-0 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                              PINNED
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        {getTypeBadge(art.type)}
                      </TableCell>

                      {/* Category & Timing */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-medium text-slate-700">{art.category}</span>
                          {art.type === "event" && art.eventDate && (
                            <p className="text-[11px] text-amber-700 font-sans flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(art.eventDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Author */}
                      <TableCell className="text-slate-600 font-medium">{art.author}</TableCell>

                      {/* Visibility / Publish Toggle */}
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={togglingPublishId === art.id}
                          onClick={() => handleTogglePublish(art)}
                          className={`h-6 px-2 text-[10px] font-bold uppercase tracking-wider rounded-full flex gap-1 items-center ${
                            art.isPublished
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                              : "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {togglingPublishId === art.id && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                          {art.isPublished ? "Published" : "Draft"}
                        </Button>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPreview(art)}
                            className="h-7 px-2.5 text-xs font-medium text-[#1E3A5F] bg-blue-50/60 border-blue-200/80 hover:bg-[#1E3A5F] hover:text-white hover:border-[#1E3A5F] focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-1 transition-colors flex gap-1.5 items-center"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900 border-slate-300 gap-1.5"
                          >
                            <Link to={`/admin/media/edit/${art.id}`}>
                              <Pencil className="h-3 w-3" /> Edit
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenDelete(art.id)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete update"
                          >
                            <Trash className="h-3.5 w-3.5" />
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewArticle && (
            <div className="space-y-5 pt-2">
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {getTypeBadge(previewArticle.type)}
                  <Badge variant="outline" className="text-slate-600 text-xs">
                    {previewArticle.category}
                  </Badge>
                  {previewArticle.isPinned && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                      Pinned
                    </Badge>
                  )}
                  <Badge className={previewArticle.isPublished ? "bg-[#6B8E3E] text-white" : "bg-slate-400 text-white"}>
                    {previewArticle.isPublished ? "Live" : "Draft"}
                  </Badge>
                </div>
                <DialogTitle className="font-serif text-[#1E3A5F] text-2xl font-bold">
                  {previewArticle.title}
                </DialogTitle>
                <DialogDescription>
                  By {previewArticle.author} • {previewArticle.publishedAt ? new Date(previewArticle.publishedAt).toLocaleDateString() : "Draft"}
                </DialogDescription>
              </DialogHeader>

              {/* Cover Image */}
              {previewArticle.imageUrl && (
                <img
                  src={previewArticle.imageUrl}
                  alt={previewArticle.title}
                  className="w-full h-56 object-cover rounded-lg border bg-slate-100"
                />
              )}

              {/* Event Specific Card */}
              {previewArticle.type === "event" && (
                <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs text-amber-900">
                  {previewArticle.eventDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#D4A017]" />
                      <span className="font-semibold">Event Date:</span>
                      <span>
                        {new Date(previewArticle.eventDate).toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  {previewArticle.eventLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#D4A017]" />
                      <span className="font-semibold">Location:</span>
                      <span>{previewArticle.eventLocation}</span>
                    </div>
                  )}
                  {previewArticle.eventLink && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-[#D4A017]" />
                      <a
                        href={previewArticle.eventLink}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-medium hover:text-amber-950"
                      >
                        Event Link
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="p-3 bg-slate-50 border rounded-md text-xs text-slate-700 italic">
                "{previewArticle.summary}"
              </div>

              {/* Content */}
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                {previewArticle.content}
              </div>

              {/* Video Preview */}
              {previewArticle.videoUrl && (
                <div className="pt-2">
                  <VideoEmbed url={previewArticle.videoUrl} title={previewArticle.title} />
                </div>
              )}

              {/* Attachment */}
              {previewArticle.attachmentUrl && (
                <div className="pt-2">
                  <Button asChild size="sm" variant="outline" className="gap-2 text-xs">
                    <a href={previewArticle.attachmentUrl} target="_blank" rel="noreferrer" download>
                      <Download className="h-3.5 w-3.5" /> Download Attached Document (PDF)
                    </a>
                  </Button>
                </div>
              )}

              {/* Gallery */}
              {previewArticle.galleryUrls && previewArticle.galleryUrls.length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  <h4 className="text-xs font-bold uppercase text-slate-700">Gallery Photos</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {previewArticle.galleryUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Gallery ${i}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewOpen(false)} className="text-xs">
                  Close
                </Button>
                <Button asChild className="bg-[#1E3A5F] text-white text-xs">
                  <Link to={`/admin/media/edit/${previewArticle.id}`}>Edit Details</Link>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this update? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
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
              Delete Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMediaPage;
