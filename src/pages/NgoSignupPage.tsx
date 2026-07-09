import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft } from "lucide-react";

const ngoSchema = z
  .object({
    organizationName: z.string().min(1, "Organisation name is required"),
    contactPerson: z.string().min(1, "Contact person name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    phone: z.string().min(1, "Phone number is required"),
    focusArea: z.string().min(1, "Focus area is required"),
    registrationNumber: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type NgoFormValues = z.infer<typeof ngoSchema>;

const NgoSignupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NgoFormValues>({
    resolver: zodResolver(ngoSchema),
    defaultValues: {
      organizationName: "",
      contactPerson: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      focusArea: "",
      registrationNumber: "",
    },
  });

  const onSubmit = async (values: NgoFormValues) => {
    setSubmitting(true);
    try {
      // 1. Supabase Auth signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.organizationName,
          },
        },
      });

      if (signUpError || !signUpData.user) {
        throw new Error(signUpError?.message || "Authentication signup failed.");
      }

      const uid = signUpData.user.id;

      // 2. Insert profile record
      const { error: profileError } = await supabase.from("profiles").insert({
        id: uid,
        role: "ngo",
        full_name: values.organizationName,
        email: values.email,
        country: "Ghana",
      });

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error(profileError.message);
      }

      // 3. Insert ngo_profiles record
      const { error: ngoError } = await supabase.from("ngo_profiles").insert({
        user_id: uid,
        organization_name: values.organizationName,
        contact_person: values.contactPerson,
        phone: values.phone,
        focus_area: values.focusArea,
        registration_number: values.registrationNumber || null,
        approval_status: "pending",
      });

      if (ngoError) {
        throw new Error(ngoError.message);
      }

      toast({
        title: "Registration submitted",
        description: "Your NGO application is pending admin approval.",
      });

      await supabase.auth.signOut();
      navigate("/pending");
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "An unexpected error occurred during NGO signup.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-md border-t-4 border-[#F59E0B]">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-[#1E3A5F] font-bold">NGO Partner Registration</CardTitle>
          <CardDescription>
            Register your organization to coordinate projects, log milestones, and recruit volunteers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organisation / NGO Name</Label>
              <Input
                id="organizationName"
                disabled={submitting}
                className={errors.organizationName ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("organizationName")}
              />
              {errors.organizationName && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.organizationName.message}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person Name</Label>
                <Input
                  id="contactPerson"
                  disabled={submitting}
                  className={errors.contactPerson ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("contactPerson")}
                />
                {errors.contactPerson && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {errors.contactPerson.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number (Optional)</Label>
                <Input
                  id="registrationNumber"
                  placeholder="e.g. NGO-12345"
                  disabled={submitting}
                  className={errors.registrationNumber ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("registrationNumber")}
                />
                {errors.registrationNumber && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {errors.registrationNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  disabled={submitting}
                  className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  disabled={submitting}
                  className={errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focusArea">Focus Area & Core mission description</Label>
              <Textarea
                id="focusArea"
                placeholder="e.g. Primary education support in rural areas, clean water outreach..."
                disabled={submitting}
                className={errors.focusArea ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("focusArea")}
              />
              {errors.focusArea && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.focusArea.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-2 mt-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Register as NGO Partner
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t py-4 bg-slate-50/50">
          <Link to="/register" className="text-xs text-[#1E3A5F] hover:underline flex items-center gap-1.5 font-medium">
            <ArrowLeft className="h-3 w-3" /> Back to role chooser
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NgoSignupPage;
