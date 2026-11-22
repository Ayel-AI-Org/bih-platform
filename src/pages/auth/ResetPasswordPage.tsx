import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, AlertCircle } from "lucide-react";
import PasswordRequirementsHelper from "@/components/auth/PasswordRequirementsHelper";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [initializing, setInitializing] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let isMounted = true;

    // Subscribe to onAuthStateChange for PASSWORD_RECOVERY
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        if (isMounted) {
          setIsSessionReady(true);
          setInitializing(false);
          setErrorMessage(null);
        }
      }
    });

    const establishSession = async () => {
      setInitializing(true);
      setErrorMessage(null);

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const code = searchParams.get("code");

      try {
        // (a) token_hash + type=recovery in the URL
        if (tokenHash && type === "recovery") {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (error) throw error;

          if (data?.session) {
            if (isMounted) {
              setIsSessionReady(true);
              setInitializing(false);
              setErrorMessage(null);
            }
            return;
          }
        }

        // (b) ?code= in the URL (PKCE exchange)
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) throw error;

          if (data?.session) {
            if (isMounted) {
              setIsSessionReady(true);
              setInitializing(false);
              setErrorMessage(null);
            }
            return;
          }
        }

        // (c) Existing active session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          if (isMounted) {
            setIsSessionReady(true);
            setInitializing(false);
            setErrorMessage(null);
          }
          return;
        }

        // Check if there is an in-flight hash fragment that GoTrue is still parsing
        if (window.location.hash.includes("access_token")) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          const {
            data: { session: hashSession },
          } = await supabase.auth.getSession();

          if (hashSession) {
            if (isMounted) {
              setIsSessionReady(true);
              setInitializing(false);
              setErrorMessage(null);
            }
            return;
          }
        }

        // If no session could be established
        if (isMounted) {
          setIsSessionReady(false);
          setInitializing(false);
          setErrorMessage(
            "This link is expired or was opened in a different browser. Request a new link and open it in the same browser."
          );
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Password reset session resolution failed:", err);
          setIsSessionReady(false);
          setInitializing(false);
          setErrorMessage(
            "This link is expired or was opened in a different browser. Request a new link and open it in the same browser."
          );
        }
      }
    };

    establishSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      toast({
        title: "Password updated",
        description: "Your password has been updated. Please sign in.",
      });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.message || "An unexpected error occurred during password update.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 py-10 md:py-12 flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md mb-4 text-left">
        <Link to="/" className="text-xs text-[#1E3A5F] hover:underline font-semibold">
          &larr; Back to home
        </Link>
      </div>
      <Card className="w-full max-w-md shadow-md border-t-4 border-[#D4A017]">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-2 text-[#D4A017]">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-serif text-[#1E3A5F]">Reset Password</CardTitle>
          <CardDescription>
            {initializing
              ? "Verifying reset authorization..."
              : errorMessage
              ? "Unable to reset password"
              : "Enter your new secure password below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initializing ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4A017]" />
              <p className="text-xs text-muted-foreground animate-pulse font-medium">
                Verifying reset authorization, please wait...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="space-y-4 text-center py-2">
              <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 text-amber-900 text-sm leading-relaxed text-left flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-950 mb-1">Session Not Found</p>
                  <p className="text-xs text-amber-900 leading-normal">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <Button asChild className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white mt-2">
                <Link to="/forgot-password">Request New Reset Link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  disabled={submitting || !isSessionReady}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  disabled={submitting || !isSessionReady}
                  className={errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <PasswordRequirementsHelper password={watch("password")} className="mt-1" />

              <Button
                type="submit"
                disabled={submitting || !isSessionReady}
                className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
