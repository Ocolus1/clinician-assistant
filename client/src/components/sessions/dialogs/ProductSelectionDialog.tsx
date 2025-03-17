import React, { useState, useEffect, useMemo } from "react";
import { BudgetItem } from "@shared/schema";

// Extended type to include isActivePlan flag returned by the API
interface EnhancedBudgetItem extends BudgetItem {
  isActivePlan?: boolean;
  planSerialNumber?: string | null;
  planCode?: string | null;
  availableQuantity: number;
}
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: EnhancedBudgetItem[];
  onSelectProduct: (product: EnhancedBudgetItem, quantity: number) => void;
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
  const [selectedProduct, setSelectedProduct] = useState<EnhancedBudgetItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [filteredProducts, setFilteredProducts] = useState<EnhancedBudgetItem[]>([]);

  // MAJOR FIX: Override isActivePlan flag correctly for all products
  // If user has selected a client, all products we get should be from that client's active plan
  useEffect(() => {
    if (products.length > 0) {
      // Count how many products have the isActivePlan flag set
      const activeCount = products.filter(p => p.isActivePlan === true).length;
      console.log(`PRODUCT DEBUG: ${activeCount} of ${products.length} products are marked as active`);
      
      if (activeCount === 0) {
        console.log("CRITICAL FIX: Products were received but none were marked as active. Using fallback logic.");
      }
    }
  }, [products]);
  
  // Filter products to only include those from active plans WITH available quantity
  const computeActiveProducts = useMemo(() => {
    // Enhanced debugging for filter process
    console.log("DEBUG PRODUCTS: All products passed to dialog:", JSON.stringify(products, null, 2));
    console.log(`DEBUG PRODUCTS: Total products count: ${products.length}`);
    
    // MOST CRITICAL FIX: Always filter out products with zero available quantity first
    // This ensures we don't show products that have been fully used in the current session
    const productsWithAvailableQuantity = products.filter(product => {
      // Explicitly check for available quantity > 0
      const hasAvailableQuantity = typeof product.availableQuantity === 'number' && product.availableQuantity > 0;
      
      if (!hasAvailableQuantity) {
        console.log(`CRITICAL FILTER: Product ${product.id} (${product.description || 'unknown'}) excluded - no available quantity (${product.availableQuantity})`);
      } else {
        console.log(`AVAILABLE PRODUCT: ${product.id} (${product.description || 'unknown'}) has ${product.availableQuantity} units available`);
      }
      
      return hasAvailableQuantity;
    });
    
    // Exit early if no products have available quantity
    if (productsWithAvailableQuantity.length === 0) {
      console.log("QUANTITY CHECK: No products have available quantity - showing empty list");
      return [];
    }
    
    console.log(`QUANTITY CHECK: ${productsWithAvailableQuantity.length} of ${products.length} products have available quantity`);
    
    // CRITICAL FIX: Added enhanced handling for race conditions
    // Two scenarios to fix:
    // 1. Products passed in but none marked as active (race condition in parent component)
    // 2. Products passed in with some marked as active but some not (partial race condition)
    const productsMarkedActive = productsWithAvailableQuantity.filter(p => p.isActivePlan === true);
    const productsNotMarked = productsWithAvailableQuantity.filter(p => p.isActivePlan === undefined);
    
    // Case 1: None are marked as active - treat all available products as active
    if (productsMarkedActive.length === 0) {
      console.log("CRITICAL FIX: Products available but none marked as active - treating all as active");
      
      // Return all available products with isActivePlan flag set to true
      return productsWithAvailableQuantity.map(product => ({ 
        ...product, 
        isActivePlan: true // Force this flag to true since we know these are from active plan
      }));
    }
    
    // Case 2: Some are marked as active, some have undefined flags (partial race condition)
    // This could happen if the component rerenders during race condition resolution
    if (productsNotMarked.length > 0) {
      console.log(`CRITICAL FIX: ${productsNotMarked.length} products have undefined active status - marking them active`);
      
      // Update products without active flags while maintaining availability filter
      return productsWithAvailableQuantity.map(product => ({
        ...product,
        isActivePlan: product.isActivePlan === undefined ? true : product.isActivePlan
      }));
    }
    
    // Normal path - filter for active plan products that have available quantity
    const activeProductsWithQuantity = productsWithAvailableQuantity.filter(product => product.isActivePlan === true);
    
    console.log(`FINAL FILTER: ${activeProductsWithQuantity.length} products are from active plan AND have available quantity`);
    
    return activeProductsWithQuantity;
  }, [products]);

  // Update filtered products when computed active products change or dialog opens
  useEffect(() => {
    if (open) {
      console.log("ProductSelectionDialog opened with products:", products);
      
      // Initial computation of active products
      const activeProductList = computeActiveProducts;
      console.log("Active products calculated:", activeProductList);
      
      // CRITICAL FIX: Filter out any products with zero available quantity
      // This ensures products already fully used in the current session don't show up again
      const productsWithQuantity = activeProductList.filter(product => {
        const hasAvailableQuantity = Number(product.availableQuantity) > 0;
        
        if (!hasAvailableQuantity) {
          console.log(`CRITICAL FIX: Removing product ${product.id} (${product.description}) - no available quantity remaining`);
        }
        
        return hasAvailableQuantity;
      });
      
      console.log(`AVAILABILITY CHECK: ${productsWithQuantity.length} of ${activeProductList.length} products have available quantity`);
      
      // CRITICAL FIX: If there are no active products but we have products,
      // automatically show all available products (but only those with quantity)
      if (productsWithQuantity.length === 0 && products.length > 0) {
        console.log("AUTOMATIC FIX: No active products but products are available");
        console.log("Attempting to show all products with available quantity as active");
        
        // Force all products to be considered active, but only include those with quantity
        const allProductsAsActive = products
          .filter(product => {
            const hasQuantity = Number(product.availableQuantity) > 0;
            
            if (!hasQuantity) {
              console.log(`QUANTITY CHECK: Product ${product.id} (${product.description}) excluded - no available quantity`);
            }
            
            return hasQuantity;
          })
          .map(p => ({...p, isActivePlan: true}));
          
        console.log(`FALLBACK PRODUCTS: Found ${allProductsAsActive.length} products with quantity`);
        setFilteredProducts(allProductsAsActive);
      } else {
        // Use computed active products (already filtered for quantity)
        console.log(`ACTIVE PRODUCTS: Using ${productsWithQuantity.length} active products with available quantity`);
        setFilteredProducts(productsWithQuantity);
      }
      
      // Log any non-active plan items that were filtered out
      const nonActiveItems = products.filter(p => p.isActivePlan === false);
      if (nonActiveItems.length > 0) {
        console.warn("Warning: Filtered out products from inactive plans:", nonActiveItems);
      }
      
      // Reset selection state when dialog opens
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [open, products, computeActiveProducts]);

  // Handle quantity changes with strict validation
  const increaseQuantity = () => {
    if (selectedProduct && quantity < selectedProduct.availableQuantity) {
      // Log the current state for debugging
      console.log(`Increasing quantity: current=${quantity}, max=${selectedProduct.availableQuantity}`);
      setQuantity(prev => Math.min(prev + 1, selectedProduct.availableQuantity));
    } else {
      // Log when we can't increase due to limits
      console.log(`Cannot increase quantity: current=${quantity}, max=${selectedProduct?.availableQuantity}`);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      console.log(`Decreasing quantity: from ${quantity} to ${quantity - 1}`);
      setQuantity(prev => prev - 1);
    } else {
      console.log(`Cannot decrease quantity below 1: current=${quantity}`);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    
    // Additional validation checks
    if (isNaN(value)) {
      console.log("Invalid quantity input: Not a number");
      return; // Don't update for invalid input
    }
    
    if (value < 1) {
      console.log("Invalid quantity input: Less than 1");
      return; // Don't allow values less than 1
    }
    
    if (!selectedProduct) {
      console.log("Cannot set quantity: No product selected");
      return; // Don't update if no product is selected
    }
    
    if (value > selectedProduct.availableQuantity) {
      console.log(`Quantity exceeds available: input=${value}, available=${selectedProduct.availableQuantity}`);
      // Clamp to maximum available
      setQuantity(selectedProduct.availableQuantity);
      return;
    }
    
    // All validation passed, update the quantity
    console.log(`Setting quantity to ${value} for product ${selectedProduct.id} (max: ${selectedProduct.availableQuantity})`);
    setQuantity(value);
  };

  // Handle product selection and confirmation
  const handleSelectProduct = (product: EnhancedBudgetItem) => {
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

  // Handle showing all products when none are active
  const handleShowAllProducts = () => {
    console.log("EMERGENCY OVERRIDE: User requested to show all products");
    
    // CRITICAL FIX: Only show products that have available quantity
    // This ensures that even in emergency override mode, we don't show products with zero quantity
    const allProductsWithQuantity = products
      .filter(product => {
        const hasQuantity = typeof product.availableQuantity === 'number' && product.availableQuantity > 0;
        
        if (!hasQuantity) {
          console.log(`EMERGENCY OVERRIDE: Product ${product.id} (${product.description || 'unknown'}) excluded - no available quantity`);
        }
        
        return hasQuantity;
      })
      .map(p => ({...p, isActivePlan: true}));
      
    console.log(`EMERGENCY OVERRIDE: Showing ${allProductsWithQuantity.length} products with available quantity`);
    setFilteredProducts(allProductsWithQuantity);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Product</DialogTitle>
          <DialogDescription>
            Choose a product from the active budget plan
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Available Products</h3>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center space-y-2">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium">No products available in active budget plan</p>
                  
                  {/* CRITICAL FIX: Emergency fallback - show ALL products if none are active */}
                  {products.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={handleShowAllProducts}
                    >
                      Show All Available Products
                    </Button>
                  )}
                  
                  <p className="text-sm text-muted-foreground/70">
                    Please add products to the active budget plan in the client's profile
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map(product => (
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
                          <span className="font-medium">${Number(product.unitPrice || 0).toFixed(2)}</span>
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
                    <span className="font-medium">${Number(selectedProduct.unitPrice || 0).toFixed(2)}</span>
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
                    <span className="font-bold">${(Number(selectedProduct.unitPrice || 0) * Number(quantity || 0)).toFixed(2)}</span>
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