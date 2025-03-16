import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InsertBudgetSettings } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tag, CalendarRange, DollarSign, Plus, Calculator } from "lucide-react";
import { CatalogSelectionModal } from "@/components/budget/CatalogSelectionModal";

// Form Schema with validation
const budgetPlanSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  ndisFunds: z.string().min(1, "NDIS funds amount is required")
    .refine(val => !isNaN(Number(val)), {
      message: "Funds must be a valid number",
    }),
  isActive: z.boolean().default(false),
  budgetItems: z.array(z.object({
    itemCode: z.string().min(1, "Item code is required"),
    description: z.string().optional(),
    quantity: z.string().min(1, "Quantity is required")
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Quantity must be a positive number",
      }),
    unitPrice: z.string().min(1, "Unit price is required")
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "Unit price must be a non-negative number",
      }),
  })),
});

type BudgetPlanFormValues = z.infer<typeof budgetPlanSchema>;

interface FullScreenBudgetPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onSuccess?: () => void;
}

export function FullScreenBudgetPlanDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess
}: FullScreenBudgetPlanDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [budgetItemsArray, setBudgetItemsArray] = useState<any[]>([]);

  // Generate a random Plan ID for display purposes
  const planId = `PLAN-${new Date().getTime().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

  // Get catalog items for dropdown
  const { data: catalogItems = [] } = useQuery({
    queryKey: ["/api/budget-catalog"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/budget-catalog");
      return res.json();
    },
    enabled: open,
  });

  // Initialize form with empty/default values
  const form = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      ndisFunds: "",
      isActive: false,
      budgetItems: [],
    },
  });

  // Calculate total cost
  const totalCost = budgetItemsArray.reduce((total, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return total + (quantity * unitPrice);
  }, 0);

  // Calculate remaining funds
  const availableFunds = Number(form.watch("ndisFunds")) || 0;
  const remainingFunds = availableFunds - totalCost;

  // Handle form submission
  const mutation = useMutation({
    mutationFn: async (data: BudgetPlanFormValues) => {
      // Transform form values to match API expectations
      const transformedData: Partial<InsertBudgetSettings> = {
        endOfPlan: data.endDate, // We map the end date to the endOfPlan field
        ndisFunds: Number(data.ndisFunds),
        isActive: data.isActive,
        // Generate a serial number based on date if needed
        planSerialNumber: `BP-${new Date().getTime().toString().slice(-6)}`,
      };

      // Create budget plan
      const response = await apiRequest(
        "POST",
        `/api/clients/${clientId}/budget-settings`,
        transformedData
      );
      const budgetSettings = await response.json();

      // Create budget items
      const itemPromises = budgetItemsArray.map(item => {
        return apiRequest(
          "POST",
          `/api/clients/${clientId}/budget-items`,
          {
            budgetSettingsId: budgetSettings.id,
            itemCode: item.itemCode,
            description: item.description || "",
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          }
        );
      });

      await Promise.all(itemPromises);
      return budgetSettings;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: [`/api/clients/${clientId}/budget-settings`],
      });
      
      // Close dialog and reset form
      onOpenChange(false);
      form.reset();
      setBudgetItemsArray([]);
      setSelectedItem(null);
      
      // Show success toast
      toast({
        title: "Budget Plan Created",
        description: "New budget plan has been created successfully.",
      });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Error creating budget plan:", error);
      toast({
        title: "Error",
        description: "Failed to create budget plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle catalog item selection
  const handleCatalogItemSelect = (item: any) => {
    setSelectedItem({
      itemCode: item.itemCode,
      description: item.description,
      unitPrice: item.defaultUnitPrice.toString(),
      quantity: "1"
    });
    setCatalogModalOpen(false);
  };

  // Add the current selected item to the budget items array
  const handleAddBudgetItem = () => {
    if (selectedItem) {
      const newBudgetItems = [...budgetItemsArray, selectedItem];
      setBudgetItemsArray(newBudgetItems);
      setSelectedItem(null);
      
      // Add to form values as well to ensure validation
      form.setValue("budgetItems", newBudgetItems);
    }
  };

  // Submit handler
  function onSubmit(data: BudgetPlanFormValues) {
    // Update the form data with the budgetItemsArray
    const updatedData = {
      ...data,
      budgetItems: budgetItemsArray,
    };
    
    mutation.mutate(updatedData);
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setBudgetItemsArray([]);
      setSelectedItem(null);
    }
  }, [open, form]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-full p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-xl font-bold">Create New Budget Plan</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel - Budget Items */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center p-3 bg-slate-50 border-b">
                    <h3 className="font-semibold">Planned Budget Items</h3>
                    <span>Total: {formatCurrency(totalCost)}</span>
                  </div>
                  
                  <div className="p-4 max-h-[300px] overflow-y-auto">
                    {budgetItemsArray.length > 0 ? (
                      <div className="space-y-3">
                        {budgetItemsArray.map((item, index) => (
                          <div key={index} className="border rounded-lg p-3 flex justify-between items-center">
                            <div>
                              <div className="font-medium">{item.itemCode}</div>
                              <div className="text-gray-500 text-sm">{item.description}</div>
                            </div>
                            <div className="text-right">
                              <div>{item.quantity} x {formatCurrency(Number(item.unitPrice))}</div>
                              <div className="font-semibold">
                                {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                        <Calculator className="h-12 w-12 mb-3 text-gray-300" />
                        <p className="mb-1">No budget items added yet</p>
                        <p className="text-sm">Add items using the form on the right</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right Panel - Budget Settings & Entry */}
                <div className="space-y-4">
                  {/* Budget Settings Section */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                      <h3 className="font-semibold">Budget Settings</h3>
                      <span className="text-xs text-gray-500">Plan ID: {planId}</span>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <FormLabel className="cursor-pointer">Plan Status</FormLabel>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <span className={field.value ? "text-green-600" : "text-gray-500"}>
                                {field.value ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="ndisFunds"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel>NDIS Funds</FormLabel>
                              <span className="text-green-600 text-sm">
                                Surplus: {formatCurrency(remainingFunds)}
                              </span>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                <Input className="pl-8" placeholder="0" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End of Plan Date</FormLabel>
                            <FormControl>
                              <Input type="date" placeholder="Pick a date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Budget Item Entry Section */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                      <h3 className="font-semibold">Budget Item Entry</h3>
                    </div>
                    
                    <div className="p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">Select Item</span>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className="text-blue-600 text-xs"
                          onClick={() => {/* Implement add new catalog item */}}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add New Catalog Item
                        </Button>
                      </div>
                      
                      {selectedItem ? (
                        <div className="space-y-3">
                          <div className="border rounded-lg p-2 bg-blue-50">
                            <div className="font-medium text-sm">{selectedItem.itemCode}</div>
                            <div className="text-gray-600 text-xs">{selectedItem.description}</div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <FormLabel className="text-xs">Unit Price</FormLabel>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                <Input 
                                  className="pl-8 bg-gray-50 h-8 text-sm" 
                                  value={selectedItem.unitPrice} 
                                  readOnly
                                />
                              </div>
                            </div>
                            
                            <div>
                              <FormLabel className="text-xs">Quantity</FormLabel>
                              <Input 
                                type="number" 
                                min="1"
                                className="h-8 text-sm"
                                value={selectedItem.quantity}
                                onChange={(e) => setSelectedItem({
                                  ...selectedItem,
                                  quantity: e.target.value
                                })}
                              />
                            </div>
                          </div>
                          
                          <Button 
                            type="button" 
                            className="w-full text-sm h-8" 
                            onClick={handleAddBudgetItem}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Budget Item
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-dashed h-16 flex items-center gap-2 text-sm"
                            onClick={() => setCatalogModalOpen(true)}
                          >
                            <Tag className="h-4 w-4" />
                            Select from Catalog...
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending || budgetItemsArray.length === 0}>
                  {mutation.isPending ? "Creating..." : "Create Budget Plan"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <CatalogSelectionModal 
        open={catalogModalOpen}
        onOpenChange={setCatalogModalOpen}
        catalogItems={catalogItems} 
        onSelectItem={handleCatalogItemSelect}
      />
    </>
  );
}