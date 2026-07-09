import { useEffect, useState } from "react";
import { getDonations } from "@/lib/platform-data";
import { type Donation } from "@/types/models";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Heart, Wallet, FileCheck } from "lucide-react";

interface DonorDashboardProps {
  userId: string;
  profileData: any;
  email: string;
}

export const DonorDashboard = ({ userId, profileData, email }: DonorDashboardProps) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const allDonations = await getDonations();
        // Filter donations matching this user's email
        const matched = allDonations.filter(
          (d) => d.email.toLowerCase() === email.toLowerCase()
        );
        setDonations(matched);
      } catch (err: any) {
        console.error("Error loading donations:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDonations();
  }, [email]);

  const totalDonated = donations.reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="space-y-8">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-red-500/10 rounded-lg text-rose-500">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Contributed</p>
              <h3 className="text-3xl font-bold font-serif">GHS {totalDonated.toFixed(2)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-600">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Donations Made</p>
              <h3 className="text-3xl font-bold font-serif">{donations.length} transactions</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Personal Donation Ledger</CardTitle>
          <CardDescription>
            Secure record of your philanthropic support. Donation receipts and status tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading transaction records...</p>
          ) : donations.length === 0 ? (
            <div className="text-center py-12 rounded-lg border border-dashed text-muted-foreground">
              <Heart className="mx-auto h-8 w-8 text-rose-300 mb-2" />
              <p className="text-sm">You haven't made any donations yet. Visit the Donate page to support our works.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supported Cause / Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paystack Ref</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Transaction Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations.map((d) => (
                    <TableRow key={d.id} className="hover:bg-muted/50 transition-colors text-xs">
                      <TableCell className="font-medium">{d.purpose}</TableCell>
                      <TableCell className="font-bold text-emerald-600">
                        {d.currency} {d.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[10px]">
                        {d.paystackReference || "Direct Cash/Bank"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-700">
                          <FileCheck className="h-3 w-3 mr-1" /> Sent
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DonorDashboard;
