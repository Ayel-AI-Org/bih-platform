import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, Clock } from "lucide-react";

interface PendingUserInfo {
  name: string;
  email: string;
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
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          navigate("/login");
          return;
        }

        // Fetch name from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", authUser.id)
          .maybeSingle();

        setUser({
          name: profile?.full_name || authUser.user_metadata.full_name || "User",
          email: authUser.email || "",
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md mb-4 text-left">
        <Link to="/" className="text-xs text-[#1E3A5F] hover:underline font-semibold">
          &larr; Back to home
        </Link>
      </div>
      <Card className="w-full max-w-md shadow-lg border-t-4 border-[#D4A017]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-[#D4A017]">
            <Clock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-serif text-[#1E3A5F]">Account Under Review</CardTitle>
          <CardDescription>
            Bridge for Impact Hub onboarding process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 text-center">
          <div className="bg-slate-100/80 p-4 rounded-lg text-left text-xs space-y-1">
            <p className="text-muted-foreground font-medium">Account Details</p>
            <p className="text-[#1E3A5F] font-bold text-sm">{user?.name}</p>
            <p className="text-slate-500 font-mono mt-0.5">{user?.email}</p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Your account is under review. We'll notify you by email once approved.
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
