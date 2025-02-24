import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBudgetItemSchema } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Calculator, DollarSign, Plus } from "lucide-react";

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
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Budget Items</h3>
          <div className="flex items-center gap-2 text-lg font-medium">
            <DollarSign className="w-5 h-5" />
            Total: ${totalBudget.toFixed(2)}
          </div>
        </div>

        <div className="space-y-4">
          {budgetItems.map((item: any) => (
            <Card key={item.id}>
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createBudgetItem.mutate(data))}>
          <FormField
            control={form.control}
            name="itemCode"
            render={({ field }) => (
              <FormItem className="mb-4">
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
              <FormItem className="mb-4">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                      step="0.01" 
                      min="0"
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
            className="w-full mt-4"
            disabled={createBudgetItem.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Budget Item
          </Button>
        </form>
      </Form>

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
