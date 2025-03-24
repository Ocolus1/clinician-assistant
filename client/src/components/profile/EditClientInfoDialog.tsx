import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Client, FUNDS_MANAGEMENT_OPTIONS } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

// Create a form schema for client personal information
// Note: name is included but will be made read-only in the form
const editClientSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
  fundsManagement: z.string().optional(),
});

type EditClientFormValues = z.infer<typeof editClientSchema>;

interface EditClientInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

export function EditClientInfoDialog({ open, onOpenChange, client }: EditClientInfoDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format date for the form input - handle string or Date object
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd");
    } catch (e) {
      console.error("Error formatting date for input:", e);
      return "";
    }
  };

  // Initialize form with client data
  const form = useForm<EditClientFormValues>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      name: client.name,
      dateOfBirth: formatDateForInput(client.dateOfBirth),
      fundsManagement: client.fundsManagement || undefined,
    },
  });

  // Mutation for updating client
  const updateClient = useMutation({
    mutationFn: async (data: EditClientFormValues) => {
      return apiRequest("PUT", `/api/clients/${client.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Client information updated successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', client.id] });
      onOpenChange(false);
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error("Error updating client:", error);
      toast({
        title: "Error",
        description: "Failed to update client information. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: EditClientFormValues) => {
    setIsSubmitting(true);
    // Ensure we preserve the original client name (with uniqueIdentifier) 
    // by explicitly setting it to the original value
    updateClient.mutate({
      ...data,
      name: client.name // Always use the original name for HIPAA compliance
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Client Information</DialogTitle>
          <DialogDescription>
            Update personal details for {client.name}. The client ID cannot be changed for compliance reasons.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Client name" 
                      value={field.value}
                      readOnly={true}
                      disabled={true}
                      className="bg-muted/40 cursor-not-allowed"
                      aria-readonly="true"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Client ID cannot be changed for HIPAA compliance
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      placeholder="Date of birth" 
                      onChange={field.onChange}
                      value={field.value} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fundsManagement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funds Management</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select funds management option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FUNDS_MANAGEMENT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}