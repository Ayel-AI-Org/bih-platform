import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Printer, Coins, History, Heart } from "lucide-react";

interface DonationItem {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  purpose: string;
  status: string;
  reference: string;
  createdAt: string;
}

const DonorHistoryPage = () => {
  const { toast } = useToast();
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");

  const fetchDonationsHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch profiles table details to get donor name for receipt printing
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setFullName(profile.full_name);
      }

      // 2. Fetch all donations matching user
      const { data, error } = await supabase
        .from("donations")
        .select("id, amount, currency, payment_method, purpose, status, paystack_reference, created_at")
        .eq("donor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDonations(
        (data || []).map((row: any) => ({
          id: row.id,
          amount: Number(row.amount),
          currency: row.currency || "GHS",
          paymentMethod: row.payment_method,
          purpose: row.purpose || "General Fund",
          status: row.status,
          reference: row.paystack_reference || "N/A",
          createdAt: row.created_at,
        }))
      );
    } catch (err: any) {
      toast({
        title: "History load failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonationsHistory();
  }, []);

  const handlePrintReceipt = (donation: DonationItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Pop-up blocked",
        description: "Please allow pop-ups for this site to download your receipt.",
        variant: "destructive",
      });
      return;
    }

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - Bridge for Impact Hub</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #2c2c2c; line-height: 1.6; }
            .receipt-container { max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { font-family: Georgia, serif; color: #1e3a5f; margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0 0; font-size: 12px; color: #64748b; }
            .title { text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 25px; letter-spacing: 1px; color: #d4a017; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 8px; font-size: 14px; }
            .label { color: #64748b; font-weight: 500; }
            .value { color: #1e3a5f; font-weight: 600; text-align: right; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            @media print {
              body { padding: 0; }
              .receipt-container { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <h1>Bridge for Impact Hub</h1>
              <p>Empowering Communities, Building Bridges</p>
            </div>
            <div class="title">Official Donation Receipt</div>
            
            <div class="row">
              <span class="label">Receipt Date:</span>
              <span class="value">${new Date().toLocaleDateString()}</span>
            </div>
            <div class="row">
              <span class="label">Donor Name:</span>
              <span class="value">${fullName || "Valued Supporter"}</span>
            </div>
            <div class="row">
              <span class="label">Amount Paid:</span>
              <span class="value">${donation.currency} ${donation.amount.toFixed(2)}</span>
            </div>
            <div class="row">
              <span class="label">Date of Donation:</span>
              <span class="value">${new Date(donation.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="row">
              <span class="label">Reference ID:</span>
              <span class="value" style="font-family: monospace;">${donation.reference}</span>
            </div>
            <div class="row">
              <span class="label">Support Purpose:</span>
              <span class="value">${donation.purpose}</span>
            </div>
            <div class="row" style="border-bottom: none;">
              <span class="label">Payment Channel:</span>
              <span class="value" style="text-transform: capitalize;">${donation.paymentMethod.replace("_", " ")}</span>
            </div>

            <div class="footer">
              <p>Thank you for your generous support! Your contribution directly fuels local impact.</p>
              <p>Bridge for Impact Hub · Accra, Ghana · support@bih.org</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const truncateRef = (text: string) => {
    if (text.length <= 15) return text;
    return text.substring(0, 15) + "...";
  };

  const successfulDonations = donations.filter((d) => d.status === "success");
  const totalDonatedAmount = successfulDonations.reduce((sum, d) => sum + d.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Donation History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your financial contributions and download print-ready receipts.
        </p>
      </div>

      {/* Summary Stats Stripe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Donated</span>
            <Coins className="h-4 w-4 text-[#6B8E3E]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#6B8E3E]">
              GHS {totalDonatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Aggregate validated contributions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Successful Cycles</span>
            <Heart className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#1E3A5F]">{successfulDonations.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Number of completed transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* History Ledger Table */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="font-serif text-[#1E3A5F] text-lg font-bold">Transactions Dossier</CardTitle>
          <CardDescription>
            Immutable audit list of mobile money and card transaction receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {donations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <History className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm">No transactions registered under your account profile.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.map((don) => (
                      <TableRow key={don.id} className="hover:bg-slate-50/30 text-xs">
                        <TableCell className="text-slate-550 font-sans">
                          {new Date(don.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-[#1E3A5F] font-mono">
                          {don.currency} {don.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-slate-600 capitalize">
                          {don.paymentMethod.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-slate-655 max-w-[150px] truncate" title={don.purpose}>
                          {don.purpose}
                        </TableCell>
                        <TableCell className="text-slate-450 font-mono" title={don.reference}>
                          {truncateRef(don.reference)}
                        </TableCell>
                        <TableCell>
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
                        <TableCell className="text-right">
                          {don.status === "success" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrintReceipt(don)}
                              className="h-7 px-2 text-[#D4A017] hover:bg-slate-100 flex gap-1 items-center ml-auto"
                            >
                              <Printer className="h-3.5 w-3.5" /> Receipt
                            </Button>
                          ) : (
                            <span className="text-[10px] text-slate-400 mr-2">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="md:hidden divide-y divide-slate-100">
                {donations.map((don) => (
                  <div key={don.id} className="p-4 space-y-3.5 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-[#1E3A5F] font-mono">
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
                    <div className="space-y-1 text-[11px] text-slate-500 font-sans">
                      <p>Purpose: <span className="text-slate-700 font-medium">{don.purpose}</span></p>
                      <p>Reference: <code className="font-mono text-slate-600">{don.reference}</code></p>
                      <div className="flex justify-between pt-1 text-[10px] text-slate-400">
                        <span>Method: <span className="capitalize">{don.paymentMethod.replace("_", " ")}</span></span>
                        <span>{new Date(don.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {don.status === "success" && (
                      <div className="pt-2 border-t flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintReceipt(don)}
                          className="h-8 w-full text-xs text-[#D4A017] border-slate-200 flex gap-1 justify-center"
                        >
                          <Printer className="h-4 w-4" /> Download Receipt
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DonorHistoryPage;
