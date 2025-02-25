import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    <div className="grid md:grid-cols-2 gap-8 items-center min-h-screen p-8">
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
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
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
                "Continue"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}