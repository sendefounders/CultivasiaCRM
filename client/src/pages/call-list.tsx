import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { CustomerModal } from "@/components/customer-modal";
import { UpsellModal } from "@/components/upsell-modal";
import { CsvImport } from "@/components/csv-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Phone, Upload, Filter } from "lucide-react";
import { Call, Product } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CallList() {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: calls, isLoading } = useQuery<Call[]>({
    queryKey: ["/api/calls"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const updateCallMutation = useMutation({
    mutationFn: async ({ callId, updates }: { callId: string; updates: Partial<Call> }) => {
      const response = await apiRequest('PUT', `/api/calls/${callId}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
      toast({
        title: "Call updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update call",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      const response = await apiRequest('POST', '/api/transactions', transactionData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
    },
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'secondary';
      case 'in_progress': return 'default';
      case 'called': return 'secondary';
      case 'unattended': return 'destructive';
      case 'completed': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleCallClick = (call: Call) => {
    setSelectedCall(call);
    
    // Update call status to in_progress when opened
    if (call.status === 'new') {
      updateCallMutation.mutate({
        callId: call.id,
        updates: { 
          status: 'in_progress',
          callStartedAt: new Date().toISOString(),
          agentId: user?.id
        }
      });
    }
    
    setShowCustomerModal(true);
  };

  const handleEndCall = (callId: string) => {
    updateCallMutation.mutate({
      callId,
      updates: { 
        status: 'called',
        callEndedAt: new Date().toISOString()
      }
    });
    setShowCustomerModal(false);
    
    // Show upsell modal after a short delay
    setTimeout(() => {
      setShowUpsellModal(true);
    }, 300);
  };

  const handleMarkUnattended = (callId: string) => {
    updateCallMutation.mutate({
      callId,
      updates: { 
        status: 'unattended',
        callEndedAt: new Date().toISOString()
      }
    });
    setShowCustomerModal(false);
  };

  const handleUndo = (callId: string) => {
    updateCallMutation.mutate({
      callId,
      updates: { 
        status: 'new',
        callStartedAt: null,
        callEndedAt: null
      }
    });
    setShowCustomerModal(false);
  };

  const handleAcceptUpsell = (callId: string, newProductSku: string) => {
    const call = calls?.find(c => c.id === callId);
    const newProduct = products?.find(p => p.sku === newProductSku);
    const currentProduct = products?.find(p => p.sku === call?.orderSku);
    
    if (call && newProduct && currentProduct) {
      // Create transaction
      createTransactionMutation.mutate({
        callId: call.id,
        originalOrderSku: call.orderSku,
        newOrderSku: newProduct.sku,
        originalPrice: call.currentPrice,
        newPrice: newProduct.price,
        revenue: Number(newProduct.price) - Number(call.currentPrice),
        agentId: user?.id,
        isUpsell: true,
      });

      // Update call with new product and completed status
      updateCallMutation.mutate({
        callId: call.id,
        updates: {
          orderSku: newProduct.sku,
          currentPrice: newProduct.price,
          status: 'completed'
        }
      });
    }
  };

  const handleDeclineUpsell = (callId: string) => {
    updateCallMutation.mutate({
      callId,
      updates: { status: 'completed' }
    });
  };

  const filteredCalls = calls?.filter(call => {
    const matchesSearch = searchTerm === "" || 
      call.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.phone.includes(searchTerm);
    const matchesStatus = statusFilter === "" || statusFilter === "all" || call.status === statusFilter;
    const matchesCallType = callTypeFilter === "" || callTypeFilter === "all" || call.callType === callTypeFilter;
    
    return matchesSearch && matchesStatus && matchesCallType;
  });

  const currentProduct = selectedCall ? products?.find(p => p.sku === selectedCall.orderSku) || null : null;
  const suggestedProduct = products?.find(p => p.sku === 'AP2') || null; // Simple upsell logic

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Call List</h2>
              <p className="text-sm text-muted-foreground">Manage and track customer calls</p>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-import-csv">
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Call List</DialogTitle>
                  </DialogHeader>
                  <CsvImport />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="p-6 border-b border-border bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers or phone numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-calls"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="called">Called</SelectItem>
                <SelectItem value="unattended">Unattended</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
              <SelectTrigger className="w-48" data-testid="select-call-type-filter">
                <SelectValue placeholder="Filter by call type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="confirmation">Confirmation</SelectItem>
                <SelectItem value="promo">Promo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Call List Table */}
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Call List
                <span className="text-sm font-normal text-muted-foreground">
                  {filteredCalls?.length || 0} calls
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading calls...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCalls?.map((call) => (
                      <TableRow key={call.id} data-testid={`call-row-${call.id}`}>
                        <TableCell>{formatDateTime(call.date)}</TableCell>
                        <TableCell className="font-medium">{call.customerName}</TableCell>
                        <TableCell>{call.phone}</TableCell>
                        <TableCell>{call.orderSku}</TableCell>
                        <TableCell>{formatCurrency(Number(call.currentPrice))}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(call.status)}>
                            {call.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{call.callType}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleCallClick(call)}
                            disabled={call.status === 'completed'}
                            data-testid={`button-call-${call.id}`}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            {call.status === 'completed' ? 'Completed' : 'Call'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Modal */}
        <CustomerModal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          call={selectedCall}
          onEndCall={handleEndCall}
          onMarkUnattended={handleMarkUnattended}
          onUndo={handleUndo}
        />

        {/* Upsell Modal */}
        <UpsellModal
          isOpen={showUpsellModal}
          onClose={() => setShowUpsellModal(false)}
          call={selectedCall}
          currentProduct={currentProduct}
          suggestedProduct={suggestedProduct}
          onAcceptUpsell={handleAcceptUpsell}
          onDeclineUpsell={handleDeclineUpsell}
        />
      </main>
    </div>
  );
}
