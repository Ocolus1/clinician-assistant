import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { RELATIONSHIP_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Users, MessageSquare, Edit, UserPlus, Archive, Unlock, ShieldCheck, Mail, Phone, Globe, ArchiveRestore, FileText } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Ally } from "@shared/schema";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ClientAlliesProps {
  allies: Ally[];
  clientId: number;
  onAddAlly?: () => void;
  onEditAlly?: (ally: Ally) => void;
  onDeleteAlly?: (ally: Ally) => void;
  onContactAlly?: (ally: Ally) => void;
}

// Create a validation schema for the ally form
const editAllySchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  relationship: z.string().min(1, { message: "Relationship is required" }),
  email: z.string().email({ message: "Invalid email format" }).min(1, { message: "Email is required" }),
  phone: z.string().optional(),
  preferredLanguage: z.string().min(1, { message: "Preferred language is required" }),
  notes: z.string().optional(),
  accessTherapeutics: z.boolean().default(false),
  accessFinancials: z.boolean().default(false),
});

type EditAllyFormValues = z.infer<typeof editAllySchema>;

export default function ClientAllies({ 
  allies, 
  clientId,
  onAddAlly, 
  onEditAlly, 
  onDeleteAlly,
  onContactAlly 
}: ClientAlliesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [allyToArchive, setAllyToArchive] = useState<Ally | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showArchivedAllies, setShowArchivedAllies] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentAlly, setCurrentAlly] = useState<Ally | null>(null);
  const [openRelationship, setOpenRelationship] = useState(false);
  const [openLanguage, setOpenLanguage] = useState(false);
  
  // Filter allies based on their archived status
  const activeAllies = allies.filter(ally => !ally.archived);
  const archivedAllies = allies.filter(ally => ally.archived);
  
  // Display allies based on the filter
  const displayedAllies = showArchivedAllies ? archivedAllies : activeAllies;
  
  // Archive/restore mutation
  const archiveMutation = useMutation({
    mutationFn: ({ allyId, archived }: { allyId: number; archived: boolean }) => 
      apiRequest('PUT', `/api/clients/${clientId}/allies/${allyId}/archive`, { archived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/allies`] });
      toast({
        title: allyToArchive?.archived ? 'Ally Restored' : 'Ally Archived',
        description: allyToArchive?.archived 
          ? `${allyToArchive.name} has been restored from archive.`
          : `${allyToArchive?.name} has been archived.`,
      });
      setShowArchiveDialog(false);
      setAllyToArchive(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update ally: ${error}`,
        variant: 'destructive',
      });
    }
  });
  
  const handleArchiveClick = (ally: Ally) => {
    setAllyToArchive(ally);
    setShowArchiveDialog(true);
  };
  
  const handleArchiveConfirm = () => {
    if (allyToArchive) {
      archiveMutation.mutate({ 
        allyId: allyToArchive.id, 
        archived: !allyToArchive.archived 
      });
    }
  };

  // Function to handle contact via email
  const handleContactEmail = (ally: Ally) => {
    if (ally.email && onContactAlly) {
      onContactAlly(ally);
    }
  };
  
  // Form for editing ally
  const form = useForm<EditAllyFormValues>({
    resolver: zodResolver(editAllySchema),
    defaultValues: {
      name: "",
      relationship: "",
      email: "",
      phone: "",
      preferredLanguage: "",
      notes: "",
      accessTherapeutics: false,
      accessFinancials: false,
    },
  });
  
  // Edit ally mutation
  const editAllyMutation = useMutation({
    mutationFn: (data: EditAllyFormValues) => {
      if (!currentAlly) return Promise.reject("No ally selected");
      return apiRequest('PUT', `/api/clients/${clientId}/allies/${currentAlly.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/allies`] });
      toast({
        title: 'Ally Updated',
        description: `${currentAlly?.name}'s information has been updated.`,
      });
      setShowEditDialog(false);
      setCurrentAlly(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update ally: ${error}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle edit button click
  const handleEditClick = (ally: Ally) => {
    setCurrentAlly(ally);
    
    // Reset form with ally data
    form.reset({
      name: ally.name,
      relationship: ally.relationship,
      email: ally.email || "",
      phone: ally.phone || "",
      preferredLanguage: ally.preferredLanguage || "",
      notes: ally.notes || "",
      accessTherapeutics: ally.accessTherapeutics || false,
      accessFinancials: ally.accessFinancials || false,
    });
    
    setShowEditDialog(true);
  };
  
  // Handle form submission
  const onSubmit = (data: EditAllyFormValues) => {
    editAllyMutation.mutate(data);
  };
  
  return (
    <div className="space-y-6">
      {allies.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-500 mb-2">No allies added yet</h4>
          <p className="text-gray-500 mb-4">Add family members, caregivers, or therapists to the client's support network.</p>
          <Button onClick={onAddAlly}>Add First Ally</Button>
        </div>
      ) : (
        <>
          {/* Archived/Active toggle */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {showArchivedAllies ? 'Archived Allies' : 'Active Allies'}
              <Badge variant="outline" className="ml-2">
                {displayedAllies.length}
              </Badge>
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowArchivedAllies(!showArchivedAllies)}
              className="flex items-center gap-1"
            >
              {showArchivedAllies ? (
                <>
                  <Users className="h-4 w-4" />
                  Show Active
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Show Archived
                </>
              )}
            </Button>
          </div>
          
          {/* Ally Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedAllies.length > 0 ? (
              displayedAllies.map((ally) => (
                <Card 
                  key={ally.id} 
                  className={`overflow-hidden ${ally.archived ? 'bg-gray-50 border-gray-200' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-lg flex items-center gap-2">
                            {ally.name}
                            {ally.archived && (
                              <Badge variant="outline" className="text-xs bg-gray-100">
                                Archived
                              </Badge>
                            )}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {ally.relationship}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex space-x-1">
                        {!ally.archived && (
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(ally)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={ally.archived 
                            ? "text-green-600 hover:text-green-800 hover:bg-green-50" 
                            : "text-amber-600 hover:text-amber-800 hover:bg-amber-50"}
                          onClick={() => handleArchiveClick(ally)}
                        >
                          {ally.archived ? (
                            <ArchiveRestore className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2 pb-4">
                    <div className="grid grid-cols-1 gap-y-1 text-sm text-gray-500">
                      {ally.email && (
                        <div className="flex items-center">
                          <Mail className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          <span>{ally.email}</span>
                        </div>
                      )}
                      {ally.phone && (
                        <div className="flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          <span>{ally.phone}</span>
                        </div>
                      )}
                      {ally.preferredLanguage && (
                        <div className="flex items-center">
                          <Globe className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          <span>{ally.preferredLanguage}</span>
                        </div>
                      )}
                      
                      {/* Access permissions badges */}
                      <div className="flex space-x-2 mt-2">
                        {ally.accessTherapeutics && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
                            <FileText className="h-3 w-3 mr-1" />
                            Therapeutic
                          </Badge>
                        )}
                        {ally.accessFinancials && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Financial
                          </Badge>
                        )}
                      </div>
                      
                      {ally.notes && (
                        <div className="flex items-start mt-2">
                          <FileText className="h-3.5 w-3.5 mr-2 mt-0.5 text-gray-400" />
                          <span className="text-xs">{ally.notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-2 text-center py-6 bg-gray-50 rounded-lg">
                <Archive className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">
                  {showArchivedAllies ? 'No archived allies found.' : 'No active allies found.'}
                </p>
              </div>
            )}
          </div>
          
          {!showArchivedAllies && (
            <div className="flex justify-end pt-4">
              <Button className="flex items-center" onClick={onAddAlly}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Ally
              </Button>
            </div>
          )}
        </>
      )}
      
      {/* Archive/Restore Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {allyToArchive?.archived ? 'Restore Ally' : 'Archive Ally'}
            </DialogTitle>
            <DialogDescription>
              {allyToArchive?.archived ? (
                <>
                  Are you sure you want to restore {allyToArchive?.name} to active status?
                  This will make them visible in the main allies list again.
                </>
              ) : (
                <>
                  Are you sure you want to archive {allyToArchive?.name}?
                  Archived allies won't appear in the main allies list but can be restored later.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant={allyToArchive?.archived ? "default" : "secondary"}
              onClick={handleArchiveConfirm}
            >
              {allyToArchive?.archived ? 'Restore' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Ally Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Ally</DialogTitle>
            <DialogDescription>
              Update information for {currentAlly?.name}.
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
                        <Input {...field} placeholder="Enter ally name" />
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
                        placeholder="Enter any additional notes about this ally"
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
                  disabled={editAllyMutation.isPending}
                >
                  {editAllyMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}