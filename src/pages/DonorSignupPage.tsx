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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const INTEREST_AREAS = [
  "Education",
  "Health",
  "Environment",
  "Community",
  "Infrastructure",
];

const donorSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    phone: z.string().optional().or(z.literal("")),
    donorType: z.string().min(1, "Please select donor type"),
    interests: z.array(z.string()).min(1, "Select at least one interest area"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type DonorFormValues = z.infer<typeof donorSchema>;

const DonorSignupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DonorFormValues>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      donorType: "",
      interests: [],
    },
  });

  const selectedInterests = watch("interests");

  const toggleInterest = (interest: string) => {
    const updated = selectedInterests.includes(interest)
      ? selectedInterests.filter((i) => i !== interest)
      : [...selectedInterests, interest];
    setValue("interests", updated, { shouldValidate: true });
  };

  const onSubmit = async (values: DonorFormValues) => {
    setSubmitting(true);
    try {
      // 1. Supabase Auth signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
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
        role: "donor",
        full_name: values.fullName,
        email: values.email,
        country: "Ghana",
      });

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error(profileError.message);
      }

      // 3. Insert donor_profiles record
      const { error: donorError } = await supabase.from("donor_profiles").insert({
        user_id: uid,
        phone: values.phone || null,
        donor_type: values.donorType,
        interests: values.interests,
        approval_status: "pending",
      });

      if (donorError) {
        throw new Error(donorError.message);
      }

      toast({
        title: "Registration submitted",
        description: "Your donor registration is pending admin approval.",
      });

      await supabase.auth.signOut();
      navigate("/pending");
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "An unexpected error occurred during donor signup.",
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
          <CardTitle className="text-2xl font-serif text-[#1E3A5F] font-bold">Donor Member Registration</CardTitle>
          <CardDescription>
            Register to support project causes, track philanthropy metrics, and audit real-world impact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name / Entity Name</Label>
              <Input
                id="fullName"
                disabled={submitting}
                className={errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.fullName.message}
                </p>
              )}
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
                <Label htmlFor="phone">Phone Number (Optional)</Label>
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
              <Label htmlFor="donorType">Donor Type</Label>
              <Select
                disabled={submitting}
                onValueChange={(val) => setValue("donorType", val, { shouldValidate: true })}
              >
                <SelectTrigger className={errors.donorType ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select donor classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Organisation">Organisation / Corporate</SelectItem>
                  <SelectItem value="Foundation">Philanthropic Foundation</SelectItem>
                </SelectContent>
              </Select>
              {errors.donorType && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.donorType.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Cause Interests (Select all that apply)</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {INTEREST_AREAS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <Badge
                      key={interest}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => !submitting && toggleInterest(interest)}
                      className={`cursor-pointer px-3 py-1.5 text-xs transition-colors flex items-center gap-1 ${
                        isSelected
                          ? "bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90"
                          : "bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {interest}
                      {isSelected && <Check className="h-3 w-3" />}
                    </Badge>
                  );
                })}
              </div>
              {errors.interests && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.interests.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-2 mt-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Register as Donor
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

export default DonorSignupPage;
