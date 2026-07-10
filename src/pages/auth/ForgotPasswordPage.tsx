import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setSubmitting(true);
    try {
      // Use exact redirectTo parameter per requirement
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: "https://www.bridgeforimpacthub.org/reset-password",
      });

      if (error) {
        throw error;
      }

      setSent(true);
      toast({
        title: "Reset link sent",
        description: "If the email is registered, you will receive a reset link.",
      });
    } catch (err: any) {
      // Still show success/sent screen as security best practice, but toast Supabase specific errors
      toast({
        title: "Request processed",
        description: "Password reset processing completed.",
      });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md mb-4 text-left">
        <Link to="/" className="text-xs text-[#1E3A5F] hover:underline font-semibold">
          &larr; Back to home
        </Link>
      </div>
      <Card className="w-full max-w-md shadow-md border-t-4 border-[#D4A017]">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-2 text-[#D4A017]">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-serif text-[#1E3A5F]">Forgot Password</CardTitle>
          <CardDescription>
            Request a password reset link for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg text-sm leading-relaxed">
                If an account exists with that email address, a password reset link has been sent. Please check your inbox.
              </div>
              <Button asChild className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white mt-2">
                <Link to="/login">Back to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. name@example.com"
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

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t py-4 bg-slate-50/50">
          <Link to="/login" className="text-xs text-[#1E3A5F] hover:underline flex items-center gap-1.5 font-medium">
            <ArrowLeft className="h-3 w-3" /> Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
