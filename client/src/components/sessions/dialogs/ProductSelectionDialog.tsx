import React, { useState, useEffect } from "react";
import { BudgetItem } from "@shared/schema";
import { 
  Package,
  Minus,
  Plus,
  Check
} from "lucide-react";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: (BudgetItem & { availableQuantity: number })[];
  onSelectProduct: (product: BudgetItem & { availableQuantity: number }, quantity: number) => void;
}

/**
 * Dialog component for selecting products to include in a session
 */
export function ProductSelectionDialog({
  open,
  onOpenChange,
  products,
  onSelectProduct
}: ProductSelectionDialogProps) {
  const [selectedProduct, setSelectedProduct] = useState<(BudgetItem & { availableQuantity: number }) | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Clear selection when dialog opens with new products
  useEffect(() => {
    if (open) {
      console.log("ProductSelectionDialog opened with products:", products);
      // Reset selection state when dialog opens
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [open, products]);

  // Handle quantity changes
  const increaseQuantity = () => {
    if (selectedProduct && quantity < selectedProduct.availableQuantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && selectedProduct && value <= selectedProduct.availableQuantity) {
      setQuantity(value);
    }
  };

  // Handle product selection and confirmation
  const handleSelectProduct = (product: BudgetItem & { availableQuantity: number }) => {
    setSelectedProduct(product);
    // Reset quantity to 1 when selecting a new product
    setQuantity(1);
  };

  const handleConfirmSelection = () => {
    if (selectedProduct) {
      onSelectProduct(selectedProduct, quantity);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Product</DialogTitle>
          <DialogDescription>
            Choose a product to include in this session
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Available Products</h3>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {products.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-muted-foreground">No products available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map(product => (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer hover:bg-muted/20 transition ${selectedProduct?.id === product.id ? 'border-primary' : ''}`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <CardHeader className="p-3 pb-1">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">{product.description}</CardTitle>
                          {selectedProduct?.id === product.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Available: {product.availableQuantity}</span>
                          <span className="font-medium">${product.unitPrice.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Selected Product</h3>
            {selectedProduct ? (
              <div className="space-y-4 border rounded-md p-4">
                <div>
                  <h4 className="font-medium">{selectedProduct.description}</h4>
                  <p className="text-sm text-muted-foreground">{selectedProduct.itemCode}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm">Unit Price:</span>
                    <span className="font-medium">${selectedProduct.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm">Available:</span>
                    <span>{selectedProduct.availableQuantity}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Quantity:</span>
                    <div className="flex items-center space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={decreaseQuantity}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={handleQuantityChange}
                        className="w-16 h-8 text-center"
                        min={1}
                        max={selectedProduct.availableQuantity}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={increaseQuantity}
                        disabled={quantity >= selectedProduct.availableQuantity}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold">${(selectedProduct.unitPrice * quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-md p-6 flex flex-col items-center justify-center text-center h-[300px]">
                <Package className="h-12 w-12 text-muted-foreground mb-2 opacity-30" />
                <p className="text-muted-foreground">Select a product from the list</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSelection}
            disabled={!selectedProduct}
          >
            Add to Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}