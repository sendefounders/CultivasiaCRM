import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Phone, PhoneOff, AlertTriangle, Calendar, ShoppingCart, Check, X } from "lucide-react";
import { Transaction, CallHistory, Product } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: Transaction | null;
  onEndCall: (callId: string, remarks?: string, duration?: number) => void;
  onMarkUnattended: (callId: string, remarks?: string, duration?: number) => void;
  onMarkCallback: (callId: string, remarks?: string, duration?: number) => void;
  onAnswered: (callId: string) => void;
  onStopTimer: () => number; // Returns the current timer duration
  onAcceptUpsell: (callId: string, newProductSku: string, customPrice?: number, duration?: number) => void; // Upsell handler with duration
  callTimer?: string;
}

export function CustomerModal({ 
  isOpen, 
  onClose, 
  call, 
  onEndCall, 
  onMarkUnattended,
  onMarkCallback,
  onAnswered,
  onStopTimer,
  onAcceptUpsell,
  callTimer
}: CustomerModalProps) {
  const { toast } = useToast();
  const [showRemarksInput, setShowRemarksInput] = useState(false);
  const [remarks, setRemarks] = useState("");
  // Initialize callPhase based on call status - if in_progress, skip to answered phase
  const [callPhase, setCallPhase] = useState<'initial' | 'answered'>(
    call?.status === 'in_progress' ? 'answered' : 'initial'
  );
  const [remarksAction, setRemarksAction] = useState<'end_call' | 'callback' | 'unattended'>('end_call');
  const [capturedDuration, setCapturedDuration] = useState<number | null>(null);
  
  // Upsell state
  const [showUpsellSection, setShowUpsellSection] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [newProductSku, setNewProductSku] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [placedOrders, setPlacedOrders] = useState<Array<{sku: string, name: string, price: string}>>([]);

  // Fetch products for upsell functionality
  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Get current and suggested products
  const currentProduct = products?.find(p => p.sku === call?.orderSku);
  const suggestedProduct = products?.find(p => p.sku !== call?.orderSku);
  const hasCompleteProductData = currentProduct && suggestedProduct;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate price difference for suggested upsell
  const priceDifference = hasCompleteProductData && suggestedProduct && currentProduct
    ? Number(suggestedProduct.price) - Number(currentProduct.price)
    : 0;

  // Sync callPhase with call status changes
  useEffect(() => {
    if (call?.status === 'in_progress') {
      setCallPhase('answered');
    } else {
      setCallPhase('initial');
    }
  }, [call?.status]);

  // Reset placed orders when modal opens with a new call
  useEffect(() => {
    if (isOpen && call) {
      setPlacedOrders([]);
      setShowUpsellSection(false);
      setManualMode(false);
      setNewProductSku("");
      setNewPrice("");
    }
  }, [isOpen, call?.id]);

  // Helper to determine if call can still be acted upon
  const isCallActionable = () => {
    // Allow actions on all statuses except 'completed' - agents should be able to reopen calls
    return call && call.status !== 'completed';
  };

  const handleAnsweredClick = () => {
    if (call) {
      setCallPhase('answered');
      // Only trigger onAnswered for new calls, not already in-progress calls
      if (call.status !== 'in_progress') {
        onAnswered(call.id);
      }
    }
  };

  const handleEndCallClick = () => {
    // Stop timer and capture duration when End Call is clicked
    const duration = onStopTimer();
    setCapturedDuration(duration);
    setRemarksAction('end_call');
    setShowRemarksInput(true);
  };

  const handleCallbackClick = () => {
    // Stop timer and capture duration when Callback is clicked
    const duration = onStopTimer();
    setCapturedDuration(duration);
    setRemarksAction('callback');
    setShowRemarksInput(true);
  };

  const handleUnattendedClick = () => {
    // Stop timer and capture duration when Unattended is clicked
    const duration = onStopTimer();
    setCapturedDuration(duration);
    setRemarksAction('unattended');
    setShowRemarksInput(true);
  };

  const handleNewOrderClick = () => {
    // Show inline upsell section - timer continues running
    setShowUpsellSection(true);
  };

  const handleAcceptSuggested = () => {
    if (call && suggestedProduct) {
      // Don't pass duration - timer continues running until End Call
      onAcceptUpsell(call.id, suggestedProduct.sku, undefined, undefined);
      
      // Add to placed orders list
      setPlacedOrders(prev => [...prev, {
        sku: suggestedProduct.sku,
        name: suggestedProduct.name,
        price: suggestedProduct.price
      }]);
      
      setShowUpsellSection(false);
      // DO NOT close modal - agents can add more orders
      toast({
        title: "Order Created",
        description: `Successfully created order for ${suggestedProduct.name}`,
      });
    }
  };

  const handleAcceptManual = () => {
    if (call && newProductSku.trim() && newPrice.trim()) {
      const price = parseFloat(newPrice);
      if (!isNaN(price)) {
        // Don't pass duration - timer continues running until End Call
        onAcceptUpsell(call.id, newProductSku.trim(), price, undefined);
        
        // Add to placed orders list
        setPlacedOrders(prev => [...prev, {
          sku: newProductSku.trim(),
          name: newProductSku.trim(), // Use SKU as name for manual entries
          price: newPrice.trim()
        }]);
        
        setShowUpsellSection(false);
        setNewProductSku("");
        setNewPrice("");
        // DO NOT close modal - agents can add more orders
        toast({
          title: "Order Created",
          description: `Successfully created order for ${newProductSku.trim()}`,
        });
      }
    }
  };

  const handleCancelUpsell = () => {
    setShowUpsellSection(false);
    setManualMode(false);
    setNewProductSku("");
    setNewPrice("");
  };

  const handleSaveRemarks = () => {
    if (call) {
      switch (remarksAction) {
        case 'end_call':
          onEndCall(call.id, remarks, capturedDuration || undefined);
          // Close modal immediately after calling onEndCall
          onClose();
          break;
        case 'callback':
          onMarkCallback(call.id, remarks, capturedDuration || undefined);
          // Close modal immediately after calling onMarkCallback
          onClose();
          break;
        case 'unattended':
          onMarkUnattended(call.id, remarks, capturedDuration || undefined);
          // Close modal immediately after calling onMarkUnattended
          onClose();
          break;
      }
      setShowRemarksInput(false);
      setRemarks("");
      setCallPhase('initial');
      setCapturedDuration(null);
    }
  };

  const handleSaveUnattendedRemarks = () => {
    if (call) {
      onMarkUnattended(call.id, remarks);
      setShowRemarksInput(false);
      setRemarks("");
      setCallPhase('initial');
    }
  };
  const { data: callHistory } = useQuery<CallHistory[]>({
    queryKey: ["/api/transactions", call?.id, "history"],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${call?.id}/history`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch call history: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!call?.id,
  });

  if (!call) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden" data-testid="customer-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Customer Information
            <div className="flex items-center space-x-2">
              {callTimer && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700" data-testid="badge-call-timer">
                  ⏱️ {callTimer}
                </Badge>
              )}
              <Badge variant={getStatusBadgeVariant(call.status)} data-testid="badge-call-status">
                {call.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 h-[70vh]">
          {/* Left Column - Customer Information */}
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* Customer Details */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">Customer Details</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
                  <p className="text-lg font-semibold text-foreground mt-1" data-testid="text-customer-name">
                    {call.customerName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-lg font-semibold text-foreground mt-1" data-testid="text-customer-phone">
                    {call.phone}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Order</label>
                  <p className="text-lg font-semibold text-foreground mt-1" data-testid="text-customer-order">
                    {call.orderSku}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Price</label>
                  <p className="text-lg font-semibold text-foreground mt-1" data-testid="text-customer-price">
                    {formatCurrency(Number(call.currentPrice))}
                  </p>
                </div>
              </div>
            </div>

            {/* AWB Number */}
            {call.awb && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">AWB Number</label>
                <p className="text-foreground mt-1" data-testid="text-customer-awb">{call.awb}</p>
              </div>
            )}

            {/* Address */}
            {call.address && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="text-foreground mt-1" data-testid="text-customer-address">
                  {call.address}
                </p>
              </div>
            )}

            {/* Call Remarks */}
            {call.callRemarks && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Previous Call Remarks</h4>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm text-foreground" data-testid="text-call-remarks">
                    {call.callRemarks}
                  </p>
                </div>
              </div>
            )}

            {/* Call History */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">Call History</h4>
              <div className="space-y-2">
                {callHistory && callHistory.length > 0 ? (
                  callHistory.map((history, index) => (
                    <div key={history.id} className="p-2 bg-secondary rounded-lg" data-testid={`call-history-${index}`}>
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {formatDateTime(history.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Action: {history.action}
                        </p>
                        {history.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {history.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 text-muted-foreground">
                    <p className="text-sm">No call history available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Orders Placed During This Call */}
            {placedOrders.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Orders Placed This Call</h4>
                <div className="space-y-2">
                  {placedOrders.map((order, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg" data-testid={`placed-order-${index}`}>
                      <div>
                        <p className="text-xs font-medium text-green-800 dark:text-green-300">
                          {order.name}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          SKU: {order.sku}
                        </p>
                      </div>
                      <div className="text-xs font-semibold text-green-800 dark:text-green-300">
                        {formatCurrency(Number(order.price))}
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    {placedOrders.length} order{placedOrders.length !== 1 ? 's' : ''} placed during this call
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions and Notes */}
          <div className="space-y-4 overflow-y-auto pl-2">
            {/* Always-visible Call Notes */}
            <div className="space-y-3">
              <Label htmlFor="live-call-notes">Call Notes</Label>
              <Textarea
                id="live-call-notes"
                placeholder="Take notes during the call..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="min-h-[120px] resize-none border border-input"
                data-testid="textarea-live-notes"
              />
            </div>

            {/* Action Buttons */}
            {isCallActionable() && (
              <div className="space-y-4">
                {/* Initial Call Phase - Show Answered, Unattended, Callback */}
                {callPhase === 'initial' && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Call Actions</h4>
                    <div className="space-y-2">
                      <Button
                        onClick={handleAnsweredClick}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-answered"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Answered
                      </Button>
                      <Button
                        onClick={handleUnattendedClick}
                        variant="secondary"
                        className="w-full bg-red-200 hover:bg-red-300 text-red-800"
                        data-testid="button-mark-unattended"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Unattended
                      </Button>
                      <Button
                        onClick={handleCallbackClick}
                        variant="secondary"
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                        data-testid="button-callback"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Callback
                      </Button>
                    </div>
                  </div>
                )}

              {/* Answered Phase - Show New Order, End Call, Callback, Unattended */}
              {callPhase === 'answered' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Call Actions</h4>
                  
                  {/* New Order Section */}
                  {!showUpsellSection ? (
                    <Button
                      onClick={handleNewOrderClick}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      data-testid="button-new-order"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      New Order
                    </Button>
                  ) : (
                    <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-foreground">Add New Order</h5>
                      
                      {/* Current Order Info - Compact */}
                      <div className="p-2 bg-white rounded text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Customer:</span>
                            <span className="font-medium">{call?.customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Current SKU:</span>
                            <span className="font-medium">{call?.orderSku}</span>
                          </div>
                          {currentProduct && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Price:</span>
                              <span className="font-medium">{formatCurrency(Number(currentProduct.price))}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Upsell Options */}
                      {hasCompleteProductData && !manualMode && (
                        <>
                          {/* Suggested Upsell */}
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <h5 className="font-medium text-green-800 mb-2">Suggested Upsell</h5>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Product SKU</p>
                                <p className="font-bold text-green-700">{suggestedProduct!.sku}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Product Name</p>
                                <p className="font-medium">{suggestedProduct!.name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">New Price</p>
                                <p className="font-bold text-green-700">{formatCurrency(Number(suggestedProduct!.price))}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Additional Revenue</p>
                                <p className="font-bold text-green-600">+{formatCurrency(priceDifference)}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Suggested Upsell Buttons */}
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleAcceptSuggested}
                              className="flex-1"
                              data-testid="button-accept-suggested"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Accept Suggested
                            </Button>
                            <Button
                              onClick={() => setManualMode(true)}
                              variant="outline"
                              className="flex-1"
                              data-testid="button-manual-entry"
                            >
                              Manual Entry
                            </Button>
                          </div>
                        </>
                      )}

                      {(manualMode || !hasCompleteProductData) && (
                        <>
                          {/* Manual Entry Form */}
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <h5 className="font-medium text-orange-800 mb-3">Manual Order Entry</h5>
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="new-sku">Product SKU</Label>
                                <Input
                                  id="new-sku"
                                  value={newProductSku}
                                  onChange={(e) => setNewProductSku(e.target.value)}
                                  placeholder="Enter product SKU..."
                                  data-testid="input-new-sku"
                                />
                              </div>
                              <div>
                                <Label htmlFor="new-price">Price (PHP)</Label>
                                <Input
                                  id="new-price"
                                  type="number"
                                  value={newPrice}
                                  onChange={(e) => setNewPrice(e.target.value)}
                                  placeholder="Enter price..."
                                  data-testid="input-new-price"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Manual Entry Buttons */}
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleAcceptManual}
                              disabled={!newProductSku.trim() || !newPrice.trim()}
                              className="flex-1"
                              data-testid="button-accept-manual"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Create Order
                            </Button>
                            {hasCompleteProductData && (
                              <Button
                                onClick={() => setManualMode(false)}
                                variant="outline"
                                className="flex-1"
                                data-testid="button-back-suggested"
                              >
                                Back to Suggested
                              </Button>
                            )}
                          </div>
                        </>
                      )}

                      {/* Cancel Button */}
                      <div className="pt-2 border-t">
                        <Button
                          onClick={handleCancelUpsell}
                          variant="secondary"
                          className="w-full"
                          data-testid="button-cancel-upsell"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Call End Options */}
                  <div className="space-y-2">
                    <Button
                      onClick={handleEndCallClick}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      data-testid="button-save-end-call"
                    >
                      <PhoneOff className="h-4 w-4 mr-2" />
                      Save & End Call
                    </Button>
                    <Button
                      onClick={handleCallbackClick}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                      data-testid="button-callback-answered"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Callback
                    </Button>
                    <Button
                      onClick={handleUnattendedClick}
                      variant="secondary"
                      className="w-full bg-red-200 hover:bg-red-300 text-red-800"
                      data-testid="button-unattended-answered"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Unattended
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
