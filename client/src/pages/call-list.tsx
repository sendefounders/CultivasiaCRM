import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { CustomerModal } from "@/components/customer-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, Phone, Filter, Upload, StickyNote } from "lucide-react";
import { Transaction, Product } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CsvImport } from "@/components/csv-import";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CallList() {
  const [selectedCall, setSelectedCall] = useState<Transaction | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("");
  const [callTimer, setCallTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatCallTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const { data: calls, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", { statusFilter, callTypeFilter, searchTerm, agentId: user?.id }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (callTypeFilter) params.append('callType', callTypeFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (user?.role === 'agent') {
        params.append('agentId', user.id);
      }
      // Show all transactions (both original orders and upsells) in call list
      
      const response = await fetch(`/api/transactions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const updateCallMutation = useMutation({
    mutationFn: async ({ callId, updates }: { callId: string; updates: Partial<Transaction> }) => {
      const response = await apiRequest('PUT', `/api/transactions/${callId}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all transaction queries regardless of parameters
      queryClient.invalidateQueries({ 
        queryKey: ['/api/transactions'],
        exact: false // This ensures all variations are invalidated
      });
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
      // Invalidate all transaction queries regardless of parameters
      queryClient.invalidateQueries({ 
        queryKey: ['/api/transactions'],
        exact: false // This ensures all variations are invalidated
      });
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
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

  const getDialButtonStyle = (status: string) => {
    switch (status) {
      case 'called':
        return 'bg-gray-300 hover:bg-gray-400 text-gray-700 border-gray-300'; // Light Gray
      case 'callback':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500'; // Yellow
      case 'unattended':
        return 'bg-red-200 hover:bg-red-300 text-red-800 border-red-200'; // Washed out Red
      case 'completed':
        return 'bg-gray-300 hover:bg-gray-400 text-gray-700 border-gray-300'; // Light Gray for completed
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'; // Default Blue (theme color)
    }
  };

  const handleCallClick = (call: Transaction) => {
    setSelectedCall(call);
    
    // Handle different call states
    if (call.callDuration && call.callDuration > 0) {
      // Completed call - show stored duration
      setCallTimer(call.callDuration);
      setIsTimerRunning(false);
    } else if (call.status === 'in_progress' && call.callStartedAt) {
      // In-progress call - resume timer from where it left off
      const startTime = new Date(call.callStartedAt);
      const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      setCallTimer(elapsed);
      setCallStartTime(startTime);
      setIsTimerRunning(true);
    } else {
      // New call - timer not started yet
      setCallTimer(0);
      setIsTimerRunning(false);
    }
    
    setShowCustomerModal(true);
  };

  const handleEndCall = async (callId: string, remarks?: string, duration?: number) => {
    // Use provided duration or current timer value
    const finalDuration = duration !== undefined ? duration : callTimer;
    
    try {
      // Fetch fresh data from the database to avoid cache timing issues
      const response = await fetch(`/api/transactions/${callId}`, {
        credentials: 'include'
      });
      const freshCall = await response.json();
      
      // Check if there's any order placed (either orderSku exists OR isUpsell is true)
      const hasOrder = freshCall?.orderSku || freshCall?.isUpsell;
      
      updateCallMutation.mutate({
        callId,
        updates: { 
          // Preserve all existing order data if it exists (from fresh data)
          ...(hasOrder && {
            originalOrderSku: freshCall.originalOrderSku,
            originalPrice: freshCall.originalPrice,
            orderSku: freshCall.orderSku,
            currentPrice: freshCall.currentPrice,
            revenue: freshCall.revenue,
            isUpsell: true  // Always set to true if there's any order
          }),
          // Update call completion data - use 'completed' if there's order data, 'called' otherwise
          status: hasOrder ? 'completed' : 'called',
          callEndedAt: new Date(),
          callDuration: finalDuration,
          callRemarks: remarks || null
        }
      });
    } catch (error) {
      // Fallback to cached data if fetch fails
      console.error('Failed to fetch fresh call data:', error);
      const call = calls?.find(c => c.id === callId);
      
      updateCallMutation.mutate({
        callId,
        updates: { 
          status: 'called', // Default to 'called' if we can't verify upsell data
          callEndedAt: new Date(),
          callDuration: finalDuration,
          callRemarks: remarks || null
        }
      });
    }
    
    setShowCustomerModal(false);
  };

  const handleMarkUnattended = (callId: string, remarks?: string, duration?: number) => {
    // Use provided duration or current timer value
    const finalDuration = duration !== undefined ? duration : callTimer;
    
    // Get the current call data to preserve order information
    const call = calls?.find(c => c.id === callId);
    
    updateCallMutation.mutate({
      callId,
      updates: { 
        // Preserve all existing order data if it exists
        ...(call?.originalOrderSku && {
          originalOrderSku: call.originalOrderSku,
          originalPrice: call.originalPrice,
          orderSku: call.orderSku,
          currentPrice: call.currentPrice,
          revenue: call.revenue,
          isUpsell: call.isUpsell
        }),
        // Update call completion data
        status: 'unattended',
        callEndedAt: new Date(),
        callDuration: finalDuration,
        callRemarks: remarks || null
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Call Marked as Unattended",
          description: `Successfully marked ${call?.customerName || 'call'} as unattended.`,
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to mark call as unattended. Please try again.",
          variant: "destructive",
        });
      }
    });
    setShowCustomerModal(false);
  };

  const handleMarkCallback = (callId: string, remarks?: string, duration?: number) => {
    // Use provided duration or current timer value
    const finalDuration = duration !== undefined ? duration : callTimer;
    
    // Get the current call data to preserve order information
    const call = calls?.find(c => c.id === callId);
    
    updateCallMutation.mutate({
      callId,
      updates: { 
        // Preserve all existing order data if it exists
        ...(call?.originalOrderSku && {
          originalOrderSku: call.originalOrderSku,
          originalPrice: call.originalPrice,
          orderSku: call.orderSku,
          currentPrice: call.currentPrice,
          revenue: call.revenue,
          isUpsell: call.isUpsell
        }),
        // Update call completion data
        status: 'callback',
        callEndedAt: new Date(),
        callDuration: finalDuration,
        callRemarks: remarks || null
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Callback Scheduled",
          description: `Successfully scheduled callback for ${call?.customerName || 'customer'}.`,
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to schedule callback. Please try again.",
          variant: "destructive",
        });
      }
    });
    setShowCustomerModal(false);
  };

  const handleAnswered = (callId: string) => {
    // Start timer when "Answered" is pressed
    const now = new Date();
    setCallStartTime(now);
    setCallTimer(0);
    setIsTimerRunning(true);
    
    // Update status to in_progress and record call start time
    updateCallMutation.mutate({
      callId,
      updates: { 
        status: 'in_progress',
        callStartedAt: now,
        agentId: user?.id
      }
    });
  };

  const handleStopTimer = () => {
    // Stop timer and return current duration
    setIsTimerRunning(false);
    return callTimer;
  };



  const handleAcceptUpsell = (callId: string, newProductSku: string, customPrice?: number, duration?: number) => {
    const call = calls?.find(c => c.id === callId);
    const newProduct = products?.find(p => p.sku === newProductSku);
    
    if (call) {
      // Use custom price if provided (manual entry), otherwise use product price
      const finalPrice = customPrice !== undefined 
        ? customPrice.toString() 
        : newProduct?.price || '0';
      
      // During order placement, keep call in_progress so agent can continue call workflow
      updateCallMutation.mutate({
        callId: call.id,
        updates: {
          // Store original order info if not already stored
          originalOrderSku: call.originalOrderSku || call.orderSku,
          originalPrice: call.originalPrice || call.currentPrice,
          // Update to new product
          orderSku: newProductSku,
          currentPrice: finalPrice,
          // Calculate revenue
          revenue: (Number(finalPrice) - Number(call.originalPrice || call.currentPrice)).toString(),
          isUpsell: true,
          // Keep call in_progress so agent can continue workflow (place more orders, end call, etc.)
          status: 'in_progress'
          // Don't set callDuration or callEndedAt - timer should keep running
        }
      });
      
      // Don't reset timer state - let it keep running
      
      const productName = newProduct?.name || newProductSku;
      toast({
        title: "Order Created",
        description: `Successfully created order for ${productName}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Call data not found. Please try again.",
        variant: "destructive",
      });
    }
  };


  const filteredCalls = calls?.filter(call => {
    const matchesSearch = searchTerm === "" || 
      call.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.phone.includes(searchTerm);
    
    // Handle status filtering with special case for "purchased"
    let matchesStatus = false;
    if (statusFilter === "" || statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "purchased") {
      // "Purchased" means any completed call (customer made a purchase)
      matchesStatus = call.status === 'completed';
    } else {
      matchesStatus = call.status === statusFilter;
    }
    
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
            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-import-confirmation">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Confirmation Calls
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Confirmation Calls</DialogTitle>
                  </DialogHeader>
                  <CsvImport 
                    callType="confirmation"
                    title="Import Confirmation Calls"
                    description="Upload a CSV file with confirmation calls. Required columns: DATE, NAME, PHONE, ORDER, PRICE"
                  />
                </DialogContent>
              </Dialog>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="button-import-promotional">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Promotional Calls
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Promotional Calls</DialogTitle>
                  </DialogHeader>
                  <CsvImport 
                    callType="promo"
                    title="Import Promotional Calls"
                    description="Upload a CSV file with promotional calls. Required columns: DATE, NAME, PHONE, ORDER, PRICE"
                  />
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
                <SelectItem value="callback">Callback</SelectItem>
                <SelectItem value="purchased">Purchased</SelectItem>
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
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCalls?.map((call) => (
                      <TableRow key={call.id} data-testid={`call-row-${call.id}`}>
                        <TableCell>{formatDate(call.date)}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {call.customerName}
                            {call.callRemarks && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <StickyNote className="h-4 w-4 text-blue-600" data-testid={`note-icon-${call.id}`} />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{call.callRemarks}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{call.phone}</TableCell>
                        <TableCell>{call.orderSku}</TableCell>
                        <TableCell>{formatCurrency(Number(call.currentPrice))}</TableCell>
                        <TableCell>
                          {(call.status === 'called' || call.status === 'completed' || call.status === 'unattended' || call.status === 'callback') ? (
                            <Badge 
                              variant="secondary"
                              className={
                                call.status === 'completed' ? 'bg-green-200 text-green-800 hover:bg-green-200' :
                                call.status === 'called' ? 'bg-gray-200 text-gray-700 hover:bg-gray-200' :
                                call.status === 'unattended' ? 'bg-red-200 text-red-800 hover:bg-red-200' :
                                call.status === 'callback' ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200' :
                                'bg-gray-200 text-gray-700 hover:bg-gray-200'
                              }
                              data-testid={`status-${call.status}-${call.id}`}
                            >
                              {call.status === 'completed' ? 'Purchased' :
                               call.status === 'called' ? 'Called' :
                               call.status === 'unattended' ? 'Unattended' :
                               call.status === 'callback' ? 'Callback' : 'Called'}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleCallClick(call)}
                              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                              data-testid={`button-dial-${call.id}`}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Dial
                            </Button>
                          )}
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
          onClose={() => {
            setIsTimerRunning(false);
            // Don't reset timer - preserve duration for resume
            setShowCustomerModal(false);
          }}
          call={selectedCall}
          onEndCall={handleEndCall}
          onMarkUnattended={handleMarkUnattended}
          onMarkCallback={handleMarkCallback}
          onAnswered={handleAnswered}
          onStopTimer={handleStopTimer}
          onAcceptUpsell={handleAcceptUpsell}
          callTimer={formatCallTimer(callTimer)}
          isUpdating={updateCallMutation.isPending}
        />

      </main>
    </div>
  );
}
