import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { CalendarIcon, Edit, Save, X } from 'lucide-react';
import type { BudgetSettings, BudgetItem, BudgetItemCatalog } from '@shared/schema';
import { 
  Form,
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface BudgetPlanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BudgetSettings;
  budgetItems: BudgetItem[];
  catalogItems?: BudgetItemCatalog[];
  onUpdateItem?: (item: BudgetItem) => Promise<void>;
}

// Schema for budget item edits
const budgetItemEditSchema = z.object({
  quantity: z.number().min(0, "Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  description: z.string().min(1, "Description is required"),
});

type BudgetItemFormValues = z.infer<typeof budgetItemEditSchema>;

export function BudgetPlanDetailsDialog({
  open,
  onOpenChange,
  settings,
  budgetItems,
  catalogItems = [],
  onUpdateItem
}: BudgetPlanDetailsDialogProps) {
  // State for editing mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Setup form for item editing
  const form = useForm<BudgetItemFormValues>({
    resolver: zodResolver(budgetItemEditSchema),
    defaultValues: {
      quantity: 0,
      unitPrice: 0,
      description: '',
    },
  });

  // Calculate total budget amount
  const totalBudget = budgetItems.reduce((acc, item) => {
    return acc + (item.quantity * item.unitPrice);
  }, 0);

  // Get formatted end date
  const endDate = settings.endOfPlan ? new Date(settings.endOfPlan) : null;
  const formattedEndDate = endDate ? endDate.toLocaleDateString() : 'No end date';

  // Get catalog descriptions for budget items (if available)
  const getItemDescription = (item: BudgetItem) => {
    if (item.description) return item.description;
    
    const catalogItem = catalogItems.find(catalog => catalog.itemCode === item.itemCode);
    return catalogItem?.description || 'No description available';
  };
  
  // Handle clicking on a budget item
  const handleSelectItem = (item: BudgetItem) => {
    if (!isEditMode) return;
    
    setSelectedItem(item);
    form.reset({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      // Ensure the description is always a string
      description: item.description || getItemDescription(item) || "No description provided",
    });
  };
  
  // Handle form submission
  const onSubmit = async (data: BudgetItemFormValues) => {
    if (!selectedItem || !onUpdateItem) return;
    
    try {
      setIsUpdating(true);
      
      // Prepare updated item
      const updatedItem: BudgetItem = {
        ...selectedItem,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        // Description is required in schema, so provide a fallback string instead of null
        description: data.description || selectedItem.description || "No description provided",
      };
      
      // Call update handler
      await onUpdateItem(updatedItem);
      
      // Reset selected item
      setSelectedItem(null);
    } catch (error) {
      console.error("Error updating budget item:", error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle toggling edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      setSelectedItem(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isEditMode ? 'sm:max-w-[900px]' : 'sm:max-w-[700px]'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl">
                {settings.planCode ? settings.planCode : 'Budget Plan Details'}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Edit budget items by selecting them from the list' : 'Detailed view of budget plan and associated items'}
              </DialogDescription>
            </div>
            <Button 
              variant={isEditMode ? "destructive" : "default"} 
              size="sm" 
              onClick={toggleEditMode}
            >
              {isEditMode ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel Editing
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Items
                </>
              )}
            </Button>
          </div>
        </DialogHeader>
        
        <div className={`${isEditMode ? 'grid grid-cols-[1fr_300px] gap-4' : ''} my-4`}>
          <div className="space-y-6">
            {/* Plan Overview Section */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Plan Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
                  <p className="text-base">{settings.planSerialNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-base">{settings.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                  <p className="text-base font-semibold">{formatCurrency(totalBudget)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="text-base flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formattedEndDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Budget Items Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Budget Items</h3>
              {budgetItems.length === 0 ? (
                <p className="text-muted-foreground">No budget items found for this plan.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {budgetItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`overflow-hidden cursor-pointer ${isEditMode ? 'hover:border-primary transition-colors' : ''} ${selectedItem?.id === item.id ? 'border-primary' : ''}`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">{item.itemCode}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-2">
                        <p className="text-sm">{getItemDescription(item)}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Unit Price</p>
                            <p className="font-medium">{formatCurrency(item.unitPrice)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Quantity</p>
                            <p className="font-medium">{item.quantity}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Edit sidebar - only visible in edit mode */}
          {isEditMode && (
            <div className="border rounded-md p-4 space-y-4 h-fit sticky top-0">
              <h3 className="font-medium">Edit Budget Item</h3>
              <Separator />
              
              {selectedItem ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            />
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-2">
                      <Button type="submit" className="w-full" disabled={isUpdating}>
                        <Save className="mr-2 h-4 w-4" />
                        {isUpdating ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  Select a budget item from the list to edit its details
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsEditMode(false);
              setSelectedItem(null);
              onOpenChange(false);
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}