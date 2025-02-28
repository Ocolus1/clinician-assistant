import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Calculator, Trash, CalendarIcon, Search, Tag, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
  DialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
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
    },
  });
  
  // Auto-save budget settings when values change
  useEffect(() => {
    const debouncedSave = setTimeout(() => {
      if (settingsForm.formState.isDirty) {
        saveBudgetSettings.mutate(settingsForm.getValues());
      }
    }, 1000);
    
    return () => clearTimeout(debouncedSave);
  }, [settingsForm.watch("availableFunds"), settingsForm.watch("endOfPlan")]);

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
      defaultUnitPrice: 0,
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
      const res = await apiRequest("POST", `/api/budget-catalog`, data);
      return res.json();
    },
    onSuccess: () => {
      catalogItemForm.reset();
      setShowCatalogItemForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/budget-catalog"] });
      toast({
        title: "Success",
        description: "Catalog item added successfully",
      });
    },
    onError: (error) => {
      console.error("Error adding catalog item:", error);
      toast({
        title: "Error",
        description: "Failed to add catalog item. Please check the form and try again.",
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
        // Then proceed to summary
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
    ? [...new Set(catalogItems.map(item => item.category))]
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
                      <FormMessage />
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
                      <FormMessage />
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
                    <FormMessage />
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
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                          value={field.value}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
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
                          checked={field.value}
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
                <Button 
                  type="submit" 
                  disabled={createCatalogItem.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {createCatalogItem.isPending ? "Saving..." : "Save Catalog Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Catalog Item Selection Dialog */}
      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
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
              <Select 
                value={selectedCategory || ""} 
                onValueChange={(value) => setSelectedCategory(value || null)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {filteredCatalogItems.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-md bg-gray-50">
                <Package className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700">No items found</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm || selectedCategory 
                    ? "Try adjusting your search or filters" 
                    : "Add your first catalog item to get started"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCatalogItems.map((item) => (
                  <Card 
                    key={item.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-gray-200"
                    onClick={() => selectCatalogItem(item)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{item.itemCode}</CardTitle>
                        <div className="rounded-full px-2 py-1 text-xs bg-gray-100 text-gray-700">
                          {item.category}
                        </div>
                      </div>
                      <CardDescription className="mt-1">{item.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0 pb-3 flex justify-between items-center">
                      <div className="text-lg font-semibold text-indigo-700">
                        {formatCurrency(item.defaultUnitPrice)}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-indigo-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectCatalogItem(item);
                        }}
                      >
                        Select
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="border-t pt-4 flex justify-between">
              <Button variant="outline" onClick={() => setShowItemForm(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  setShowItemForm(false);
                  setShowCatalogItemForm(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Catalog Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="mb-3">
        <p className="text-sm text-muted-foreground">Fields marked with <span className="text-red-500">*</span> are required</p>
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-3 text-primary">Budget Settings</h2>
        <Card className="border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b border-gray-200">
            <h3 className="text-md font-semibold text-blue-800">Plan Configuration</h3>
          </div>
          <CardContent className="p-5">
            <Form {...settingsForm}>
              <form className="space-y-5">
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={settingsForm.control}
                    name="availableFunds"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm font-medium mb-1.5">
                          Available Funds <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="pl-7 h-10 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
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
                    control={settingsForm.control}
                    name="endOfPlan"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm font-medium mb-1.5">End of Plan Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
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
                            </FormControl>
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
                        <FormMessageHidden />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Budget Analysis Section */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Budget Analysis Dashboard</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`rounded-lg shadow-sm border ${hasBudgetSurplus ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
                      <div className="p-4">
                        <div className="flex items-center mb-1 text-sm text-gray-600">
                          {hasBudgetSurplus ? (
                            <><DollarSign className="h-4 w-4 mr-1 text-green-500" /> Budget Surplus</>
                          ) : (
                            <><DollarSign className="h-4 w-4 mr-1 text-red-500" /> Budget Deficit</>
                          )}
                        </div>
                        <div className="flex justify-between items-end">
                          <div className={`text-2xl font-bold ${hasBudgetSurplus ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(budgetDifference))}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total planned: {formatCurrency(totalBudget)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {daysLeft !== null && (
                      <div className="rounded-lg shadow-sm border bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <div className="p-4">
                          <div className="flex items-center mb-1 text-sm text-gray-600">
                            <CalendarIcon className="h-4 w-4 mr-1 text-blue-500" /> Plan Duration
                          </div>
                          <div className="flex justify-between items-end">
                            <div className="text-2xl font-bold text-blue-700">
                              {daysLeft} <span className="text-sm font-normal">days left</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Ends: {date ? format(date, "MMM d, yyyy") : "Not set"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-3 text-primary">Budget Items</h2>
        <Card className="border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 border-b border-gray-200">
            <h3 className="text-md font-semibold text-indigo-800">Add New Budget Item</h3>
          </div>
          <CardContent className="p-5">
            <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit((data) => createBudgetItem.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-3">
                    <FormField
                      control={itemForm.control}
                      name="itemCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium mb-1.5">
                            Item Code <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                          </FormControl>
                          <FormMessageHidden />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-4">
                    <FormField
                      control={itemForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium mb-1.5">
                            Description <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            />
                          </FormControl>
                          <FormMessageHidden />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <FormField
                      control={itemForm.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium mb-1.5">
                            Unit Price <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="pl-7 border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
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
                  </div>

                  <div className="col-span-2">
                    <FormField
                      control={itemForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium mb-1.5">
                            Quantity <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              className="border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
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

                  <div className="col-span-1">
                    <Button
                      type="submit"
                      className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 hover:text-indigo-800 transition-colors"
                      variant="secondary"
                      disabled={createBudgetItem.isPending}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-3 text-primary">Budget Item List</h2>
        <Card className="border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 border-b border-gray-200">
            <h3 className="text-md font-semibold text-purple-800">Planned Budget Items</h3>
          </div>
          <CardContent className="p-5">
            {budgetItems.length === 0 ? (
              <div className="text-center text-gray-500 py-10 bg-gray-50 border border-dashed border-gray-200 rounded-md">
                <div className="mb-2">
                  <Calculator className="h-8 w-8 mx-auto text-gray-400" />
                </div>
                <p className="text-sm">No budget items added yet</p>
                <p className="text-xs text-gray-400 mt-1">Add items using the form above</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 text-sm text-gray-500 border-b border-gray-200 pb-3 font-medium">
                  <div className="col-span-3">Item Code</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>
                {budgetItems.map((item: BudgetItem) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-center hover:bg-gray-50 rounded-md p-3 transition-colors border-b border-gray-100">
                    <div className="col-span-3 font-medium text-gray-700">{item.itemCode}</div>
                    <div className="col-span-3 text-sm text-gray-600">{item.description}</div>
                    <div className="col-span-2 text-right text-gray-700">{formatCurrency(item.unitPrice)}</div>
                    <div className="col-span-1 text-center bg-gray-100 rounded-md py-1 text-gray-700">{item.quantity}</div>
                    <div className="col-span-2 text-right font-semibold text-indigo-700">{formatCurrency(item.unitPrice * item.quantity)}</div>
                    <div className="col-span-1 flex justify-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600 transition-colors"
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
                              disabled={deleteBudgetItem.isPending}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total Budget</div>
                    <div className="text-xl font-bold text-indigo-700">{formatCurrency(totalBudget)}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="w-1/3 border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onPrevious}
          >
            Previous
          </Button>
          <Button
            type="button"
            className="w-2/3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
            onClick={handleComplete}
          >
            <Calculator className="w-4 h-4 mr-2" />
            Complete & View Summary
          </Button>
        </div>
      </div>
    </div>
  );
}