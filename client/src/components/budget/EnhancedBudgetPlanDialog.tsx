import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { InsertBudgetSettings, FUNDS_MANAGEMENT_OPTIONS } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, DollarSign, CalendarRange, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Form Schema with validation
const budgetPlanSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  ndisFunds: z.string().min(1, "NDIS funds amount is required")
    .refine(val => !isNaN(Number(val)), {
      message: "Funds must be a valid number",
    }),
  isActive: z.boolean().default(false),
  fundsManagement: z.enum(FUNDS_MANAGEMENT_OPTIONS),
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
  })).min(1, "At least one budget item is required"),
});

type BudgetPlanFormValues = z.infer<typeof budgetPlanSchema>;

interface EnhancedBudgetPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onSuccess?: () => void;
}

export function EnhancedBudgetPlanDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess
}: EnhancedBudgetPlanDialogProps) {
  const { toast } = useToast();
  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Get catalog items for dropdown
  const { data: catalogItems = [] } = useQuery({
    queryKey: ["/api/budget-catalog"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/budget-catalog");
      return res.json();
    },
    enabled: open,
  });

  // Initialize form with default values
  const form = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
      ndisFunds: "10000",
      isActive: false,
      fundsManagement: "Self-Managed",
      budgetItems: [{
        itemCode: "",
        description: "",
        quantity: "1",
        unitPrice: "0",
      }],
    },
  });

  // Set up field array for budget items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "budgetItems",
  });

  // Calculate total cost
  const totalCost = form.watch("budgetItems").reduce((total, item) => {
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
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        ndisFunds: Number(data.ndisFunds),
        isActive: data.isActive,
        fundsManagement: data.fundsManagement,
      };

      // Create budget plan
      const response = await apiRequest(
        "POST",
        `/api/clients/${clientId}/budget-settings`,
        transformedData
      );
      const budgetSettings = await response.json();

      // Create budget items
      const itemPromises = data.budgetItems.map(item => {
        return apiRequest(
          "POST",
          `/api/clients/${clientId}/budget-items`,
          {
            budgetSettingsId: budgetSettings.id,
            itemCode: item.itemCode,
            description: item.description || catalogItems.find(
              (ci: any) => ci.itemCode === item.itemCode
            )?.description || "",
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

  // Handle item selection from catalog
  const handleSelectCatalogItem = (catalogItem: any, index: number) => {
    // Update the form values for the selected item
    const updatedItem = {
      itemCode: catalogItem.itemCode,
      description: catalogItem.description,
      quantity: form.getValues(`budgetItems.${index}.quantity`),
      unitPrice: String(catalogItem.defaultUnitPrice),
    };

    form.setValue(`budgetItems.${index}.itemCode`, updatedItem.itemCode);
    form.setValue(`budgetItems.${index}.description`, updatedItem.description);
    form.setValue(`budgetItems.${index}.unitPrice`, updatedItem.unitPrice);
  };

  // Add a new blank item
  const addNewItem = () => {
    append({
      itemCode: "",
      description: "",
      quantity: "1",
      unitPrice: "0",
    });
  };

  // Submit handler
  function onSubmit(data: BudgetPlanFormValues) {
    mutation.mutate(data);
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Budget Plan</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden h-full">
              {/* Left Column - Plan Details */}
              <div className="space-y-6 overflow-y-auto p-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Plan Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
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
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="ndisFunds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total NDIS Funds</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input className="pl-8" placeholder="0.00" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="fundsManagement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funds Management</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select fund management type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FUNDS_MANAGEMENT_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Make this the active plan</FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Budget Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNewItem}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="overflow-hidden">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex justify-between items-start">
                            <Label className="font-medium">Item {index + 1}</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="h-8 w-8 p-0"
                              disabled={fields.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            <FormField
                              control={form.control}
                              name={`budgetItems.${index}.itemCode`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Item Code</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      const item = catalogItems.find((item: any) => item.itemCode === value);
                                      if (item) {
                                        handleSelectCatalogItem(item, index);
                                      }
                                    }}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an item code" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {catalogItems.map((item: any) => (
                                        <SelectItem key={item.id} value={item.itemCode}>
                                          {item.itemCode} - {item.description.substring(0, 30)}{item.description.length > 30 ? '...' : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`budgetItems.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl>
                                      <Input type="number" min="1" step="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`budgetItems.${index}.unitPrice`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Unit Price</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <Input className="pl-8" type="number" min="0" step="0.01" {...field} />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <FormField
                              control={form.control}
                              name={`budgetItems.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Item description" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Right Column - Summary & Preview */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Budget Summary</h3>
                  
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Total Funds</span>
                      </div>
                      <span className="font-semibold text-lg">
                        {formatCurrency(availableFunds)}
                      </span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Total Allocations</span>
                      </div>
                      <span className="font-semibold text-lg">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-5 w-5 text-indigo-600" />
                        <span className="font-medium">Remaining Funds</span>
                      </div>
                      <span className={`font-semibold text-lg ${remainingFunds < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(remainingFunds)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Plan Preview</h3>
                  
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-base">
                          Budget Plan
                        </h4>
                        {form.watch("isActive") && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex items-center gap-1">
                          <CalendarRange className="h-3.5 w-3.5" />
                          <span>
                            {form.watch("startDate") || "Start date"} to {form.watch("endDate") || "End date"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>{formatCurrency(availableFunds)} ({form.watch("fundsManagement")})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Selected Items</h3>
                  
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {form.watch("budgetItems").map((item, index) => {
                        if (!item.itemCode) return null;
                        
                        const quantity = Number(item.quantity) || 0;
                        const unitPrice = Number(item.unitPrice) || 0;
                        const itemTotal = quantity * unitPrice;
                        
                        return (
                          <div key={index} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-3 text-sm">
                            <div className="flex justify-between">
                              <div>
                                <div className="font-medium">{item.itemCode}</div>
                                <div className="text-gray-500">{item.description}</div>
                              </div>
                              <div className="text-right">
                                <div>
                                  {quantity} x {formatCurrency(unitPrice)}
                                </div>
                                <div className="font-semibold">
                                  {formatCurrency(itemTotal)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {!form.watch("budgetItems").some(item => item.itemCode) && (
                        <div className="text-center text-gray-500 p-4">
                          No items selected
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Budget Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}