import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import {
  createMediaArticle,
  getDonations,
  getMediaArticles,
  getDonors,
  getNgos,
  getProjects,
  getSession,
  getSuggestions,
  getVolunteers,
  logout,
  sendRegistrationDecisionEmail,
  sendSuggestionDecisionEmail,
  updateProjectStatus,
  updateRegistrationApprovalStatus,
  updateSuggestionStatus,
} from "@/lib/platform-data";
import type {
  ApprovalStatus,
  Donation,
  DonorProfile,
  MediaArticle,
  NgoProfile,
  Project,
  ProjectStatus,
  ProjectSuggestion,
  Session,
  VolunteerProfile,
} from "@/types/models";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const formatDate = (value: string) => new Date(value).toLocaleDateString();

const projectStatusDisplay: Record<ProjectStatus, string> = {
  proposed: "Pending",
  ongoing: "Ongoing",
  completed: "Completed",
};

type AdminPanel = "overview" | "registrations" | "media" | "projects";

type VolunteerDetails = {
  skillsText: string;
  primarySkillCategories: string[];
  yearsOfExperience: string;
  languagesSpoken: string;
  pastExperience: string;
  targetCommunities: string;
  preferredContactChannels: string[];
  nationality: string;
  cityRegion: string;
  dataPrivacyConsent: boolean;
  availabilityText: string;
  availabilityBlocks: string[];
  startDate: string;
  commitmentDuration: string;
  canTravel: boolean;
  maxTravelDistanceKm?: number;
};

type NgoDetails = {
  focusAreaText: string;
  preferredContactChannels: string[];
  alternateContact: string;
  cityRegion: string;
  yearEstablished: string;
  legalStatus: string;
  registrationAuthority: string;
  missionStatement: string;
  programsRunning: string;
  primaryBeneficiaries: string;
  geographicCoverage: string;
  teamSize: string;
  pastExperience: string;
  targetCommunities: string;
};

const safeParse = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const decodeVolunteer = (row: VolunteerProfile): VolunteerDetails => {
  const skills = safeParse(row.skills) as Partial<VolunteerDetails> | null;
  const availability = safeParse(row.availability) as Partial<VolunteerDetails> | null;

  return {
    skillsText: skills?.skillsText ?? row.skills,
    primarySkillCategories: skills?.primarySkillCategories ?? [],
    yearsOfExperience: skills?.yearsOfExperience ?? "",
    languagesSpoken: skills?.languagesSpoken ?? "",
    pastExperience: skills?.pastExperience ?? "",
    targetCommunities: skills?.targetCommunities ?? "",
    preferredContactChannels: skills?.preferredContactChannels ?? [],
    nationality: skills?.nationality ?? "",
    cityRegion: skills?.cityRegion ?? row.location,
    dataPrivacyConsent: Boolean(skills?.dataPrivacyConsent),
    availabilityText: availability?.availabilityText ?? row.availability,
    availabilityBlocks: availability?.availabilityBlocks ?? [],
    startDate: availability?.startDate ?? "",
    commitmentDuration: availability?.commitmentDuration ?? "",
    canTravel: Boolean(availability?.canTravel),
    maxTravelDistanceKm:
      typeof availability?.maxTravelDistanceKm === "number" ? availability.maxTravelDistanceKm : undefined,
  };
};

const decodeNgo = (row: NgoProfile): NgoDetails => {
  const focus = safeParse(row.focusArea) as Partial<NgoDetails> | null;
  return {
    focusAreaText: focus?.focusAreaText ?? row.focusArea,
    preferredContactChannels: focus?.preferredContactChannels ?? [],
    alternateContact: focus?.alternateContact ?? "",
    cityRegion: focus?.cityRegion ?? "",
    yearEstablished: focus?.yearEstablished ?? "",
    legalStatus: focus?.legalStatus ?? "",
    registrationAuthority: focus?.registrationAuthority ?? "",
    missionStatement: focus?.missionStatement ?? "",
    programsRunning: focus?.programsRunning ?? "",
    primaryBeneficiaries: focus?.primaryBeneficiaries ?? "",
    geographicCoverage: focus?.geographicCoverage ?? "",
    teamSize: focus?.teamSize ?? "",
    pastExperience: focus?.pastExperience ?? "",
    targetCommunities: focus?.targetCommunities ?? "",
  };
};

const AdminDashboardPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [ngos, setNgos] = useState<NgoProfile[]>([]);
  const [donors, setDonors] = useState<DonorProfile[]>([]);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [mediaArticles, setMediaArticles] = useState<MediaArticle[]>([]);
  const [activePanel, setActivePanel] = useState<AdminPanel>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [mediaForm, setMediaForm] = useState({
    title: "",
    summary: "",
    content: "",
    author: "",
    category: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    imageUrls: [] as string[],
    fullStoryUrl: "",
  });

  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>("");
  const [selectedNgoId, setSelectedNgoId] = useState<string>("");
  const [hasAutoSelectedVolunteer, setHasAutoSelectedVolunteer] = useState(false);
  const [hasAutoSelectedNgo, setHasAutoSelectedNgo] = useState(false);
  const [volunteerNote, setVolunteerNote] = useState("");
  const [ngoNote, setNgoNote] = useState("");
  const [volunteerRequestMoreInfo, setVolunteerRequestMoreInfo] = useState(false);
  const [ngoRequestMoreInfo, setNgoRequestMoreInfo] = useState(false);
  const [pendingProjectPhaseChange, setPendingProjectPhaseChange] = useState<{
    projectId: string;
    projectTitle: string;
    currentStatus: ProjectStatus;
    nextStatus: ProjectStatus;
  } | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const currentSession = await getSession();
        setSession(currentSession);

        if (!currentSession || currentSession.role !== "admin") {
          return;
        }

        const [volunteersRows, ngoRows, donorRows, suggestionRows, donationRows, projectRows, mediaRows] = await Promise.all([
          getVolunteers(),
          getNgos(),
          getDonors(),
          getSuggestions(),
          getDonations(),
          getProjects(),
          getMediaArticles(),
        ]);

        setVolunteers(volunteersRows);
        setNgos(ngoRows);
        setDonors(donorRows);
        setSuggestions(suggestionRows);
        setDonations(donationRows);
        setProjects(projectRows);
        setMediaArticles(mediaRows);
      } catch (error) {
        toast({
          title: "Dashboard load failed",
          description: error instanceof Error ? error.message : "Could not load admin data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [refreshKey, toast]);

  useEffect(() => {
    if (volunteers.length === 0) {
      setSelectedVolunteerId("");
      setHasAutoSelectedVolunteer(false);
      return;
    }

    // Keep the panel closed if the user explicitly closed it.
    if (hasAutoSelectedVolunteer) {
      return;
    }

    const pending = volunteers.find((item) => item.approvalStatus === "pending");
    setSelectedVolunteerId((pending ?? volunteers[0]).id);
    setHasAutoSelectedVolunteer(true);
  }, [volunteers, hasAutoSelectedVolunteer]);

  useEffect(() => {
    if (ngos.length === 0) {
      setSelectedNgoId("");
      setHasAutoSelectedNgo(false);
      return;
    }

    // Keep the panel closed if the user explicitly closed it.
    if (hasAutoSelectedNgo) {
      return;
    }

    const pending = ngos.find((item) => item.approvalStatus === "pending");
    setSelectedNgoId((pending ?? ngos[0]).id);
    setHasAutoSelectedNgo(true);
  }, [ngos, hasAutoSelectedNgo]);

  const guard = !session || session.role !== "admin";

  const selectedVolunteer = volunteers.find((item) => item.id === selectedVolunteerId) ?? null;
  const selectedVolunteerDetails = selectedVolunteer ? decodeVolunteer(selectedVolunteer) : null;

  const selectedNgo = ngos.find((item) => item.id === selectedNgoId) ?? null;
  const selectedNgoDetails = selectedNgo ? decodeNgo(selectedNgo) : null;

  const volunteerDupes = useMemo(() => {
    const emailCount = new Map<string, number>();
    const phoneCount = new Map<string, number>();
    for (const item of volunteers) {
      emailCount.set(item.email, (emailCount.get(item.email) ?? 0) + 1);
      phoneCount.set(item.phone, (phoneCount.get(item.phone) ?? 0) + 1);
    }
    return { emailCount, phoneCount };
  }, [volunteers]);

  const ngoDupes = useMemo(() => {
    const emailCount = new Map<string, number>();
    const phoneCount = new Map<string, number>();
    const regCount = new Map<string, number>();
    for (const item of ngos) {
      emailCount.set(item.email, (emailCount.get(item.email) ?? 0) + 1);
      phoneCount.set(item.phone, (phoneCount.get(item.phone) ?? 0) + 1);
      regCount.set(item.registrationNumber, (regCount.get(item.registrationNumber) ?? 0) + 1);
    }
    return { emailCount, phoneCount, regCount };
  }, [ngos]);

  const volunteerRisks = useMemo(() => {
    if (!selectedVolunteer || !selectedVolunteerDetails) {
      return [] as string[];
    }

    const risks: string[] = [];
    if (!selectedVolunteerDetails.nationality || !selectedVolunteerDetails.cityRegion || !selectedVolunteerDetails.dataPrivacyConsent) {
      risks.push("Missing critical verification fields.");
    }
    if ((volunteerDupes.emailCount.get(selectedVolunteer.email) ?? 0) > 1) {
      risks.push("Duplicate email detected.");
    }
    if ((volunteerDupes.phoneCount.get(selectedVolunteer.phone) ?? 0) > 1) {
      risks.push("Duplicate phone detected.");
    }
    if (selectedVolunteerDetails.skillsText.trim().length < 10 || selectedVolunteerDetails.pastExperience.trim().length < 10) {
      risks.push("Very short free-text response detected.");
    }

    return risks;
  }, [selectedVolunteer, selectedVolunteerDetails, volunteerDupes]);

  const ngoRisks = useMemo(() => {
    if (!selectedNgo || !selectedNgoDetails) {
      return [] as string[];
    }

    const risks: string[] = [];
    if (!selectedNgoDetails.legalStatus || !selectedNgoDetails.registrationAuthority || !selectedNgoDetails.cityRegion) {
      risks.push("Missing critical verification fields.");
    }
    if ((ngoDupes.emailCount.get(selectedNgo.email) ?? 0) > 1) {
      risks.push("Duplicate email detected.");
    }
    if ((ngoDupes.phoneCount.get(selectedNgo.phone) ?? 0) > 1) {
      risks.push("Duplicate phone detected.");
    }
    if ((ngoDupes.regCount.get(selectedNgo.registrationNumber) ?? 0) > 1) {
      risks.push("Duplicate registration number detected.");
    }
    if (selectedNgoDetails.missionStatement.trim().length < 10 || selectedNgoDetails.programsRunning.trim().length < 10) {
      risks.push("Very short free-text response detected.");
    }

    return risks;
  }, [selectedNgo, selectedNgoDetails, ngoDupes]);

  const last30DaysDonationTotal = useMemo(() => {
    const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return donations
      .filter((item) => new Date(item.createdAt).getTime() >= threshold)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [donations]);

  const pendingVolunteersCount = useMemo(
    () => volunteers.filter((item) => item.approvalStatus === "pending").length,
    [volunteers],
  );

  const pendingNgosCount = useMemo(
    () => ngos.filter((item) => item.approvalStatus === "pending").length,
    [ngos],
  );

  const pendingSuggestionsCount = useMemo(
    () => suggestions.filter((item) => item.status === "pending").length,
    [suggestions],
  );

  const handleSelectPanel = (panel: AdminPanel) => {
    setActivePanel(panel);
    setIsMobileSidebarOpen(false);
  };

  const handleRegistrationDecision = async (
    role: "volunteer" | "ngo" | "donor",
    userId: string,
    status: ApprovalStatus,
    email: string,
    name: string,
    adminNote: string,
    requestMoreInfo: boolean,
  ) => {
    if (!adminNote.trim() || adminNote.trim().length < 8) {
      toast({
        title: "Decision note required",
        description: "Please enter a meaningful admin note before approving or rejecting.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateRegistrationApprovalStatus({ role, userId, status });

      try {
        await sendRegistrationDecisionEmail({
          to: email,
          name,
          role: role === "ngo" ? "NGO" : role === "donor" ? "Donor" : "Volunteer",
          status,
          adminNote,
          requestMoreInfo,
        });
      } catch {
        toast({
          title: "Status updated",
          description: "Approval status was saved, but decision email could not be sent.",
          variant: "destructive",
        });
      }

      setRefreshKey((prev) => prev + 1);
      if (role === "volunteer") {
        setVolunteerNote("");
        setVolunteerRequestMoreInfo(false);
      }
      if (role === "ngo") {
        setNgoNote("");
        setNgoRequestMoreInfo(false);
      }

      toast({ title: "Registration updated", description: `${role.toUpperCase()} application marked as ${status}.` });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update registration status.",
        variant: "destructive",
      });
    }
  };

  const handleReviewSuggestion = async (suggestionId: string, decision: "approved" | "rejected") => {
    const adminNotes = window.prompt("Required admin note for this decision:")?.trim();

    if (!adminNotes || adminNotes.length < 8) {
      toast({
        title: "Decision note required",
        description: "A meaningful admin note is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const reviewResult = await updateSuggestionStatus(suggestionId, decision, adminNotes);
      await sendSuggestionDecisionEmail({
        to: reviewResult.email,
        submittedBy: reviewResult.submittedBy,
        title: reviewResult.title,
        status: decision,
        adminNotes,
      });
      setRefreshKey((prev) => prev + 1);
      toast({ title: "Suggestion updated", description: `Marked as ${decision}.` });
    } catch (error) {
      toast({
        title: "Review failed",
        description: error instanceof Error ? error.message : "Could not update suggestion.",
        variant: "destructive",
      });
    }
  };

  const handleCreateMediaArticle = async () => {
    if (!mediaForm.title.trim() || !mediaForm.summary.trim() || !mediaForm.content.trim() || !mediaForm.author.trim()) {
      toast({
        title: "Missing required fields",
        description: "Title, summary, content, and author are required.",
        variant: "destructive",
      });
      return;
    }

    if (mediaForm.imageUrls.length === 0) {
      toast({
        title: "At least one image is required",
        description: "Upload 1 to 3 story images before publishing.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMediaArticle({
        title: mediaForm.title.trim(),
        summary: mediaForm.summary.trim(),
        content: mediaForm.content.trim(),
        author: mediaForm.author.trim(),
        category: mediaForm.category.trim() || "General",
        publishedAt: mediaForm.publishedAt,
        imageUrls: mediaForm.imageUrls,
        fullStoryUrl: mediaForm.fullStoryUrl.trim() || undefined,
      });

      setMediaForm({
        title: "",
        summary: "",
        content: "",
        author: "",
        category: "",
        publishedAt: new Date().toISOString().slice(0, 10),
        imageUrls: [],
        fullStoryUrl: "",
      });
      setRefreshKey((prev) => prev + 1);
      toast({
        title: "Media article published",
        description: "The story is now available on the media page.",
      });
    } catch (error) {
      toast({
        title: "Publish failed",
        description: error instanceof Error ? error.message : "Could not create media article.",
        variant: "destructive",
      });
    }
  };

  const handleMediaImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    if (files.length > 3) {
      toast({
        title: "Maximum 3 images",
        description: "Please choose up to 3 images per story.",
        variant: "destructive",
      });
      event.currentTarget.value = "";
      return;
    }

    const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

    try {
      const uploadedImages = await Promise.all(Array.from(files).map((file) => readAsDataUrl(file)));
      setMediaForm((prev) => ({ ...prev, imageUrls: uploadedImages.slice(0, 3) }));
    } catch (error) {
      toast({
        title: "Image upload failed",
        description: error instanceof Error ? error.message : "Could not process selected image files.",
        variant: "destructive",
      });
    } finally {
      event.currentTarget.value = "";
    }
  };

  const handleProjectStatusUpdate = async (projectId: string, status: ProjectStatus) => {
    try {
      await updateProjectStatus(projectId, status);
      setRefreshKey((prev) => prev + 1);
      toast({
        title: "Project updated",
        description: `Project moved to ${projectStatusDisplay[status]}.`,
      });
    } catch (error) {
      toast({
        title: "Status update failed",
        description: error instanceof Error ? error.message : "Could not update project status.",
        variant: "destructive",
      });
    }
  };

  const handleProjectPhaseSelection = (project: Project, nextStatus: ProjectStatus) => {
    if (nextStatus === project.status) {
      return;
    }

    setPendingProjectPhaseChange({
      projectId: project.id,
      projectTitle: project.title,
      currentStatus: project.status,
      nextStatus,
    });
  };

  const handleConfirmProjectPhaseChange = async () => {
    if (!pendingProjectPhaseChange) {
      return;
    }

    await handleProjectStatusUpdate(pendingProjectPhaseChange.projectId, pendingProjectPhaseChange.nextStatus);
    setPendingProjectPhaseChange(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Could not logout.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container max-w-xl text-center text-muted-foreground">Loading admin dashboard...</div>
      </section>
    );
  }

  if (guard) {
    return (
      <section className="py-16">
        <div className="container max-w-xl text-center space-y-4">
          <h1 className="text-3xl">Admin access required</h1>
          <p className="text-muted-foreground">Please login with an admin account to access the BIH dashboard.</p>
          <Button asChild>
            <Link to="/login" state={{ from: "/admin" }}>Go to login</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 relative">
      <aside className="hidden lg:block fixed top-16 left-0 h-[calc(100vh-4rem)] w-72 border-r border-primary-foreground/10 bg-primary text-primary-foreground z-40">
        <div className="h-full overflow-y-auto p-4 space-y-2">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">Admin Sections</p>
          <Button
            variant="ghost"
            className={`w-full justify-start ${activePanel === "overview" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
            onClick={() => handleSelectPanel("overview")}
          >
            Overview
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${activePanel === "registrations" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
            onClick={() => handleSelectPanel("registrations")}
          >
            Registrations & Suggestions
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${activePanel === "media" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
            onClick={() => handleSelectPanel("media")}
          >
            Media Articles & Stories
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${activePanel === "projects" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
            onClick={() => handleSelectPanel("projects")}
          >
            Project Lifecycle
          </Button>
        </div>
      </aside>

      {isMobileSidebarOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40" role="dialog" aria-modal="true">
          <div className="h-full w-72 bg-primary text-primary-foreground border-r border-primary-foreground/10 p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">Admin Sections</p>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(false)} aria-label="Close menu" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              className={`w-full justify-start ${activePanel === "overview" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
              onClick={() => handleSelectPanel("overview")}
            >
              Overview
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${activePanel === "registrations" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
              onClick={() => handleSelectPanel("registrations")}
            >
              Registrations & Suggestions
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${activePanel === "media" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
              onClick={() => handleSelectPanel("media")}
            >
              Media Articles & Stories
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${activePanel === "projects" ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
              onClick={() => handleSelectPanel("projects")}
            >
              Project Lifecycle
            </Button>
          </div>
        </div>
      ) : null}

      <div className="container space-y-8 lg:pl-80">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden mt-1"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open admin menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
            <p className="text-sm font-semibold text-accent uppercase tracking-widest">Admin Dashboard</p>
            <h1 className="text-3xl md:text-5xl mt-3 mb-2">Admin Center</h1>
            <p className="text-muted-foreground">Structured approval workflow for volunteers, NGOs, donors, and submissions.</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>

        <div className="space-y-6">
            {activePanel === "overview" ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard label="Volunteers" value={volunteers.length} />
                  <SummaryCard label="NGOs" value={ngos.length} />
                  <SummaryCard label="Pending Suggestions" value={pendingSuggestionsCount} />
                  <SummaryCard label="Projects" value={projects.length} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard label="Pending Volunteers" value={pendingVolunteersCount} />
                  <SummaryCard label="Pending NGOs" value={pendingNgosCount} />
                  <SummaryCard label="Donations (last 30d)" value={Math.round(last30DaysDonationTotal)} />
                  <SummaryCard label="Media Stories" value={mediaArticles.length} />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                    <p><span className="font-medium">Active Donors:</span> {donors.length}</p>
                    <p><span className="font-medium">Total Donations:</span> {donations.length}</p>
                    <p><span className="font-medium">Pending Review Queue:</span> {pendingVolunteersCount + pendingNgosCount + pendingSuggestionsCount}</p>
                    <p><span className="font-medium">Live Projects:</span> {projects.length}</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activePanel === "registrations" ? (
              <>
                <div className="grid gap-4 md:grid-cols-5">
                  <SummaryCard label="Volunteers" value={volunteers.length} />
                  <SummaryCard label="NGOs" value={ngos.length} />
                  <SummaryCard label="Donors" value={donors.length} />
                  <SummaryCard label="Suggestions" value={suggestions.length} />
                  <SummaryCard label="Donations" value={donations.length} />
                </div>

                <Tabs defaultValue="volunteers" className="space-y-4">
                  <TabsList className="flex-wrap h-auto">
                    <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
                    <TabsTrigger value="ngos">NGOs</TabsTrigger>
                    <TabsTrigger value="donors">Donors</TabsTrigger>
                    <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                    <TabsTrigger value="donations">Donations</TabsTrigger>
                  </TabsList>

                  <TabsContent value="volunteers" className="space-y-4">
                    <VolunteerTable
                      rows={volunteers}
                      selectedId={selectedVolunteerId}
                      onToggleReview={(id) => setSelectedVolunteerId((prev) => (prev === id ? "" : id))}
                    />

                    {selectedVolunteer && selectedVolunteerDetails ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <ReviewSummaryCard
                          applicantType="Volunteer"
                          name={selectedVolunteer.fullName}
                          location={selectedVolunteerDetails.cityRegion || selectedVolunteer.location}
                          submittedAt={selectedVolunteer.createdAt}
                          status={selectedVolunteer.approvalStatus}
                          risks={volunteerRisks}
                        />
                        <VerificationCard
                          rows={[
                            ["Email", selectedVolunteer.email],
                            ["Phone", selectedVolunteer.phone],
                            ["Preferred Contact", selectedVolunteerDetails.preferredContactChannels.join(", ") || "Not provided"],
                            ["Nationality", selectedVolunteerDetails.nationality || "Not provided"],
                            ["City/Region", selectedVolunteerDetails.cityRegion || "Not provided"],
                            ["Privacy Consent", selectedVolunteerDetails.dataPrivacyConsent ? "Yes" : "No"],
                          ]}
                        />
                        <FitCard
                          rows={[
                            ["Skills", selectedVolunteerDetails.skillsText],
                            ["Skill Categories", selectedVolunteerDetails.primarySkillCategories.join(", ") || "Not provided"],
                            ["Experience", selectedVolunteerDetails.yearsOfExperience || "Not provided"],
                            ["Languages", selectedVolunteerDetails.languagesSpoken || "Not provided"],
                            ["Availability", selectedVolunteerDetails.availabilityText],
                            ["Time Blocks", selectedVolunteerDetails.availabilityBlocks.join(", ") || "Not provided"],
                            ["Start Date", selectedVolunteerDetails.startDate || "Not provided"],
                            ["Commitment", selectedVolunteerDetails.commitmentDuration || "Not provided"],
                            ["Can Travel", selectedVolunteerDetails.canTravel ? "Yes" : "No"],
                            ["Max Distance", selectedVolunteerDetails.maxTravelDistanceKm ? `${selectedVolunteerDetails.maxTravelDistanceKm} km` : "Not provided"],
                            ["Target Communities", selectedVolunteerDetails.targetCommunities || "Not provided"],
                            ["Past Experience", selectedVolunteerDetails.pastExperience || "Not provided"],
                          ]}
                        />
                        <DecisionCard
                          note={volunteerNote}
                          setNote={setVolunteerNote}
                          requestMoreInfo={volunteerRequestMoreInfo}
                          setRequestMoreInfo={setVolunteerRequestMoreInfo}
                          onApprove={() =>
                            handleRegistrationDecision(
                              "volunteer",
                              selectedVolunteer.id,
                              "approved",
                              selectedVolunteer.email,
                              selectedVolunteer.fullName,
                              volunteerNote,
                              volunteerRequestMoreInfo,
                            )
                          }
                          onReject={() =>
                            handleRegistrationDecision(
                              "volunteer",
                              selectedVolunteer.id,
                              "rejected",
                              selectedVolunteer.email,
                              selectedVolunteer.fullName,
                              volunteerNote,
                              volunteerRequestMoreInfo,
                            )
                          }
                          disabled={selectedVolunteer.approvalStatus !== "pending"}
                        />
                      </div>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="ngos" className="space-y-4">
                    <NgoTable
                      rows={ngos}
                      selectedId={selectedNgoId}
                      onToggleReview={(id) => setSelectedNgoId((prev) => (prev === id ? "" : id))}
                    />

                    {selectedNgo && selectedNgoDetails ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <ReviewSummaryCard
                          applicantType="NGO"
                          name={selectedNgo.organizationName}
                          location={selectedNgoDetails.cityRegion || "Not provided"}
                          submittedAt={selectedNgo.createdAt}
                          status={selectedNgo.approvalStatus}
                          risks={ngoRisks}
                        />
                        <VerificationCard
                          rows={[
                            ["Contact Person", selectedNgo.contactPerson],
                            ["Email", selectedNgo.email],
                            ["Phone", selectedNgo.phone],
                            ["Preferred Contact", selectedNgoDetails.preferredContactChannels.join(", ") || "Not provided"],
                            ["Alternative Contact", selectedNgoDetails.alternateContact || "Not provided"],
                            ["Registration Number", selectedNgo.registrationNumber],
                            ["Registration Authority", selectedNgoDetails.registrationAuthority || "Not provided"],
                            ["Legal Status", selectedNgoDetails.legalStatus || "Not provided"],
                            ["City/Region", selectedNgoDetails.cityRegion || "Not provided"],
                          ]}
                        />
                        <FitCard
                          rows={[
                            ["Focus Area", selectedNgoDetails.focusAreaText],
                            ["Year Established", selectedNgoDetails.yearEstablished || "Not provided"],
                            ["Mission", selectedNgoDetails.missionStatement || "Not provided"],
                            ["Programs Running", selectedNgoDetails.programsRunning || "Not provided"],
                            ["Primary Beneficiaries", selectedNgoDetails.primaryBeneficiaries || "Not provided"],
                            ["Geographic Coverage", selectedNgoDetails.geographicCoverage || "Not provided"],
                            ["Team Size", selectedNgoDetails.teamSize || "Not provided"],
                            ["Target Communities", selectedNgoDetails.targetCommunities || "Not provided"],
                            ["Past Experience", selectedNgoDetails.pastExperience || "Not provided"],
                          ]}
                        />
                        <DecisionCard
                          note={ngoNote}
                          setNote={setNgoNote}
                          requestMoreInfo={ngoRequestMoreInfo}
                          setRequestMoreInfo={setNgoRequestMoreInfo}
                          onApprove={() =>
                            handleRegistrationDecision(
                              "ngo",
                              selectedNgo.id,
                              "approved",
                              selectedNgo.email,
                              selectedNgo.organizationName,
                              ngoNote,
                              ngoRequestMoreInfo,
                            )
                          }
                          onReject={() =>
                            handleRegistrationDecision(
                              "ngo",
                              selectedNgo.id,
                              "rejected",
                              selectedNgo.email,
                              selectedNgo.organizationName,
                              ngoNote,
                              ngoRequestMoreInfo,
                            )
                          }
                          disabled={selectedNgo.approvalStatus !== "pending"}
                        />
                      </div>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="donors">
                    <SimpleStatusTable title="Donors" rows={donors.map((item) => ({
                      id: item.id,
                      name: item.fullName,
                      email: item.email,
                      status: item.approvalStatus,
                      extra: `${item.donorType} | ${item.interests}`,
                    }))} />
                  </TabsContent>

                  <TabsContent value="suggestions" className="space-y-4">
                    <Card>
                      <CardContent className="pt-6 text-sm text-muted-foreground">
                        Approved suggestions are promoted into the live project list with an initial <span className="font-medium text-foreground">Pending</span> phase.
                      </CardContent>
                    </Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Submitted By</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suggestions.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.title}</TableCell>
                            <TableCell>{item.submittedBy}</TableCell>
                            <TableCell>{item.location}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === "pending" ? "outline" : item.status === "approved" ? "default" : "secondary"} className="capitalize">
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.status === "pending" ? (
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleReviewSuggestion(item.id, "approved")}>Approve</Button>
                                  <Button size="sm" variant="outline" onClick={() => handleReviewSuggestion(item.id, "rejected")}>Reject</Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Reviewed</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="donations">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {donations.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.fullName}</TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>{item.currency} {item.amount}</TableCell>
                            <TableCell className="capitalize">{item.paymentMethod.replace("_", " ")}</TableCell>
                            <TableCell>{formatDate(item.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </>
            ) : null}

            {activePanel === "media" ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Publish Media Story</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="media-title">Title</Label>
                        <Input id="media-title" value={mediaForm.title} onChange={(event) => setMediaForm((prev) => ({ ...prev, title: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="media-category">Category</Label>
                        <Input id="media-category" value={mediaForm.category} onChange={(event) => setMediaForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Impact Story" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="media-author">Author</Label>
                        <Input id="media-author" value={mediaForm.author} onChange={(event) => setMediaForm((prev) => ({ ...prev, author: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="media-published-at">Publish Date</Label>
                        <Input id="media-published-at" type="date" value={mediaForm.publishedAt} onChange={(event) => setMediaForm((prev) => ({ ...prev, publishedAt: event.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="media-summary">Summary</Label>
                      <Textarea id="media-summary" value={mediaForm.summary} onChange={(event) => setMediaForm((prev) => ({ ...prev, summary: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="media-content">Story Content</Label>
                      <Textarea id="media-content" className="min-h-36" value={mediaForm.content} onChange={(event) => setMediaForm((prev) => ({ ...prev, content: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="media-image-upload">Story Images (1-3)</Label>
                      <Input id="media-image-upload" type="file" accept="image/*" multiple onChange={handleMediaImageUpload} />
                      <p className="text-xs text-muted-foreground">Upload up to 3 images. These will appear as a slideshow in the public story popup.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="media-full-story-url">Full Story URL (optional)</Label>
                      <Input
                        id="media-full-story-url"
                        type="url"
                        value={mediaForm.fullStoryUrl}
                        onChange={(event) => setMediaForm((prev) => ({ ...prev, fullStoryUrl: event.target.value }))}
                        placeholder="https://example.com/full-story"
                      />
                    </div>
                    {mediaForm.imageUrls.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {mediaForm.imageUrls.map((imageUrl, index) => (
                          <div key={`media-preview-${index}`} className="space-y-1">
                            <img src={imageUrl} alt={`Story preview ${index + 1}`} className="h-24 w-full rounded-md object-cover border" />
                            <p className="text-xs text-muted-foreground">Image {index + 1}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setMediaForm((prev) => ({ ...prev, imageUrls: [] }))}>
                        Clear Images
                      </Button>
                      <Button onClick={handleCreateMediaArticle}>Publish Story</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Published Stories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Author</TableHead>
                          <TableHead>Assets</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mediaArticles.map((article) => (
                          <TableRow key={article.id}>
                            <TableCell>{article.title}</TableCell>
                            <TableCell>{article.category}</TableCell>
                            <TableCell>{article.author}</TableCell>
                            <TableCell>{article.imageUrls.length} image(s){article.fullStoryUrl ? " + link" : ""}</TableCell>
                            <TableCell>{formatDate(article.publishedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activePanel === "projects" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Project Lifecycle Manager</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Timeline</TableHead>
                        <TableHead>Current Phase</TableHead>
                        <TableHead>Set Phase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.title}</TableCell>
                          <TableCell>{project.location}</TableCell>
                          <TableCell>{project.timeline}</TableCell>
                          <TableCell>
                            <Badge variant={project.status === "ongoing" ? "default" : project.status === "completed" ? "secondary" : "outline"}>
                              {projectStatusDisplay[project.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={project.status}
                              onValueChange={(value) => handleProjectPhaseSelection(project, value as ProjectStatus)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select phase" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="proposed">Pending</SelectItem>
                                <SelectItem value="ongoing">Ongoing</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            <AlertDialog open={pendingProjectPhaseChange !== null} onOpenChange={(open) => !open && setPendingProjectPhaseChange(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Phase Change</AlertDialogTitle>
                  <AlertDialogDescription>
                    {pendingProjectPhaseChange
                      ? `Change "${pendingProjectPhaseChange.projectTitle}" from ${projectStatusDisplay[pendingProjectPhaseChange.currentStatus]} to ${projectStatusDisplay[pendingProjectPhaseChange.nextStatus]}?`
                      : "Are you sure you want to change this project phase?"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmProjectPhaseChange}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
    </section>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-semibold">{value}</p>
    </CardContent>
  </Card>
);

const VolunteerTable = ({
  rows,
  selectedId,
  onToggleReview,
}: {
  rows: VolunteerProfile[];
  selectedId: string;
  onToggleReview: (id: string) => void;
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>Location</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Review</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.fullName}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell>{item.phone}</TableCell>
          <TableCell>{item.location}</TableCell>
          <TableCell>
            <Badge variant={item.approvalStatus === "approved" ? "default" : item.approvalStatus === "rejected" ? "secondary" : "outline"} className="capitalize">
              {item.approvalStatus}
            </Badge>
          </TableCell>
          <TableCell>
            <Button size="sm" variant="outline" onClick={() => onToggleReview(item.id)}>
              {selectedId === item.id ? "Close review" : "Open review"}
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const NgoTable = ({
  rows,
  selectedId,
  onToggleReview,
}: {
  rows: NgoProfile[];
  selectedId: string;
  onToggleReview: (id: string) => void;
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Organization</TableHead>
        <TableHead>Contact</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Review</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.organizationName}</TableCell>
          <TableCell>{item.contactPerson}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell>{item.phone}</TableCell>
          <TableCell>
            <Badge variant={item.approvalStatus === "approved" ? "default" : item.approvalStatus === "rejected" ? "secondary" : "outline"} className="capitalize">
              {item.approvalStatus}
            </Badge>
          </TableCell>
          <TableCell>
            <Button size="sm" variant="outline" onClick={() => onToggleReview(item.id)}>
              {selectedId === item.id ? "Close review" : "Open review"}
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const ReviewSummaryCard = ({
  applicantType,
  name,
  location,
  submittedAt,
  status,
  risks,
}: {
  applicantType: string;
  name: string;
  location: string;
  submittedAt: string;
  status: ApprovalStatus;
  risks: string[];
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Compact Summary</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-sm">
      <p><span className="font-medium">Applicant Type:</span> {applicantType}</p>
      <p><span className="font-medium">Name / Org:</span> {name}</p>
      <p><span className="font-medium">Location:</span> {location}</p>
      <p><span className="font-medium">Submission Date:</span> {formatDate(submittedAt)}</p>
      <p className="flex items-center gap-2"><span className="font-medium">Status:</span>
        <Badge variant={status === "approved" ? "default" : status === "rejected" ? "secondary" : "outline"} className="capitalize">{status}</Badge>
      </p>
      <div>
        <p className="font-medium">Risk Flags</p>
        {risks.length > 0 ? (
          <ul className="list-disc list-inside text-amber-700">
            {risks.map((risk) => <li key={risk}>{risk}</li>)}
          </ul>
        ) : (
          <p className="text-emerald-700">No immediate risk flags.</p>
        )}
      </div>
    </CardContent>
  </Card>
);

const VerificationCard = ({ rows }: { rows: Array<[string, string]> }) => (
  <Card>
    <CardHeader>
      <CardTitle>Verification Section</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <p key={label}><span className="font-medium">{label}:</span> {value}</p>
      ))}
    </CardContent>
  </Card>
);

const FitCard = ({ rows }: { rows: Array<[string, string]> }) => (
  <Card>
    <CardHeader>
      <CardTitle>Fit Section</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <p key={label}><span className="font-medium">{label}:</span> {value}</p>
      ))}
    </CardContent>
  </Card>
);

const DecisionCard = ({
  note,
  setNote,
  requestMoreInfo,
  setRequestMoreInfo,
  onApprove,
  onReject,
  disabled,
}: {
  note: string;
  setNote: (value: string) => void;
  requestMoreInfo: boolean;
  setRequestMoreInfo: (value: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  disabled: boolean;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Decision Section</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <Textarea
        placeholder="Required admin note for this decision..."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requestMoreInfo}
          onChange={(event) => setRequestMoreInfo(event.target.checked)}
        />
        Request more information
      </label>
      <div className="flex gap-2">
        <Button onClick={onApprove} disabled={disabled}>Approve</Button>
        <Button variant="outline" onClick={onReject} disabled={disabled}>Reject</Button>
      </div>
      {disabled ? <p className="text-sm text-muted-foreground">Decision already completed for this application.</p> : null}
    </CardContent>
  </Card>
);

const SimpleStatusTable = ({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ id: string; name: string; email: string; status: ApprovalStatus; extra: string }>;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.email}</TableCell>
              <TableCell>{item.extra}</TableCell>
              <TableCell>
                <Badge variant={item.status === "approved" ? "default" : item.status === "rejected" ? "secondary" : "outline"} className="capitalize">
                  {item.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export default AdminDashboardPage;
