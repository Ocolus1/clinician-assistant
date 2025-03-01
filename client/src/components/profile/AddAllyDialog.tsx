import React from "react";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RELATIONSHIP_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

// Define the form schema
const newAllySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  relationship: z.string().min(1, "Relationship is required"),
  preferredLanguage: z.string().min(1, "Preferred language is required"),
  phone: z.string().optional(),
  notes: z.string().optional(),
  accessTherapeutics: z.boolean().default(false),
  accessFinancials: z.boolean().default(false),
});

// Form values type
type NewAllyFormValues = z.infer<typeof newAllySchema>;

// Component props
interface AddAllyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  clientName: string;
}

export default function AddAllyDialog({
  open,
  onOpenChange,
  clientId,
  clientName
}: AddAllyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Define state hooks at the top level
  const [openRelationship, setOpenRelationship] = useState(false);
  const [openLanguage, setOpenLanguage] = useState(false);

  // Initialize form
  const form = useForm<NewAllyFormValues>({
    resolver: zodResolver(newAllySchema),
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

  // Create ally mutation
  const createAllyMutation = useMutation({
    mutationFn: (data: NewAllyFormValues) => {
      return apiRequest('POST', `/api/clients/${clientId}/allies`, data);
    },
    onSuccess: () => {
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'allies'] });
      toast({
        title: "Success",
        description: "New ally created successfully!",
      });
    },
    onError: (error) => {
      console.error("Error creating ally:", error);
      toast({
        title: "Error",
        description: "Failed to create ally. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: NewAllyFormValues) => {
    createAllyMutation.mutate(data);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          form.reset();
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent 
        className="sm:max-w-[600px]"
        onEscapeKeyDown={(e) => e.preventDefault()} 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add New Ally</DialogTitle>
          <DialogDescription>
            Add a new ally for {clientName}'s support network.
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
                                  (item) => item.value === field.value
                                )?.label
                              : "Select relationship"}
                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search relationships..." />
                          <CommandEmpty>No relationship found.</CommandEmpty>
                          <CommandGroup>
                            {RELATIONSHIP_OPTIONS.map((item) => (
                              <CommandItem
                                value={item.label}
                                key={item.value}
                                onSelect={() => {
                                  form.setValue("relationship", item.value);
                                  setOpenRelationship(false);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    item.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {item.label}
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
              
              {/* Language Field */}
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
                                  (item) => item.value === field.value
                                )?.label
                              : "Select language"}
                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search languages..." />
                          <CommandEmpty>No language found.</CommandEmpty>
                          <CommandGroup>
                            {LANGUAGE_OPTIONS.map((item) => (
                              <CommandItem
                                value={item.label}
                                key={item.value}
                                onSelect={() => {
                                  form.setValue("preferredLanguage", item.value);
                                  setOpenLanguage(false);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    item.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {item.label}
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
            </div>
            
            {/* Phone Field */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" placeholder="Enter phone number (optional)" />
                  </FormControl>
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
                      placeholder="Additional notes about this ally (optional)"
                      className="resize-none min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Access Permissions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Access Permissions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accessTherapeutics"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Therapeutic Access</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Allow access to therapy information and progress
                        </div>
                      </div>
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Financial Access</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Allow access to budget and financial information
                        </div>
                      </div>
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
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createAllyMutation.isPending}
              >
                {createAllyMutation.isPending ? "Creating..." : "Create Ally"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}