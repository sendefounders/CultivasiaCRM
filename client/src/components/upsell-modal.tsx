import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Call, Product } from "@shared/schema";

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: Call | null;
  currentProduct: Product | null;
  suggestedProduct: Product | null;
  onAcceptUpsell: (callId: string, newProductSku: string) => void;
  onDeclineUpsell: (callId: string) => void;
}

export function UpsellModal({ 
  isOpen, 
  onClose, 
  call, 
  currentProduct, 
  suggestedProduct, 
  onAcceptUpsell, 
  onDeclineUpsell 
}: UpsellModalProps) {
  if (!call || !currentProduct || !suggestedProduct) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const priceDifference = Number(suggestedProduct.price) - Number(currentProduct.price);

  const handleAccept = () => {
    onAcceptUpsell(call.id, suggestedProduct.sku);
    onClose();
  };

  const handleDecline = () => {
    onDeclineUpsell(call.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="upsell-modal">
        <DialogHeader>
          <DialogTitle>Upsell Opportunity</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Current Order */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">Current Order</h4>
              <p className="text-2xl font-bold text-foreground" data-testid="text-current-sku">
                {currentProduct.sku}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-current-name">
                {currentProduct.name}
              </p>
              <p className="text-lg font-semibold text-foreground mt-2" data-testid="text-current-price">
                {formatCurrency(Number(currentProduct.price))}
              </p>
            </div>

            {/* Suggested Upsell */}
            <div className="text-center p-4 bg-primary bg-opacity-10 rounded-lg border border-primary">
              <h4 className="font-semibold text-foreground mb-2">Suggested Upsell</h4>
              <p className="text-2xl font-bold text-primary" data-testid="text-upsell-sku">
                {suggestedProduct.sku}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-upsell-name">
                {suggestedProduct.name}
              </p>
              <p className="text-lg font-semibold text-foreground mt-2" data-testid="text-upsell-price">
                {formatCurrency(Number(suggestedProduct.price))}
              </p>
            </div>
          </div>

          {/* Price Difference */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-muted-foreground">Additional Revenue</p>
            <p className="text-3xl font-bold text-green-600" data-testid="text-price-difference">
              +{formatCurrency(priceDifference)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleAccept}
              className="flex-1"
              data-testid="button-accept-upsell"
            >
              <Check className="h-4 w-4 mr-2" />
              Accept Upsell
            </Button>
            <Button
              onClick={handleDecline}
              variant="secondary"
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
              data-testid="button-decline-upsell"
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
