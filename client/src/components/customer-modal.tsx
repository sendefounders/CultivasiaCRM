import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, PhoneOff, AlertTriangle, Calendar } from "lucide-react";
import { Transaction, CallHistory } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: Transaction | null;
  onEndCall: (callId: string, remarks?: string) => void;
  onMarkUnattended: (callId: string, remarks?: string) => void;
  onMarkCallback: (callId: string, remarks?: string) => void;
  onAnswered: (callId: string) => void;
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
  callTimer
}: CustomerModalProps) {
  const [showRemarksInput, setShowRemarksInput] = useState(false);
  const [remarks, setRemarks] = useState("");
  // Initialize callPhase based on call status - if in_progress, skip to answered phase
  const [callPhase, setCallPhase] = useState<'initial' | 'answered'>(
    call?.status === 'in_progress' ? 'answered' : 'initial'
  );
  const [remarksAction, setRemarksAction] = useState<'end_call' | 'callback' | 'unattended'>('end_call');

  // Sync callPhase with call status changes
  useEffect(() => {
    if (call?.status === 'in_progress') {
      setCallPhase('answered');
    } else {
      setCallPhase('initial');
    }
  }, [call?.status]);

  // Helper to determine if call can still be acted upon
  const isCallActionable = () => {
    return call && ['new', 'in_progress', 'callback'].includes(call.status);
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
    setRemarksAction('end_call');
    setShowRemarksInput(true);
  };

  const handleCallbackClick = () => {
    setRemarksAction('callback');
    setShowRemarksInput(true);
  };

  const handleUnattendedClick = () => {
    setRemarksAction('unattended');
    setShowRemarksInput(true);
  };

  const handleSaveRemarks = () => {
    if (call) {
      switch (remarksAction) {
        case 'end_call':
          onEndCall(call.id, remarks);
          break;
        case 'callback':
          onMarkCallback(call.id, remarks);
          break;
        case 'unattended':
          onMarkUnattended(call.id, remarks);
          break;
      }
      setShowRemarksInput(false);
      setRemarks("");
      setCallPhase('initial');
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto" data-testid="customer-modal">
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

        <div className="space-y-6">
          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-6">
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
              <h4 className="font-semibold text-foreground mb-4">Call Remarks</h4>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm text-foreground" data-testid="text-call-remarks">
                  {call.callRemarks}
                </p>
              </div>
            </div>
          )}

          {/* Call History */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Call History</h4>
            <div className="space-y-3">
              {callHistory && callHistory.length > 0 ? (
                callHistory.map((history, index) => (
                  <div key={history.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg" data-testid={`call-history-${index}`}>
                    <div>
                      <p className="text-sm font-medium text-foreground">
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
                <div className="text-center py-4 text-muted-foreground">
                  <p>No call history available</p>
                </div>
              )}
            </div>
          </div>

          {/* Call Remarks Input */}
          {showRemarksInput && (
            <div className="space-y-3 p-4 bg-secondary rounded-lg">
              <Label htmlFor="call-remarks">Call Remarks (Optional)</Label>
              <Textarea
                id="call-remarks"
                placeholder="Add any notes about this call..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="min-h-[80px]"
                data-testid="textarea-call-remarks"
              />
              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveRemarks}
                  className="flex-1"
                  data-testid="button-save-remarks"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  {remarksAction === 'callback' ? 'Save & Mark Callback' : 
                   remarksAction === 'unattended' ? 'Save & Mark Unattended' : 'Save & End Call'}
                </Button>
                <Button
                  onClick={() => setShowRemarksInput(false)}
                  variant="outline"
                  data-testid="button-cancel-remarks"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!showRemarksInput && isCallActionable() && (
            <div>
              {/* Initial Call Phase - Show Answered, Unattended, Callback */}
              {callPhase === 'initial' && (
                <div className="flex space-x-3">
                  <Button
                    onClick={handleAnsweredClick}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-answered"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Answered
                  </Button>
                  <Button
                    onClick={handleUnattendedClick}
                    variant="secondary"
                    className="flex-1 bg-red-200 hover:bg-red-300 text-red-800"
                    data-testid="button-mark-unattended"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Unattended
                  </Button>
                  <Button
                    onClick={handleCallbackClick}
                    variant="secondary"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                    data-testid="button-callback"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Callback
                  </Button>
                </div>
              )}

              {/* Answered Phase - Show End Call, Callback, Unattended */}
              {callPhase === 'answered' && (
                <div className="flex space-x-3">
                  <Button
                    onClick={handleEndCallClick}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    data-testid="button-end-call"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Call
                  </Button>
                  <Button
                    onClick={handleCallbackClick}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                    data-testid="button-callback-answered"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Callback
                  </Button>
                  <Button
                    onClick={handleUnattendedClick}
                    variant="secondary"
                    className="flex-1 bg-red-200 hover:bg-red-300 text-red-800"
                    data-testid="button-unattended-answered"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Unattended
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
