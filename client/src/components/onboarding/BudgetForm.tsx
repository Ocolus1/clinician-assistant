import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Calculator, Trash, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { 
  insertBudgetItemSchema, 
  insertBudgetSettingsSchema, 
  type InsertBudgetItem, 
  type BudgetItem, 
  type BudgetSettings, 
  type InsertBudgetSettings 
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

  return (
    <div className="space-y-4">
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Budget Settings</h3>
        <Card>
          <CardContent className="p-4">
            <Form {...settingsForm}>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={settingsForm.control}
                    name="availableFunds"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Available Funds ($)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="pl-6 h-10"
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
                    control={settingsForm.control}
                    name="endOfPlan"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End of Plan Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Budget Analysis Section */}
                <div className="mt-4 space-y-2">
                  <div className={`p-3 rounded-md ${hasBudgetSurplus ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">
                          Budget {hasBudgetSurplus ? 'Surplus' : 'Deficit'}:
                        </span>
                        <span className={`ml-2 font-bold ${hasBudgetSurplus ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(budgetDifference))}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Total Budget:</span>
                        <span className="ml-2">{formatCurrency(totalBudget)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {daysLeft !== null && (
                    <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="font-medium">Days Left in Plan:</span>
                        <span className="ml-2 font-bold text-blue-700">{daysLeft}</span>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Add New Item</h3>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit((data) => createBudgetItem.mutate(data))} className="space-y-3">
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-3">
                  <FormField
                    control={itemForm.control}
                    name="itemCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
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
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="pl-6"
                              {...field}
                              // Convert string to number on change
                              onChange={(e) => {
                                // Explicitly convert to number using parseFloat for decimal values
                                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                              // Ensure value is displayed correctly
                              value={field.value}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
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
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            // Convert string to number on change
                            onChange={(e) => {
                              // Explicitly convert to number using parseInt
                              const value = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                              field.onChange(value);
                            }}
                            // Ensure value is displayed correctly 
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    type="submit"
                    className="w-full"
                    variant="secondary"
                    disabled={createBudgetItem.isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Budget Items</h3>
          <Card>
            <CardContent className="p-4">
              {budgetItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No budget items added yet
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 text-sm text-muted-foreground border-b pb-2">
                    <div className="col-span-3">Item Code</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {budgetItems.map((item: BudgetItem) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-center hover:bg-muted/30 rounded-md p-2 transition-colors">
                      <div className="col-span-3 font-medium">{item.itemCode}</div>
                      <div className="col-span-3 text-sm text-muted-foreground">{item.description}</div>
                      <div className="col-span-2 text-right">{formatCurrency(item.unitPrice)}</div>
                      <div className="col-span-1 text-center">{item.quantity}</div>
                      <div className="col-span-2 text-right font-medium">{formatCurrency(item.unitPrice * item.quantity)}</div>
                      <div className="col-span-1 flex justify-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
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
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <Button
          type="button"
          variant="outline"
          className="w-1/3"
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button
          type="button"
          className="w-2/3"
          onClick={handleComplete}
          variant="default"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Complete & View Summary
        </Button>
      </div>
    </div>
  );
}