import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  exportRowsToCsv,
  getDonations,
  getDonors,
  getNgos,
  getSession,
  sendSuggestionDecisionEmail,
  getSuggestions,
  getVolunteers,
  logout,
  updateSuggestionStatus,
} from "@/lib/platform-data";
import type { Donation, DonorProfile, NgoProfile, ProjectSuggestion, Session, VolunteerProfile } from "@/types/models";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatDate = (value: string) => new Date(value).toLocaleDateString();

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

  useEffect(() => {
    const run = async () => {
      try {
        const currentSession = await getSession();
        setSession(currentSession);

        if (!currentSession || currentSession.role !== "admin") {
          return;
        }

        const [volunteersRows, ngoRows, donorRows, suggestionRows, donationRows] = await Promise.all([
          getVolunteers(),
          getNgos(),
          getDonors(),
          getSuggestions(),
          getDonations(),
        ]);

        setVolunteers(volunteersRows);
        setNgos(ngoRows);
        setDonors(donorRows);
        setSuggestions(suggestionRows);
        setDonations(donationRows);
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
  }, [refreshKey]);

  const guard = !session || session.role !== "admin";

  const handleExport = (filename: string, rows: Record<string, string | number>[]) => {
    try {
      exportRowsToCsv(filename, rows);
      toast({ title: "Export started", description: `${filename} downloaded.` });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export data.",
        variant: "destructive",
      });
    }
  };

  const handleReview = async (suggestionId: string, decision: "approved" | "rejected") => {
    const adminNotes = window.prompt("Optional note to include in email to the submitter:")?.trim();

    try {
      const reviewResult = await updateSuggestionStatus(suggestionId, decision, adminNotes || undefined);

      try {
        await sendSuggestionDecisionEmail({
          to: reviewResult.email,
          submittedBy: reviewResult.submittedBy,
          title: reviewResult.title,
          status: decision,
          adminNotes: adminNotes || undefined,
        });
      } catch {
        toast({
          title: "Suggestion updated",
          description: `Marked as ${decision}, but decision email could not be sent.`,
          variant: "destructive",
        });
      }

      setRefreshKey((prev) => prev + 1);
      toast({ title: "Suggestion updated", description: `Marked as ${decision} and email notification triggered.` });
    } catch (error) {
      toast({
        title: "Review failed",
        description: error instanceof Error ? error.message : "Could not update suggestion.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Admin logged out" });
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
    <section className="py-16">
      <div className="container space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent uppercase tracking-widest">Admin Dashboard</p>
            <h1 className="text-3xl md:text-5xl mt-3 mb-2">Phase 1 operational hub</h1>
            <p className="text-muted-foreground">View, filter, approve, and export core public-platform data.</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>

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

          <TabsContent value="volunteers" className="space-y-3">
            <ExportButton
              onClick={() =>
                handleExport(
                  "bih-volunteers.csv",
                  volunteers.map((item) => ({
                    name: item.fullName,
                    email: item.email,
                    phone: item.phone,
                    location: item.location,
                    skills: item.skills,
                    availability: item.availability,
                    createdAt: formatDate(item.createdAt),
                  })),
                )
              }
            />
            <VolunteerTable rows={volunteers} />
          </TabsContent>

          <TabsContent value="ngos" className="space-y-3">
            <ExportButton
              onClick={() =>
                handleExport(
                  "bih-ngos.csv",
                  ngos.map((item) => ({
                    organization: item.organizationName,
                    contactPerson: item.contactPerson,
                    email: item.email,
                    phone: item.phone,
                    focusArea: item.focusArea,
                    registrationNumber: item.registrationNumber,
                    createdAt: formatDate(item.createdAt),
                  })),
                )
              }
            />
            <NgoTable rows={ngos} />
          </TabsContent>

          <TabsContent value="donors" className="space-y-3">
            <ExportButton
              onClick={() =>
                handleExport(
                  "bih-donors.csv",
                  donors.map((item) => ({
                    name: item.fullName,
                    email: item.email,
                    phone: item.phone,
                    donorType: item.donorType,
                    interests: item.interests,
                    createdAt: formatDate(item.createdAt),
                  })),
                )
              }
            />
            <DonorTable rows={donors} />
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-3">
            <ExportButton
              onClick={() =>
                handleExport(
                  "bih-project-suggestions.csv",
                  suggestions.map((item) => ({
                    title: item.title,
                    submittedBy: item.submittedBy,
                    email: item.email,
                    phone: item.phone ?? "",
                    organization: item.organization ?? "",
                    category: item.category ?? "",
                    expectedBudget: item.expectedBudget ?? "",
                    beneficiaries: item.beneficiaries ?? "",
                    description: item.description,
                    location: item.location,
                    timeline: item.timeline,
                    status: item.status,
                    adminNotes: item.adminNotes ?? "",
                    reviewedAt: item.reviewedAt ? formatDate(item.reviewedAt) : "",
                    createdAt: formatDate(item.createdAt),
                  })),
                )
              }
            />
            <SuggestionTable rows={suggestions} onReview={handleReview} />
          </TabsContent>

          <TabsContent value="donations" className="space-y-3">
            <ExportButton
              onClick={() =>
                handleExport(
                  "bih-donations.csv",
                  donations.map((item) => ({
                    name: item.fullName,
                    email: item.email,
                    amount: `${item.currency} ${item.amount}`,
                    method: item.paymentMethod,
                    purpose: item.purpose,
                    confirmation: item.confirmationEmailStatus,
                    createdAt: formatDate(item.createdAt),
                  })),
                )
              }
            />
            <DonationTable rows={donations} />
          </TabsContent>
        </Tabs>
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

const ExportButton = ({ onClick }: { onClick: () => void }) => (
  <div className="flex justify-end">
    <Button variant="outline" onClick={onClick}>Export CSV</Button>
  </div>
);

const VolunteerTable = ({ rows }: { rows: VolunteerProfile[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Location</TableHead>
        <TableHead>Availability</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.fullName}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell>{item.location}</TableCell>
          <TableCell>{item.availability}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const NgoTable = ({ rows }: { rows: NgoProfile[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Organization</TableHead>
        <TableHead>Contact</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Focus</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.organizationName}</TableCell>
          <TableCell>{item.contactPerson}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell>{item.focusArea}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const DonorTable = ({ rows }: { rows: DonorProfile[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Type</TableHead>
        <TableHead>Interests</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.fullName}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell className="capitalize">{item.donorType}</TableCell>
          <TableCell>{item.interests}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const SuggestionTable = ({
  rows,
  onReview,
}: {
  rows: ProjectSuggestion[];
  onReview: (suggestionId: string, decision: "approved" | "rejected") => void;
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Title</TableHead>
        <TableHead>Submitted by</TableHead>
        <TableHead>Contact</TableHead>
        <TableHead>Details</TableHead>
        <TableHead>Location</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.title}</TableCell>
          <TableCell>{item.submittedBy}</TableCell>
          <TableCell>
            <div className="text-sm">
              <div>{item.email}</div>
              {item.phone ? <div className="text-muted-foreground">{item.phone}</div> : null}
            </div>
          </TableCell>
          <TableCell>
            <div className="max-w-sm text-xs text-muted-foreground space-y-1">
              {item.organization ? <div><span className="font-medium text-foreground">Org:</span> {item.organization}</div> : null}
              {item.category ? <div><span className="font-medium text-foreground">Category:</span> {item.category}</div> : null}
              {item.expectedBudget ? <div><span className="font-medium text-foreground">Budget:</span> GHS {item.expectedBudget}</div> : null}
              {item.beneficiaries ? <div><span className="font-medium text-foreground">Beneficiaries:</span> {item.beneficiaries}</div> : null}
              <div><span className="font-medium text-foreground">Summary:</span> {item.description}</div>
            </div>
          </TableCell>
          <TableCell>{item.location}</TableCell>
          <TableCell>
            <Badge variant={item.status === "pending" ? "outline" : item.status === "approved" ? "default" : "secondary"} className="capitalize">
              {item.status}
            </Badge>
          </TableCell>
          <TableCell>
            {item.status === "pending" ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onReview(item.id, "approved")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => onReview(item.id, "rejected")}>Reject</Button>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Reviewed</span>
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const DonationTable = ({ rows }: { rows: Donation[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Amount</TableHead>
        <TableHead>Method</TableHead>
        <TableHead>Confirmation</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.fullName}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell>{item.currency} {item.amount}</TableCell>
          <TableCell className="capitalize">{item.paymentMethod.replace("_", " ")}</TableCell>
          <TableCell>{item.confirmationEmailStatus}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default AdminDashboardPage;
