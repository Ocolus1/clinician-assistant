import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insertBudgetItemSchema, BudgetItemCatalog } from "@shared/schema";
import { AlertCircle, Search, Loader2 } from "lucide-react";

// Extend the schema to add validation messages
const budgetItemFormSchema = insertBudgetItemSchema.extend({
  itemCode: z.string().min(1, { message: "Item code is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  unitPrice: z.coerce.number().min(0.01, { message: "Unit price must be greater than 0" }),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1" }),
  category: z.string().optional(),
  name: z.string().optional(),
});

type BudgetItemFormValues = z.infer<typeof budgetItemFormSchema>;

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  budgetSettingsId: number;
  totalBudgeted: number;
  currentTotal: number;
  onSuccess?: () => void;
  onValidationFailure?: () => void;
}

/**
 * A completely self-contained dialog component for adding budget items
 * with its own form context and validation to prevent conflicts with parent forms
 */
export function AddItemDialog({
  open,
  onOpenChange,
  clientId,
  budgetSettingsId,
  totalBudgeted,
  currentTotal,
  onSuccess,
  onValidationFailure
}: AddItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<BudgetItemCatalog | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [confirmationProps, setConfirmationProps] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmAction: () => void;
    cancelLabel?: string;
    cancelAction?: () => void;
    cancelHidden?: boolean;
  }>({
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmAction: () => {},
  });
  
  // Create a completely isolated form instance
  const form = useForm<BudgetItemFormValues>({
    resolver: zodResolver(budgetItemFormSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      unitPrice: 0,
      quantity: 1,
      category: "",
      name: "",
    },
  });
  
  // Fetch budget item catalog
  const { data: catalogItems = [], isLoading: isLoadingCatalog } = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/budget-catalog');
      if (!response.ok) {
        throw new Error('Failed to load budget catalog');
      }
      return response.json();
    },
  });
  
  // Create budget item mutation
  const createBudgetItem = useMutation({
    mutationFn: async (data: BudgetItemFormValues) => {
      const response = await apiRequest('POST', `/api/clients/${clientId}/budget-items`, {
        ...data,
        budgetSettingsId
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create budget item');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      
      // Show success toast
      toast({
        title: "Budget item created",
        description: "The budget item was successfully added to the plan.",
      });
      
      // Reset form
      form.reset();
      
      // Close dialog
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error('Error creating budget item:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create budget item",
        variant: "destructive",
      });
    },
  });
  
  // Filter catalog items based on search term
  const filteredCatalogItems = searchTerm.trim() ? 
    catalogItems.filter(item => 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    ) : 
    catalogItems;
  
  // Update form when catalog item is selected
  React.useEffect(() => {
    if (selectedCatalogItem) {
      form.setValue("itemCode", selectedCatalogItem.itemCode);
      form.setValue("description", selectedCatalogItem.description);
      form.setValue("unitPrice", selectedCatalogItem.defaultUnitPrice);
      form.setValue("category", selectedCatalogItem.category || "");
    }
  }, [selectedCatalogItem, form]);
  
  // This function handles validation when adding items
  const validateBudget = async (data: BudgetItemFormValues) => {
    // Calculate the total for this new item
    const newItemTotal = data.unitPrice * data.quantity;
    
    // Calculate the new total budget after adding this item
    const newTotalBudget = currentTotal + newItemTotal;
    
    // Check if this would exceed the total budgeted amount
    const difference = newTotalBudget - totalBudgeted;
    
    // If over budget, show warning dialog
    if (difference > 0) {
      return new Promise<boolean>((resolve) => {
        setConfirmationProps({
          title: "Budget Allocation Exceeds Available Funds",
          message: `Adding this item would exceed the available budget by ${formatCurrency(difference)}. Please adjust your allocations accordingly.`,
          confirmLabel: "Adjust Allocations",
          confirmAction: () => {
            // Close the confirmation dialog
            setConfirmationDialogOpen(false);
            // Don't proceed with item creation
            if (onValidationFailure) {
              onValidationFailure();
            }
            resolve(false);
          },
          cancelHidden: true,
        });
        setConfirmationDialogOpen(true);
      });
    } 
    
    // If under budget, show confirmation dialog
    if (difference < 0) {
      return new Promise<boolean>((resolve) => {
        setConfirmationProps({
          title: "Budget Allocation Below Available Funds",
          message: `Adding this item would leave ${formatCurrency(Math.abs(difference))} unallocated in the budget. Do you want to proceed?`,
          confirmLabel: "Yes, Add Item",
          confirmAction: () => {
            // Close the confirmation dialog
            setConfirmationDialogOpen(false);
            // Proceed with item creation
            resolve(true);
          },
          cancelLabel: "No, Adjust Allocations",
          cancelAction: () => {
            // Close the confirmation dialog
            setConfirmationDialogOpen(false);
            // Don't proceed with item creation
            resolve(false);
          },
        });
        setConfirmationDialogOpen(true);
      });
    }
    
    // If exactly on budget, proceed without confirmation
    return true;
  };
  
  // Handle form submission with budget validation
  const onSubmit = async (data: BudgetItemFormValues) => {
    // Clear any previous validation errors
    setValidationError(null);
    
    // Validate budget constraints
    const shouldProceed = await validateBudget(data);
    if (!shouldProceed) {
      return;
    }
    
    // Proceed with creating the budget item
    createBudgetItem.mutate(data);
  };

  return (
    <>
      {/* Main Add Item Dialog - Completely isolated from any parent form contexts */}
      <Dialog 
        open={open} 
        onOpenChange={(openState) => {
          // When closing, reset form state to prevent stale context
          if (!openState) {
            // Reset form if dialog is closing
            form.reset();
            setSelectedCatalogItem(null);
            setSearchTerm("");
            setValidationError(null);
          }
          onOpenChange(openState);
        }}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
            <DialogDescription>
              Add a new item to the budget plan. You can select from the catalog or create a custom item.
            </DialogDescription>
          </DialogHeader>
          
          {/* Fully self-contained form without using BudgetItemForm component */}
          <div className="mt-4">
            {/* Catalog item selection */}
            <div className="mb-4">
              <FormLabel className="text-sm font-medium">Select from catalog</FormLabel>
              <div className="flex items-center mt-1.5 mb-3 relative">
                <Input
                  placeholder="Search by name, code or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
                {isLoadingCatalog ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Loading catalog items...</span>
                  </div>
                ) : filteredCatalogItems.length > 0 ? (
                  <div className="divide-y">
                    {filteredCatalogItems.map((item) => (
                      <button
                        key={item.id}
                        type="button" 
                        className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors ${
                          selectedCatalogItem?.id === item.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => setSelectedCatalogItem(item)}
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium text-sm">{item.description}</div>
                            <div className="text-xs text-muted-foreground">{item.itemCode}</div>
                          </div>
                          <div className="text-sm font-medium">${typeof item.defaultUnitPrice === 'number' ? item.defaultUnitPrice.toFixed(2) : item.defaultUnitPrice}</div>
                        </div>
                        {item.category && (
                          <div className="mt-1">
                            <span className="inline-flex text-xs bg-muted px-1.5 py-0.5 rounded-sm">
                              {item.category}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchTerm ? 'No matching items found' : 'No catalog items available'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Show validation error if exists */}
            {validationError && (
              <div className="rounded-md bg-red-50 p-4 mb-4 border-2 border-red-300">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">Budget Validation Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{validationError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Complete isolation with explicit FormProvider wrapping the form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="itemCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Code <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter item code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter item description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.01" 
                            min="0"
                            placeholder="0.00" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="1" 
                            step="1"
                            placeholder="1" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional category" />
                      </FormControl>
                      <FormDescription>
                        Categorize the item for better organization (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createBudgetItem.isPending}
                  >
                    {createBudgetItem.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Budget Item
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Separate Confirmation Dialog */}
      <Dialog 
        open={confirmationDialogOpen} 
        onOpenChange={setConfirmationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmationProps.title}</DialogTitle>
            <DialogDescription>
              {confirmationProps.message}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex justify-between gap-2">
            {!confirmationProps.cancelHidden && confirmationProps.cancelAction && (
              <Button 
                variant="outline" 
                onClick={confirmationProps.cancelAction}
              >
                {confirmationProps.cancelLabel || "Cancel"}
              </Button>
            )}
            <Button 
              onClick={confirmationProps.confirmAction}
              className={confirmationProps.cancelHidden ? "w-full" : ""}
            >
              {confirmationProps.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}