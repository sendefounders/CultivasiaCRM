import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, ShoppingCart } from "lucide-react";
import { Call, Product } from "@shared/schema";
import { useState } from "react";

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: Call | null;
  currentProduct: Product | null;
  suggestedProduct: Product | null;
  onAcceptUpsell: (callId: string, newProductSku: string, customPrice?: number) => void;
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
  const [manualMode, setManualMode] = useState(false);
  const [newProductSku, setNewProductSku] = useState('');
  const [newPrice, setNewPrice] = useState('');
  
  // Only require call data - products are optional for manual entry
  if (!call) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Check if we have complete product data for automatic upsell
  const hasCompleteProductData = currentProduct && suggestedProduct;
  const priceDifference = hasCompleteProductData 
    ? Number(suggestedProduct.price) - Number(currentProduct.price) 
    : 0;

  const handleAcceptSuggested = () => {
    if (suggestedProduct) {
      onAcceptUpsell(call.id, suggestedProduct.sku);
      onClose();
    }
  };

  const handleAcceptManual = () => {
    if (newProductSku.trim() && newPrice.trim()) {
      const price = parseFloat(newPrice);
      if (!isNaN(price)) {
        onAcceptUpsell(call.id, newProductSku.trim(), price);
        onClose();
      }
    }
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
          {/* Current Order Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">Current Order</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium" data-testid="text-customer-name">{call.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current SKU</p>
                <p className="font-medium" data-testid="text-current-sku">{call.orderSku}</p>
              </div>
              {currentProduct && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Product Name</p>
                    <p className="font-medium" data-testid="text-current-name">{currentProduct.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Price</p>
                    <p className="font-medium" data-testid="text-current-price">
                      {formatCurrency(Number(currentProduct.price))}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Upsell Options */}
          <div className="space-y-4">
            {hasCompleteProductData && !manualMode && (
              <>
                {/* Suggested Upsell */}
                <div className="p-4 bg-primary bg-opacity-10 rounded-lg border border-primary">
                  <h4 className="font-semibold text-foreground mb-2">Suggested Upsell</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Product SKU</p>
                      <p className="font-bold text-primary" data-testid="text-upsell-sku">{suggestedProduct!.sku}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Product Name</p>
                      <p className="font-medium" data-testid="text-upsell-name">{suggestedProduct!.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">New Price</p>
                      <p className="font-bold text-primary" data-testid="text-upsell-price">
                        {formatCurrency(Number(suggestedProduct!.price))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Additional Revenue</p>
                      <p className="font-bold text-green-600" data-testid="text-price-difference">
                        +{formatCurrency(priceDifference)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Suggested Upsell Buttons */}
                <div className="flex space-x-3">
                  <Button
                    onClick={handleAcceptSuggested}
                    className="flex-1"
                    data-testid="button-accept-upsell"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accept Suggested Upsell
                  </Button>
                  <Button
                    onClick={() => setManualMode(true)}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-manual-entry"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Manual Entry
                  </Button>
                </div>
              </>
            )}

            {(manualMode || !hasCompleteProductData) && (
              <>
                {/* Manual Entry Form */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-foreground mb-4">Manual Order Entry</h4>
                  <div className="space-y-4">
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
                <div className="flex space-x-3">
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
          </div>

          {/* Decline Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleDecline}
              variant="secondary"
              className="w-full bg-gray-500 hover:bg-gray-600 text-white"
              data-testid="button-decline-upsell"
            >
              <X className="h-4 w-4 mr-2" />
              No Upsell - Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
