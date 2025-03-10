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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
  SearchIcon,
  Plus,
  CheckCircle,
  PackageOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
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
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<BudgetItemCatalog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
    // We don't send selected products in this initial form
    // Products will be added after the plan is created
    onSubmit(values);
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

  // Add a catalog item to the selected items
  const addCatalogItem = (item: BudgetItemCatalog) => {
    if (!selectedCatalogItems.some(existingItem => existingItem.id === item.id)) {
      setSelectedCatalogItems([...selectedCatalogItems, item]);
    }
  };

  // Remove a catalog item from selected items
  const removeCatalogItem = (itemId: number) => {
    setSelectedCatalogItems(selectedCatalogItems.filter(item => item.id !== itemId));
  };

  // Calculate total budget from selected items
  const calculateTotalBudget = () => {
    return selectedCatalogItems.reduce((total, item) => {
      return total + item.defaultUnitPrice;
    }, 0);
  };

  // Update available funds when selected items change
  useEffect(() => {
    const total = calculateTotalBudget();
    if (total > 0) {
      form.setValue("availableFunds", total);
    }
  }, [selectedCatalogItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                </div>
                
                <FormField
                  control={form.control}
                  name="endOfPlan"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-2">
                      <FormLabel className="text-sm font-medium flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        End of Plan Date
                      </FormLabel>
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1">
                          <FormControl>
                            <Popover onOpenChange={(open) => {
                              // Set the isPickingDate flag when opening the date picker
                              if (open) {
                                setIsPickingDate(true);
                              } else {
                                // Reset the flag after a delay when closing
                                setTimeout(() => {
                                  setIsPickingDate(false);
                                }, 300);
                              }
                            }}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal border-gray-300",
                                    !date && "text-muted-foreground"
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
                                  onSelect={(newDate) => {
                                    if (newDate) {
                                      setDate(newDate);
                                      field.onChange(newDate);
                                    } else {
                                      setDate(undefined);
                                      field.onChange(undefined);
                                    }
                                  }}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Product selection section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <PackageOpen className="h-3.5 w-3.5" />
                      Budget Products
                    </h4>
                  </div>

                  {/* Search and filter controls */}
                  <div className="flex flex-col md:flex-row gap-2 mb-3">
                    <div className="relative flex-grow">
                      <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 border-gray-300"
                      />
                    </div>
                    <Select
                      value={selectedCategory || ""}
                      onValueChange={(value) => setSelectedCategory(value || null)}
                    >
                      <SelectTrigger className="w-full md:w-[180px] border-gray-300">
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

                  {/* Product selection grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto mb-3 p-2 border border-gray-200 rounded-md">
                    {filteredCatalogItems.length === 0 ? (
                      <div className="col-span-2 text-center text-gray-500 py-4">
                        No products found. Try adjusting your search.
                      </div>
                    ) : (
                      filteredCatalogItems.map((item) => {
                        const isSelected = selectedCatalogItems.some(
                          (selected) => selected.id === item.id
                        );
                        return (
                          <div
                            key={item.id}
                            className={`flex justify-between items-center p-2 rounded border ${
                              isSelected
                                ? "border-primary/40 bg-primary/5"
                                : "border-gray-200 hover:border-gray-300"
                            } cursor-pointer transition-colors`}
                            onClick={() => {
                              if (isSelected) {
                                removeCatalogItem(item.id);
                              } else {
                                addCatalogItem(item);
                              }
                            }}
                          >
                            <div className="flex-1 mr-2">
                              <div className="font-medium text-sm">{item.itemCode}</div>
                              <div className="text-xs text-gray-600 truncate">
                                {item.description}
                              </div>
                              <div className="text-xs mt-1">
                                {formatCurrency(item.defaultUnitPrice)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 ${
                                isSelected ? "text-primary" : "text-gray-400"
                              }`}
                              type="button"
                            >
                              {isSelected ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Selected products summary */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="text-sm font-medium">Selected Products</h5>
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedCatalogItems.length} items
                      </Badge>
                    </div>
                    {selectedCatalogItems.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No products selected. Select products from the list above.
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                        {selectedCatalogItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center text-sm py-1"
                          >
                            <div className="truncate mr-2">{item.description}</div>
                            <div className="font-medium">
                              {formatCurrency(item.defaultUnitPrice)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                      <div className="font-medium text-sm">Total Budget</div>
                      <div className="font-bold text-primary">
                        {formatCurrency(calculateTotalBudget())}
                      </div>
                    </div>
                  </div>
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
    </Dialog>
  );
}