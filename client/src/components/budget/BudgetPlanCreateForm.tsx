import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Calculator, Trash, CalendarIcon, Search, Tag, ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage
} from "@/components/ui/form";
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
import { useBudgetFeature } from "./BudgetFeatureContext";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BudgetPlanCreateFormProps {
  clientId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export function BudgetPlanCreateForm({ clientId, onCancel, onSuccess }: BudgetPlanCreateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCatalogItemForm, setShowCatalogItemForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { activePlan } = useBudgetFeature();

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
      planCode: "", // Custom field for plan code
      isActive: false,
    },
  });
  
  // Generate unique plan serial number
  function generatePlanSerialNumber() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `PLAN-${timestamp}-${random}`;
  }

  // Explicitly type and fetch budget items to ensure correct data retrieval
  // Since we're creating a new plan, we'll start with no budget items
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  
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
      // Create new settings
      const res = await apiRequest("POST", `/api/clients/${clientId}/budget-settings`, {
        ...data,
        // Set the plan code to match the plan serial number if no plan code provided
        planCode: data.planCode || data.planSerialNumber
      });
      return res.json();
    },
    onSuccess: (newSettings) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-settings"] });
      
      // Now add any budget items that were created
      if (budgetItems.length > 0 && newSettings.id) {
        const createPromises = budgetItems.map(item => {
          return apiRequest("POST", `/api/clients/${clientId}/budget-items`, {
            ...item,
            budgetSettingsId: newSettings.id
          });
        });
        
        // Wait for all items to be created
        Promise.all(createPromises)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "budget-items"] });
            toast({
              title: "Budget Plan Created",
              description: "Budget plan and items created successfully",
            });
            onSuccess();
          })
          .catch(error => {
            console.error("Error creating budget items:", error);
            toast({
              title: "Warning",
              description: "Budget plan created but some items failed to save",
              variant: "destructive",
            });
            onSuccess();
          });
      } else {
        // No items to create
        toast({
          title: "Budget Plan Created",
          description: "Budget plan created successfully",
        });
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Error saving budget settings:", error);
      toast({
        title: "Error",
        description: "Failed to create budget plan",
        variant: "destructive",
      });
    }
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
  
  // Helper function to select a catalog item and add it directly to the budget items
  const selectCatalogItem = (item: BudgetItemCatalog) => {
    // Create a new budget item from the catalog item
    const newItem: BudgetItem = {
      id: -1 * Date.now(), // Temporary ID
      itemCode: item.itemCode,
      description: item.description,
      unitPrice: item.defaultUnitPrice,
      quantity: 1,
      clientId: clientId,
      budgetSettingsId: -1, // Temporary, will be replaced when budget settings are created
      name: item.description,
      category: item.category || null
    };

    // Add to list of budget items
    setBudgetItems(prev => [...prev, newItem]);
    setShowItemForm(false);
    
    toast({
      title: "Item Added",
      description: `Added ${item.itemCode} to budget plan`,
    });
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
  
  // Handle removing a budget item
  const handleRemoveBudgetItem = (index: number) => {
    setBudgetItems(prev => prev.filter((_, i) => i !== index));
    
    toast({
      title: "Item Removed",
      description: "Item removed from budget plan",
    });
  };
  
  // Handle submitting the form to create the budget plan
  const handleCreatePlan = () => {
    // Validate the form
    settingsForm.trigger().then(isValid => {
      if (isValid) {
        // Show confirmation dialog if plan will be set as active
        if (settingsForm.getValues().isActive && activePlan) {
          setShowConfirmation(true);
        } else {
          // No confirmation needed, create directly
          saveBudgetSettings.mutate(settingsForm.getValues());
        }
      } else {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form before saving",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Catalog Item Dialog */}
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
                      <FormLabel>Item Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., THERAPY-001" {...field} />
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
                      <FormLabel>Default Unit Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Description of the service or item" {...field} />
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
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Therapy, Assessment, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={catalogItemForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
                    <div className="space-y-1">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Make this item available for selection in budgets
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
              <DialogFooter>
                <Button type="submit" disabled={createCatalogItem.isPending}>
                  {createCatalogItem.isPending ? "Adding..." : "Add Catalog Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Item Catalog Selection Dialog */}
      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
            <DialogDescription>
              Select an item from the catalog to add to this budget plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search and filter controls */}
            <div className="flex space-x-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  className="pl-8"
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
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Catalog items */}
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredCatalogItems.length > 0 ? (
                filteredCatalogItems.map((item) => (
                  <Card key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectCatalogItem(item)}>
                    <CardContent className="p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{item.itemCode}</div>
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                        {item.category && (
                          <Badge variant="outline" className="mt-1">
                            <Tag className="h-3 w-3 mr-1" /> {item.category}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.defaultUnitPrice)}</div>
                        <div className="text-xs text-muted-foreground">per unit</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No matching items found.</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => setShowCatalogItemForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Catalog Item
              </Button>
              <Button variant="ghost" onClick={() => setShowItemForm(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog for Setting as Active Plan */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set as Active Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the current active plan "{activePlan?.planSerialNumber || activePlan?.planCode}". 
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveBudgetSettings.mutate(settingsForm.getValues())}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main content */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Create Budget Plan</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreatePlan} disabled={saveBudgetSettings.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveBudgetSettings.isPending ? "Creating..." : "Create Plan"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Plan Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Plan Information</CardTitle>
              <CardDescription>Define the basic plan information and funding details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...settingsForm}>
                <div className="space-y-4">
                  <FormField
                    control={settingsForm.control}
                    name="planSerialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Serial Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          A unique identifier for this plan
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="planCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., NDIS-2024" {...field} />
                        </FormControl>
                        <FormDescription>
                          A code to identify this plan type
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="availableFunds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Funds</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Total funds available for this plan
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="endOfPlan"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Plan End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                onClick={() => setIsPickingDate(true)}
                                onBlur={() => setIsPickingDate(false)}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : undefined);
                                setDate(date);
                                setIsPickingDate(false);
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          When this plan expires
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Set as Active Plan</FormLabel>
                          <FormDescription>
                            {activePlan 
                              ? "This will replace the current active plan" 
                              : "This will be the active plan for sessions"}
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
                </div>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Middle column - Items */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Budget Items</CardTitle>
              <CardDescription>Add services and products to this budget plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowItemForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Budget Item
              </Button>
              
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {budgetItems.length > 0 ? (
                  budgetItems.map((item, index) => (
                    <Card key={index} className="border-muted">
                      <CardContent className="p-3 flex justify-between items-start">
                        <div>
                          <div className="font-medium">{item.itemCode}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                          <div className="mt-1 text-sm">
                            {item.quantity} x {formatCurrency(item.unitPrice)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 mt-1 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveBudgetItem(index)}
                          >
                            <Trash className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-md">
                    <p>No budget items added yet.</p>
                    <p className="text-sm">Click 'Add Budget Item' to add items from the catalog.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Budget Summary</CardTitle>
              <CardDescription>Overview of the budget allocation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Funds:</span>
                  <span className="font-medium">{formatCurrency(availableFunds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allocated:</span>
                  <span className="font-medium">{formatCurrency(totalBudget)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className={cn(
                    "font-medium",
                    hasBudgetSurplus ? "text-green-600" : "text-red-600"
                  )}>
                    {hasBudgetSurplus ? "Remaining:" : "Shortfall:"}
                  </span>
                  <span className={cn(
                    "font-bold",
                    hasBudgetSurplus ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(Math.abs(budgetDifference))}
                  </span>
                </div>
              </div>
              
              {!hasBudgetSurplus && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Warning: Budget allocation exceeds available funds by {formatCurrency(Math.abs(budgetDifference))}.
                  </AlertDescription>
                </Alert>
              )}
              
              {daysLeft !== null && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan Duration:</span>
                    <span className="font-medium">{daysLeft} days remaining</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="default" 
                className="w-full mb-2"
                onClick={handleCreatePlan}
                disabled={saveBudgetSettings.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveBudgetSettings.isPending ? "Creating..." : "Create Budget Plan"}
              </Button>
              <Button variant="outline" className="w-full" onClick={onCancel}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}