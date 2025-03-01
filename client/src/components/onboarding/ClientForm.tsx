import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { FormMessageHidden } from "@/components/ui/form-no-message";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FUNDS_MANAGEMENT_OPTIONS, insertClientSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGE_OPTIONS } from "@/lib/constants";

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
      gender: z.string().optional(),
      preferredLanguage: z.string().optional(),
      contactEmail: z.string().email({ message: "Please enter a valid email" }).optional().or(z.literal('')),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      medicalHistory: z.string().optional(),
      communicationNeeds: z.string().optional(),
      therapyPreferences: z.string().optional(),
    });

  const form = useForm({
    resolver: zodResolver(modifiedClientSchema),
    defaultValues: {
      name: "",
      dateOfBirth: "",
      fundsManagement: FUNDS_MANAGEMENT_OPTIONS[0], // Default to first option
      gender: "",
      preferredLanguage: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      medicalHistory: "",
      communicationNeeds: "",
      therapyPreferences: "",
    },
  });

  const createClient = useMutation({
    mutationFn: async (data: any) => {
      // Add default value for availableFunds to satisfy the API
      const dataWithDefaults = {
        ...data,
        availableFunds: 0 // This will be properly set in BudgetForm
      };
      
      // Log the data being sent to the API for debugging
      console.log("Submitting client data:", dataWithDefaults);
      
      const res = await apiRequest("POST", "/api/clients", dataWithDefaults);
      const responseData = await res.json();
      console.log("API response:", responseData);
      return responseData;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Client information saved successfully",
      });
      onComplete(data.id);
    },
    onError: (error) => {
      console.error("Error creating client:", error);
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

            <Tabs defaultValue="personal" className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="medical">Medical</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Non-binary">Non-binary</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="preferredLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Language</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select preferred language" />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="contact" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@example.com" />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(XXX) XXX-XXXX" />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter address" />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="medical" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="medicalHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical History</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Enter relevant medical history"
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Include any relevant medical conditions or history that might affect speech therapy.
                      </FormDescription>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="communicationNeeds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication Needs</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe specific communication needs"
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="therapyPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Therapy Preferences</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Any specific preferences for therapy sessions"
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessageHidden />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

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