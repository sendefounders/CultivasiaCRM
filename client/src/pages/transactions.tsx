import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { CsvImport } from "@/components/csv-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, TrendingUp, DollarSign, Upload } from "lucide-react";
import { Transaction } from "@shared/schema";
import { useState } from "react";

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmationImport, setShowConfirmationImport] = useState(false);
  const [showPromotionalImport, setShowPromotionalImport] = useState(false);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const filteredTransactions = transactions?.filter(transaction => {
    if (searchTerm === "") return true;
    return transaction.originalOrderSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
           transaction.newOrderSku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.revenue), 0) || 0;
  const upsellCount = transactions?.filter(t => t.isUpsell).length || 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Transactions</h2>
              <p className="text-sm text-muted-foreground">Track all upsells and revenue</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-transactions"
                />
              </div>
              
              {/* Confirmation Calls Import */}
              <Dialog open={showConfirmationImport} onOpenChange={setShowConfirmationImport}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-import-confirmation">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Confirmation Calls
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Confirmation Calls (Upsell)</DialogTitle>
                  </DialogHeader>
                  <CsvImport 
                    callType="confirmation"
                    title="Import Confirmation Calls"
                    description="Upload CSV for confirmation calls (upsell opportunities). Required columns: DATE, NAME, PHONE, ORDER, PRICE"
                  />
                </DialogContent>
              </Dialog>

              {/* Promotional Calls Import */}
              <Dialog open={showPromotionalImport} onOpenChange={setShowPromotionalImport}>
                <DialogTrigger asChild>
                  <Button data-testid="button-import-promotional">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Promotional Calls
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Promotional Calls (Retention)</DialogTitle>
                  </DialogHeader>
                  <CsvImport 
                    callType="promo"
                    title="Import Promotional Calls" 
                    description="Upload CSV for promotional calls (retention campaigns). Required columns: DATE, NAME, PHONE, ORDER, PRICE"
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-total-revenue">
                      {formatCurrency(totalRevenue)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Upsells</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-total-upsells">
                      {upsellCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Revenue</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-average-revenue">
                      {formatCurrency(upsellCount > 0 ? totalRevenue / upsellCount : 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Transaction History
                <span className="text-sm font-normal text-muted-foreground">
                  {filteredTransactions?.length || 0} transactions
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading transactions...
                </div>
              ) : filteredTransactions && filteredTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Original Order</TableHead>
                      <TableHead>New Order</TableHead>
                      <TableHead>Original Price</TableHead>
                      <TableHead>New Price</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                        <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
                        <TableCell className="font-medium">{transaction.originalOrderSku}</TableCell>
                        <TableCell className="font-medium text-primary">{transaction.newOrderSku}</TableCell>
                        <TableCell>{formatCurrency(Number(transaction.originalPrice))}</TableCell>
                        <TableCell>{formatCurrency(Number(transaction.newPrice))}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          +{formatCurrency(Number(transaction.revenue))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.isUpsell ? "default" : "secondary"}>
                            {transaction.isUpsell ? "Upsell" : "Other"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found</p>
                  <p className="text-sm">Transactions will appear here when upsells are completed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
