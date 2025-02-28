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
    <div className="space-y-6">
      
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