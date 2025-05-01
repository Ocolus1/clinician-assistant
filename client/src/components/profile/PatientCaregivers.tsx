import { useState, useEffect } from 'react';
import { Caregiver } from '@shared/schema';
import { CaretSortIcon, CheckIcon, PlusIcon } from "@radix-ui/react-icons";
import { FaBriefcase, FaCalendarAlt, FaMailBulk, FaShieldAlt, FaCoins } from 'react-icons/fa';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { cn } from "@/lib/utils";
import { RELATIONSHIP_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, ArchiveIcon, RotateCcw, Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

// Define the validation schema for editing a caregiver
const editCaregiverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  relationship: z.string().min(1, "Relationship is required"),
  preferredLanguage: z.string().min(1, "Preferred language is required"),
  phone: z.string().optional(),
  notes: z.string().optional(),
  accessTherapeutics: z.boolean().default(false),
  accessFinancials: z.boolean().default(false),
});

interface PatientCaregiversProps {
  caregivers: Caregiver[];
  patientId: number;
  onAddCaregiver?: () => void;
  onEditCaregiver?: (caregiver: Caregiver) => void;
  onDeleteCaregiver?: (caregiver: Caregiver) => void;
  onContactCaregiver?: (caregiver: Caregiver) => void;
}

type EditCaregiverFormValues = z.infer<typeof editCaregiverSchema>;

export default function PatientCaregivers({ 
  caregivers, 
  patientId,
  onAddCaregiver,
  onEditCaregiver,
  onDeleteCaregiver, 
  onContactCaregiver
}: PatientCaregiversProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [caregiverToArchive, setCaregiverToArchive] = useState<Caregiver | null>(null);
  const [openRelationship, setOpenRelationship] = useState(false);
  const [openLanguage, setOpenLanguage] = useState(false);
  const [currentCaregiver, setCurrentCaregiver] = useState<Caregiver | null>(null);
  const [activeCaregivers, setActiveCaregivers] = useState<Caregiver[]>([]);
  const [archivedCaregivers, setArchivedCaregivers] = useState<Caregiver[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  
  // Initialize the form
  const form = useForm<EditCaregiverFormValues>({
    resolver: zodResolver(editCaregiverSchema),
    defaultValues: {
      name: "",
      email: "",
      relationship: "",
      preferredLanguage: "",
      phone: "",
      notes: "",
      accessTherapeutics: false,
      accessFinancials: false,
    }
  });
  
  // Filter caregivers into active and archived with deduplication
  useEffect(() => {
    // Create maps to track already added caregivers by key identifiers
    const activeMap = new Map<string, Caregiver>();
    const archivedMap = new Map<string, Caregiver>();
    
    // Process all caregivers
    caregivers.forEach(caregiver => {
      // Create a unique key based on name and email
      const key = `${caregiver.name}-${caregiver.email}`;
      
      if (caregiver.archived) {
        // Only add if not already in map or has a lower ID (likely the original)
        if (!archivedMap.has(key) || caregiver.id < archivedMap.get(key)!.id) {
          archivedMap.set(key, caregiver);
        }
      } else {
        // Only add if not already in map or has a lower ID
        if (!activeMap.has(key) || caregiver.id < activeMap.get(key)!.id) {
          activeMap.set(key, caregiver);
        }
      }
    });
    
    // Convert maps back to arrays
    setActiveCaregivers(Array.from(activeMap.values()));
    setArchivedCaregivers(Array.from(archivedMap.values()));
    
    console.log("Filtered active caregivers:", Array.from(activeMap.values()));
    console.log("Filtered archived caregivers:", Array.from(archivedMap.values()));
  }, [caregivers]);

  // Handle archive/restore button click
  const handleArchiveClick = (caregiver: Caregiver) => {
    setCaregiverToArchive(caregiver);
    setShowArchiveDialog(true);
  };
  
  // Handle email contact click
  const handleContactEmail = (caregiver: Caregiver) => {
    if (onContactCaregiver) {
      onContactCaregiver(caregiver);
    } else {
      window.location.href = `mailto:${caregiver.email}`;
    }
  };
  
  // Archive mutation
  const archiveCaregiverMutation = useMutation({
    mutationFn: (data: { id: number; archived: boolean }) => {
      console.log("Archiving caregiver:", data);
      return apiRequest('PUT', `/api/patients/${patientId}/caregivers/${data.id}/archive`, { archived: data.archived });
    },
    onSuccess: (data) => {
      console.log("Caregiver archive/restore successful:", data);
      setShowArchiveDialog(false);
      setCaregiverToArchive(null);
      // Invalidate and refetch with the correct query key format
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'caregivers'] });
    },
    onError: (error) => {
      console.error("Error archiving/restoring caregiver:", error);
    }
  });
  
  // Edit caregiver mutation
  const editCaregiverMutation = useMutation({
    mutationFn: (data: EditCaregiverFormValues) => {
      if (!currentCaregiver) return Promise.reject("No caregiver selected");
      console.log("Updating caregiver data:", data);
      return apiRequest('PUT', `/api/patients/${patientId}/caregivers/${currentCaregiver.id}`, data);
    },
    onSuccess: (data) => {
      console.log("Caregiver update successful:", data);
      setShowEditDialog(false);
      setCurrentCaregiver(null);
      // Invalidate and refetch with the correct query key format
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'caregivers'] });
    },
    onError: (error) => {
      console.error("Error updating caregiver:", error);
    }
  });
  
  // Handle archive confirmation
  const handleArchiveConfirm = () => {
    if (caregiverToArchive) {
      archiveCaregiverMutation.mutate({
        id: caregiverToArchive.id,
        archived: !caregiverToArchive.archived
      });
    }
  };
  
  // Handle edit click
  const handleEditClick = (caregiver: Caregiver) => {
    setCurrentCaregiver(caregiver);
    // Set form values
    form.reset({
      name: caregiver.name,
      email: caregiver.email || "",
      relationship: caregiver.relationship || "",
      preferredLanguage: caregiver.preferredLanguage || "",
      phone: caregiver.phone || "",
      notes: caregiver.notes || "",
      accessTherapeutics: caregiver.accessTherapeutics || false,
      accessFinancials: caregiver.accessFinancials || false,
    });
    setShowEditDialog(true);
    
    if (onEditCaregiver) {
      onEditCaregiver(caregiver);
    }
  };
  
  // Handle form submission
  const onSubmit = (data: EditCaregiverFormValues) => {
    editCaregiverMutation.mutate(data);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Patient Caregivers</h3>
          <p className="text-sm text-muted-foreground">
            People who support this patient's therapy journey
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
          <Button onClick={onAddCaregiver}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Caregiver
          </Button>
        </div>
      </div>
      
      {/* Display either Active or Archived Caregivers based on toggle */}
      {!showArchived ? (
        // Active Caregivers
        <>
          {activeCaregivers.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No active caregivers. Add a caregiver to get started.</p>
              <Button onClick={onAddCaregiver} className="mt-4">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add New Caregiver
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCaregivers.map((caregiver) => (
                <Card key={caregiver.id} className="relative">
                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditClick(caregiver)}
                      title="Edit caregiver"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleArchiveClick(caregiver)}
                      title="Archive caregiver"
                    >
                      <ArchiveIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-lg font-semibold">{caregiver.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <FaBriefcase className="mr-1.5" />
                      {RELATIONSHIP_OPTIONS.find(opt => opt.value === caregiver.relationship)?.label || caregiver.relationship}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-5 pb-3 px-6">
                    <div className="space-y-3">
                      {caregiver.email && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm cursor-pointer" 
                               onClick={() => handleContactEmail(caregiver)} 
                               title="Click to send email">
                            <span className="text-blue-600 hover:underline">{caregiver.email}</span>
                          </div>
                        </div>
                      )}
                      
                      {caregiver.phone && (
                        <div className="flex items-center text-sm">
                          <FaCalendarAlt className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{caregiver.phone}</span>
                        </div>
                      )}
                      
                      {caregiver.preferredLanguage && (
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-sm">
                            <span className="mr-2">Preferred Language:</span>
                            <span>
                              {LANGUAGE_OPTIONS.find(opt => opt.value === caregiver.preferredLanguage)?.label || caregiver.preferredLanguage}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {caregiver.accessTherapeutics && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
                                <FaShieldAlt className="mr-1 h-3 w-3" />
                                Therapeutic Access
                              </Badge>
                            )}
                            
                            {caregiver.accessFinancials && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center">
                                <FaCoins className="mr-1 h-3 w-3" />
                                Financial Access
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {caregiver.notes && (
                      <div className="text-sm pt-2 border-t">
                        <p className="text-muted-foreground">{caregiver.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        // Archived Caregivers
        <>
          {archivedCaregivers.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No archived caregivers.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedCaregivers.map((caregiver) => (
                <Card key={caregiver.id} className="relative opacity-75">
                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleArchiveClick(caregiver)}
                      title="Restore caregiver"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <CardHeader className="pb-2 pt-4">
                    <Badge variant="outline" className="w-fit mb-2">Archived</Badge>
                    <CardTitle className="text-lg font-semibold">{caregiver.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <FaBriefcase className="mr-1.5" />
                      {RELATIONSHIP_OPTIONS.find(opt => opt.value === caregiver.relationship)?.label || caregiver.relationship}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-5 pb-3 px-6">
                    <div className="space-y-3">
                      {caregiver.email && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">{caregiver.email}</span>
                          </div>
                        </div>
                      )}
                      
                      {caregiver.phone && (
                        <div className="flex items-center text-sm">
                          <FaCalendarAlt className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{caregiver.phone}</span>
                        </div>
                      )}
                      
                      {caregiver.preferredLanguage && (
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-sm">
                            <span className="mr-2">Preferred Language:</span>
                            <span>
                              {LANGUAGE_OPTIONS.find(opt => opt.value === caregiver.preferredLanguage)?.label || caregiver.preferredLanguage}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {caregiver.accessTherapeutics && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
                                <FaShieldAlt className="mr-1 h-3 w-3" />
                                Therapeutic Access
                              </Badge>
                            )}
                            
                            {caregiver.accessFinancials && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center">
                                <FaCoins className="mr-1 h-3 w-3" />
                                Financial Access
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {caregiver.notes && (
                      <div className="text-sm pt-2 border-t">
                        <p className="text-muted-foreground">{caregiver.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Archive/Restore Confirmation Dialog */}
      <Dialog 
        open={showArchiveDialog} 
        onOpenChange={(open) => {
          // Only allow closing via the buttons, not by clicking outside
          if (!open) setShowArchiveDialog(false);
        }}
      >
        <DialogContent 
          onEscapeKeyDown={(e) => e.preventDefault()} 
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {caregiverToArchive?.archived ? 'Restore Caregiver' : 'Archive Caregiver'}
            </DialogTitle>
            <DialogDescription>
              {caregiverToArchive?.archived ? (
                <>
                  Are you sure you want to restore {caregiverToArchive?.name} to active status?
                  This will make them visible in the main caregivers list again.
                </>
              ) : (
                <>
                  Are you sure you want to archive {caregiverToArchive?.name}?
                  Archived caregivers won't appear in the main caregivers list but can be restored later.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant={caregiverToArchive?.archived ? "default" : "secondary"}
              onClick={handleArchiveConfirm}
            >
              {caregiverToArchive?.archived ? 'Restore' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Caregiver Dialog */}
      <Dialog 
        open={showEditDialog} 
        onOpenChange={(open) => {
          // Only allow closing via the buttons, not by clicking outside
          if (!open) setShowEditDialog(false);
        }}
      >
        <DialogContent 
          className="sm:max-w-[600px]"
          onEscapeKeyDown={(e) => e.preventDefault()} 
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit Caregiver</DialogTitle>
            <DialogDescription>
              Update information for {currentCaregiver?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter caregiver name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Enter email address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Relationship Field */}
                <FormField
                  control={form.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship <span className="text-red-500">*</span></FormLabel>
                      <Popover open={openRelationship} onOpenChange={setOpenRelationship}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? RELATIONSHIP_OPTIONS.find(
                                    (option) => option.value === field.value
                                  )?.label
                                : "Select relationship"}
                              <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search relationship..." />
                            <CommandEmpty>No relationship found.</CommandEmpty>
                            <CommandGroup>
                              {RELATIONSHIP_OPTIONS.map((option) => (
                                <CommandItem
                                  key={option.value}
                                  value={option.value}
                                  onSelect={() => {
                                    form.setValue("relationship", option.value);
                                    form.clearErrors("relationship");
                                    setOpenRelationship(false);
                                  }}
                                >
                                  <CheckIcon
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      option.value === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {option.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Phone Field */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter phone number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Preferred Language Field */}
              <FormField
                control={form.control}
                name="preferredLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Language <span className="text-red-500">*</span></FormLabel>
                    <Popover open={openLanguage} onOpenChange={setOpenLanguage}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? LANGUAGE_OPTIONS.find(
                                  (option) => option.value === field.value
                                )?.label
                              : "Select language"}
                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search language..." />
                          <CommandEmpty>No language found.</CommandEmpty>
                          <CommandGroup>
                            {LANGUAGE_OPTIONS.map((option) => (
                              <CommandItem
                                key={option.value}
                                value={option.label}
                                onSelect={() => {
                                  form.setValue("preferredLanguage", option.value);
                                  form.clearErrors("preferredLanguage");
                                  setOpenLanguage(false);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    option.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {option.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Notes Field */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter any additional notes about this caregiver"
                        className="resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Access Settings */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Access Settings</h4>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="accessTherapeutics"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <FormLabel className="cursor-pointer">Access to Therapeutics</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="accessFinancials"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <FormLabel className="cursor-pointer">Access to Financials</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={editCaregiverMutation.isPending}
                >
                  {editCaregiverMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
