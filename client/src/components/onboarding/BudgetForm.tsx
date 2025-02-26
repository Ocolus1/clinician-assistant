import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Calculator, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertBudgetItemSchema, type InsertBudgetItem, type BudgetItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface BudgetFormProps {
  clientId: number;
  onComplete: () => void;
}

export default function BudgetForm({ clientId, onComplete }: BudgetFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertBudgetItem>({
    resolver: zodResolver(insertBudgetItemSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      unitPrice: 0,
      quantity: 1,
    },
  });

  // Explicitly type and fetch budget items to ensure correct data retrieval
  const { data: budgetItems = [] } = useQuery<BudgetItem[]>({
    queryKey: ["/api/clients", clientId, "budget-items"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/clients/${clientId}/budget-items`);
      return res.json();
    },
  });

  const createBudgetItem = useMutation({
    mutationFn: async (data: InsertBudgetItem) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/budget-items`, data);
      return res.json();
    },
    onSuccess: () => {
      form.reset();
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
      const res = await apiRequest("DELETE", `/api/clients/${clientId}/budget-items/${id}`);
      return res.json();
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
        description: "Failed to delete budget item.",
        variant: "destructive",
      });
    },
  });


  const totalBudget = budgetItems.reduce((acc: number, item: BudgetItem) => {
    return acc + (item.unitPrice * item.quantity);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 mb-4">
        <div className="bg-card rounded-lg p-3 border flex-shrink-0">
          <div className="text-sm text-muted-foreground">Total Items</div>
          <div className="text-xl font-semibold">{budgetItems.length}</div>
        </div>
        <div className="bg-card rounded-lg p-3 border flex-shrink-0">
          <div className="text-sm text-muted-foreground">Total Budget</div>
          <div className="text-xl font-semibold">${totalBudget.toFixed(2)}</div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Add New Item</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createBudgetItem.mutate(data))} className="space-y-3">
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-3">
                  <FormField
                    control={form.control}
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
                </div>

                <div className="col-span-2">
                  <FormField
                    control={form.control}
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
                                field.onChange(e.target.value === '' ? 0 : e.target.value);
                              }}
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
                    control={form.control}
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
                              field.onChange(e.target.value === '' ? 1 : e.target.value);
                            }}
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
                  <div className="grid grid-cols-13 gap-4 text-sm text-muted-foreground border-b pb-2">
                    <div className="col-span-3">Item Code</div>
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {budgetItems.map((item: BudgetItem) => (
                    <div key={item.id} className="grid grid-cols-13 gap-4 items-center hover:bg-muted/30 rounded-md p-2 transition-colors">
                      <div className="col-span-3 font-medium">{item.itemCode}</div>
                      <div className="col-span-4 text-sm text-muted-foreground">{item.description}</div>
                      <div className="col-span-2 text-right">${item.unitPrice.toFixed(2)}</div>
                      <div className="col-span-1 text-center">{item.quantity}</div>
                      <div className="col-span-2 text-right">${(item.unitPrice * item.quantity).toFixed(2)}</div>
                      <div className="col-span-1 flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteBudgetItem.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-12 gap-4 border-t pt-2 mt-4">
                    <div className="col-span-10 text-right font-bold">Total Budget:</div>
                    <div className="col-span-2 text-right font-bold">${totalBudget.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Button
        className="w-full"
        onClick={onComplete}
        variant="default"
      >
        <Calculator className="w-4 h-4 mr-2" />
        Complete & View Summary
      </Button>
    </div>
  );
}