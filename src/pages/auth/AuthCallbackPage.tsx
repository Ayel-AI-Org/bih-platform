import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/database/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [statusMessage, setStatusMessage] = useState("Establishing secure authentication session...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 1. Get the current active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session || !session.user) {
          navigate("/login", { replace: true });
          return;
        }

        const user = session.user;
        const email = user.email || "";

        // 2. Check if a base profile already exists
        setStatusMessage("Verifying profile records...");
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        let role: "volunteer" | "ngo" | "donor";
        let isNewUser = false;

        if (!profile) {
          // New User signup via Google OAuth
          isNewUser = true;
          const selectedRole = searchParams.get("role") || "volunteer";
          
          if (selectedRole !== "volunteer" && selectedRole !== "donor") {
            role = "volunteer"; // Default fallback
          } else {
            role = selectedRole as "volunteer" | "donor";
          }

          setStatusMessage("Provisioning new ecosystem account...");
          
          const fullName = user.user_metadata.full_name || email.split("@")[0] || "Ecosystem Member";
          const avatarUrl = user.user_metadata.avatar_url || null;

          // Insert Base Profile
          const { error: insertProfileError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              role: role,
              full_name: fullName,
              email: email,
              avatar_url: avatarUrl,
              country: "Ghana",
              is_active: true,
            });

          if (insertProfileError) throw insertProfileError;

          // Insert Role-specific Registry
          if (role === "volunteer") {
            const { error: volunteerError } = await supabase
              .from("volunteer_profiles")
              .insert({
                user_id: user.id,
                phone: "pending",
                location: "pending",
                skills: [],
                availability: "pending",
                approval_status: "pending",
              });
            if (volunteerError) throw volunteerError;
          } else if (role === "donor") {
            const { error: donorError } = await supabase
              .from("donor_profiles")
              .insert({
                user_id: user.id,
                phone: "",
                donor_type: "individual",
                interests: [],
                approval_status: "pending",
              });
            if (donorError) throw donorError;
          }
        } else {
          // Existing User returning
          role = profile.role as "volunteer" | "ngo" | "donor";
        }

        // 3. Resolve Profile completeness & Approval redirects
        setStatusMessage("Evaluating access status...");

        if (role === "volunteer") {
          // Fetch volunteer profile details
          const { data: volProfile, error: volError } = await supabase
            .from("volunteer_profiles")
            .select("phone, location, approval_status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (volError) throw volError;

          const hasMissingFields = 
            !volProfile || 
            volProfile.phone === "pending" || 
            volProfile.location === "pending" ||
            !volProfile.phone || 
            !volProfile.location;

          if (hasMissingFields) {
            toast({
              title: "Profile incomplete",
              description: "Please complete your volunteer partner details to request onboarding approval.",
            });
            navigate("/complete-profile/volunteer", { replace: true });
            return;
          }

          if (volProfile.approval_status === "approved") {
            toast({
              title: "Welcome back!",
              description: `Session active for Volunteer: ${user.user_metadata.full_name || email}`,
            });
            navigate("/dashboard/volunteer", { replace: true });
          } else {
            navigate("/pending", { replace: true });
          }

        } else if (role === "donor") {
          // Donors go to pending (or directly to dashboard if approved)
          const { data: donorProfile, error: donorError } = await supabase
            .from("donor_profiles")
            .select("approval_status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (donorError) throw donorError;

          if (donorProfile?.approval_status === "approved") {
            toast({
              title: "Welcome back!",
              description: `Session active for Donor: ${user.user_metadata.full_name || email}`,
            });
            navigate("/dashboard/donor", { replace: true });
          } else {
            navigate("/pending", { replace: true });
          }

        } else if (role === "ngo") {
          // NGOs go to dashboard if approved, else pending
          const { data: ngoProfile, error: ngoError } = await supabase
            .from("ngo_profiles")
            .select("approval_status")
            .eq("user_id", user.id)
            .maybeSingle();

          if (ngoError) throw ngoError;

          if (ngoProfile?.approval_status === "approved") {
            toast({
              title: "Welcome back!",
              description: `Session active for NGO: ${profile.full_name}`,
            });
            navigate("/dashboard/ngo", { replace: true });
          } else {
            navigate("/pending", { replace: true });
          }
        } else {
          // Admin/Super Admin
          navigate("/admin", { replace: true });
        }

      } catch (err: any) {
        console.error("Auth callback error:", err);
        toast({
          title: "Authentication session failed",
          description: err.message || "Failed to resolve authenticated session.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, toast]);

  return (
    <div className="flex h-[80vh] w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4A017]" />
        <h3 className="text-lg font-serif text-[#1E3A5F] font-bold">Verifying Session</h3>
        <p className="text-muted-foreground text-xs font-medium animate-pulse">{statusMessage}</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
