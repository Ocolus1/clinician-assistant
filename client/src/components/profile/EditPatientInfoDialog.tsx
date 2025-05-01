import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Patient, FUNDS_MANAGEMENT_OPTIONS } from "@shared/schema";
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

// Create a form schema for patient personal information
// Note: name is included but will be made read-only in the form
const editPatientSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
  fundsManagement: z.string().optional(),
});

type EditPatientFormValues = z.infer<typeof editPatientSchema>;

interface EditPatientInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
}

export function EditPatientInfoDialog({ open, onOpenChange, patient }: EditPatientInfoDialogProps) {
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

  // Initialize form with patient data
  const form = useForm<EditPatientFormValues>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {
      name: patient.name,
      dateOfBirth: formatDateForInput(patient.dateOfBirth),
      fundsManagement: patient.fundsManagement || undefined,
    },
  });

  // Mutation for updating patient
  const updatePatient = useMutation({
    mutationFn: async (data: EditPatientFormValues) => {
      return apiRequest("PUT", `/api/patients/${patient.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Patient information updated successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id] });
      onOpenChange(false);
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error("Error updating patient:", error);
      toast({
        title: "Error",
        description: "Failed to update patient information. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: EditPatientFormValues) => {
    setIsSubmitting(true);
    // Ensure we preserve the original patient name (with uniqueIdentifier) 
    // by explicitly setting it to the original value
    updatePatient.mutate({
      ...data,
      name: patient.name // Always use the original name for HIPAA compliance
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Patient Information</DialogTitle>
          <DialogDescription>
            Update personal details for {patient.name}. The patient ID cannot be changed for compliance reasons.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Patient name" 
                      value={field.value}
                      readOnly={true}
                      disabled={true}
                      className="bg-muted/40 cursor-not-allowed"
                      aria-readonly="true"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Patient ID cannot be changed for HIPAA compliance
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
