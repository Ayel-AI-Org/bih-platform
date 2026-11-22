import { useState, useEffect } from "react";
import { supabase } from "@/database/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StandardFilterTabs } from "@/components/admin/StandardFilterTabs";
import { Search, Download, Heart, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

interface AdminDonationItem {
  id: string;
  fullName: string;
  email: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  purpose: string;
  message?: string;
  status: "pending" | "success" | "failed";
  createdAt: string;
}

const AdminDonationsPage = () => {
  const { toast } = useToast();
  const [donations, setDonations] = useState<AdminDonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reconciling, setReconciling] = useState(false);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-reconcile");
      if (error) throw error;

      if (!data?.configured) {
        toast({
          title: "Paystack Not Configured",
          description:
            data?.error ||
            "PAYSTACK_SECRET_KEY is not configured on the server. Live reconciliation cannot be performed without provider credentials.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Paystack Reconciliation Completed",
        description:
          data.message ||
          `Reconciliation finished. Verified ${data.checkedCount ?? 0} records; updated ${data.reconciledCount ?? 0} discrepancies.`,
      });
      fetchDonations();
    } catch (err: any) {
      toast({
        title: "Reconciliation failed",
        description: err.message || "Failed to contact the Paystack reconciliation service.",
        variant: "destructive",
      });
    } finally {
      setReconciling(false);
    }
  };

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDonations(
        (data || []).map((row: any) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          amount: Number(row.amount),
          currency: row.currency || "GHS",
          paymentMethod: row.payment_method || "mobile_money",
          purpose: row.purpose || "General Support",
          message: row.message || "",
          status: row.status as any,
          createdAt: row.created_at,
        }))
      );
    } catch (err: any) {
      toast({
        title: "Fetch failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const totalSuccessful = donations
    .filter((d) => d.status === "success")
    .reduce((acc, row) => acc + row.amount, 0);

  const getFilteredDonations = () => {
    return donations.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          d.fullName.toLowerCase().includes(query) ||
          d.email.toLowerCase().includes(query) ||
          d.purpose.toLowerCase().includes(query)
        );
      }
      return true;
    });
  };

  const getExportCSVData = () => {
    const dataset = getFilteredDonations();
    if (dataset.length === 0) {
      toast({
        title: "No data to export",
        description: "Configure search query to match logs before exporting.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Full Name", "Email", "Amount", "Currency", "Payment Method", "Purpose", "Status", "Date"];
    const rows = dataset.map((d) => [
      d.fullName,
      d.email,
      d.amount,
      d.currency,
      d.paymentMethod,
      d.purpose,
      d.status,
      new Date(d.createdAt).toLocaleDateString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bih-donations-export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredList = getFilteredDonations();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-9 w-48" />
          <div className="h-9 w-28" />
        </div>
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1E3A5F] font-bold">Donations Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only receipt audit trail of financial contributions in the ecosystem.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
         <Button
              onClick={handleReconcile}
              disabled={reconciling || loading}
              variant="outline"
              className="bg-white border-[#D4A017] text-[#D4A017] hover:bg-amber-50/50 hover:text-[#D4A017] gap-1.5 h-9"
            >
              {reconciling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Reconciling...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Reconcile with Paystack
                </>
              )}
            </Button>

            <Button
              onClick={getExportCSVData}
              variant="outline"
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-700 gap-1.5 h-9"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
        </div>
      </div>

      {/* Aggregate stats banner */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardContent className="py-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 flex-shrink-0">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Successful Donations
            </span>
            <h2 className="text-3xl font-bold font-mono text-[#1E3A5F] mt-0.5">
              GHS {totalSuccessful.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </CardContent>
      </Card>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200/80 p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <StandardFilterTabs
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filter donations by status"
            options={[
              { value: "all", label: "All Donations", count: donations.length },
              { value: "success", label: "Success", count: donations.filter((d) => d.status === "success").length },
              { value: "pending", label: "Pending", count: donations.filter((d) => d.status === "pending").length },
              { value: "failed", label: "Failed", count: donations.filter((d) => d.status === "failed").length },
            ]}
          />

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-0">
            {filteredList.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-sm">No donations logged in the registry matching the query.</p>
              </div>
            ) : (
              <>
                {/* Desktop & Tablet Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F1F5F9] border-b border-slate-200">
                        <TableHead className="text-xs font-semibold text-[#1E3A5F]">Full Name</TableHead>
                        <TableHead className="text-xs font-semibold text-[#1E3A5F]">Email</TableHead>
                        <TableHead className="text-xs font-semibold text-[#1E3A5F]">Amount</TableHead>
                        <TableHead className="text-xs font-semibold text-[#1E3A5F]">Payment Method</TableHead>
                        <TableHead className="text-xs font-semibold text-[#1E3A5F]">Purpose</TableHead>
                        <TableHead className="text-xs font-semibold text-[#1E3A5F]">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-[#1E3A5F]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredList.map((d) => (
                        <TableRow key={d.id} className="hover:bg-slate-50/80 transition-colors duration-150 text-xs">
                          <TableCell className="font-semibold text-slate-900">
                            {d.fullName}
                          </TableCell>
                          <TableCell className="font-mono text-slate-600">
                            {d.email}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 font-mono">
                            {d.amount.toFixed(2)} GHS
                          </TableCell>
                          <TableCell className="capitalize text-slate-700">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${
                                d.paymentMethod === "mobile_money"
                                  ? "border-purple-200 bg-purple-50 text-purple-700"
                                  : d.paymentMethod === "card"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              {d.paymentMethod.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-700 truncate max-w-[150px]">
                            {d.purpose}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] uppercase font-semibold tracking-wide border-none text-white px-2 py-0.5 rounded-sm ${
                                d.status === "success"
                                  ? "bg-[#6B8E3E]"
                                  : d.status === "failed"
                                  ? "bg-[#C0392B]"
                                  : "bg-[#C8601A]"
                              }`}
                            >
                              {d.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium font-sans">
                            {new Date(d.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card Stack (<md) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredList.map((d) => (
                    <div key={d.id} className="p-4 space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{d.fullName}</p>
                          <p className="text-xs text-slate-600 font-mono mt-0.5">{d.email}</p>
                        </div>
                        <span className="font-bold text-slate-900 font-mono text-sm shrink-0">
                          {d.amount.toFixed(2)} GHS
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${
                            d.paymentMethod === "mobile_money"
                              ? "border-purple-200 bg-purple-50 text-purple-700"
                              : d.paymentMethod === "card"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {d.paymentMethod.replace("_", " ")}
                        </Badge>

                        <Badge
                          className={`text-[10px] uppercase font-semibold tracking-wide border-none text-white px-2 py-0.5 rounded-sm ${
                            d.status === "success"
                              ? "bg-[#6B8E3E]"
                              : d.status === "failed"
                              ? "bg-[#C0392B]"
                              : "bg-[#C8601A]"
                          }`}
                        >
                          {d.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-600 font-medium">
                        <span className="truncate max-w-[200px]" title={d.purpose}>
                          Purpose: <strong className="text-slate-800 font-semibold">{d.purpose}</strong>
                        </span>
                        <span className="shrink-0 font-sans">
                          {new Date(d.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDonationsPage;
