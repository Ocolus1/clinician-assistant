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
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface AllyFormProps {
  clientId: number;
  onComplete: () => void;
}

export default function AllyForm({ clientId, onComplete }: AllyFormProps) {
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
  });

  const createAlly = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/allies`, data);
      return res.json();
    },
    onSuccess: () => {
      form.reset();
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

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Current Allies ({allies.length}/5)</h3>
        <div className="space-y-2">
          {allies.map((ally: any) => (
            <div key={ally.id} className="p-3 bg-muted rounded-md">
              <p className="font-medium">{ally.name}</p>
              <p className="text-sm text-muted-foreground">{ally.relationship}</p>
            </div>
          ))}
        </div>
      </div>

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
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
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
                                (option) => option === field.value
                              )
                            : "Select relationship"}
                          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search relationship..." />
                          <CommandEmpty>No relationship found.</CommandEmpty>
                          <CommandGroup>
                            {RELATIONSHIP_OPTIONS.map((option) => (
                              <CommandItem
                                key={option}
                                value={option}
                                onSelect={() => form.setValue("relationship", option)}
                                className="flex items-center"
                              >
                                <CheckIcon
                                  className="mr-2 h-4 w-4 flex-shrink-0"
                                  style={{ opacity: field.value === option ? 1 : 0 }}
                                />
                                <span>{option}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
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
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {field.value || "Select language"}
                          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search language..." />
                          <CommandEmpty>No language found.</CommandEmpty>
                          <CommandGroup>
                            {LANGUAGE_OPTIONS.map((option) => (
                              <CommandItem
                                key={option}
                                value={option}
                                onSelect={() => form.setValue("preferredLanguage", option)}
                                className="flex items-center"
                              >
                                <CheckIcon
                                  className="mr-2 h-4 w-4 flex-shrink-0"
                                  style={{ opacity: field.value === option ? 1 : 0 }}
                                />
                                <span>{option}</span>
                                {option}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                    <Input type="email" {...field} />
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

            <div className="flex gap-4">
              <Button
                type="submit"
                variant="secondary"
                className="flex-1"
                disabled={createAlly.isPending}
              >
                {createAlly.isPending ? "Adding..." : "Add Another Ally"}
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={onComplete}
              >
                Continue
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <Button className="w-full" onClick={onComplete}>
          Continue
        </Button>
      )}
    </div>
  );
}