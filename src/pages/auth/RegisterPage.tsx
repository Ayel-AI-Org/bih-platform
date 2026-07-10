import { ArrowRight, Building2, HandHeart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";

const roles = [
  {
    icon: Users,
    title: "Volunteer Partner",
    description: "Contribute your hours, skills, and effort to active NGO projects.",
    path: "/register/volunteer",
    cta: "Register as Volunteer",
  },
  {
    icon: Building2,
    title: "NGO Partner",
    description: "Submit project blueprints and coordinate local community tasks.",
    path: "/register/ngo",
    cta: "Register as NGO Partner",
  },
  {
    icon: HandHeart,
    title: "Donor Member",
    description: "Fund critical needs, track receipts, and audit community impact.",
    path: "/register/donor",
    cta: "Register as Donor",
  },
];

const RegisterPage = () => {
  const { toast } = useToast();

  const handleGoogleRegister = async (role: "volunteer" | "donor") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Google registration failed",
        description: err.message || "Could not initialize Google OAuth.",
        variant: "destructive",
      });
    }
  };
  return (
    <section className="py-20 bg-slate-50 min-h-[85vh] flex flex-col items-center justify-center">
      <div className="container max-w-5xl">
        <div className="mb-6 text-left">
          <Link to="/" className="text-xs text-[#1E3A5F] hover:underline font-semibold">
            &larr; Back to home
          </Link>
        </div>
        <div className="text-center mb-12 space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-[#D4A017] text-xs font-semibold uppercase tracking-widest border border-amber-200">
            Join the Ecosystem
          </span>
          <h1 className="text-3xl md:text-5xl font-serif text-[#1E3A5F] font-bold">Choose your pathway</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Select the profile that best matches your commitment to community building.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card key={role.title} className="border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center mb-4 text-[#D4A017]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-serif text-[#1E3A5F]">{role.title}</CardTitle>
                  <CardDescription className="text-xs min-h-[36px]">{role.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <Button asChild className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-1.5 text-xs">
                    <Link to={role.path}>
                      {role.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  {role.path !== "/register/ngo" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleGoogleRegister(role.path === "/register/volunteer" ? "volunteer" : "donor")}
                      className="w-full border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1E3A5F]"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56,12.25c0,-0.78 -0.07,-1.53 -0.2,-2.25h-10.36v4.26h5.92c-0.26,1.37 -1.04,2.53 -2.21,3.31v2.77h3.57c2.08,-1.92 3.28,-4.74 3.28,-8.09z" fill="#4285F4" />
                        <path d="M12,23c2.97,0 5.46,-0.98 7.28,-2.66l-3.57,-2.77c-0.98,0.66 -2.23,1.06 -3.71,1.06c-2.86,0 -5.29,-1.93 -6.16,-4.53h-3.69v2.87c1.82,3.61 5.55,6.03 9.85,6.03z" fill="#34A853" />
                        <path d="M5.84,14.09c-0.22,-0.66 -0.35,-1.36 -0.35,-2.09c0,-0.73 0.13,-1.43 0.35,-2.09v-2.87h-3.69c-0.77,1.54 -1.21,3.27 -1.21,5.1c0,1.83 0.44,3.56 1.21,5.1l3.69,-2.87z" fill="#FBBC05" />
                        <path d="M12,5.38c1.62,0 3.06,0.56 4.21,1.64l3.15,-3.15c-1.91,-1.78 -4.42,-2.87 -7.36,-2.87c-4.3,0 -8.03,2.42 -9.85,6.03l3.69,2.87c0.87,-2.6 3.3,-4.52 6.16,-4.52z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-[#1E3A5F] hover:underline font-semibold">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default RegisterPage;
