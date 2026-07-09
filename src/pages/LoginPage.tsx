import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
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
    <div className="min-h-[85vh] py-12 bg-slate-50 flex items-center justify-center p-4">
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
              Sign In
            </Button>
          </form>
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
