import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/database/client";
import { fetchUserAuthStatus } from "@/components/layout/AuthGuards";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, Clock, XCircle } from "lucide-react";

interface PendingUserInfo {
  name: string;
  email: string;
  approvalStatus: "pending" | "approved" | "rejected" | null;
}

const PendingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<PendingUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const authStatus = await fetchUserAuthStatus();
        if (!authStatus.user) {
          navigate("/login");
          return;
        }

        // If approved, redirect to dashboard
        if (authStatus.approvalStatus === "approved") {
          if (authStatus.role === "volunteer") {
            navigate("/dashboard/volunteer");
            return;
          }
          if (authStatus.role === "ngo") {
            navigate("/dashboard/ngo");
            return;
          }
          if (authStatus.role === "donor") {
            navigate("/dashboard/donor");
            return;
          }
        }

        // Fetch name from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", authStatus.user.id)
          .maybeSingle();

        setUser({
          name: profile?.full_name || authStatus.user.user_metadata?.full_name || "User",
          email: authStatus.user.email || "",
          approvalStatus: authStatus.approvalStatus,
        });
      } catch (err) {
        console.error("Failed to load user info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Error signing out",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4A017]" />
      </div>
    );
  }

  const isRejected = user?.approvalStatus === "rejected";

  return (
    <div className="flex-1 py-10 md:py-16 flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md mb-4 text-left">
        <Link to="/" className="text-xs text-[#1E3A5F] hover:underline font-semibold">
          &larr; Back to home
        </Link>
      </div>
      <Card className={`w-full max-w-md shadow-lg border-t-4 ${isRejected ? "border-rose-600" : "border-[#D4A017]"}`}>
        <CardHeader className="text-center pb-2">
          <div
            className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-4 ${
              isRejected ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-[#D4A017]"
            }`}
          >
            {isRejected ? <XCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </div>
          <CardTitle className="text-2xl font-serif text-[#1E3A5F]">
            {isRejected ? "Application Not Approved" : "Account Under Review"}
          </CardTitle>
          <CardDescription>
            {isRejected
              ? "Bridge for Impact Hub application update"
              : "Bridge for Impact Hub onboarding process."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 text-center">
          <div className="bg-slate-100/80 p-4 rounded-lg text-left text-xs space-y-1">
            <p className="text-muted-foreground font-medium">Account Details</p>
            <p className="text-[#1E3A5F] font-bold text-sm">{user?.name}</p>
            <p className="text-slate-500 font-mono mt-0.5">{user?.email}</p>
          </div>

          {isRejected ? (
            <p className="text-sm text-slate-600 leading-relaxed">
              Thank you for your interest in joining Bridge for Impact Hub. Following our review process, we regret to inform you that your registration could not be approved at this time. Please check your email for the detailed decision notice.
            </p>
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">
              Your account is under review. Kindly watch this space within the next 48 hours for updates. Thank you for your patience and understanding as we ensure a secure and welcoming environment for all our users.
            </p>
          )}

          <p className="text-sm text-slate-600 leading-relaxed">
            If you have questions or require further assistance, please contact our team at{" "}
            <a href="mailto:bridgeforimpacthub@gmail.com" className="text-[#1E3A5F] underline font-medium">
              bridgeforimpacthub@gmail.com
            </a>{" "}
            or call{" "}
            <a href="tel:+233530110924" className="text-[#1E3A5F] underline font-medium">
              +233 (0) 53 011 0924
            </a>{" "}
            (Accra, Ghana).
          </p>

          <Button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-2"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingPage;
