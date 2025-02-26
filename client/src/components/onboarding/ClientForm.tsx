import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FUNDS_MANAGEMENT_OPTIONS } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ClientFormProps {
  onComplete: (clientId: number) => void;
}

export default function ClientForm({ onComplete }: ClientFormProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      dateOfBirth: "",
      fundsManagement: "NDIA managed",
      availableFunds: 0,
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
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createClient.mutate(data))} className="space-y-6 w-full">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fundsManagement"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Funds Management</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="availableFunds"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Available Funds ($)</FormLabel>
                  <FormControl>
                    <Input 
                      value={field.value} 
                      type="number" 
                      min="0" 
                      step="0.01"
                      onChange={e => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
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