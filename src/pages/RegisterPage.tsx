import { ArrowRight, Building2, HandHeart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
  return (
    <section className="py-20 bg-slate-50 min-h-[85vh] flex items-center">
      <div className="container max-w-5xl">
        <div className="text-center mb-12 space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-[#F59E0B] text-xs font-semibold uppercase tracking-widest border border-amber-200">
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
                  <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center mb-4 text-[#F59E0B]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-serif text-[#1E3A5F]">{role.title}</CardTitle>
                  <CardDescription className="text-xs min-h-[36px]">{role.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white flex items-center justify-center gap-1.5 text-xs">
                    <Link to={role.path}>
                      {role.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
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
