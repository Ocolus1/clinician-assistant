import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Form schema
const budgetPlanSchema = z.object({
  planCode: z.string().min(1, 'Plan code is required'),
  availableFunds: z.coerce.number().min(1, 'Available funds must be greater than 0'),
});

type BudgetPlanFormValues = z.infer<typeof budgetPlanSchema>;

interface BudgetPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
}

export function BudgetPlanForm({ open, onOpenChange, clientId }: BudgetPlanFormProps) {
  const { toast } = useToast();
  
  // Set up the form
  const form = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      planCode: '',
      availableFunds: 0,
    },
  });
  
  // Set up the mutation
  const createBudgetPlan = useMutation({
    mutationFn: async (values: BudgetPlanFormValues) => {
      return apiRequest('POST', `/api/clients/${clientId}/budget-settings`, {
        ...values,
        clientId,
        isActive: true, // Make this the active plan
      });
    },
    onSuccess: () => {
      // Reset the form
      form.reset();
      
      // Close the dialog
      onOpenChange(false);
      
      // Invalidate budget settings queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-settings'] });
      
      // Show success toast
      toast({
        title: 'Budget plan created',
        description: 'Your budget plan has been created successfully.',
      });
    },
    onError: (error: any) => {
      console.error('Error creating budget plan:', error);
      
      // Show error toast
      toast({
        title: 'Error creating budget plan',
        description: error.message || 'An error occurred while creating the budget plan.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: BudgetPlanFormValues) => {
    createBudgetPlan.mutate(values);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Budget Plan</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="planCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., NDIS-2024" {...field} />
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
                  <FormLabel>Available Funds</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      {...field}
                    />
                  </FormControl>
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
                disabled={createBudgetPlan.isPending}
              >
                {createBudgetPlan.isPending ? 'Creating...' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}