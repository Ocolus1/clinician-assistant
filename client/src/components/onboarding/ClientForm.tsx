
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertClientSchema, FUNDS_MANAGEMENT_OPTIONS } from "../../../../shared/schema";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface ClientFormProps {
  onComplete: (clientId: number) => void;
}

export default function ClientForm({ onComplete }: ClientFormProps) {
  const { toast } = useToast();
  // Create a modified schema without availableFunds for the form
  const modifiedClientSchema = insertClientSchema.omit({ availableFunds: true }).refine((data) => {
    return data.name.length >= 3 && data.name.length <= 50
  }, {
    message: "Name must be between 3 and 50 characters",
    path: ["name"]
  });

  const form = useForm({
    resolver: zodResolver(modifiedClientSchema),
    defaultValues: {
      name: "",
      dateOfBirth: "",
      fundsManagement: "Self-Managed",
    },
  });

  const createClient = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      onComplete(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: any) {
    createClient.mutate(data);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Client Information</h2>
      <p className="text-muted-foreground mb-6">Please enter the client's details below</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Name</FormLabel>
                <FormControl>
                  <Input placeholder="Full name" {...field} />
                </FormControl>
                <FormMessage />
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
                  <Input type="date" {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
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
          
          <div className="flex justify-end">
            <Button type="submit" className="w-full">Next</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
