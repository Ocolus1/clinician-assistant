import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { FormMessageHidden } from "@/components/ui/form-no-message";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FUNDS_MANAGEMENT_OPTIONS, insertClientSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ClientFormProps {
  onComplete: (clientId: number) => void;
}

export default function ClientForm({ onComplete }: ClientFormProps) {
  const { toast } = useToast();
  // Create a modified schema without availableFunds for the form
  // Add additional validation to ensure name is not empty
  const modifiedClientSchema = insertClientSchema
    .omit({ availableFunds: true })
    .extend({
      name: z.string().min(1, { message: "Client name is required" }),
      dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
    });

  const form = useForm({
    resolver: zodResolver(modifiedClientSchema),
    defaultValues: {
      name: "",
      dateOfBirth: "",
      fundsManagement: FUNDS_MANAGEMENT_OPTIONS[0], // Default to first option
    },
  });

  const createClient = useMutation({
    mutationFn: async (data: any) => {
      // Add default value for availableFunds to satisfy the API
      const dataWithDefaults = {
        ...data,
        availableFunds: 0 // This will be properly set in BudgetForm
      };
      const res = await apiRequest("POST", "/api/clients", dataWithDefaults);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Client information saved successfully",
      });
      onComplete(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save client information",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center h-[700px] p-8">
      <div className="md:block h-full flex items-center rounded-xl overflow-hidden shadow-lg">
        <img 
          src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&auto=format&fit=crop"
          alt="Abstract wave pattern"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="space-y-8 max-w-md mx-auto w-full flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-primary mb-2">Client Information</h2>
          <p className="text-muted-foreground">Please enter the client's details below</p>
          <p className="text-sm text-muted-foreground mt-2">Fields marked with <span className="text-red-500">*</span> are required</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createClient.mutate(data))} className="space-y-6 w-full">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>
                    Client Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter client name" />
                  </FormControl>
                  <FormMessageHidden />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>
                    Date of Birth <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      placeholder="DD/MM/YYYY" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessageHidden />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fundsManagement"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>
                    Funds Management <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select funds management type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUNDS_MANAGEMENT_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessageHidden />
                </FormItem>
              )}
            />


            <Button 
              type="submit" 
              disabled={createClient.isPending}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6"
            >
              {createClient.isPending ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Saving...
                </div>
              ) : (
                "Next"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}