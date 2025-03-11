import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { insertBudgetItemSchema, BudgetItemCatalog, InsertBudgetItem } from "@shared/schema";
import { Search, Plus, Loader2 } from "lucide-react";

interface BudgetItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  budgetSettingsId: number;
  onSuccess?: () => void;
}

// Extend the schema to add validation messages
const budgetItemFormSchema = insertBudgetItemSchema.extend({
  itemCode: z.string().min(1, { message: "Item code is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  unitPrice: z.coerce.number().min(0.01, { message: "Unit price must be greater than 0" }),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1" }),
  category: z.string().optional(),
  name: z.string().optional(),
});

type BudgetItemFormValues = z.infer<typeof budgetItemFormSchema>;

/**
 * A form component for creating and editing budget items
 */
export function BudgetItemForm({ 
  open, 
  onOpenChange, 
  clientId, 
  budgetSettingsId,
  onSuccess 
}: BudgetItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<BudgetItemCatalog | null>(null);
  
  // Form setup
  const form = useForm<BudgetItemFormValues>({
    resolver: zodResolver(budgetItemFormSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      unitPrice: 0,
      quantity: 1,
      category: "",
      name: "",
    },
  });
  
  // Fetch budget item catalog
  const { data: catalogItems = [], isLoading: isLoadingCatalog } = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/budget-catalog');
      if (!response.ok) {
        throw new Error('Failed to load budget catalog');
      }
      return response.json();
    },
  });
  
  // Create budget item mutation
  const createBudgetItem = useMutation({
    mutationFn: async (data: BudgetItemFormValues) => {
      const response = await apiRequest('POST', `/api/clients/${clientId}/budget-items`, {
        ...data,
        budgetSettingsId
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create budget item');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      
      // Show success toast
      toast({
        title: "Budget item created",
        description: "The budget item was successfully added to the plan.",
      });
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error('Error creating budget item:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create budget item",
        variant: "destructive",
      });
    },
  });
  
  // Filter catalog items based on search term
  const filteredCatalogItems = searchTerm.trim() ? 
    catalogItems.filter(item => 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    ) : 
    catalogItems;
  
  // Update form when catalog item is selected
  useEffect(() => {
    if (selectedCatalogItem) {
      form.setValue("itemCode", selectedCatalogItem.itemCode);
      form.setValue("description", selectedCatalogItem.description);
      form.setValue("unitPrice", selectedCatalogItem.defaultUnitPrice);
      form.setValue("category", selectedCatalogItem.category || "");
    }
  }, [selectedCatalogItem, form]);
  
  // Handle form submission
  const onSubmit = (data: BudgetItemFormValues) => {
    createBudgetItem.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Budget Item</DialogTitle>
          <DialogDescription>
            Add a new item to the budget plan. You can select from the catalog or create a custom item.
          </DialogDescription>
        </DialogHeader>
        
        {/* Catalog item selection */}
        <div className="mb-4">
          <FormLabel className="text-sm font-medium">Select from catalog</FormLabel>
          <div className="flex items-center mt-1.5 mb-3 relative">
            <Input
              placeholder="Search by name, code or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
            {isLoadingCatalog ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading catalog items...</span>
              </div>
            ) : filteredCatalogItems.length > 0 ? (
              <div className="divide-y">
                {filteredCatalogItems.map((item) => (
                  <button
                    key={item.id}
                    type="button" 
                    className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors ${
                      selectedCatalogItem?.id === item.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => setSelectedCatalogItem(item)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-muted-foreground">{item.itemCode}</div>
                      </div>
                      <div className="text-sm font-medium">${item.defaultUnitPrice.toFixed(2)}</div>
                    </div>
                    {item.category && (
                      <div className="mt-1">
                        <span className="inline-flex text-xs bg-muted px-1.5 py-0.5 rounded-sm">
                          {item.category}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchTerm ? 'No matching items found' : 'No catalog items available'}
              </div>
            )}
          </div>
        </div>
        
        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Code <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter item code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter item description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1" 
                        step="1"
                        placeholder="1" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional category" />
                  </FormControl>
                  <FormDescription>
                    Categorize the item for better organization (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createBudgetItem.isPending}
              >
                {createBudgetItem.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Budget Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}