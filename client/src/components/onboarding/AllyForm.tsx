import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { RELATIONSHIP_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAllySchema } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useState } from 'react';
import { Pencil, Trash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface AllyFormProps {
  clientId: number;
  onComplete: () => void;
  onPrevious: () => void;
}

export default function AllyForm({ clientId, onComplete, onPrevious }: AllyFormProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertAllySchema),
    defaultValues: {
      name: "",
      relationship: "",
      preferredLanguage: "",
      email: "",
      accessTherapeutics: false,
      accessFinancials: false,
    },
  });

  const { data: allies = [] } = useQuery({
    queryKey: ["/api/clients", clientId, "allies"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/clients/${clientId}/allies`);
      return res.json();
    }
  });

  const createAlly = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/allies`, data);
      return res.json();
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "allies"] });
      toast({
        title: "Success",
        description: "Ally added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add ally",
        variant: "destructive",
      });
    },
  });

  const canAddMore = allies.length < 5;
  const [openRelationship, setOpenRelationship] = useState(false);
  const [open, setOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAlly, setSelectedAlly] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleEditAlly = (ally: any) => {
    setSelectedAlly(ally);
    form.reset(ally);
    setEditDialogOpen(true);
  };

  const handleDeleteAlly = (id: number) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const deleteAlly = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/allies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "allies"] });
      toast({
        title: "Success",
        description: "Ally deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete ally",
        variant: "destructive",
      });
    },
  });

  const updateAlly = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/clients/${clientId}/allies/${selectedAlly.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "allies"] });
      toast({
        title: "Success",
        description: "Ally updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update ally",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Current Allies ({allies.length}/5)</h3>
        <div className="space-y-4">
          {allies.map((ally: any) => (
            <Card key={ally.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{ally.name}</h4>
                  <p className="text-sm text-muted-foreground">{ally.relationship}</p>
                  <p className="text-sm text-muted-foreground">{ally.email}</p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className={ally.accessTherapeutics ? "text-primary" : "text-muted-foreground"}>
                      Therapeutics Access
                    </span>
                    <span className={ally.accessFinancials ? "text-primary" : "text-muted-foreground"}>
                      Financial Access
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEditAlly(ally)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteAlly(ally.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        {canAddMore ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createAlly.mutate(data))}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Relationship to Client</FormLabel>
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

              <FormField
                control={form.control}
                name="preferredLanguage"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Preferred Language</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
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
                                  setOpen(false);
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessTherapeutics"
                render={({ field }) => (
                  <FormItem className="mb-4 flex items-center justify-between">
                    <FormLabel>Access to Therapeutics</FormLabel>
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
                  <FormItem className="mb-4 flex items-center justify-between">
                    <FormLabel>Access to Financials</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-4 mt-6">
                <Button
                  type="submit"
                  variant="default"
                  className="w-full"
                  disabled={createAlly.isPending}
                >
                  {createAlly.isPending ? "Adding..." : "Add Ally"}
                </Button>
                
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/3"
                    onClick={onPrevious}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    className="w-2/3"
                    variant="default"
                    onClick={onComplete}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        ) : (
          <div className="flex gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-1/3"
              onClick={onPrevious}
            >
              Previous
            </Button>
            <Button
              type="button"
              className="w-2/3"
              variant="default"
              onClick={onComplete}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ally</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateAlly.mutate(data))}>
              {/* Reuse the same form fields from the create form */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Relationship to Client</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accessTherapeutics"
                render={({ field }) => (
                  <FormItem className="mb-4 flex items-center justify-between">
                    <FormLabel>Access to Therapeutics</FormLabel>
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
                  <FormItem className="mb-4 flex items-center justify-between">
                    <FormLabel>Access to Financials</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={updateAlly.isPending}>
                {updateAlly.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the ally.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteId) {
                  deleteAlly.mutate(deleteId);
                  setDeleteDialogOpen(false);
                }
              }}
            >
              {deleteAlly.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}