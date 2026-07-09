import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Landmark, LandmarkIcon, Coins, History, HeartHandshake } from "lucide-react";

interface RecentDonationItem {
  id: string;
  amount: number;
  currency: string;
  purpose: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

const DonorOverviewPage = () => {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalDonated: 0,
    donationsCount: 0,
    projectsSupported: 0,
  });
  const [recentDonations, setRecentDonations] = useState<RecentDonationItem[]>([]);

  const fetchDonorOverviewData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch profiles table details
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setFullName(profile.full_name);
      }

      // 2. Fetch all successful donations by this donor
      const { data: donations, error: donErr } = await supabase
        .from("donations")
        .select("amount, purpose, status")
        .eq("donor_id", user.id)
        .eq("status", "success");

      if (donErr) throw donErr;

      const totalDonatedSum = (donations || []).reduce((sum, d) => sum + Number(d.amount), 0);
      const countSuccess = (donations || []).length;
      const uniquePurposes = new Set((donations || []).map((d) => d.purpose?.trim()).filter(Boolean));

      setStats({
        totalDonated: totalDonatedSum,
        donationsCount: countSuccess,
        projectsSupported: uniquePurposes.size,
      });

      // 3. Fetch 5 most recent donations
      const { data: recent, error: recErr } = await supabase
        .from("donations")
        .select("id, amount, currency, purpose, payment_method, status, created_at")
        .eq("donor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recErr) throw recErr;

      setRecentDonations(
        (recent || []).map((row: any) => ({
          id: row.id,
          amount: Number(row.amount),
          currency: row.currency || "GHS",
          purpose: row.purpose || "General Fund",
          paymentMethod: row.payment_method,
          status: row.status,
          createdAt: row.created_at,
        }))
      );
    } catch (err: any) {
      toast({
        title: "Failed to load donor overview",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorOverviewData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-64 mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Donated",
      value: `GHS ${stats.totalDonated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Coins,
      color: "text-[#6B8E3E] bg-[#6B8E3E]/10",
      description: "Aggregate financial contributions",
    },
    {
      title: "Donations Logged",
      value: stats.donationsCount,
      icon: Heart,
      color: "text-rose-500 bg-rose-50",
      description: "Successful payment cycles",
    },
    {
      title: "Causes Supported",
      value: stats.projectsSupported,
      icon: HeartHandshake,
      color: "text-[#1E3A5F] bg-[#1E3A5F]/10",
      description: "Distinct projects funded",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Welcome back, {fullName || "Philanthropist"}</h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">Donor Partner Console</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold font-mono text-[#1E3A5F]">{card.value}</div>
                <p className="text-[10px] text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Donations Ledger */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Contributions History
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Quick lookup of your last 5 donations records</p>
          </div>
          <History className="h-5 w-5 text-slate-400" />
        </CardHeader>
        <CardContent className="p-0">
          {recentDonations.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm space-y-3">
              <p>You have not made any donations yet.</p>
              <Button asChild className="bg-[#D4A017] hover:bg-[#D4A017]/90 text-white font-medium text-xs">
                <Link to="/donate">Make First Donation</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDonations.map((don) => (
                      <TableRow key={don.id} className="hover:bg-slate-50/30 text-xs">
                        <TableCell className="font-semibold text-slate-800 font-mono">
                          {don.currency} {don.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-slate-655">{don.purpose}</TableCell>
                        <TableCell className="text-slate-500 capitalize">
                          {don.paymentMethod.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-slate-450 font-sans">
                          {new Date(don.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                              don.status === "success"
                                ? "bg-[#6B8E3E]"
                                : don.status === "pending"
                                ? "bg-[#C8601A]"
                                : "bg-[#C0392B]"
                            }`}
                          >
                            {don.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="md:hidden divide-y divide-slate-100">
                {recentDonations.map((don) => (
                  <div key={don.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-800 font-mono">
                        {don.currency} {don.amount.toFixed(2)}
                      </h4>
                      <Badge
                        className={`text-[8px] uppercase font-bold tracking-wider border-none text-white ${
                          don.status === "success"
                            ? "bg-[#6B8E3E]"
                            : don.status === "pending"
                            ? "bg-[#C8601A]"
                            : "bg-[#C0392B]"
                        }`}
                      >
                        {don.status}
                      </Badge>
                    </div>
                    <div className="space-y-0.5 text-[11px] text-slate-500 font-sans">
                      <p>Purpose: <span className="text-slate-700 font-medium">{don.purpose}</span></p>
                      <div className="flex justify-between pt-1 text-[10px] text-slate-400">
                        <span>Method: <span className="capitalize">{don.paymentMethod.replace("_", " ")}</span></span>
                        <span>{new Date(don.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Donate Again CTA Footer link */}
              <div className="p-4 border-t flex justify-center bg-slate-50/50">
                <Button asChild className="bg-[#D4A017] hover:bg-[#D4A017]/90 text-white font-medium text-xs flex gap-1 h-9 px-6">
                  <Link to="/donate">
                    <Heart className="h-4 w-4 fill-white" /> Donate Again
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DonorOverviewPage;
