import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Eye, Trash, RefreshCw, FileText, Info, Loader2 } from "lucide-react";

interface MediaArticleItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  category: string;
  imageUrl: string;
  fullStoryUrl: string;
  publishedAt: string;
  isPublished: boolean;
}

const AdminMediaPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<MediaArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Dialog States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<MediaArticleItem | null>(null);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("media_articles")
        .select("*")
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
          publishedAt: row.published_at || "",
          isPublished: row.is_published || false,
        }))
      );
    } catch (err: any) {
      toast({
        title: "Failed to fetch articles",
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

  const handleTogglePublish = async (article: MediaArticleItem) => {
    setTogglingId(article.id);
    try {
      const { error } = await supabase
        .from("media_articles")
        .update({
          is_published: !article.isPublished,
          published_at: !article.isPublished ? new Date().toISOString().split("T")[0] : article.publishedAt || null,
        })
        .eq("id", article.id);

      if (error) throw error;

      toast({
        title: !article.isPublished ? "Article published" : "Article unpublished",
        description: `Successfully modified visibility for "${article.title}"`,
      });

      fetchArticles();
    } catch (err: any) {
      toast({
        title: "Toggle action failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
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
      const { error } = await supabase
        .from("media_articles")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      toast({
        title: "Article deleted",
        description: "Media story removed permanently from database records.",
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

  const handleOpenPreview = (article: MediaArticleItem) => {
    setPreviewArticle(article);
    setPreviewOpen(true);
  };

  const filteredArticles = articles.filter((art) => {
    const q = searchQuery.toLowerCase();
    return (
      art.title.toLowerCase().includes(q) ||
      art.author.toLowerCase().includes(q)
    );
  });

  const renderTable = (publishedState: boolean) => {
    const finalFiltered = filteredArticles.filter((art) => art.isPublished === publishedState);

    if (finalFiltered.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Info className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm">No articles matching this status criteria.</p>
        </div>
      );
    }

    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Publish Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalFiltered.map((art) => (
                <TableRow key={art.id} className="hover:bg-slate-50/30 text-xs">
                  <TableCell className="font-semibold text-slate-800 truncate max-w-[200px]" title={art.title}>
                    {art.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-sans border-slate-300 text-slate-600">
                      {art.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-655 font-medium">{art.author}</TableCell>
                  <TableCell className="text-slate-500 font-sans">
                    {art.publishedAt
                      ? new Date(art.publishedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                      art.isPublished ? "bg-[#6B8E3E]" : "bg-slate-400"
                    }`}>
                      {art.isPublished ? "published" : "draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenPreview(art)}
                        className="h-7 px-2 text-[#1E3A5F] hover:bg-slate-100 flex gap-1 items-center"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-slate-600 hover:bg-slate-100 flex gap-1 items-center">
                        <Link to={`/admin/media/edit/${art.id}`}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={togglingId === art.id}
                        onClick={() => handleTogglePublish(art)}
                        className={`h-7 px-2 text-[10px] flex gap-1 items-center ${
                          art.isPublished
                            ? "border-slate-350 text-slate-600 hover:bg-slate-50"
                            : "border-[#6B8E3E] text-[#6B8E3E] hover:bg-emerald-50"
                        }`}
                      >
                        {togglingId === art.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        {art.isPublished ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDelete(art.id)}
                        className="h-7 px-2 text-[#C0392B] hover:bg-rose-50 flex gap-1 items-center"
                      >
                        <Trash className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Stack Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {finalFiltered.map((art) => (
            <div key={art.id} className="p-4 space-y-3.5 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold text-slate-800">{art.title}</h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Author: {art.author}</p>
                </div>
                <Badge className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                  art.isPublished ? "bg-[#6B8E3E]" : "bg-slate-400"
                }`}>
                  {art.isPublished ? "published" : "draft"}
                </Badge>
              </div>

              <div className="space-y-1.5 text-slate-655 font-sans leading-relaxed">
                <p className="text-[11px] line-clamp-2">"{art.summary}"</p>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span>Category: <span className="font-medium text-slate-600">{art.category}</span></span>
                  <span>{art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : "Draft"}</span>
                </div>
              </div>

              <div className="pt-2 border-t flex gap-1.5 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenPreview(art)}
                  className="h-8 text-xs text-[#1E3A5F] border-slate-200 flex-1 justify-center"
                >
                  Preview
                </Button>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs text-slate-600 border-slate-200 flex-1 justify-center">
                  <Link to={`/admin/media/edit/${art.id}`} className="flex justify-center items-center">
                    Edit
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={togglingId === art.id}
                  onClick={() => handleTogglePublish(art)}
                  className={`h-8 text-xs flex-1 justify-center ${
                    art.isPublished
                      ? "border-slate-350 text-slate-600"
                      : "border-[#6B8E3E] text-[#6B8E3E]"
                  }`}
                >
                  {art.isPublished ? "Unpublish" : "Publish"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Media Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish news updates, campaign milestones, and NGO partner updates.
          </p>
        </div>
        <Button asChild className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-medium text-xs h-9 px-4 flex gap-1.5 self-start sm:self-auto">
          <Link to="/admin/media/new">
            <Plus className="h-4 w-4" /> New Article
          </Link>
        </Button>
      </div>

      {/* Main Card with tab lists */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Articles Catalog</CardTitle>
            <CardDescription>Manage articles, drafts, and cover images.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title or author..."
              className="pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="published" className="space-y-6">
            <div className="px-6 border-b">
              <TabsList className="bg-slate-100 p-1 border-none w-fit rounded-b-none rounded-t-lg -mb-px">
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
              </TabsList>
            </div>

            <div className="pt-0">
              <TabsContent value="published" className="mt-0">
                {renderTable(true)}
              </TabsContent>
              <TabsContent value="drafts" className="mt-0">
                {renderTable(false)}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Dialog (mimics public /media detail display dialog) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewArticle && (
            <article className="space-y-5 py-2">
              <div>
                <Badge variant="outline" className="mb-2 text-[#D4A017] border-[#D4A017] font-sans">
                  {previewArticle.category}
                </Badge>
                <h1 className="text-2xl md:text-3xl font-serif text-[#1E3A5F] font-bold leading-tight">
                  {previewArticle.title}
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-sans">
                  <span>By <strong className="text-slate-655 font-medium">{previewArticle.author}</strong></span>
                  <span>·</span>
                  <span>
                    {previewArticle.publishedAt
                      ? new Date(previewArticle.publishedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Draft Mode"}
                  </span>
                </div>
              </div>

              {previewArticle.imageUrl && (
                <img
                  src={previewArticle.imageUrl}
                  alt={previewArticle.title}
                  className="w-full h-64 object-cover rounded-lg border bg-slate-100"
                />
              )}

              <p className="text-slate-800 text-sm font-semibold italic border-l-4 border-[#1E3A5F] pl-4 leading-relaxed whitespace-pre-line">
                {previewArticle.summary}
              </p>

              <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line pt-2 font-sans">
                {previewArticle.content}
              </div>

              {previewArticle.fullStoryUrl && (
                <div className="pt-4 border-t">
                  <a
                    href={previewArticle.fullStoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#1E3A5F] font-semibold hover:underline flex gap-1 items-center"
                  >
                    Read full story on source site &rarr;
                  </a>
                </div>
              )}
            </article>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogue */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Remove Article?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this article? This is a permanent action and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex gap-1.5"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMediaPage;
