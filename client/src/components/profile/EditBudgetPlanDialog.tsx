import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { BudgetSettings, BudgetItem, BudgetItemCatalog } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Trash2, PauseCircle, PlayCircle, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Interface for BudgetPlan which extends BudgetSettings with UI display properties
interface BudgetPlan extends BudgetSettings {
  planName: string;
  fundingSource: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  archived: boolean;
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
}

// Interface for enhanced budget item with usage data
interface EnhancedBudgetItem extends BudgetItem {
  catalogItem?: BudgetItemCatalog;
  usedQuantity: number;
  balanceQuantity: number;
  itemName: string;
  isActive: boolean;
  totalPrice: number;
  originalQuantity: number;
}

// Create a form schema for budget plan editing
const editBudgetPlanSchema = z.object({
  planCode: z.string().min(1, { message: "Plan code is required" }),
  endOfPlan: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Create a schema for budget item updates
const budgetItemUpdateSchema = z.object({
  id: z.number(),
  quantity: z.number().min(0, { message: "Quantity must be a positive number" }),
  isActive: z.boolean().default(true),
});

type EditBudgetPlanFormValues = z.infer<typeof editBudgetPlanSchema>;
type BudgetItemUpdate = z.infer<typeof budgetItemUpdateSchema>;

interface EditBudgetPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BudgetPlan;
  clientId: number;
}

export function EditBudgetPlanDialog({ 
  open, 
  onOpenChange, 
  plan, 
  clientId 
}: EditBudgetPlanDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  // State for budget items management
  const [budgetItems, setBudgetItems] = useState<EnhancedBudgetItem[]>([]);
  const [originalItems, setOriginalItems] = useState<EnhancedBudgetItem[]>([]);
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [originalTotalBudget, setOriginalTotalBudget] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Format date for the form input
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd");
    } catch (e) {
      console.error("Error formatting date for input:", e);
      return "";
    }
  };

  // Initialize form with plan data
  const form = useForm<EditBudgetPlanFormValues>({
    resolver: zodResolver(editBudgetPlanSchema),
    defaultValues: {
      planCode: plan.planCode || "",
      endOfPlan: plan.endOfPlan || formatDateForInput(plan.endDate),
      isActive: typeof plan.isActive === 'boolean' 
        ? plan.isActive 
        : plan.isActive === null ? true : plan.isActive === 'true',
    },
  });

  // Query for budget items in this plan
  const { data: budgetItemsData = [] } = useQuery<BudgetItem[]>({
    queryKey: ['/api/budget-settings', plan.id, 'items'],
    enabled: open,
    retry: 1,
    // When there's no specific endpoint for this, use the client's budget items
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/clients/${clientId}/budget-items`) as BudgetItem[];
      // Filter to only include items for this budget settings
      return response.filter((item: BudgetItem) => item.budgetSettingsId === plan.id);
    },
  });

  // Query for budget catalog items for reference
  const { data: catalogItems = [] } = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-catalog'],
    enabled: open,
    retry: 1,
  });

  // Query for client sessions to calculate used quantities
  const { data: clientSessions = [] } = useQuery<any[]>({
    queryKey: ['/api/clients', clientId, 'sessions'],
    enabled: open && !!clientId,
  });

  // Process budget items with additional information when data is available
  useEffect(() => {
    if (budgetItemsData.length > 0 && open) {
      // Process items with usage data and catalog information
      const processedItems = budgetItemsData.map(item => {
        // Find matching catalog item
        const catalogItem = catalogItems.find(
          catalog => catalog.itemCode === item.itemCode
        );
        
        // Calculate used quantity from sessions
        const usedQuantity = clientSessions.reduce((total: number, session: any) => {
          if (!session.products || !Array.isArray(session.products)) return total;
          
          // Sum up used quantities for this specific item
          return total + session.products.reduce((itemTotal: number, product: any) => {
            if (product.productCode === item.itemCode || product.itemCode === item.itemCode) {
              return itemTotal + (typeof product.quantity === 'string' 
                ? parseInt(product.quantity) || 0 
                : product.quantity || 0);
            }
            return itemTotal;
          }, 0);
        }, 0);
        
        // Convert quantity to number
        const quantity = typeof item.quantity === 'string'
          ? parseInt(item.quantity) || 0
          : item.quantity || 0;
        
        // Convert unit price to number
        const unitPrice = typeof item.unitPrice === 'string'
          ? parseFloat(item.unitPrice) || 0
          : item.unitPrice || 0;
        
        // Calculate balance quantity (unused)
        const balanceQuantity = Math.max(0, quantity - usedQuantity);
        
        // Return enhanced item
        return {
          ...item,
          catalogItem,
          quantity,
          unitPrice,
          usedQuantity,
          balanceQuantity,
          totalPrice: quantity * unitPrice,
          originalQuantity: quantity,
          itemName: item.name || (catalogItem ? catalogItem.description : 'Unknown Item'),
          isActive: true // Assume all items are active by default
        } as EnhancedBudgetItem;
      });
      
      setBudgetItems(processedItems);
      setOriginalItems(JSON.parse(JSON.stringify(processedItems))); // Deep copy for comparison
      
      // Calculate total budget
      const total = processedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      setTotalBudget(total);
      setOriginalTotalBudget(total);
    }
  }, [budgetItemsData, catalogItems, clientSessions, open]);
  
  // Check for changes in budget items
  useEffect(() => {
    if (originalItems.length > 0) {
      const itemsChanged = budgetItems.some((item, index) => {
        if (index >= originalItems.length) return true;
        return item.quantity !== originalItems[index].quantity || 
               item.isActive !== originalItems[index].isActive;
      });
      setHasChanges(itemsChanged);
    }
  }, [budgetItems, originalItems]);

  // Handle quantity change for a budget item
  const handleQuantityChange = (id: number, newQuantity: number) => {
    // Validate input
    if (newQuantity < 0 || isNaN(newQuantity)) return;
    
    setBudgetItems(prev => {
      // Find the item to update
      const updatedItems = prev.map(item => {
        if (item.id === id) {
          const newItem = { 
            ...item, 
            quantity: newQuantity,
            totalPrice: newQuantity * item.unitPrice
          };
          return newItem;
        }
        return item;
      });
      
      // Calculate new total
      const newTotal = updatedItems.reduce((sum, item) => {
        return sum + (item.isActive ? item.totalPrice : 0);
      }, 0);
      
      setTotalBudget(newTotal);
      return updatedItems;
    });
  };
  
  // Handle toggling active status for a budget item
  const handleToggleActive = (id: number) => {
    setBudgetItems(prev => {
      // Toggle active status for the item
      const updatedItems = prev.map(item => {
        if (item.id === id) {
          return { 
            ...item, 
            isActive: !item.isActive
          };
        }
        return item;
      });
      
      // Calculate new total for active items only
      const newTotal = updatedItems.reduce((sum, item) => {
        return sum + (item.isActive ? item.totalPrice : 0);
      }, 0);
      
      setTotalBudget(newTotal);
      return updatedItems;
    });
  };

  // Reset budget items to original state
  const handleResetChanges = () => {
    setBudgetItems(JSON.parse(JSON.stringify(originalItems))); // Deep copy
    setTotalBudget(originalTotalBudget);
    setHasChanges(false);
  };

  // Mutation for updating budget plan details
  const updateBudgetPlan = useMutation({
    mutationFn: async (data: EditBudgetPlanFormValues) => {
      return apiRequest("PUT", `/api/budget-settings/${plan.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget plan details updated successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      setActiveTab("items"); // Switch to items tab after successful update
    },
    onError: (error) => {
      console.error("Error updating budget plan:", error);
      toast({
        title: "Error",
        description: "Failed to update budget plan details. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Mutation for updating budget items
  const updateBudgetItem = useMutation({
    mutationFn: async (data: BudgetItemUpdate) => {
      return apiRequest("PUT", `/api/budget-items/${data.id}`, {
        quantity: data.quantity,
        isActive: data.isActive
      });
    },
  });

  // Handle general plan details form submission
  const onSubmitDetails = (data: EditBudgetPlanFormValues) => {
    setIsSubmitting(true);
    updateBudgetPlan.mutate(data);
  };

  // Handle budget items updates submission
  const handleSaveItems = async () => {
    setIsSubmitting(true);
    
    try {
      // Only update items that have changes
      const itemsToUpdate = budgetItems.filter(item => {
        const originalItem = originalItems.find(o => o.id === item.id);
        return originalItem && (
          item.quantity !== originalItem.quantity ||
          item.isActive !== originalItem.isActive
        );
      });
      
      if (itemsToUpdate.length === 0) {
        toast({
          title: "No Changes",
          description: "No changes were made to budget items.",
          variant: "default",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Update items one by one
      const updates = itemsToUpdate.map(item => 
        updateBudgetItem.mutateAsync({
          id: item.id,
          quantity: item.quantity,
          isActive: item.isActive
        })
      );
      
      await Promise.all(updates);
      
      // On success
      toast({
        title: "Success",
        description: `Updated ${itemsToUpdate.length} budget items successfully`,
        variant: "default",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating budget items:", error);
      toast({
        title: "Error",
        description: "Failed to update budget items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Budget Plan</DialogTitle>
          <DialogDescription>
            Manage {plan.planName || `Plan ${plan.planCode || 'Unknown'}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="details">Plan Details</TabsTrigger>
            <TabsTrigger value="items">Budget Items</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="flex-1 overflow-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitDetails)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="planCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter plan code" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endOfPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          placeholder="Select end date" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Plan</FormLabel>
                        <FormDescription>
                          Set as the active plan for this client
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important Note</AlertTitle>
                  <AlertDescription>
                    Plan code and end date changes will update the plan's metadata without changing 
                    the budget items or total funds. To manage budget items, use the "Budget Items" tab.
                  </AlertDescription>
                </Alert>

                <DialogFooter className="mt-6">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Plan Details"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="items" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm">
                  <div className="font-semibold">Budget Total: ${totalBudget.toFixed(2)}</div>
                  <div className="text-muted-foreground">
                    {budgetItems.length} items • {budgetItems.filter(i => i.isActive).length} active
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasChanges && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleResetChanges}
                      disabled={isSubmitting}
                    >
                      Reset Changes
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSaveItems}
                    disabled={!hasChanges || isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Item Changes"}
                  </Button>
                </div>
              </div>
              
              {totalBudget !== originalTotalBudget && (
                <Alert className="mb-4" variant={totalBudget > originalTotalBudget ? "destructive" : "default"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Budget Change Alert</AlertTitle>
                  <AlertDescription>
                    {totalBudget > originalTotalBudget 
                      ? `Your changes will increase the total budget by $${(totalBudget - originalTotalBudget).toFixed(2)}`
                      : `Your changes will decrease the total budget by $${(originalTotalBudget - totalBudget).toFixed(2)}`
                    }
                  </AlertDescription>
                </Alert>
              )}

              <Card className="mb-4">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Budget Items Management</CardTitle>
                </CardHeader>
                <CardContent className="py-2 text-sm">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Adjust quantities: Enter new quantities for each item</li>
                    <li>Pause items: Toggle active status to pause/unpause items</li>
                    <li>Budget balancing: Ensure the total budget remains within expected range</li>
                  </ul>
                </CardContent>
              </Card>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 border rounded-md">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[180px]">Item</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right w-[100px]">Unit Price</TableHead>
                        <TableHead className="text-right w-[80px]">Used</TableHead>
                        <TableHead className="text-right w-[100px]">Quantity</TableHead>
                        <TableHead className="text-right w-[100px]">Total</TableHead>
                        <TableHead className="text-center w-[80px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            No budget items found for this plan.
                          </TableCell>
                        </TableRow>
                      ) : (
                        budgetItems.map((item) => (
                          <TableRow key={item.id} className={!item.isActive ? "opacity-60 bg-muted/20" : ""}>
                            <TableCell className="font-medium">
                              {item.itemCode}
                              <Badge 
                                variant="outline" 
                                className="ml-2 text-xs"
                              >
                                {item.itemName}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {item.description || item.catalogItem?.description || ''}
                            </TableCell>
                            <TableCell className="text-right">
                              ${item.unitPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.usedQuantity}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end">
                                <Input
                                  type="number"
                                  min={item.usedQuantity}
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                  disabled={!item.isActive || isSubmitting}
                                  className="w-20 text-right"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${item.totalPrice.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleActive(item.id)}
                                  disabled={isSubmitting}
                                  title={item.isActive ? "Pause this item" : "Activate this item"}
                                >
                                  {item.isActive ? (
                                    <PauseCircle className="h-4 w-4" />
                                  ) : (
                                    <PlayCircle className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveItems}
                  disabled={!hasChanges || isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}