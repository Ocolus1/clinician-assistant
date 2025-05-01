import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { RELATIONSHIP_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCaregiverSchema } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { FormMessageHidden } from "@/components/ui/form-no-message";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useState } from 'react';
import { AlertCircle, Pencil, Trash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CaregiverFormProps {
  patientId: number;
  onComplete: () => void;
  onPrevious: () => void;
}

export default function CaregiverForm({ patientId, onComplete, onPrevious }: CaregiverFormProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertCaregiverSchema),
    defaultValues: {
      name: "",
      relationship: "",
      preferredLanguage: "",
      email: "",
      accessTherapeutics: false,
      accessFinancials: false,
    },
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ["/api/patients", patientId, "caregivers"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/patients/${patientId}/caregivers`);
      return res.json();
    }
  });

  const createCaregiver = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/patients/${patientId}/caregivers`, data);
      return res.json();
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "caregivers"] });
      toast({
        title: "Success",
        description: "Caregiver added successfully",
      });
    },
    onError: (error) => {
      console.error("Error creating caregiver:", error);
      toast({
        title: "Error",
        description: "Failed to add caregiver",
        variant: "destructive",
      });
    },
  });

  const canAddMore = caregivers.length < 5;
  const [openRelationship, setOpenRelationship] = useState(false);
  const [open, setOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [nextButtonError, setNextButtonError] = useState<string | null>(null);

  const handleEditCaregiver = (caregiver: any) => {
    setSelectedCaregiver(caregiver);
    form.reset(caregiver);
    setEditDialogOpen(true);
  };

  const handleDeleteCaregiver = (id: number) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const deleteCaregiver = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/patients/${patientId}/caregivers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "caregivers"] });
      toast({
        title: "Success",
        description: "Caregiver deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete caregiver",
        variant: "destructive",
      });
    },
  });

  const updateCaregiver = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/patients/${patientId}/caregivers/${selectedCaregiver.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "caregivers"] });
      toast({
        title: "Success",
        description: "Caregiver updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update caregiver",
        variant: "destructive",
      });
    },
  });

  const handleNextClick = () => {
    // Check if at least one caregiver has been added
    if (caregivers.length === 0) {
      setNextButtonError("Please add at least one caregiver before proceeding");
      return;
    }
    
    // Clear any previous errors
    setNextButtonError(null);
    
    // Proceed to the next step
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Add Caregivers</h2>
        <p className="text-muted-foreground">
          Add caregivers who will be involved in the patient's care.
        </p>
      </div>

      {nextButtonError && (
        <div className="bg-destructive/15 p-3 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-destructive text-sm">{nextButtonError}</p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Caregivers</h3>
        
        {caregivers.length === 0 ? (
          <div className="text-center p-6 border rounded-md bg-muted/30">
            <p className="text-muted-foreground">No caregivers added yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {caregivers.map((caregiver: any) => (
              <Card key={caregiver.id} className="p-4 relative">
                <div className="absolute top-3 right-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditCaregiver(caregiver)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCaregiver(caregiver.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <h4 className="font-medium">{caregiver.name}</h4>
                <p className="text-sm text-muted-foreground">{caregiver.relationship}</p>
                <p className="text-sm">{caregiver.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {caregiver.accessTherapeutics && (
                    <Badge variant="outline">Therapeutics Access</Badge>
                  )}
                  {caregiver.accessFinancials && (
                    <Badge variant="outline">Financial Access</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {canAddMore && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Add New Caregiver</h3>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                createCaregiver.mutate(data);
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>
                      Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter caregiver's name" />
                    </FormControl>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>
                      Relationship <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover open={openRelationship} onOpenChange={setOpenRelationship}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openRelationship}
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
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search relationship..." />
                          <CommandEmpty>No relationship found.</CommandEmpty>
                          <CommandGroup>
                            {RELATIONSHIP_OPTIONS.map((option) => (
                              <CommandItem
                                value={option.label}
                                key={option.value}
                                onSelect={() => {
                                  form.setValue("relationship", option.value);
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
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredLanguage"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>
                      Preferred Language <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? LANGUAGE_OPTIONS.find(
                                  (language) => language.value === field.value
                                )?.label
                              : "Select language"}
                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search language..." />
                          <CommandEmpty>No language found.</CommandEmpty>
                          <CommandGroup>
                            {LANGUAGE_OPTIONS.map((language) => (
                              <CommandItem
                                value={language.label}
                                key={language.value}
                                onSelect={() => {
                                  form.setValue("preferredLanguage", language.value);
                                  setOpen(false);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    language.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {language.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>
                      Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="Enter email address" />
                    </FormControl>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <div className="p-4 border rounded-lg mb-4">
                <h4 className="font-medium mb-2">
                  Access Settings <span className="text-red-500">*</span>
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Please select at least one access type
                </p>

                <FormField
                  control={form.control}
                  name="accessTherapeutics"
                  render={({ field }) => (
                    <FormItem className="mb-2 flex items-center justify-between">
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
                    <FormItem className="flex items-center justify-between">
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
                {form.formState.errors.accessTherapeutics && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.accessTherapeutics.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={createCaregiver.isPending}
              >
                {createCaregiver.isPending ? "Adding..." : "Add Caregiver"}
              </Button>
            </form>
          </Form>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={handleNextClick}
        >
          Next
        </Button>
      </div>

      {/* Edit Caregiver Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Caregiver</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                updateCaregiver.mutate(data);
              })}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>
                      Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter caregiver's name" />
                    </FormControl>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>
                      Relationship <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover>
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
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search relationship..." />
                          <CommandEmpty>No relationship found.</CommandEmpty>
                          <CommandGroup>
                            {RELATIONSHIP_OPTIONS.map((option) => (
                              <CommandItem
                                value={option.label}
                                key={option.value}
                                onSelect={() => {
                                  form.setValue("relationship", option.value);
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
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredLanguage"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>
                      Preferred Language <span className="text-red-500">*</span>
                    </FormLabel>
                    <Popover>
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
                                  (language) => language.value === field.value
                                )?.label
                              : "Select language"}
                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search language..." />
                          <CommandEmpty>No language found.</CommandEmpty>
                          <CommandGroup>
                            {LANGUAGE_OPTIONS.map((language) => (
                              <CommandItem
                                value={language.label}
                                key={language.value}
                                onSelect={() => {
                                  form.setValue("preferredLanguage", language.value);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    language.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {language.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>
                      Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="Enter email address" />
                    </FormControl>
                    <FormMessageHidden />
                  </FormItem>
                )}
              />

              <div className="p-4 border rounded-lg mb-4">
                <h4 className="font-medium mb-2">
                  Access Settings <span className="text-red-500">*</span>
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Please select at least one access type
                </p>

                <FormField
                  control={form.control}
                  name="accessTherapeutics"
                  render={({ field }) => (
                    <FormItem className="mb-2 flex items-center justify-between">
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
                    <FormItem className="flex items-center justify-between">
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
                {form.formState.errors.accessTherapeutics && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.accessTherapeutics.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-4 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateCaregiver.isPending}
                >
                  {updateCaregiver.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this caregiver. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteId !== null) {
                  deleteCaregiver.mutate(deleteId);
                  setDeleteDialogOpen(false);
                  setDeleteId(null);
                }
              }}
            >
              {deleteCaregiver.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
