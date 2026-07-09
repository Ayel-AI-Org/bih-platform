import { useEffect, useState, FormEvent } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
// import platformData from "@/lib/platform-data";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RedeemInvitePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim();

  const [inviteData, setInviteData] = useState<{ email: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
  });

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerificationError("Invitation token is missing in the URL.");
        setIsVerifying(false);
        return;
      }

      try {
        const data = await verifyStaffInvite(token);
        setInviteData(data);
        setForm((prev) => ({ ...prev, email: data.email }));
      } catch (error) {
        setVerificationError(error instanceof Error ? error.message : "Invalid or expired token.");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !form.fullName.trim() || !form.email.trim()) {
      return;
    }

    setIsRedeeming(true);
    try {
      await redeemStaffInvite({
        token,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
      });

      toast({
        title: "Invitation redeemed",
        description: "Your administrator account has been set up. Check your email for authentication.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Redemption failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isVerifying) {
    return (
      <section className="py-16">
        <div className="container max-w-xl text-center text-muted-foreground">
          Verifying invitation token...
        </div>
      </section>
    );
  }

  if (verificationError || !inviteData) {
    return (
      <section className="py-16">
        <div className="container max-w-xl text-center space-y-4">
          <h1 className="text-3xl font-serif">Invalid Invitation</h1>
          <p className="text-muted-foreground">{verificationError || "The token is invalid."}</p>
          <Button asChild>
            <Link to="/">Go to Home</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Redeem Staff Invitation</CardTitle>
            <CardDescription>
              Complete your profile setup to activate your administrator dashboard access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  disabled
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Your email is locked to the invitation address.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isRedeeming}>
                {isRedeeming ? "Redeeming invitation..." : "Activate Account & Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default RedeemInvitePage;
