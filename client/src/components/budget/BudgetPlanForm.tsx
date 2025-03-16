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
  onSuccess?: () => void;
}

export function BudgetPlanForm({ open, onOpenChange, clientId, onSuccess }: BudgetPlanFormProps) {
  const { toast } = useToast();
  
  // Form
  const form = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      planCode: '',
      availableFunds: 375, // Default budget amount
    }
  });
  
  // Mutation for creating a budget plan
  const createPlanMutation = useMutation({
    mutationFn: (data: BudgetPlanFormValues) => {
      // Use correct budget-settings endpoint instead of budget/plans
      return apiRequest('POST', `/api/clients/${clientId}/budget-settings`, {
        ...data,
        clientId,
        isActive: true,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Budget plan created successfully',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/budget-settings`] });
      form.reset();
      onOpenChange(false);
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create budget plan. Please try again.',
        variant: 'destructive',
      });
      console.error('Failed to create budget plan:', error);
    }
  });
  
  // Submit handler
  const onSubmit = (data: BudgetPlanFormValues) => {
    createPlanMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Budget Plan</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="planCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter plan code or reference" />
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
                      {...field} 
                      type="number" 
                      min={1}
                      step={0.01}
                      placeholder="Enter available funds" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={createPlanMutation.isPending}
              >
                {createPlanMutation.isPending ? 'Creating...' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}