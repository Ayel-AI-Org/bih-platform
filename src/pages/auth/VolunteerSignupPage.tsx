import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_SKILLS = [
  "Education",
  "Health",
  "Construction",
  "IT",
  "Agriculture",
  "Environment",
  "Community Outreach",
];

const volunteerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .regex(/^[A-Za-z\s-]+$/, "Name must contain only letters, spaces, and hyphens"),
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^[0-9]+$/, "Phone number must contain only numbers"),
    location: z.string().min(1, "Location is required"),
    skills: z.array(z.string()).min(1, "Select at least one skill category"),
    availability: z.string().min(1, "Please select availability option"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type VolunteerFormValues = z.infer<typeof volunteerSchema>;

const VolunteerSignupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VolunteerFormValues>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      location: "",
      skills: [],
      availability: "",
    },
  });

  const selectedSkills = watch("skills");

  const toggleSkill = (skill: string) => {
    const updated = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setValue("skills", updated, { shouldValidate: true });
  };

  const onSubmit = async (values: VolunteerFormValues) => {
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
        role: "volunteer",
        full_name: values.fullName,
        email: values.email,
        country: "Ghana",
      });

      if (profileError) {
        // Clean up Auth user if profile insert fails
        await supabase.auth.signOut();
        throw new Error(profileError.message);
      }

      // 3. Insert volunteer_profiles record
      const { error: volunteerError } = await supabase.from("volunteer_profiles").insert({
        user_id: uid,
        phone: values.phone,
        location: values.location,
        skills: values.skills,
        availability: values.availability,
        approval_status: "pending",
      });

      if (volunteerError) {
        throw new Error(volunteerError.message);
      }

      toast({
        title: "Registration submitted",
        description: "Your volunteer application has been sent for admin review.",
      });

      // Clear session local state and redirect
      await supabase.auth.signOut();
      navigate("/pending");
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "An unexpected error occurred during signup.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-md border-t-4 border-[#D4A017]">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-[#1E3A5F] font-bold">Volunteer Registration</CardTitle>
          <CardDescription>
            Join as a volunteer partner to start tracking your hours, skills, and community impact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                disabled={submitting}
                className={errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}
                {...register("fullName", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/[^A-Za-z\s-]/g, "");
                  },
                })}
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  disabled={submitting}
                  className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("phone", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, "");
                    },
                  })}
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  disabled={submitting}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive pr-10" : "pr-10"}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  disabled={submitting}
                  className={errors.confirmPassword ? "border-destructive focus-visible:ring-destructive pr-10" : "pr-10"}
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  disabled={submitting}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location / Area</Label>
                <Input
                  id="location"
                  placeholder="e.g. Accra, Ghana"
                  disabled={submitting}
                  className={errors.location ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("location")}
                />
                {errors.location && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {errors.location.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability">Availability Block</Label>
                <Select
                  disabled={submitting}
                  onValueChange={(val) => setValue("availability", val, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.availability ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekdays">Weekdays</SelectItem>
                    <SelectItem value="Weekends">Weekends</SelectItem>
                    <SelectItem value="Both">Both (Weekdays & Weekends)</SelectItem>
                    <SelectItem value="Flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
                {errors.availability && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {errors.availability.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Skills & Expertise (Select all that apply)</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {AVAILABLE_SKILLS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <Badge
                      key={skill}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => !submitting && toggleSkill(skill)}
                      className={`cursor-pointer px-3 py-1.5 text-xs transition-colors flex items-center gap-1 ${
                        isSelected
                          ? "bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90"
                          : "bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {skill}
                      {isSelected && <Check className="h-3 w-3" />}
                    </Badge>
                  );
                })}
              </div>
              {errors.skills && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.skills.message}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2.5 pt-2 pb-1">
              <input
                id="consentCheckbox"
                type="checkbox"
                checked={acceptedTerms}
                disabled={submitting}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer"
              />
              <Label htmlFor="consentCheckbox" className="text-xs text-slate-600 leading-normal font-normal cursor-pointer select-none">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="text-[#1E3A5F] font-medium hover:underline">
                  Terms & Conditions
                </Link>{" "}
                and consent to the{" "}
                <Link to="/privacy" target="_blank" className="text-[#1E3A5F] font-medium hover:underline">
                  Privacy Policy
                </Link>
                .
              </Label>
            </div>

            <Button
              type="submit"
              disabled={submitting || !acceptedTerms}
              className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Register as Volunteer
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

export default VolunteerSignupPage;
