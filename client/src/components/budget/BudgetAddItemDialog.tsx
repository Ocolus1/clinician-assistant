import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { budgetItemSchema } from "./BudgetFormSchema";
import type { BudgetSettings, BudgetItemCatalog } from "@shared/schema";
import type { BudgetItemFormValues } from "./BudgetFormSchema";

interface BudgetAddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BudgetItemFormValues) => void;
  catalogItems: BudgetItemCatalog[];
  budgetSettings: BudgetSettings;
}

export function BudgetAddItemDialog({
  open,
  onOpenChange,
  onSubmit,
  catalogItems,
  budgetSettings
}: BudgetAddItemDialogProps) {
  const { toast } = useToast();
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<BudgetItemCatalog | null>(null);
  
  // Initialize the form
  const form = useForm<BudgetItemFormValues>({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      unitPrice: 0,
      quantity: 1,
      budgetSettingsId: budgetSettings.id
    }
  });
  
  // Handle selection of a catalog item
  const handleSelectCatalogItem = (itemCode: string) => {
    const item = catalogItems.find(item => item.itemCode === itemCode);
    if (item) {
      setSelectedCatalogItem(item);
      
      // Update form values
      form.setValue("itemCode", item.itemCode);
      form.setValue("description", item.description);
      form.setValue("unitPrice", item.defaultUnitPrice);
    }
  };
  
  // Handle form submission
  const handleFormSubmit = (data: BudgetItemFormValues) => {
    onSubmit(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Budget Item</DialogTitle>
          <DialogDescription>
            Add a budget item to {budgetSettings.planCode || `Plan #${budgetSettings.id}`}.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Catalog Item Selection */}
              <div className="space-y-2">
                <FormLabel>Select from Catalog</FormLabel>
                <Select
                  onValueChange={handleSelectCatalogItem}
                  value={selectedCatalogItem?.itemCode || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a catalog item" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogItems.map((item) => (
                      <SelectItem key={item.id} value={item.itemCode}>
                        {item.itemCode} - {item.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Item Code */}
              <FormField
                control={form.control}
                name="itemCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter item code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Enter item description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                {/* Unit Price */}
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00" 
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="1" 
                          step="1" 
                          placeholder="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Item</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}