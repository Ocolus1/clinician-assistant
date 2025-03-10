import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Calendar } from "../ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { 
  Calendar as CalendarIcon, 
  DollarSign, 
  Tag,
  CreditCard,
  Search,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { Switch } from "../ui/switch";
import { apiRequest } from "@/lib/queryClient";
import type { BudgetSettings, BudgetItemCatalog } from "@shared/schema";

// Form schema
const createPlanSchema = z.object({
  planCode: z.string().min(1, "Plan code is required"),
  planSerialNumber: z.string().optional(),
  availableFunds: z.number().positive("Available funds must be positive"),
  isActive: z.boolean().default(false),
  endOfPlan: z.date().optional(),
});

type CreatePlanValues = z.infer<typeof createPlanSchema>;

interface BudgetPlanCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  existingPlans: BudgetSettings[];
  hasActivePlan: boolean;
  isLoading?: boolean;
}

export function BudgetPlanCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  existingPlans,
  hasActivePlan,
  isLoading = false
}: BudgetPlanCreateDialogProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  type SelectedItem = BudgetItemCatalog & { quantity: number };
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<SelectedItem[]>([]);

  // Generate unique plan serial number
  function generatePlanSerialNumber() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `PLAN-${timestamp}-${random}`;
  }

  const form = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      planCode: "",
      planSerialNumber: generatePlanSerialNumber(),
      availableFunds: 0,
      isActive: !hasActivePlan, // Default to active if no active plan exists
      endOfPlan: undefined,
    },
  });
  
  function handleSubmit(values: CreatePlanValues) {
    // Format the date as a string before submitting
    const formattedValues = {
      ...values,
      // Always format the date as a string in yyyy-MM-dd format
      endOfPlan: values.endOfPlan ? format(values.endOfPlan, 'yyyy-MM-dd') : undefined
    };
    
    console.log("Submitting budget plan with endOfPlan:", formattedValues.endOfPlan);
    
    // We don't send selected products in this initial form
    // Products will be added after the plan is created
    onSubmit(formattedValues);
    onOpenChange(false);
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Fetch catalog items
  const { data: catalogItems = [] } = useQuery<BudgetItemCatalog[]>({
    queryKey: ["/api/budget-catalog"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/budget-catalog`);
        return res.json();
      } catch (error) {
        console.error("Error fetching catalog items:", error);
        return [];
      }
    },
  });

  // Get unique categories from catalog items
  const categories = catalogItems
    ? Array.from(new Set(catalogItems.map(item => item.category).filter(Boolean) as string[]))
    : [];

  // Filter catalog items based on search term and selected category
  const filteredCatalogItems = catalogItems.filter(item => {
    const matchesSearch = searchTerm
      ? item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesCategory = selectedCategory 
      ? item.category === selectedCategory 
      : true;
    return matchesSearch && matchesCategory && item.isActive;
  });

  // Helper function to select a catalog item and populate the budget item form
  const selectCatalogItem = (item: BudgetItemCatalog) => {
    if (!selectedCatalogItems.some(existingItem => existingItem.id === item.id)) {
      setSelectedCatalogItems([
        ...selectedCatalogItems, 
        { ...item, quantity: 1 }
      ]);
    }
    setShowItemForm(false);
  };
  
  // Function to update the quantity of a selected item
  const updateItemQuantity = (itemId: number, quantity: number) => {
    setSelectedCatalogItems(
      selectedCatalogItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: Math.max(1, quantity) } 
          : item
      )
    );
  };

  // Calculate total budget from selected items
  const calculateTotalBudget = () => {
    return selectedCatalogItems.reduce((total, item) => {
      return total + (item.defaultUnitPrice * item.quantity);
    }, 0);
  };
  
  // Calculate row total for an item
  const calculateRowTotal = (item: SelectedItem) => {
    return item.defaultUnitPrice * item.quantity;
  };

  // We're not automatically updating available funds anymore since the user needs to enter it manually

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Create New Budget Plan</DialogTitle>
          <DialogDescription>
            Add a new budget plan to track funding and expenses.
          </DialogDescription>
        </DialogHeader>
        
        <Card className="border-gray-200 shadow-sm">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-md font-semibold text-gray-700">Budget Settings</h3>
              {form.watch("planSerialNumber") && (
                <div className="text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                  Plan ID: {form.watch("planSerialNumber")}
                </div>
              )}
            </div>
          </div>
          <CardContent className="p-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 mb-4">
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            disabled={hasActivePlan}
                          />
                          <FormLabel className="text-sm font-medium cursor-pointer">
                            Plan Status: <span className={field.value ? "text-green-600" : "text-gray-500"}>
                              {field.value ? "Active" : "Inactive"}
                            </span>
                            {hasActivePlan && <span className="text-amber-600 text-xs ml-2">(Another plan is currently active)</span>}
                          </FormLabel>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormField
                    control={form.control}
                    name="planCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" />
                          Plan Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="E.g., NDIS 2025" 
                            {...field} 
                            className="border-gray-300"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="availableFunds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          Total Available Funds
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field}
                            className="border-gray-300"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                        <FormLabel className="text-sm font-medium flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          End of Plan Date
                        </FormLabel>
                        <FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal border-gray-300",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Select end date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return date < today;
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Budget Items Section */}
                <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Budget Products</h4>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowItemForm(true)}
                      className="text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Products
                    </Button>
                  </div>
                  
                  {selectedCatalogItems.length === 0 ? (
                    <div className="border border-dashed border-gray-200 rounded-md p-6 text-center">
                      <div className="text-sm text-gray-500">No products added yet</div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-md overflow-hidden">
                      <div className="p-3 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-700 grid grid-cols-12">
                        <div className="col-span-2">Item Code</div>
                        <div className="col-span-4">Description</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-2 text-center">Quantity</div>
                        <div className="col-span-1 text-right">Total</div>
                        <div className="col-span-1 text-right">Actions</div>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto divide-y divide-gray-200">
                        {selectedCatalogItems.map((item) => (
                          <div key={item.id} className="p-3 text-sm grid grid-cols-12 items-center hover:bg-gray-50">
                            <div className="col-span-2 font-medium">{item.itemCode}</div>
                            <div className="col-span-4 text-gray-600 truncate">{item.description}</div>
                            <div className="col-span-2 text-right font-medium text-gray-800">{formatCurrency(item.defaultUnitPrice)}</div>
                            <div className="col-span-2 flex justify-center items-center">
                              <div className="flex bg-white rounded border border-gray-300 w-20">
                                <button 
                                  type="button"
                                  className="w-6 flex items-center justify-center text-gray-500 hover:text-gray-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateItemQuantity(item.id, item.quantity - 1);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                  </svg>
                                </button>
                                <input 
                                  type="number" 
                                  className="w-8 text-center text-sm border-0 focus:ring-0 p-0"
                                  value={item.quantity}
                                  min="1"
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 1;
                                    updateItemQuantity(item.id, newValue);
                                  }}
                                />
                                <button 
                                  type="button"
                                  className="w-6 flex items-center justify-center text-gray-500 hover:text-gray-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateItemQuantity(item.id, item.quantity + 1);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="col-span-1 text-right font-medium text-gray-800">
                              {formatCurrency(calculateRowTotal(item))}
                            </div>
                            <div className="col-span-1 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCatalogItems(selectedCatalogItems.filter(i => i.id !== item.id));
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 border-t border-gray-200 flex justify-between">
                        <div className="font-medium">Total Budget:</div>
                        <div className="font-bold text-gray-800">{formatCurrency(calculateTotalBudget())}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Plan"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>

      {/* Product Selection Dialog */}
      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="sm:max-w-[850px]">
          <DialogHeader>
            <DialogTitle>Select Item from Catalog</DialogTitle>
            <DialogDescription>
              Choose items from the catalog to add to your budget plan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  type="search"
                  placeholder="Search by item code or description" 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-[180px]">
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={selectedCategory || ""}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[400px] border rounded-md">
              {filteredCatalogItems.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No items found. Try a different search.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredCatalogItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => selectCatalogItem(item)}
                    >
                      <div>
                        <div className="font-medium">{item.itemCode}</div>
                        <div className="text-sm text-gray-500">{item.description}</div>
                        {item.category && (
                          <div className="mt-1 text-xs inline-block bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
                            {item.category}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-800">{formatCurrency(item.defaultUnitPrice)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}