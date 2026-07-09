import { useEffect, useState } from "react";
import { getProjects, logVolunteerHours, getVolunteerHoursLog, getPortfolioEntries, createPortfolioEntry, updatePortfolioEntry, submitPortfolioEntry } from "@/lib/platform-data";
import { type Project, type CommitmentLog, type PortfolioEntry, type ShowcaseStatus, type VerificationStatus } from "@/types/models";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Award, Clock, FileText, CheckCircle, AlertTriangle, Eye, EyeOff } from "lucide-react";

interface VolunteerDashboardProps {
  userId: string;
  profileData: any;
}

export const VolunteerDashboard = ({ userId, profileData }: VolunteerDashboardProps) => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [hoursLog, setHoursLog] = useState<CommitmentLog[]>([]);
  const [showcases, setShowcases] = useState<PortfolioEntry[]>([]);
  
  // Hours Log Form State
  const [hoursForm, setHoursForm] = useState({
    projectId: "",
    hours: "",
    activity: "",
  });

  // Showcase Form State
  const [isCreatingShowcase, setIsCreatingShowcase] = useState(false);
  const [editingShowcaseId, setEditingShowcaseId] = useState<string | null>(null);
  const [showcaseForm, setShowcaseForm] = useState({
    projectId: "",
    title: "",
    description: "",
    rolePlayed: "",
    outcomes: "",
    mediaUrlsText: "",
    isPublic: true,
  });

  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isSubmittingHours, setIsSubmittingHours] = useState(false);
  const [isSubmittingShowcase, setIsSubmittingShowcase] = useState(false);

  const fetchEcosystemData = async () => {
    try {
      const [allProjects, logs, entries] = await Promise.all([
        getProjects(),
        getVolunteerHoursLog({ volunteerId: userId }),
        getPortfolioEntries({ userId: userId }),
      ]);
      setProjects(allProjects);
      setHoursLog(logs);
      setShowcases(entries);
    } catch (err: any) {
      console.error("Error loading ecosystem data:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchEcosystemData();
  }, [userId]);

  // Aggregate stats
  const totalVerifiedHours = hoursLog
    .filter((log) => log.status === "verified")
    .reduce((acc, log) => acc + log.hoursLogged, 0);

  const totalPendingHours = hoursLog
    .filter((log) => log.status === "pending_verification")
    .reduce((acc, log) => acc + log.hoursLogged, 0);

  const activeShowcases = showcases.filter((s) => s.status === "published").length;

  // Hours logging submission
  const handleLogHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hoursForm.projectId) {
      toast({ title: "Select a project", description: "You must specify a project.", variant: "destructive" });
      return;
    }
    const hoursNum = Number(hoursForm.hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      toast({ title: "Invalid hours", description: "Hours must be between 0.1 and 24.", variant: "destructive" });
      return;
    }
    if (!hoursForm.activity.trim()) {
      toast({ title: "Activity description required", description: "Explain what you accomplished.", variant: "destructive" });
      return;
    }

    setIsSubmittingHours(true);
    try {
      await logVolunteerHours({
        projectId: hoursForm.projectId,
        hoursLogged: hoursNum,
        activityDescription: hoursForm.activity.trim(),
      });
      toast({ title: "Hours logged", description: "Submission pending verification by NGO partner/admin." });
      setHoursForm({ projectId: "", hours: "", activity: "" });
      fetchEcosystemData();
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingHours(false);
    }
  };

  // Portfolio showcase submission
  const handleShowcaseSubmit = async (e: React.FormEvent, submitImmediate = false) => {
    e.preventDefault();
    if (!showcaseForm.title.trim() || !showcaseForm.description.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }

    setIsSubmittingShowcase(true);
    try {
      const mediaUrls = showcaseForm.mediaUrlsText
        .split(",")
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      const payload = {
        projectId: showcaseForm.projectId || undefined,
        title: showcaseForm.title.trim(),
        description: showcaseForm.description.trim(),
        rolePlayed: showcaseForm.rolePlayed.trim(),
        outcomes: showcaseForm.outcomes.trim(),
        mediaUrls,
        isPublic: showcaseForm.isPublic,
      };

      if (editingShowcaseId) {
        await updatePortfolioEntry(editingShowcaseId, payload);
        if (submitImmediate) {
          await submitPortfolioEntry(editingShowcaseId);
          toast({ title: "Showcase submitted", description: "Portfolio entry updated and submitted for review." });
        } else {
          toast({ title: "Draft updated", description: "Showcase draft updated successfully." });
        }
      } else {
        await createPortfolioEntry(payload);
        if (submitImmediate) {
          // Fetch entries to get the latest insert id, or let the user submit it from list
          toast({ title: "Draft created", description: "Showcase created as draft. You can submit it for review from the list below." });
        } else {
          toast({ title: "Draft saved", description: "Showcase saved in drafts." });
        }
      }

      setIsCreatingShowcase(false);
      setEditingShowcaseId(null);
      setShowcaseForm({
        projectId: "",
        title: "",
        description: "",
        rolePlayed: "",
        outcomes: "",
        mediaUrlsText: "",
        isPublic: true,
      });
      fetchEcosystemData();
    } catch (err: any) {
      toast({ title: "Operation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingShowcase(false);
    }
  };

  const handleEditShowcase = (showcase: PortfolioEntry) => {
    setEditingShowcaseId(showcase.id);
    setShowcaseForm({
      projectId: showcase.projectId || "",
      title: showcase.title,
      description: showcase.description,
      rolePlayed: showcase.rolePlayed,
      outcomes: showcase.outcomes,
      mediaUrlsText: showcase.mediaUrls.join(", "),
      isPublic: showcase.isPublic,
    });
    setIsCreatingShowcase(true);
  };

  const handleSubmitExistingDraft = async (id: string) => {
    try {
      await submitPortfolioEntry(id);
      toast({ title: "Showcase submitted", description: "Sent to admin review queue." });
      fetchEcosystemData();
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    }
  };

  const hoursStatusBadge = (status: VerificationStatus) => {
    const tones: Record<VerificationStatus, "default" | "secondary" | "destructive" | "outline"> = {
      pending_verification: "outline",
      verified: "default",
      rejected: "destructive",
      voided: "secondary",
    };
    const labels: Record<VerificationStatus, string> = {
      pending_verification: "Pending",
      verified: "Verified",
      rejected: "Rejected",
      voided: "Voided",
    };
    return <Badge variant={tones[status]}>{labels[status]}</Badge>;
  };

  const showcaseStatusBadge = (status: ShowcaseStatus) => {
    const tones: Record<ShowcaseStatus, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      pending: "outline",
      published: "default",
      archived: "secondary",
    };
    return <Badge variant={tones[status]} className="capitalize">{status}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* 1. Statistics Aggregates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Verified Commitment</p>
              <h3 className="text-3xl font-bold font-serif">{totalVerifiedHours.toFixed(1)} hrs</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-yellow-500/10 rounded-lg text-amber-500">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending verification</p>
              <h3 className="text-3xl font-bold font-serif">{totalPendingHours.toFixed(1)} hrs</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-600">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Showcases</p>
              <h3 className="text-3xl font-bold font-serif">{activeShowcases} published</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges system */}
      {totalVerifiedHours >= 10 && (
        <div className="flex gap-3 items-center rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-800 dark:text-emerald-300">
          <Award className="h-6 w-6 text-emerald-600 shrink-0" />
          <div className="text-sm">
            <strong>Community Contributor Unlocked:</strong> Thank you for committing 10+ verified hours! You have earned the BIH Bronze Milestone Badge.
          </div>
        </div>
      )}

      {/* 2. Main Workspaces */}
      <Tabs defaultValue="hours" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="hours">Hours Ledger</TabsTrigger>
          <TabsTrigger value="portfolio">Project Portfolios</TabsTrigger>
        </TabsList>

        {/* 2A. Hours Tab */}
        <TabsContent value="hours" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="font-serif text-xl">Log Volunteer Hours</CardTitle>
                <CardDescription>Records are append-only. Corrections require admin audit.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogHoursSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project Worksite</Label>
                    <Select
                      value={hoursForm.projectId}
                      onValueChange={(val) => setFormVal("projectId", val, setHoursForm)}
                    >
                      <SelectTrigger id="project">
                        <SelectValue placeholder="Select active project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.filter(p => p.status !== "proposed").map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours">Hours Completed</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.1"
                      required
                      placeholder="e.g. 4.5"
                      value={hoursForm.hours}
                      onChange={(e) => setFormVal("hours", e.target.value, setHoursForm)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="activity">Activity Description</Label>
                    <Textarea
                      id="activity"
                      required
                      placeholder="e.g., Conducted sanitation campaign, distributed educational kits, etc."
                      value={hoursForm.activity}
                      onChange={(e) => setFormVal("activity", e.target.value, setHoursForm)}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" disabled={isSubmittingHours} className="w-full">
                    {isSubmittingHours ? "Logging hours..." : "Submit Log Entry"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-serif text-xl">Contribution History Ledger</CardTitle>
                <CardDescription>An immutable log of activities and validation audit status.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Loading ledger...</p>
                ) : hoursLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hours logged yet.</p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project</TableHead>
                          <TableHead>Activity</TableHead>
                          <TableHead className="w-20">Hours</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-32">Logged On</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hoursLog.map((log) => (
                          <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium text-xs">{log.projectTitle}</TableCell>
                            <TableCell className="text-xs">
                              <div>{log.activityDescription}</div>
                              {log.voidReason && (
                                <div className="text-[10px] text-destructive mt-1 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Voided: {log.voidReason}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-semibold">{log.hoursLogged.toFixed(1)}</TableCell>
                            <TableCell>{hoursStatusBadge(log.status)}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2B. Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-xl font-serif font-bold">Your Project Portfolios & Showcases</h2>
              <p className="text-xs text-muted-foreground">Share evidence of impact. Submissions must be approved by admins before going live.</p>
            </div>
            {!isCreatingShowcase && (
              <Button onClick={() => setIsCreatingShowcase(true)} className="flex gap-2">
                <Plus className="h-4 w-4" /> Add Showcase Entry
              </Button>
            )}
          </div>

          {isCreatingShowcase ? (
            <Card className="border-indigo-500/20">
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  {editingShowcaseId ? "Edit Showcase Entry" : "Create Showcase Entry"}
                </CardTitle>
                <CardDescription>Compile your role, outcomes, and evidence for review.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleShowcaseSubmit(e, false)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="showcaseProject">Associated Project (Optional)</Label>
                        <Select
                          value={showcaseForm.projectId}
                          onValueChange={(val) => setFormVal("projectId", val, setShowcaseForm)}
                        >
                          <SelectTrigger id="showcaseProject">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none_unlinked">Independent / Unlisted Work</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="showcaseTitle">Showcase Title</Label>
                        <Input
                          id="showcaseTitle"
                          required
                          placeholder="e.g., Leading Water Pump Repair in Tamale"
                          value={showcaseForm.title}
                          onChange={(e) => setFormVal("title", e.target.value, setShowcaseForm)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="showcaseRole">Your Role / Responsibility</Label>
                        <Input
                          id="showcaseRole"
                          required
                          placeholder="e.g., Lead Maintenance Technician"
                          value={showcaseForm.rolePlayed}
                          onChange={(e) => setFormVal("rolePlayed", e.target.value, setShowcaseForm)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="showcaseUrls">Media / Evidence URLs (comma separated)</Label>
                        <Input
                          id="showcaseUrls"
                          placeholder="https://images.unsplash.com/photo-1, https://youtube.com/watch?..."
                          value={showcaseForm.mediaUrlsText}
                          onChange={(e) => setFormVal("mediaUrlsText", e.target.value, setShowcaseForm)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="showcaseDesc">Project Description & Context</Label>
                        <Textarea
                          id="showcaseDesc"
                          required
                          placeholder="Explain what the project was, its challenges, and scope..."
                          value={showcaseForm.description}
                          onChange={(e) => setFormVal("description", e.target.value, setShowcaseForm)}
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="showcaseOutcomes">Key Outcomes & Real-World Impact</Label>
                        <Textarea
                          id="showcaseOutcomes"
                          required
                          placeholder="Detail quantifiable results (e.g. Restored water flow for 400 households)..."
                          value={showcaseForm.outcomes}
                          onChange={(e) => setFormVal("outcomes", e.target.value, setShowcaseForm)}
                          rows={4}
                        />
                      </div>

                      <div className="flex items-center space-x-3 rounded-lg border p-4 bg-muted/30">
                        <input
                          id="isPublic"
                          type="checkbox"
                          checked={showcaseForm.isPublic}
                          onChange={(e) => setFormVal("isPublic", e.target.checked, setShowcaseForm)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor="isPublic" className="font-semibold text-sm cursor-pointer flex items-center gap-1.5">
                            {showcaseForm.isPublic ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                            Opt-in for Public Showcase
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            If checked, this showcase will display publicly in your profile once approved.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={() => { setIsCreatingShowcase(false); setEditingShowcaseId(null); }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmittingShowcase} variant="outline">
                      Save as Draft
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmittingShowcase}
                      onClick={(e) => handleShowcaseSubmit(e, true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isSubmittingShowcase ? "Submitting..." : "Submit for Admin Review"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {showcases.length === 0 ? (
                <div className="col-span-2 text-center py-12 rounded-lg border border-dashed text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-3" />
                  <p className="text-sm">No showcases defined. Click "Add Showcase Entry" to begin.</p>
                </div>
              ) : (
                showcases.map((showcase) => (
                  <Card key={showcase.id} className="flex flex-col hover:shadow-md transition-shadow relative">
                    <CardHeader className="flex flex-row justify-between items-start border-b pb-4 gap-4">
                      <div>
                        <CardTitle className="text-lg font-serif">{showcase.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Role: <span className="font-semibold text-foreground">{showcase.rolePlayed}</span>
                          {showcase.projectTitle && ` | Project: ${showcase.projectTitle}`}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {showcaseStatusBadge(showcase.status)}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {showcase.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {showcase.isPublic ? "Public" : "Internal"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Outcomes</span>
                        <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded whitespace-pre-wrap">{showcase.outcomes}</p>
                      </div>

                      {showcase.adminFeedback && (
                        <div className="rounded border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-red-800 dark:text-red-300">
                          <strong>Admin Feedback:</strong> {showcase.adminFeedback}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 justify-end mt-auto">
                        {(showcase.status === "draft" || showcase.status === "rejected") && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleEditShowcase(showcase)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => handleSubmitExistingDraft(showcase.id)}
                            >
                              Submit for Approval
                            </Button>
                          </>
                        )}
                        {showcase.status === "published" && (
                          <div className="text-emerald-600 font-semibold text-xs flex items-center gap-1 pt-1.5">
                            <CheckCircle className="h-4 w-4" /> Live on Portfolios
                          </div>
                        )}
                        {showcase.status === "pending" && (
                          <div className="text-amber-500 font-semibold text-xs flex items-center gap-1 pt-1.5 animate-pulse">
                            Under Review
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Form helpers
function setFormVal<T>(name: keyof T, value: any, setter: React.Dispatch<React.SetStateAction<T>>) {
  setter((prev) => ({
    ...prev,
    [name]: name === "projectId" && value === "none_unlinked" ? "" : value,
  }));
}

export default VolunteerDashboard;
