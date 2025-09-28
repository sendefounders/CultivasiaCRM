import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, AlertTriangle, Undo2 } from "lucide-react";
import { Call, CallHistory } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: Call | null;
  onEndCall: (callId: string) => void;
  onMarkUnattended: (callId: string) => void;
  onUndo: (callId: string) => void;
}

export function CustomerModal({ 
  isOpen, 
  onClose, 
  call, 
  onEndCall, 
  onMarkUnattended, 
  onUndo 
}: CustomerModalProps) {
  const { data: callHistory } = useQuery<CallHistory[]>({
    queryKey: ["/api/calls", call?.id, "history"],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${call?.id}/history`, {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto" data-testid="customer-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Customer Information
            <Badge variant={getStatusBadgeVariant(call.status)} data-testid="badge-call-status">
              {call.status.replace('_', ' ').toUpperCase()}
            </Badge>
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

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={() => onEndCall(call.id)}
              className="flex-1"
              data-testid="button-end-call"
              disabled={call.status === 'completed'}
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              End Call
            </Button>
            <Button
              onClick={() => onMarkUnattended(call.id)}
              variant="secondary"
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
              data-testid="button-mark-unattended"
              disabled={call.status === 'completed'}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Unattended
            </Button>
            <Button
              onClick={() => onUndo(call.id)}
              variant="outline"
              className="flex-1"
              data-testid="button-undo-call"
              disabled={call.status === 'new'}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Undo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
