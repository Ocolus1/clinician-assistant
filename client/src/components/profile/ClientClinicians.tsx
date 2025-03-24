import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Edit } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CLINICIAN_ROLES } from "@shared/schema";

// Define schema for adding a clinician assignment
const clinicianAssignmentSchema = z.object({
  clinicianId: z.string().min(1, { message: "Clinician is required" }),
  role: z.string().min(1, { message: "Role is required" }),
  notes: z.string().optional(),
});

type ClinicianAssignmentFormValues = z.infer<typeof clinicianAssignmentSchema>;

interface ClientCliniciansProps {
  clientId: number;
}

export default function ClientClinicians({ clientId }: ClientCliniciansProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Get all clinicians for selection
  const { data: allClinicians = [] } = useQuery({
    queryKey: ['/api/clinicians'],
    queryFn: async () => {
      const response = await fetch('/api/clinicians');
      if (!response.ok) {
        throw new Error('Failed to fetch clinicians');
      }
      return response.json();
    },
  });

  // Get clinicians assigned to this client
  const { data: assignedClinicians = [], isLoading } = useQuery({
    queryKey: ['/api/clients', clientId, 'clinicians'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/clinicians`);
      if (!response.ok) {
        throw new Error('Failed to fetch assigned clinicians');
      }
      return response.json();
    },
    enabled: !!clientId,
  });

  // Mutation to assign a clinician to the client
  const assignClinician = useMutation({
    mutationFn: async (data: ClinicianAssignmentFormValues) => {
      return apiRequest('POST', `/api/clients/${clientId}/clinicians`, {
        clientId: clientId,
        clinicianId: parseInt(data.clinicianId),
        role: data.role,
        notes: data.notes || '',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Clinician assigned successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'clinicians'] });
      form.reset();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error assigning clinician:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign clinician. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to unassign a clinician
  const removeClinician = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest('DELETE', `/api/client-clinicians/${assignmentId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Clinician removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'clinicians'] });
    },
    onError: (error) => {
      console.error('Error removing clinician:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove clinician. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Form setup for adding a clinician
  const form = useForm<ClinicianAssignmentFormValues>({
    resolver: zodResolver(clinicianAssignmentSchema),
    defaultValues: {
      clinicianId: '',
      role: '',
      notes: '',
    },
  });

  function onSubmit(data: ClinicianAssignmentFormValues) {
    assignClinician.mutate(data);
  }

  // Get filtered list of unassigned clinicians
  const availableClinicians = allClinicians.filter((clinician: any) => {
    return !assignedClinicians.some((assignment: any) => assignment.clinician.id === clinician.id);
  });

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Assigned Clinicians</h3>
        <Button
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
          disabled={availableClinicians.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Assign Clinician
        </Button>
      </div>

      {isLoading ? (
        <p>Loading clinicians...</p>
      ) : assignedClinicians.length === 0 ? (
        <Card>
          <CardContent className="py-4 text-center text-muted-foreground">
            No clinicians assigned to this client yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {assignedClinicians.map((assignment: any) => (
            <Card key={assignment.id} className="shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center">
                  <CardTitle className="text-base">{assignment.clinician.name}</CardTitle>
                  <Badge variant="outline" className="ml-2">{assignment.role}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeClinician.mutate(assignment.id)}
                  disabled={removeClinician.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-sm">
                  <p><span className="font-medium">Email:</span> {assignment.clinician.email}</p>
                  {assignment.clinician.specialization && (
                    <p><span className="font-medium">Specialization:</span> {assignment.clinician.specialization}</p>
                  )}
                  {assignment.notes && (
                    <p className="italic text-gray-500 mt-1">{assignment.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for adding a clinician */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Clinician</DialogTitle>
            <DialogDescription>
              Assign a clinician to this client for care coordination.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clinicianId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinician</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a clinician" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableClinicians.map((clinician: any) => (
                          <SelectItem key={clinician.id} value={clinician.id.toString()}>
                            {clinician.name} {clinician.title ? `(${clinician.title})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLINICIAN_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={assignClinician.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={assignClinician.isPending}
                >
                  {assignClinician.isPending ? 'Assigning...' : 'Assign Clinician'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}