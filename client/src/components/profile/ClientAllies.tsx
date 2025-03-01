import { useState, useEffect } from 'react';
import { Ally } from '@shared/schema';
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

// Define the validation schema for editing an ally
const editAllySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  relationship: z.string().min(1, "Relationship is required"),
  preferredLanguage: z.string().min(1, "Preferred language is required"),
  phone: z.string().optional(),
  notes: z.string().optional(),
  accessTherapeutics: z.boolean().default(false),
  accessFinancials: z.boolean().default(false),
});

interface ClientAlliesProps {
  allies: Ally[];
  clientId: number;
  onAddAlly?: () => void;
  onEditAlly?: (ally: Ally) => void;
  onDeleteAlly?: (ally: Ally) => void;
  onContactAlly?: (ally: Ally) => void;
}

type EditAllyFormValues = z.infer<typeof editAllySchema>;

export default function ClientAllies({ 
  allies, 
  clientId,
  onAddAlly,
  onEditAlly,
  onDeleteAlly, 
  onContactAlly
}: ClientAlliesProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [allyToArchive, setAllyToArchive] = useState<Ally | null>(null);
  const [openRelationship, setOpenRelationship] = useState(false);
  const [openLanguage, setOpenLanguage] = useState(false);
  const [currentAlly, setCurrentAlly] = useState<Ally | null>(null);
  const [activeAllies, setActiveAllies] = useState<Ally[]>([]);
  const [archivedAllies, setArchivedAllies] = useState<Ally[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  
  // Initialize the form
  const form = useForm<EditAllyFormValues>({
    resolver: zodResolver(editAllySchema),
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
  
  // Filter allies into active and archived
  useEffect(() => {
    setActiveAllies(allies.filter(ally => !ally.archived));
    setArchivedAllies(allies.filter(ally => ally.archived));
  }, [allies]);

  // Handle archive/restore button click
  const handleArchiveClick = (ally: Ally) => {
    setAllyToArchive(ally);
    setShowArchiveDialog(true);
  };
  
  // Handle email contact click
  const handleContactEmail = (ally: Ally) => {
    if (onContactAlly) {
      onContactAlly(ally);
    } else {
      window.location.href = `mailto:${ally.email}`;
    }
  };
  
  // Archive mutation
  const archiveAllyMutation = useMutation({
    mutationFn: (data: { id: number; archived: boolean }) => {
      return apiRequest('PUT', `/api/clients/${clientId}/allies/${data.id}/archive`, { archived: data.archived });
    },
    onSuccess: () => {
      setShowArchiveDialog(false);
      setAllyToArchive(null);
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/allies`] });
    }
  });
  
  // Edit ally mutation
  const editAllyMutation = useMutation({
    mutationFn: (data: EditAllyFormValues) => {
      if (!currentAlly) return Promise.reject("No ally selected");
      return apiRequest('PUT', `/api/clients/${clientId}/allies/${currentAlly.id}`, data);
    },
    onSuccess: () => {
      setShowEditDialog(false);
      setCurrentAlly(null);
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/allies`] });
    }
  });
  
  // Handle archive confirmation
  const handleArchiveConfirm = () => {
    if (allyToArchive) {
      archiveAllyMutation.mutate({
        id: allyToArchive.id,
        archived: !allyToArchive.archived
      });
    }
  };
  
  // Handle edit click
  const handleEditClick = (ally: Ally) => {
    setCurrentAlly(ally);
    // Set form values
    form.reset({
      name: ally.name,
      email: ally.email || "",
      relationship: ally.relationship || "",
      preferredLanguage: ally.preferredLanguage || "",
      phone: ally.phone || "",
      notes: ally.notes || "",
      accessTherapeutics: ally.accessTherapeutics || false,
      accessFinancials: ally.accessFinancials || false,
    });
    setShowEditDialog(true);
    
    if (onEditAlly) {
      onEditAlly(ally);
    }
  };
  
  // Handle form submission
  const onSubmit = (data: EditAllyFormValues) => {
    editAllyMutation.mutate(data);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Client Allies</h3>
          <p className="text-sm text-muted-foreground">
            People who support this client's therapy journey
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
          <Button onClick={onAddAlly}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Ally
          </Button>
        </div>
      </div>
      
      {/* Active Allies */}
      {!showArchived && (
        <>
          {activeAllies.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No active allies. Add an ally to get started.</p>
              <Button onClick={onAddAlly} className="mt-4">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add New Ally
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeAllies.map((ally) => (
                <Card key={ally.id} className="relative">
                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditClick(ally)}
                      title="Edit ally"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleArchiveClick(ally)}
                      title="Archive ally"
                    >
                      <ArchiveIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{ally.name}</CardTitle>
                    <CardDescription className="flex items-center">
                      <FaBriefcase className="mr-1" />
                      {RELATIONSHIP_OPTIONS.find(opt => opt.value === ally.relationship)?.label || ally.relationship}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 pb-1">
                    <div className="space-y-3">
                      {ally.email && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm">
                            <FaMailBulk className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{ally.email}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleContactEmail(ally)}
                            title="Send email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {ally.phone && (
                        <div className="flex items-center text-sm">
                          <FaCalendarAlt className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{ally.phone}</span>
                        </div>
                      )}
                      
                      {ally.preferredLanguage && (
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-sm">
                            <span className="mr-2">Preferred Language:</span>
                            <span>
                              {LANGUAGE_OPTIONS.find(opt => opt.value === ally.preferredLanguage)?.label || ally.preferredLanguage}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {ally.accessTherapeutics && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
                                <FaShieldAlt className="mr-1 h-3 w-3" />
                                Therapeutic Access
                              </Badge>
                            )}
                            
                            {ally.accessFinancials && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center">
                                <FaCoins className="mr-1 h-3 w-3" />
                                Financial Access
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {ally.notes && (
                      <div className="text-sm pt-2 border-t">
                        <p className="text-muted-foreground">{ally.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Archived Allies */}
      {showArchived && (
        <>
          {archivedAllies.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No archived allies.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedAllies.map((ally) => (
                <Card key={ally.id} className="relative opacity-75">
                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleArchiveClick(ally)}
                      title="Restore ally"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <Badge variant="outline" className="w-fit mb-2">Archived</Badge>
                    <CardTitle className="text-lg">{ally.name}</CardTitle>
                    <CardDescription className="flex items-center">
                      <FaBriefcase className="mr-1" />
                      {RELATIONSHIP_OPTIONS.find(opt => opt.value === ally.relationship)?.label || ally.relationship}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 pb-1">
                    <div className="space-y-3">
                      {ally.email && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm">
                            <FaMailBulk className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{ally.email}</span>
                          </div>
                        </div>
                      )}
                      
                      {ally.phone && (
                        <div className="flex items-center text-sm">
                          <FaCalendarAlt className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{ally.phone}</span>
                        </div>
                      )}
                      
                      {ally.preferredLanguage && (
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-sm">
                            <span className="mr-2">Preferred Language:</span>
                            <span>
                              {LANGUAGE_OPTIONS.find(opt => opt.value === ally.preferredLanguage)?.label || ally.preferredLanguage}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {ally.accessTherapeutics && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
                                <FaShieldAlt className="mr-1 h-3 w-3" />
                                Therapeutic Access
                              </Badge>
                            )}
                            
                            {ally.accessFinancials && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center">
                                <FaCoins className="mr-1 h-3 w-3" />
                                Financial Access
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {ally.notes && (
                      <div className="text-sm pt-2 border-t">
                        <p className="text-muted-foreground">{ally.notes}</p>
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