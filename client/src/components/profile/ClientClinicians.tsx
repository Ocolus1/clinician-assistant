import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Edit, Mail, Award, UserCircle, Phone, Calendar, Search, Info, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";

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
  const [filterValue, setFilterValue] = useState("");
  const [showSuccessAnimation, setShowSuccessAnimation] = useState<number | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

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

  // Reset success animation after it plays
  useEffect(() => {
    if (showSuccessAnimation !== null) {
      const timer = setTimeout(() => {
        setShowSuccessAnimation(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAnimation]);

  // Get role-based background colors
  const getRoleColor = (role: string) => {
    switch (role) {
      case "Primary Therapist":
        return "bg-blue-50 hover:bg-blue-100 border-blue-200";
      case "Secondary Therapist":
        return "bg-green-50 hover:bg-green-100 border-green-200";
      case "Supervisor":
        return "bg-purple-50 hover:bg-purple-100 border-purple-200";
      case "Support Staff":
        return "bg-amber-50 hover:bg-amber-100 border-amber-200";
      default:
        return "bg-gray-50 hover:bg-gray-100 border-gray-200";
    }
  };

  // Get role-based icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Primary Therapist":
        return <Award className="h-4 w-4 text-blue-600" />;
      case "Secondary Therapist":
        return <Award className="h-4 w-4 text-green-600" />;
      case "Supervisor":
        return <Award className="h-4 w-4 text-purple-600" />;
      case "Support Staff":
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <Award className="h-4 w-4 text-gray-600" />;
    }
  };

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
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Clinician assigned successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'clinicians'] });
      form.reset();
      setIsAddDialogOpen(false);
      // Show success animation for the newly added clinician
      setShowSuccessAnimation(data.id);
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

  // Filter clinicians by search input
  const filteredClinicians = assignedClinicians.filter((assignment: any) => {
    if (!filterValue) return true;
    const searchTerm = filterValue.toLowerCase();
    return (
      assignment.clinician.name.toLowerCase().includes(searchTerm) ||
      assignment.role.toLowerCase().includes(searchTerm) ||
      (assignment.clinician.specialization && 
       assignment.clinician.specialization.toLowerCase().includes(searchTerm))
    );
  });

  return (
    <div className="mt-6">
      <div className="flex flex-col space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Assigned Clinicians</h3>
          <Button
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            disabled={availableClinicians.length === 0}
            className="rounded-full focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Assign clinician"
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign Clinician
          </Button>
        </div>
        
        {/* Clinician stats summary */}
        {assignedClinicians.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <p>{assignedClinicians.length} clinician{assignedClinicians.length !== 1 ? 's' : ''} assigned 
            {availableClinicians.length > 0 ? ` (${availableClinicians.length} available)` : ''}</p>
          </div>
        )}

        {/* Search filter */}
        {assignedClinicians.length > 2 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter clinicians..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="pl-9 h-9"
              aria-label="Filter clinicians"
            />
            {filterValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => setFilterValue("")}
                aria-label="Clear filter"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-4 bg-slate-200 rounded w-24 mb-2.5"></div>
            <div className="h-2 bg-slate-200 rounded w-16"></div>
          </div>
        </div>
      ) : assignedClinicians.length === 0 ? (
        <Card>
          <CardContent className="py-6 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
            <UserCircle className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p>No clinicians assigned to this client yet.</p>
              {availableClinicians.length > 0 && (
                <p className="text-sm mt-1">Click the "Assign Clinician" button to get started.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnimatePresence>
            {filteredClinicians.map((assignment: any) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: showSuccessAnimation === assignment.id ? [1, 1.02, 1] : 1,
                  transition: { 
                    duration: 0.3,
                    scale: { duration: 0.5 }
                  }
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -2 }}
                className="focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 rounded-lg"
              >
                <Card 
                  className={cn(
                    "shadow-sm hover:shadow-md transition-all duration-200 border-2",
                    getRoleColor(assignment.role)
                  )}
                  tabIndex={0}
                  aria-label={`${assignment.clinician.name}, ${assignment.role}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 bg-gradient-to-br from-primary/10 to-primary/30 rounded-full p-2.5">
                          <UserCircle className="h-6 w-6 text-primary/80" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{assignment.clinician.name}</CardTitle>
                          <div className="flex items-center mt-1">
                            {getRoleIcon(assignment.role)}
                            <Badge variant="outline" className="ml-2 font-normal">
                              {assignment.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeClinician.mutate(assignment.id)}
                        disabled={removeClinician.isPending}
                        className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label={`Remove ${assignment.clinician.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 pt-1">
                    <div className="text-sm space-y-1.5">
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 mr-2" />
                        <span>{assignment.clinician.email}</span>
                      </div>
                      {assignment.clinician.specialization && (
                        <div className="flex items-center text-muted-foreground">
                          <Award className="h-3.5 w-3.5 mr-2" />
                          <span>{assignment.clinician.specialization}</span>
                        </div>
                      )}
                      {assignment.notes && (
                        <div className="flex items-start mt-3 pt-3 border-t border-border">
                          <Info className="h-3.5 w-3.5 mr-2 mt-0.5 text-muted-foreground/70" />
                          <span className="italic text-muted-foreground/80">{assignment.notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog for adding a clinician */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={cn(isMobile && "max-w-[90vw] sm:max-w-lg")}>
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Add notes about this assignment..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className={cn("sm:justify-end", isMobile && "flex-col gap-2")}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={assignClinician.isPending}
                  className={cn(isMobile && "w-full")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={assignClinician.isPending}
                  className={cn(isMobile && "w-full")}
                >
                  {assignClinician.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Assign Clinician
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}