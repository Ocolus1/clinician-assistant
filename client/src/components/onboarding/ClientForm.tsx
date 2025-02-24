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
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createClient.mutate(data))}>
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
        >
          {createClient.isPending ? "Saving..." : "Continue"}
        </Button>
      </form>
    </Form>
  );
}
