import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, logout } from "@/lib/platform-data";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VolunteerDashboard from "@/components/dashboard/VolunteerDashboard";
import NgoDashboard from "@/components/dashboard/NgoDashboard";
import DonorDashboard from "@/components/dashboard/DonorDashboard";
import { User, LogOut, ShieldAlert } from "lucide-react";

type ProfileDetails = {
  phone: string;
  location?: string;
  skills?: string;
  availability?: string;
  organizationName?: string;
  contactPerson?: string;
  focusArea?: string;
  registrationNumber?: string;
  interests?: string;
  donorType?: string;
  approvalStatus: string;
};

const UserProfileDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSession>>>(null);
  const [profileData, setProfileData] = useState<ProfileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const currentSession = await getSession();
        if (!active) return;
        setSession(currentSession);

        if (!currentSession) {
          navigate("/login");
          return;
        }

        if (currentSession.role === "admin") {
          navigate("/admin");
          return;
        }

        const roleTableMap = {
          volunteer: "volunteer_profiles",
          ngo: "ngo_profiles",
          donor: "donor_profiles",
        };
        const tableName = roleTableMap[currentSession.role];

        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .eq("profile_id", currentSession.userId)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (active && data) {
          setProfileData({
            phone: data.phone,
            location: data.location,
            skills: data.skills,
            availability: data.availability,
            organizationName: data.organization_name,
            contactPerson: data.contact_person,
            focusArea: data.focus_area,
            registrationNumber: data.registration_number,
            interests: data.interests,
            donorType: data.donor_type,
            approvalStatus: data.approval_status || "pending",
          });
        }
      } catch (error) {
        toast({
          title: "Failed to load dashboard",
          description: error instanceof Error ? error.message : "Could not fetch profile details.",
          variant: "destructive",
        });
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [navigate, toast]);

  const handleLogout = async () => {
    await logout();
    toast({ title: "Logged out", description: "Successfully logged out." });
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading portal workspace...</p>
        </div>
      </div>
    );
  }

  if (!session || !profileData) {
    return (
      <section className="py-16 bg-muted/20 min-h-screen">
        <div className="container max-w-xl text-center space-y-4 pt-12">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-3xl font-serif font-bold">Dashboard Unavailable</h1>
          <p className="text-muted-foreground">We could not resolve your profile details. Please log in again.</p>
          <Button onClick={handleLogout}>Log Out</Button>
        </div>
      </section>
    );
  }

  const badgeVariants: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  };

  return (
    <section className="py-12 bg-muted/10 min-h-screen">
      <div className="container max-w-5xl space-y-8">
        
        {/* Profile Ribbon */}
        <Card className="border border-primary/10 shadow-sm bg-gradient-to-r from-indigo-900/5 via-indigo-950/5 to-indigo-900/5">
          <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold font-serif text-foreground">{session.name}</h1>
                <p className="text-sm text-muted-foreground">{session.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-stretch md:self-auto justify-between">
              <div className="flex flex-col items-end gap-1.5">
                <Badge className="capitalize font-semibold text-xs py-0.5 px-2 bg-indigo-600 hover:bg-indigo-700">
                  {session.role}
                </Badge>
                <Badge
                  variant={badgeVariants[profileData.approvalStatus] || "secondary"}
                  className="capitalize font-semibold text-xs py-0.5 px-2"
                >
                  Status: {profileData.approvalStatus}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Alerts */}
        {profileData.approvalStatus === "pending" && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
            <strong>Application Under Review:</strong> Your BIH membership request is pending administrator approval. You will receive an email once a decision is made. Access to portal modules is currently read-only.
          </div>
        )}
        {profileData.approvalStatus === "rejected" && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-300">
            <strong>Application Denied:</strong> Please contact the BIH review board at support@bridgeforimpacthub.org to discuss your profile verification state.
          </div>
        )}

        {/* Dynamic Dashboards */}
        {profileData.approvalStatus === "approved" && (
          <div className="space-y-6">
            {session.role === "volunteer" && (
              <VolunteerDashboard userId={session.userId} profileData={profileData} />
            )}
            {session.role === "ngo" && (
              <NgoDashboard userId={session.userId} profileData={profileData} />
            )}
            {session.role === "donor" && (
              <DonorDashboard userId={session.userId} profileData={profileData} email={session.email} />
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default UserProfileDashboard;
