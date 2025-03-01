import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Calculator, Trash, CalendarIcon, Search, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { FormMessageHidden } from "@/components/ui/form-no-message";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { 
  insertBudgetItemSchema, 
  insertBudgetSettingsSchema,
  insertBudgetItemCatalogSchema,
  type InsertBudgetItem, 
  type BudgetItem, 
  type BudgetSettings, 
  type InsertBudgetSettings,
  type BudgetItemCatalog,
  type InsertBudgetItemCatalog
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface BudgetFormProps {
  clientId: number;
  onComplete: () => void;
  onPrevious: () => void;
}

export default function BudgetForm({ clientId, onComplete, onPrevious }: BudgetFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCatalogItemForm, setShowCatalogItemForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Form for budget items
  const itemForm = useForm<InsertBudgetItem>({
    resolver: zodResolver(insertBudgetItemSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      unitPrice: 0,
      quantity: 1,
    },
  });
  
  // Form for budget settings
  const settingsForm = useForm<InsertBudgetSettings>({
    resolver: zodResolver(insertBudgetSettingsSchema),
    defaultValues: {
      availableFunds: 0,
      endOfPlan: undefined,
      planSerialNumber: generatePlanSerialNumber(),
      isActive: true,
    },
  });
  
  // Generate unique plan serial number
  function generatePlanSerialNumber() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `PLAN-${timestamp}-${random}`;
  }
  
  // Auto-save budget settings when values change
  useEffect(() => {
    const debouncedSave = setTimeout(() => {
      if (settingsForm.formState.isDirty) {
        saveBudgetSettings.mutate(settingsForm.getValues());
      }
    }, 1000);
    
    return () => clearTimeout(debouncedSave);
  }, [
    settingsForm.watch("availableFunds"), 
    settingsForm.watch("endOfPlan"),
    settingsForm.watch("isActive")
  ]);

  // Fetch budget settings
  const { data: budgetSettings } = useQuery<BudgetSettings | undefined>({
    queryKey: ["/api/clients", clientId, "budget-settings"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/clients/${clientId}/budget-settings`);
        return res.json();
      } catch (error) {
        // Return undefined if settings don't exist yet
        return undefined;
      }
    },
  });
  
  // Update form when settings are loaded
  useEffect(() => {
    if (budgetSettings) {
      // Set form values from fetched settings
      settingsForm.setValue("availableFunds", budgetSettings.availableFunds);
      settingsForm.setValue("isActive", budgetSettings.isActive);
      
      // Set planSerialNumber if it exists, otherwise generate a new one
      if (budgetSettings.planSerialNumber) {
        settingsForm.setValue("planSerialNumber", budgetSettings.planSerialNumber);
      } else {
        settingsForm.setValue("planSerialNumber", generatePlanSerialNumber());
      }
      
      if (budgetSettings.endOfPlan) {
        settingsForm.setValue("endOfPlan", budgetSettings.endOfPlan);
        setDate(new Date(budgetSettings.endOfPlan));
      }
    }
  }, [budgetSettings, settingsForm]);

  // Explicitly type and fetch budget items to ensure correct data retrieval
  const { data: budgetItems = [] } = useQuery<BudgetItem[]>({
    queryKey: ["/api/clients", clientId, "budget-items"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/clients/${clientId}/budget-items`);
      return res.json();
    },
  });
  
  // Form for catalog items
  const catalogItemForm = useForm<InsertBudgetItemCatalog>({
    resolver: zodResolver(insertBudgetItemCatalogSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      defaultUnitPrice: 0.01, // Set a valid minimum default price
      category: "",
      isActive: true
    },
  });
  
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

  // Save or update budget settings
  const saveBudgetSettings = useMutation({
    mutationFn: async (data: InsertBudgetSettings) => {
      if (budgetSettings?.id) {
        // Update existing settings
        const res = await apiRequest("PUT", `/api/budget-settings/${budgetSettings.id}`, data);
        return res.json();
      } else {
        // Create new settings
        const res = await apiRequest("POST", `/api/clients/${clientId}/budget-settings`, data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-settings"] });
      toast({
        title: "Success",
        description: "Budget settings saved successfully",
      });
    },
    onError: (error) => {
      console.error("Error saving budget settings:", error);
      toast({
        title: "Error",
        description: "Failed to save budget settings",
        variant: "destructive",
      });
    }
  });

  const createBudgetItem = useMutation({
    mutationFn: async (data: InsertBudgetItem) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/budget-items`, data);
      return res.json();
    },
    onSuccess: () => {
      itemForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-items"] });
      toast({
        title: "Success",
        description: "Budget item added successfully",
      });
    },
    onError: (error) => {
      console.error("Error adding budget item:", error);
      toast({
        title: "Error",
        description: "Failed to add budget item. Please check the form and try again.",
        variant: "destructive",
      });
    },
  });
  
  const deleteBudgetItem = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/budget-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-items"] });
      toast({
        title: "Success",
        description: "Budget item deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting budget item:", error);
      toast({
        title: "Error",
        description: "Failed to delete budget item",
        variant: "destructive",
      });
    },
  });
  
  // Create a catalog item
  const createCatalogItem = useMutation({
    mutationFn: async (data: InsertBudgetItemCatalog) => {
      console.log("Submitting catalog item data:", data);
      
      try {
        const res = await apiRequest("POST", `/api/budget-catalog`, data);
        
        // Check if the response is ok
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Error response from server:", errorData);
          
          // Handle validation errors specially
          if (errorData.details) {
            const fieldErrors = [];
            
            // Process detailed validation errors by field
            if (errorData.details.itemCode?._errors) {
              fieldErrors.push(`Item Code: ${errorData.details.itemCode._errors[0]}`);
            }
            if (errorData.details.description?._errors) {
              fieldErrors.push(`Description: ${errorData.details.description._errors[0]}`);
            }
            if (errorData.details.defaultUnitPrice?._errors) {
              fieldErrors.push(`Default Unit Price: ${errorData.details.defaultUnitPrice._errors[0]}`);
            }
            
            const errorMessage = fieldErrors.length > 0 
              ? `Validation errors: ${fieldErrors.join(', ')}` 
              : errorData.error || "Failed to add catalog item";
              
            throw new Error(errorMessage);
          } else {
            throw new Error(errorData.error || "Failed to add catalog item");
          }
        }
        
        return res.json();
      } catch (error) {
        console.error("Error in createCatalogItem mutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Successfully added catalog item:", data);
      catalogItemForm.reset();
      setShowCatalogItemForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/budget-catalog"] });
      toast({
        title: "Success",
        description: "Catalog item added successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error adding catalog item:", error);
      // Display more specific error message if available
      const errorMessage = error.message || "Failed to add catalog item. Please check the form and try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const totalBudget = budgetItems.reduce((acc: number, item: BudgetItem) => {
    return acc + (item.unitPrice * item.quantity);
  }, 0);

  // Handler for complete button
  const handleComplete = () => {
    // Save budget settings first
    const settings = settingsForm.getValues();
    saveBudgetSettings.mutate(settings, {
      onSuccess: () => {
        // Invalidate queries to ensure fresh data when redirected to client list
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        
        // Navigate to client list after completion
        toast({
          title: "Budget saved successfully",
          description: "Client onboarding completed successfully",
        });
        onComplete();
      }
    });
  };

  // Calculate days left in plan
  const calculateDaysLeft = () => {
    if (!date) return null;
    const today = new Date();
    const endDate = new Date(date);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysLeft = calculateDaysLeft();
  const availableFunds = settingsForm.watch("availableFunds") || 0;
  const budgetDifference = availableFunds - totalBudget;
  const hasBudgetSurplus = budgetDifference >= 0;
  
  // Format currency values
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  // Helper function to select a catalog item and populate the budget item form
  const selectCatalogItem = (item: BudgetItemCatalog) => {
    itemForm.setValue("itemCode", item.itemCode);
    itemForm.setValue("description", item.description);
    itemForm.setValue("unitPrice", item.defaultUnitPrice);
    itemForm.setValue("quantity", 1);
    setShowItemForm(false);
  };
  
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

  return (
    <div className="space-y-6">
      {/* Catalog Item Management Dialog */}
      <Dialog open={showCatalogItemForm} onOpenChange={setShowCatalogItemForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Catalog Item</DialogTitle>
            <DialogDescription>
              Add a new item to the catalog for future use in budgets.
            </DialogDescription>
          </DialogHeader>
          <Form {...catalogItemForm}>
            <form onSubmit={catalogItemForm.handleSubmit((data) => createCatalogItem.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={catalogItemForm.control}
                  name="itemCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Code <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="ITEM-001" {...field} />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
                <FormField
                  control={catalogItemForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Therapy, Equipment" {...field} />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={catalogItemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Item description" {...field} />
                    </FormControl>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />
              <FormField
                control={catalogItemForm.control}
                name="defaultUnitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Unit Price <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                          onChange={(e) => {
                            // Ensure we have a valid numeric value that's at least 0.01
                            let value = e.target.value === '' ? 0.01 : parseFloat(e.target.value);
                            // Enforce minimum value
                            value = Math.max(0.01, value);
                            field.onChange(value);
                          }}
                          value={field.value}
                        />
                      </div>
                    </FormControl>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />
              <FormField
                control={catalogItemForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <div className="flex h-5 items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={field.value === true}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      </div>
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">Item will be available for selection in the catalog</p>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCatalogItemForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Catalog Item</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Item Selection Dialog */}
      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Select Item from Catalog</DialogTitle>
            <DialogDescription>
              Choose an item from the catalog or add a new catalog item.
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
                  <p className="text-sm text-gray-500">No items found. Try a different search or add a new catalog item.</p>
                  <Button 
                    className="mt-4"
                    onClick={() => {
                      setShowItemForm(false);
                      setShowCatalogItemForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add New Catalog Item
                  </Button>
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
                        <div className="font-medium text-primary">{formatCurrency(item.defaultUnitPrice)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              className="mr-auto"
              onClick={() => {
                setShowItemForm(false);
                setShowCatalogItemForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add New Catalog Item
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowItemForm(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Two-column layout for budget management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Budget Items List */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <Card className="border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-semibold text-gray-700">Planned Budget Items</h3>
                  <div className="text-sm font-medium text-gray-600">
                    Total: {formatCurrency(totalBudget)}
                  </div>
                </div>
              </div>
              <CardContent className="p-5">
                {budgetItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-10 bg-gray-50 border border-dashed border-gray-200 rounded-md">
                    <div className="mb-2">
                      <Calculator className="h-8 w-8 mx-auto text-gray-400" />
                    </div>
                    <p className="text-sm">No budget items added yet</p>
                    <p className="text-xs text-gray-400 mt-1">Add items using the form on the right</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {budgetItems.map((item: BudgetItem) => (
                      <Card key={item.id} className="overflow-hidden border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center">
                            <div className="font-medium text-gray-700">{item.itemCode}</div>
                            {item.category && (
                              <div className="ml-2 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
                                {item.category}
                              </div>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Budget Item</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this budget item? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteBudgetItem.mutate(item.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600 mb-2">{item.description}</div>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="text-center p-2 bg-gray-50 rounded-md">
                              <div className="text-xs text-gray-500 mb-1">Unit Price</div>
                              <div className="font-medium text-gray-700">{formatCurrency(item.unitPrice)}</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-md">
                              <div className="text-xs text-gray-500 mb-1">Quantity</div>
                              <div className="font-medium text-gray-700">{item.quantity}</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-md">
                              <div className="text-xs text-gray-500 mb-1">Total</div>
                              <div className="font-medium text-gray-700">{formatCurrency(item.unitPrice * item.quantity)}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fund Allocation Visualization */}
          {budgetItems.length > 0 && (
            <div>
              <Card className="border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-200">
                  <h3 className="text-md font-semibold text-gray-700">Fund Utilization</h3>
                </div>
                <CardContent className="p-5">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Allocation Progress</h4>
                      <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, (totalBudget / availableFunds) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>0%</span>
                        <span>Allocated: {((totalBudget / availableFunds) * 100).toFixed(1)}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right column: Configuration and form */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <Card className="border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-semibold text-gray-700">Budget Settings</h3>
                  {settingsForm.watch("planSerialNumber") && (
                    <div className="text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                      Plan ID: {settingsForm.watch("planSerialNumber")}
                    </div>
                  )}
                </div>
              </div>
              <CardContent className="p-5">
                <Form {...settingsForm}>
                  <form className="space-y-5">
                    <FormField
                      control={settingsForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 mb-4">
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={field.value === true}
                                onCheckedChange={field.onChange}
                              />
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                Plan Status: <span className={field.value ? "text-green-600" : "text-gray-500"}>
                                  {field.value ? "Active" : "Inactive"}
                                </span>
                              </FormLabel>
                            </div>
                          </FormControl>
                          <FormMessageHidden />
                        </FormItem>
                      )}
                    />

                    {/* Available Funds with Budget Surplus/Deficit */}
                    <FormField
                      control={settingsForm.control}
                      name="availableFunds"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-2">
                          <FormLabel className="text-sm font-medium">
                            Available Funds <span className="text-red-500">*</span>
                          </FormLabel>
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="relative flex-1">
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="pl-7 h-10 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                    {...field}
                                    onChange={(e) => {
                                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      field.onChange(value);
                                    }}
                                    value={field.value}
                                  />
                                </div>
                              </FormControl>
                            </div>
                            <div className={`px-3 py-2 rounded-md text-sm font-medium ${hasBudgetSurplus ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                <span>{hasBudgetSurplus ? 'Surplus: ' : 'Deficit: '}</span>
                                <span className="ml-1 font-semibold">{formatCurrency(Math.abs(budgetDifference))}</span>
                              </div>
                            </div>
                          </div>
                          <FormMessageHidden />
                        </FormItem>
                      )}
                    />
                    
                    {/* End of Plan Date with Days Left */}
                    <FormField
                      control={settingsForm.control}
                      name="endOfPlan"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-2">
                          <FormLabel className="text-sm font-medium">End of Plan Date</FormLabel>
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="relative flex-1">
                              <FormControl>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full h-10 pl-3 text-left font-normal border-gray-300 hover:bg-gray-50",
                                        !field.value && "text-gray-500"
                                      )}
                                    >
                                      {field.value ? (
                                        format(new Date(field.value), "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-70" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={date}
                                      onSelect={(newDate) => {
                                        setDate(newDate);
                                        if (newDate) {
                                          field.onChange(format(newDate, "yyyy-MM-dd"));
                                        }
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </FormControl>
                            </div>
                            {daysLeft !== null && (
                              <div className="px-3 py-2 rounded-md bg-blue-50 text-blue-700 text-sm font-medium">
                                <div className="flex items-center">
                                  <CalendarIcon className="h-4 w-4 mr-1" />
                                  <span>Days Left:</span>
                                  <span className="ml-1 font-semibold">{daysLeft}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <FormMessageHidden />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Add Item Form */}
          <div>
            <Card className="border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-3 border-b border-gray-200">
                <h3 className="text-md font-semibold text-gray-700">Budget Item Entry</h3>
              </div>
              <CardContent className="p-5">
                <Form {...itemForm}>
                  <form onSubmit={itemForm.handleSubmit((data) => createBudgetItem.mutate(data))} className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel className="text-sm font-medium">
                          Select Item <span className="text-red-500">*</span>
                        </FormLabel>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-primary"
                          onClick={() => setShowCatalogItemForm(true)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add New Catalog Item
                        </Button>
                      </div>
                      
                      <Button
                        type="button"
                        className="w-full justify-start border-dashed border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100"
                        variant="outline"
                        onClick={() => setShowItemForm(true)}
                      >
                        <Tag className="w-4 h-4 mr-2 text-gray-500" />
                        {itemForm.watch("itemCode") ? (
                          <span>{itemForm.watch("itemCode")} - {itemForm.watch("description")}</span>
                        ) : (
                          <span className="text-gray-500">Select from Catalog...</span>
                        )}
                      </Button>
                      
                      {itemForm.watch("itemCode") && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Unit Price</div>
                            <div className="font-medium text-gray-700">{formatCurrency(itemForm.watch("unitPrice"))}</div>
                          </div>
                          
                          <FormField
                            control={itemForm.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-gray-500 mb-1">
                                  Quantity <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                    {...field}
                                    onChange={(e) => {
                                      const value = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                                      field.onChange(value);
                                    }}
                                    value={field.value}
                                  />
                                </FormControl>
                                <FormMessageHidden />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      
                      {/* Hidden fields - maintained for form validation */}
                      <FormField
                        control={itemForm.control}
                        name="itemCode"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessageHidden />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessageHidden />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="unitPrice"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                              />
                            </FormControl>
                            <FormMessageHidden />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                        disabled={createBudgetItem.isPending || !itemForm.watch("itemCode")}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Budget Item
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="px-4"
        >
          Previous
        </Button>
        <Button 
          type="button" 
          onClick={handleComplete}
          className="bg-primary hover:bg-primary/90 px-8"
        >
          Save & Continue
        </Button>
      </div>
    </div>
  );
}