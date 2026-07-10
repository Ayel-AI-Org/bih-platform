import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, Lock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Google sign in failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      // 1. Supabase SignIn
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        // Map common errors to specific user-facing toasts
        if (signInError.message.toLowerCase().includes("invalid login credentials")) {
          toast({
            title: "Authentication failed",
            description: "Invalid email or password",
            variant: "destructive",
          });
          return;
        }
        throw signInError;
      }

      const user = data.user;
      if (!user) {
        throw new Error("Unable to resolve authenticated session.");
      }

      // 2. Fetch role from public.profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        throw profileError;
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error("User profile record not found.");
      }

      const role = profile.role;

      // 3. Admin Redirect (no approval status check needed)
      if (role === "admin") {
        toast({
          title: "Welcome back",
          description: `Administrator session active: ${profile.full_name}`,
        });
        const redirectPath = (location.state as any)?.from || "/admin";
        navigate(redirectPath, { replace: true });
        return;
      }

      // 4. Resolve table mapping for public role approvals
      const roleTableMap = {
        volunteer: "volunteer_profiles",
        ngo: "ngo_profiles",
        donor: "donor_profiles",
      };

      const tableName = roleTableMap[role as "volunteer" | "ngo" | "donor"];
      if (!tableName) {
        await supabase.auth.signOut();
        throw new Error("Invalid profile role association.");
      }

      const { data: roleProfile, error: roleProfileError } = await supabase
        .from(tableName)
        .select("approval_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleProfileError) {
        await supabase.auth.signOut();
        throw roleProfileError;
      }

      const approvalStatus = roleProfile?.approval_status || "pending";

      // 5. Apply redirect logic
      if (approvalStatus === "pending") {
        toast({
          title: "Access Restricted",
          description: "Your account is pending approval",
          variant: "default",
        });
        navigate("/pending", { replace: true });
        return;
      }

      if (approvalStatus === "rejected") {
        toast({
          title: "Access Denied",
          description: "Your account was not approved.",
          variant: "destructive",
        });
        navigate("/pending", { replace: true });
        return;
      }

      if (approvalStatus === "approved") {
        toast({
          title: "Sign in successful",
          description: `Welcome back, ${profile.full_name}.`,
        });

        const dashboardRedirectMap = {
          volunteer: "/dashboard/volunteer",
          ngo: "/dashboard/ngo",
          donor: "/dashboard/donor",
        };

        const redirectPath =
          (location.state as any)?.from ||
          dashboardRedirectMap[role as "volunteer" | "ngo" | "donor"] ||
          "/";

        navigate(redirectPath, { replace: true });
      }
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "An unexpected error occurred during sign in.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-12 bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-4 text-left">
        <Link to="/" className="text-xs text-[#1E3A5F] hover:underline font-semibold">
          &larr; Back to home
        </Link>
      </div>
      <Card className="w-full max-w-md shadow-md border-t-4 border-[#D4A017]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-2 text-[#D4A017]">
            <LogIn className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-serif text-[#1E3A5F] font-bold">Sign In</CardTitle>
          <CardDescription>
            Access the Bridge for Impact Hub dashboard portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                disabled={submitting}
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#1E3A5F] hover:underline flex items-center gap-1 font-medium"
                >
                  <Lock className="h-3 w-3" /> Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                disabled={submitting}
                className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-2 mt-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={handleGoogleLogin}
              className="w-full border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold text-[#1E3A5F] hover:text-[#1E3A5F]"
            >
              <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56,12.25c0,-0.78 -0.07,-1.53 -0.2,-2.25h-10.36v4.26h5.92c-0.26,1.37 -1.04,2.53 -2.21,3.31v2.77h3.57c2.08,-1.92 3.28,-4.74 3.28,-8.09z" fill="#4285F4" />
                <path d="M12,23c2.97,0 5.46,-0.98 7.28,-2.66l-3.57,-2.77c-0.98,0.66 -2.23,1.06 -3.71,1.06c-2.86,0 -5.29,-1.93 -6.16,-4.53h-3.69v2.87c1.82,3.61 5.55,6.03 9.85,6.03z" fill="#34A853" />
                <path d="M5.84,14.09c-0.22,-0.66 -0.35,-1.36 -0.35,-2.09c0,-0.73 0.13,-1.43 0.35,-2.09v-2.87h-3.69c-0.77,1.54 -1.21,3.27 -1.21,5.1c0,1.83 0.44,3.56 1.21,5.1l3.69,-2.87z" fill="#FBBC05" />
                <path d="M12,5.38c1.62,0 3.06,0.56 4.21,1.64l3.15,-3.15c-1.91,-1.78 -4.42,-2.87 -7.36,-2.87c-4.3,0 -8.03,2.42 -9.85,6.03l3.69,2.87c0.87,-2.6 3.3,-4.52 6.16,-4.52z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 justify-center border-t py-4 bg-slate-50/50 text-xs text-center">
          <p className="text-muted-foreground">
            Don't have an account yet?{" "}
            <Link to="/register" className="text-[#1E3A5F] hover:underline font-semibold">
              Register here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
