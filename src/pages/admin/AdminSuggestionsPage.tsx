import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
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
import { Search, Eye, Check, AlertTriangle, Info, Play, Loader2, HelpCircle } from "lucide-react";

interface SuggestionItem {
  id: string;
  title: string;
  description: string;
  location: string;
  timeline: string;
  submittedBy: string;
  email: string;
  phone: string;
  organization: string;
  category: string;
  expectedBudget: number | null;
  beneficiaries: string;
  status: "pending" | "reviewing" | "approved" | "rejected";
  adminNotes: string;
  createdAt: string;
}

const statusTone: Record<SuggestionItem["status"], string> = {
  pending: "bg-[#C8601A] text-white hover:bg-[#C8601A]/90",
  reviewing: "bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90",
  approved: "bg-[#6B8E3E] text-white hover:bg-[#6B8E3E]/90",
  rejected: "bg-[#C0392B] text-white hover:bg-[#C0392B]/90",
};

const AdminSuggestionsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Modal Dialogue States
  const [detailItem, setDetailItem] = useState<SuggestionItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [approveItem, setApproveItem] = useState<SuggestionItem | null>(null);
  const [approveNotes, setApproveNotes] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  const [convertPromptOpen, setConvertPromptOpen] = useState(false);
  const [approvedItemToConvert, setApprovedItemToConvert] = useState<SuggestionItem | null>(null);

  const [rejectItem, setRejectItem] = useState<SuggestionItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from("project_suggestions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSuggestions(
        (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description || "",
          location: row.location || "",
          timeline: row.timeline || "TBD",
          submittedBy: row.submitted_by || "Anonymous",
          email: row.email || "",
          phone: row.phone || "",
          organization: row.organization || "",
          category: row.category || "General",
          expectedBudget: row.expected_budget ? Number(row.expected_budget) : null,
          beneficiaries: row.beneficiaries || "",
          status: row.status,
          adminNotes: row.admin_notes || "",
          createdAt: row.created_at,
        }))
      );
    } catch (err: any) {
      toast({
        title: "Failed to load suggestions",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleMarkReviewing = async (id: string) => {
    setActioningId(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No admin session active.");

      const { error } = await supabase
        .from("project_suggestions")
        .update({
          status: "reviewing",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Suggestion status updated to Reviewing.",
      });

      fetchSuggestions();
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
    }
  };

  const handleOpenApprove = (item: SuggestionItem) => {
    setApproveItem(item);
    setApproveNotes("");
    setApproveOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!approveItem) return;
    setApproving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No admin session active.");

      const { error } = await supabase
        .from("project_suggestions")
        .update({
          status: "approved",
          admin_notes: approveNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", approveItem.id);

      if (error) throw error;

      toast({
        title: "Suggestion approved",
        description: "Status marked as approved in audit log.",
      });

      setApproveOpen(false);
      fetchSuggestions();

      // Trigger convert prompt dialog
      setApprovedItemToConvert(approveItem);
      setConvertPromptOpen(true);
    } catch (err: any) {
      toast({
        title: "Approval failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleConvertYes = () => {
    if (!approvedItemToConvert) return;
    setConvertPromptOpen(false);
    
    // Redirect to /admin/projects passing suggestion details as search parameters
    const params = new URLSearchParams();
    params.set("title", approvedItemToConvert.title);
    params.set("description", approvedItemToConvert.description);
    params.set("location", approvedItemToConvert.location);
    params.set("timeline", approvedItemToConvert.timeline);
    params.set("category", approvedItemToConvert.category);

    navigate(`/admin/projects?${params.toString()}`);
  };

  const handleOpenReject = (item: SuggestionItem) => {
    setRejectItem(item);
    setRejectNotes("");
    setRejectOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectItem) return;
    setRejecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No admin session active.");

      const { error } = await supabase
        .from("project_suggestions")
        .update({
          status: "rejected",
          admin_notes: rejectNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", rejectItem.id);

      if (error) throw error;

      toast({
        title: "Suggestion rejected",
        description: "Reason successfully saved to admin notes.",
      });

      setRejectOpen(false);
      fetchSuggestions();
    } catch (err: any) {
      toast({
        title: "Rejection failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRejecting(false);
    }
  };

  const handleOpenDetail = (item: SuggestionItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const stats = suggestions.reduce(
    (acc, sug) => {
      if (sug.status === "pending") acc.pending++;
      if (sug.status === "reviewing") acc.reviewing++;
      if (sug.status === "approved") acc.approved++;
      if (sug.status === "rejected") acc.rejected++;
      return acc;
    },
    { pending: 0, reviewing: 0, approved: 0, rejected: 0 }
  );

  const filteredSuggestions = suggestions.filter((sug) => {
    const q = searchQuery.toLowerCase();
    return (
      sug.title.toLowerCase().includes(q) ||
      sug.submittedBy.toLowerCase().includes(q) ||
      sug.email.toLowerCase().includes(q)
    );
  });

  const renderTable = (statusGroup: string) => {
    const finalFiltered = filteredSuggestions.filter((s) => {
      if (statusGroup === "all") return true;
      return s.status === statusGroup;
    });

    if (finalFiltered.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Info className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm">No project suggestions found matching current filters.</p>
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
                <TableHead>Submitted By</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Expected Budget</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalFiltered.map((sug) => (
                <TableRow key={sug.id} className="hover:bg-slate-50/30 text-xs">
                  <TableCell className="font-semibold text-slate-800 truncate max-w-[140px]" title={sug.title}>
                    {sug.title}
                  </TableCell>
                  <TableCell className="text-slate-655 font-medium">{sug.submittedBy}</TableCell>
                  <TableCell className="text-slate-500 font-mono">{sug.email}</TableCell>
                  <TableCell className="text-slate-500 font-sans">{sug.category}</TableCell>
                  <TableCell className="font-mono text-slate-700 font-bold">
                    {sug.expectedBudget !== null ? `GHS ${sug.expectedBudget.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell className="text-slate-450 font-sans">
                    {new Date(sug.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${statusTone[sug.status]}`}>
                      {sug.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDetail(sug)}
                        className="h-7 px-2 text-[#1E3A5F] hover:bg-slate-100 flex gap-1 items-center"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>

                      {sug.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actioningId === sug.id}
                            onClick={() => handleMarkReviewing(sug.id)}
                            className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-slate-50 h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <Play className="h-3 w-3" /> Review
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenApprove(sug)}
                            className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReject(sug)}
                            className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <AlertTriangle className="h-3 w-3" /> Reject
                          </Button>
                        </>
                      )}

                      {sug.status === "reviewing" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleOpenApprove(sug)}
                            className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReject(sug)}
                            className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-7 px-2 text-[10px] flex gap-1 items-center"
                          >
                            <AlertTriangle className="h-3 w-3" /> Reject
                          </Button>
                        </>
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
          {finalFiltered.map((sug) => (
            <div key={sug.id} className="p-4 space-y-3.5 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold text-slate-800">{sug.title}</h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Submitted by: {sug.submittedBy}</p>
                </div>
                <Badge className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${statusTone[sug.status]}`}>
                  {sug.status}
                </Badge>
              </div>

              <div className="space-y-1.5 text-slate-655 font-sans leading-relaxed">
                <p>Email: <code className="font-mono text-slate-700">{sug.email}</code></p>
                {sug.expectedBudget !== null && (
                  <p>Expected Budget: <strong className="text-slate-700 font-mono">GHS {sug.expectedBudget.toLocaleString()}</strong></p>
                )}
                <p className="text-[10px] text-slate-400 pt-0.5 flex justify-between">
                  <span>Category: <span className="font-medium text-slate-600">{sug.category}</span></span>
                  <span>{new Date(sug.createdAt).toLocaleDateString()}</span>
                </p>
              </div>

              <div className="pt-2 border-t flex gap-1.5 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDetail(sug)}
                  className="h-8 text-xs text-[#1E3A5F] border-slate-200 flex-1 justify-center"
                >
                  View Detail
                </Button>
                {sug.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actioningId === sug.id}
                      onClick={() => handleMarkReviewing(sug.id)}
                      className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-slate-50 h-8 text-xs flex-1 justify-center"
                    >
                      Review
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenApprove(sug)}
                      className="bg-[#6B8E3E] text-white h-8 text-xs flex-1 justify-center"
                    >
                      Approve
                    </Button>
                  </>
                )}
                {sug.status === "reviewing" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleOpenApprove(sug)}
                      className="bg-[#6B8E3E] text-white h-8 text-xs flex-1 justify-center"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReject(sug)}
                      className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 h-8 text-xs flex-1 justify-center"
                    >
                      Reject
                    </Button>
                  </>
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
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Project Suggestions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and audit community-submitted campaign concepts, budget requests, and suggest converts.
        </p>
      </div>

      {/* Stats summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending suggestions</span>
            <span className="h-2 w-2 rounded-full bg-[#C8601A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#C8601A]">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">In review checks</span>
            <span className="h-2 w-2 rounded-full bg-[#1E3A5F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#1E3A5F]">{stats.reviewing}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Approved</span>
            <span className="h-2 w-2 rounded-full bg-[#6B8E3E]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#6B8E3E]">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Rejected</span>
            <span className="h-2 w-2 rounded-full bg-[#C0392B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-rose-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table Panel Card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Suggestions dossier</CardTitle>
            <CardDescription>Approve submitted concepts and convert them to active projects.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title, author or email..."
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
                <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </div>

            <div className="pt-0">
              <TabsContent value="all" className="mt-0">
                {renderTable("all")}
              </TabsContent>
              <TabsContent value="pending" className="mt-0">
                {renderTable("pending")}
              </TabsContent>
              <TabsContent value="reviewing" className="mt-0">
                {renderTable("reviewing")}
              </TabsContent>
              <TabsContent value="approved" className="mt-0">
                {renderTable("approved")}
              </TabsContent>
              <TabsContent value="rejected" className="mt-0">
                {renderTable("rejected")}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details View Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          {detailItem && (
            <>
              <DialogHeader>
                <Badge className={`w-fit text-[8px] uppercase tracking-wider font-bold border-none text-white ${statusTone[detailItem.status]}`}>
                  {detailItem.status}
                </Badge>
                <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold leading-tight">
                  {detailItem.title}
                </DialogTitle>
                <DialogDescription className="text-xs pt-1">
                  Submitted by {detailItem.submittedBy} (Organization: {detailItem.organization || "N/A"})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-3 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <Label className="text-slate-400 font-medium">Concept Category</Label>
                  <p className="text-slate-800 font-semibold text-sm mt-0.5">{detailItem.category}</p>
                </div>
                <div>
                  <Label className="text-slate-400 font-medium">Location</Label>
                  <p className="text-slate-700 mt-0.5">{detailItem.location}</p>
                </div>
                <div>
                  <Label className="text-slate-400 font-medium">Timeline Estimate</Label>
                  <p className="text-slate-700 mt-0.5">{detailItem.timeline}</p>
                </div>
                <div>
                  <Label className="text-slate-400 font-medium">Description</Label>
                  <p className="text-slate-655 mt-1 bg-slate-50 p-3 rounded border whitespace-pre-line leading-relaxed">
                    {detailItem.description}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-400 font-medium">Beneficiaries Details</Label>
                  <p className="text-slate-700 mt-0.5 whitespace-pre-line">{detailItem.beneficiaries || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400 font-medium">Email Address</Label>
                    <p className="text-slate-700 mt-0.5 font-mono">{detailItem.email}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 font-medium">Phone Number</Label>
                    <p className="text-slate-700 mt-0.5 font-mono">{detailItem.phone || "—"}</p>
                  </div>
                </div>

                {detailItem.adminNotes && (
                  <div className="bg-amber-50 text-amber-800 p-3 rounded border border-amber-100 mt-2">
                    <Label className="text-amber-900 font-bold">Moderator / Admin Notes</Label>
                    <p className="mt-0.5 whitespace-pre-line">{detailItem.adminNotes}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0 mt-6 pt-3 border-t">
                <Button variant="ghost" onClick={() => setDetailOpen(false)} className="text-xs h-9">
                  Close Detail
                </Button>
                {(detailItem.status === "pending" || detailItem.status === "reviewing") && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDetailOpen(false);
                        handleOpenReject(detailItem);
                      }}
                      className="border-[#C0392B] text-[#C0392B] hover:bg-rose-50 text-xs h-9 flex-1 sm:flex-none"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setDetailOpen(false);
                        handleOpenApprove(detailItem);
                      }}
                      className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white text-xs h-9 flex-1 sm:flex-none"
                    >
                      Approve suggestion
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Notes Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Approve Suggestion</DialogTitle>
            <DialogDescription>
              Add optional admin notes or coordinator instructions to log alongside the approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="approveNotes">Approval Notes (optional)</Label>
            <Textarea
              id="approveNotes"
              rows={3}
              placeholder="e.g. Budget pre-aligned, matches target NGO priority focus..."
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setApproveOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleApproveConfirm}
              disabled={approving}
              className="bg-[#6B8E3E] hover:bg-[#6B8E3E]/90 text-white text-xs h-9 flex gap-1.5"
            >
              {approving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Approve Suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Project Prompt Dialog */}
      <Dialog open={convertPromptOpen} onOpenChange={setConvertPromptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-[#D4A017]">
              <HelpCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold text-center">Convert to Project?</DialogTitle>
            <DialogDescription className="text-center">
              Would you like to convert this approved suggestion into a real, active campaign right now? 
              This will pre-fill the Project Creation form.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4 flex justify-center sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setConvertPromptOpen(false)}
              className="text-xs h-9 flex-1"
            >
              No, Keep in Archive
            </Button>
            <Button
              onClick={handleConvertYes}
              className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white text-xs h-9 flex-1"
            >
              Yes, Convert to Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialogue Notes */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Reject Suggestion</DialogTitle>
            <DialogDescription>
              A rejection reason is required and will be saved in the suggestion log record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="rejectNotes">Rejection Reason</Label>
            <Textarea
              id="rejectNotes"
              rows={3}
              placeholder="e.g. Budget excessive, out of geographic focus area scope..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setRejectOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={rejecting || !rejectNotes.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 flex gap-1.5"
            >
              {rejecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Reject Suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSuggestionsPage;
