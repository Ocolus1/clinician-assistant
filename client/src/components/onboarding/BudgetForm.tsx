
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DollarSign, Plus, Calculator } from "lucide-react";
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
import { insertBudgetItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface BudgetFormProps {
  clientId: number;
  onComplete: () => void;
}

export default function BudgetForm({ clientId, onComplete }: BudgetFormProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertBudgetItemSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      unitPrice: 0,
      quantity: 1,
    },
  });

  const { data: budgetItems = [] } = useQuery({
    queryKey: ["/api/clients", clientId, "budget-items"],
  });

  const createBudgetItem = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/budget-items`, data);
      return res.json();
    },
    onSuccess: () => {
      form.reset();
      toast({
        title: "Success",
        description: "Budget item added successfully",
      });
    },
  });

  const totalBudget = budgetItems.reduce((acc: number, item: any) => {
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

      <div className="flex gap-8">
        <div className="w-1/2">
          <h3 className="text-lg font-semibold mb-3">Add New Item</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createBudgetItem.mutate(data))} className="space-y-3">
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
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
                      <FormLabel>Unit Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number" 
                          min="0"
                          step="0.01"
                          {...field}
                          value={field.value === null ? '' : field.value}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            if (!isNaN(value)) {
                              field.onChange(value);
                            }
                          }}
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
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={createBudgetItem.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Budget Item
              </Button>
            </form>
          </Form>
        </div>

        <div className="w-1/2">
          <h3 className="text-lg font-semibold mb-3">Budget Items</h3>
          <div className="space-y-3">
            {budgetItems.map((item: any) => (
              <Card key={item.id} className="bg-background">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{item.itemCode}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.unitPrice.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
