import { ArrowRight, Building2, HandHeart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const roles = [
  {
    icon: Users,
    title: "Volunteer Registration",
    description: "Create a volunteer profile and join projects based on your skills and availability.",
    path: "/register/volunteer",
    cta: "Sign up as Volunteer",
  },
  {
    icon: Building2,
    title: "NGO / Club Registration",
    description: "Register your organization to submit projects and collaborate with BIH partners.",
    path: "/register/ngo",
    cta: "Register your NGO",
  },
  {
    icon: HandHeart,
    title: "Donor Registration",
    description: "Create a donor profile to support initiatives and track your philanthropic engagement.",
    path: "/register/donor",
    cta: "Join as Donor",
  },
];

const RegisterPage = () => {
  return (
    <section className="py-16">
      <div className="container max-w-6xl">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-accent uppercase tracking-widest">Phase 1 • Registration</p>
          <h1 className="text-3xl md:text-5xl mt-3 mb-4">Choose your registration path</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            BIH maintains role-specific onboarding for volunteers, NGOs/clubs, and donors.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.title} className="border-border/80">
              <CardHeader>
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                  <role.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-2xl">{role.title}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={role.path}>
                    {role.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RegisterPage;
