import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Eye, Check, RefreshCw, Archive, Info, Loader2 } from "lucide-react";

interface PortfolioEntryItem {
  id: string;
  title: string;
  description: string;
  rolePlayed: string;
  projectId: string | null;
  projectTitle: string;
  mediaUrls: string[];
  status: "draft" | "pending" | "published" | "archived";
  visibility: string;
  adminNotes: string;
  createdAt: string;
  submitterName: string;
  submitterRole: string;
}

const AdminPortfolioPage = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<PortfolioEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Modal / Dialogue States
  const [previewEntry, setPreviewEntry] = useState<PortfolioEntryItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [returnEntry, setReturnEntry] = useState<PortfolioEntryItem | null>(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const [returning, setReturning] = useState(false);

  const [archiveEntry, setArchiveEntry] = useState<PortfolioEntryItem | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const fetchPortfolioEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("portfolio_entries")
        .select(`
          id,
          title,
          description,
          role_played,
          project_id,
          media_urls,
          status,
          visibility,
          admin_notes,
          created_at,
          submitter:profiles!user_id (full_name, role),
          project:projects (title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEntries(
        (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          rolePlayed: row.role_played,
          projectId: row.project_id,
          projectTitle: row.project?.title || "—",
          mediaUrls: row.media_urls || [],
          status: row.status,
          visibility: row.visibility || "internal",
          adminNotes: row.admin_notes || "",
          createdAt: row.created_at,
          submitterName: row.submitter?.full_name || "Unknown Submitter",
          submitterRole: row.submitter?.role || "volunteer",
        }))
      );
    } catch (err: any) {
      toast({
        title: "Failed to load portfolio entries",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioEntries();
  }, []);

  const handleApprove = async (entryId: string) => {
    setActioningId(entryId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No admin session active.");

      const { error } = await supabase
        .from("portfolio_entries")
        .update({
          status: "published",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Entry approved",
        description: "Portfolio entry is now published and viewable.",
      });

      fetchPortfolioEntries();
      if (previewOpen) setPreviewOpen(false);
    } catch (err: any) {
      toast({
        title: "Approve failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  };

  const handleOpenReturnModal = (entry: PortfolioEntryItem) => {
    setReturnEntry(entry);
    setReturnNotes("");
    setReturnOpen(true);
  };

  const handleReturnConfirm = async () => {
    if (!returnEntry) return;
    setReturning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No admin session active.");

      const { error } = await supabase
        .from("portfolio_entries")
        .update({
          status: "draft",
          admin_notes: returnNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", returnEntry.id);

      if (error) throw error;

      toast({
        title: "Entry returned",
        description: "Portfolio submission sent back to owner as draft.",
      });

      setReturnOpen(false);
      fetchPortfolioEntries();
      if (previewOpen) setPreviewOpen(false);
    } catch (err: any) {
      toast({
        title: "Return action failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setReturning(false);
    }
  };

  const handleOpenArchiveModal = (entry: PortfolioEntryItem) => {
    setArchiveEntry(entry);
    setArchiveOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveEntry) return;
    setArchiving(true);
    try {
      const { error } = await supabase
        .from("portfolio_entries")
        .update({
          status: "archived",
        })
        .eq("id", archiveEntry.id);

      if (error) throw error;

      toast({
        title: "Entry archived",
        description: "Portfolio entry has been moved to archives.",
      });

      setArchiveOpen(false);
      fetchPortfolioEntries();
    } catch (err: any) {
      toast({
        title: "Archive action failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
    }
  };

  const handleOpenPreview = (entry: PortfolioEntryItem) => {
    setPreviewEntry(entry);
    setPreviewOpen(true);
  };

  // Compute stat aggregates
  const stats = entries.reduce(
    (acc, entry) => {
      if (entry.status === "pending") acc.pending++;
      if (entry.status === "published") acc.published++;
      if (entry.status === "archived") acc.archived++;
      return acc;
    },
    { pending: 0, published: 0, archived: 0 }
  );

  const filteredEntries = entries.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.submitterName.toLowerCase().includes(query)
    );
  });

  const renderTable = (statusGroup: string) => {
    const finalFiltered = filteredEntries.filter((e) => {
      if (statusGroup === "all") return true;
      if (statusGroup === "returned") return e.status === "draft" && e.adminNotes !== "";
      return e.status === statusGroup;
    });

    if (finalFiltered.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Info className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm">No portfolio items found matching current filters.</p>
        </div>
      );
    }

    return (
      <>
        {/* Desktop Grid View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Submitter Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Entry Title</TableHead>
                <TableHead>Project Linked</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalFiltered.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-slate-50/30 text-xs">
                  <TableCell className="font-semibold text-slate-800">{entry.submitterName}</TableCell>
                  <TableCell>
                    <Badge className={`text-[8px] uppercase tracking-wider font-bold border-none text-white ${
                      entry.submitterRole === "ngo" ? "bg-[#1E3A5F]" : "bg-[#D4A017]"
                    }`}>
                      {entry.submitterRole}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-655 font-medium truncate max-w-[140px]">{entry.title}</TableCell>
                  <TableCell className="text-slate-500 truncate max-w-[140px]" title={entry.projectTitle}>
                    {entry.projectTitle}
                  </TableCell>
                  <TableCell className="text-slate-450 font-sans">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                      entry.status === "published"
                        ? "bg-[#6B8E3E]"
                        : entry.status === "archived"
                        ? "bg-slate-400"
                        : entry.status === "pending"
                        ? "bg-[#C8601A]"
                        : "bg-[#C0392B]"
                    }`}>
                      {entry.status === "draft" && entry.adminNotes ? "returned" : entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {entry.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenPreview(entry)}
                            className="h-7 px-2 text-[#1E3A5F] hover:bg-slate-100 flex gap-1 items-center"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </Button>
                          <Button
                            size="sm"
                            disabled={actioningId === entry.id}
                            onClick={() => handleApprove(entry.id)}
                            className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReturnModal(entry)}
                            className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <RefreshCw className="h-3 w-3" /> Return
                          </Button>
                        </>
                      )}

                      {entry.status === "published" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenPreview(entry)}
                            className="h-7 px-2 text-[#1E3A5F] hover:bg-slate-100 flex gap-1 items-center"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenArchiveModal(entry)}
                            className="border-slate-300 text-slate-500 hover:bg-slate-50 h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <Archive className="h-3 w-3" /> Archive
                          </Button>
                        </>
                      )}

                      {entry.status !== "pending" && entry.status !== "published" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenPreview(entry)}
                          className="h-7 px-2 text-[#1E3A5F] hover:bg-slate-100 flex gap-1 items-center"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Stack Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {finalFiltered.map((entry) => (
            <div key={entry.id} className="p-4 space-y-3.5 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold text-slate-800">{entry.submitterName}</h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5 uppercase tracking-wider">{entry.submitterRole}</p>
                </div>
                <Badge className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                  entry.status === "published"
                    ? "bg-[#6B8E3E]"
                    : entry.status === "archived"
                    ? "bg-slate-400"
                    : entry.status === "pending"
                    ? "bg-[#C8601A]"
                    : "bg-[#C0392B]"
                }`}>
                  {entry.status === "draft" && entry.adminNotes ? "returned" : entry.status}
                </Badge>
              </div>

              <div className="space-y-1.5 text-slate-655">
                <p className="font-medium text-slate-800">{entry.title}</p>
                <div className="flex justify-between text-[10px] text-slate-500 font-sans pt-1">
                  <span>Project: <strong className="text-slate-700">{entry.projectTitle}</strong></span>
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t flex gap-1.5 justify-end">
                {entry.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenPreview(entry)}
                      className="h-8 text-xs text-[#1E3A5F] border-slate-200 flex-1 justify-center"
                    >
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      disabled={actioningId === entry.id}
                      onClick={() => handleApprove(entry.id)}
                      className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white h-8 text-xs flex-1 justify-center"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReturnModal(entry)}
                      className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-8 text-xs flex-1 justify-center"
                    >
                      Return
                    </Button>
                  </>
                )}

                {entry.status === "published" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenPreview(entry)}
                      className="h-8 text-xs text-[#1E3A5F] border-slate-200 flex-1 justify-center"
                    >
                      View details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenArchiveModal(entry)}
                      className="border-slate-350 text-slate-500 h-8 text-xs flex-1 justify-center"
                    >
                      Archive
                    </Button>
                  </>
                )}

                {entry.status !== "pending" && entry.status !== "published" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPreview(entry)}
                    className="h-8 text-xs text-[#1E3A5F] border-slate-200 w-full justify-center"
                  >
                    View details
                  </Button>
                )}
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
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Portfolio Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and audit volunteer showcases and NGO portfolio entries submitted for publication.
        </p>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pending Review</span>
            <span className="h-2 w-2 rounded-full bg-[#C8601A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#C8601A]">{stats.pending}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Submissions awaiting moderator review</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Published</span>
            <span className="h-2 w-2 rounded-full bg-[#6B8E3E]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#6B8E3E]">{stats.published}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Entries approved and live on public feeds</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Archived</span>
            <span className="h-2 w-2 rounded-full bg-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-600">{stats.archived}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Submissions locked in historical archives</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Review Panel */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Submissions Registry</CardTitle>
            <CardDescription>Verify media resources and descriptors for user showcases.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title or submitter..."
              className="pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="pending" className="space-y-6">
            <div className="px-6 border-b">
              <TabsList className="bg-slate-100 p-1 border-none w-fit rounded-b-none rounded-t-lg -mb-px">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="returned">Returned</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </div>

            <div className="pt-0">
              <TabsContent value="all" className="mt-0">
                {renderTable("all")}
              </TabsContent>
              <TabsContent value="pending" className="mt-0">
                {renderTable("pending")}
              </TabsContent>
              <TabsContent value="published" className="mt-0">
                {renderTable("published")}
              </TabsContent>
              <TabsContent value="returned" className="mt-0">
                {renderTable("returned")}
              </TabsContent>
              <TabsContent value="archived" className="mt-0">
                {renderTable("archived")}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Modal Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          {previewEntry && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge className="bg-[#1E3A5F] text-white text-[9px] uppercase tracking-wider">
                    {previewEntry.visibility} visibility
                  </Badge>
                  {previewEntry.status === "pending" && (
                    <Badge className="bg-[#C8601A] text-white text-[9px] uppercase tracking-wider">
                      pending review
                    </Badge>
                  )}
                </div>
                <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold leading-tight">
                  {previewEntry.title}
                </DialogTitle>
                <DialogDescription className="text-xs pt-1">
                  Submitted by {previewEntry.submitterName} ({previewEntry.submitterRole})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-3 text-xs leading-relaxed">
                <div>
                  <Label className="text-slate-400 font-medium">Role Played</Label>
                  <p className="text-slate-800 font-semibold text-sm mt-0.5">{previewEntry.rolePlayed}</p>
                </div>
                <div>
                  <Label className="text-slate-400 font-medium">Project Context</Label>
                  <p className="text-slate-700 mt-0.5">{previewEntry.projectTitle}</p>
                </div>
                <div>
                  <Label className="text-slate-400 font-medium">Description</Label>
                  <p className="text-slate-655 mt-1 bg-slate-50 p-3 rounded border leading-relaxed whitespace-pre-line">
                    {previewEntry.description}
                  </p>
                </div>

                {/* Media Links */}
                {previewEntry.mediaUrls.length > 0 && (
                  <div>
                    <Label className="text-slate-400 font-medium">Attached Media Resources</Label>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-[11px] text-[#1E3A5F] font-medium">
                      {previewEntry.mediaUrls.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            Media Attachment {i + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {previewEntry.adminNotes && (
                  <div className="bg-rose-50 text-rose-800 p-3 rounded border border-rose-100 mt-2">
                    <Label className="text-rose-900 font-bold">Previous Moderator Notes</Label>
                    <p className="mt-0.5">{previewEntry.adminNotes}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0 mt-6 pt-3 border-t">
                <Button variant="ghost" onClick={() => setPreviewOpen(false)} className="text-xs h-9">
                  Close Preview
                </Button>
                {previewEntry.status === "pending" && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenReturnModal(previewEntry)}
                      className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 text-xs h-9 flex-1 sm:flex-none"
                    >
                      Return Draft
                    </Button>
                    <Button
                      onClick={() => handleApprove(previewEntry.id)}
                      disabled={actioningId === previewEntry.id}
                      className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white text-xs h-9 flex-1 sm:flex-none"
                    >
                      Approve & Publish
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Return Notes Input Dialogue */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Return with Feedback</DialogTitle>
            <DialogDescription>
              Provide clear feedback detailing what revisions are required by the submitter before approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="returnNotes">Moderator Notes</Label>
            <Textarea
              id="returnNotes"
              rows={4}
              placeholder="Provide constructive instructions (e.g. upload higher resolution images, verify role descriptor details)..."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setReturnOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleReturnConfirm}
              disabled={returning || !returnNotes.trim()}
              className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs h-9 flex gap-1.5"
            >
              {returning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send Instructions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialogue */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Archive Portfolio Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this entry? This hides the entry from public lists and moves it to history archives.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setArchiveOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleArchiveConfirm}
              disabled={archiving}
              className="bg-slate-600 hover:bg-slate-700 text-white text-xs h-9 flex gap-1.5"
            >
              {archiving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Archive Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPortfolioPage;
