import React, { useState, useEffect } from "react";
import { useParams, useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Users, 
  Target, 
  DollarSign, 
  Calendar, 
  FileText,
  ArrowLeft,
  Edit,
  Clock,
  ChevronRight,
  MessageSquare,
  Award,
  PlusCircle,
  Mail,
  Phone
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RELATIONSHIP_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Client, Ally, Goal, Subgoal, BudgetSettings, BudgetItem } from "@shared/schema";

// Tab components
import ClientPersonalInfo from "@/components/profile/ClientPersonalInfo";
import ClientAllies from "@/components/profile/ClientAllies";
import ClientGoals from "@/components/profile/ClientGoals";
import ClientBudget from "@/components/profile/ClientBudget";
import ClientSessions from "@/components/profile/ClientSessions";
import ClientReports from "@/components/profile/ClientReports";

// Function to parse URL parameters for active tab
function getActiveTabFromURL(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tab') || 'personal';
}

export default function ClientProfile() {
  // Initialize toast hook
  const { toast } = useToast();
  
  // The route parameter is 'id' not 'clientId'
  const params = useParams();
  console.log("All URL params:", params); // Debug all params
  
  // Get the id parameter using destructuring
  const { id } = params;
  console.log("Raw ID from URL params:", id); // Add this for debugging
  
  // Parse the ID into a number, ensuring it's a valid number
  const clientId = id && !isNaN(parseInt(id)) ? parseInt(id) : NaN;
  console.log("Parsed client ID:", clientId); // Add this for debugging
  
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());

  // Fetch client data with enhanced logging
  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ['/api/clients', clientId],
    queryFn: async (context) => {
      console.log("Fetching client data for ID:", clientId);
      const url = `/api/clients/${clientId}`;
      console.log("Requesting URL:", url);
      
      const result = await fetch(url);
      if (!result.ok) {
        throw new Error(`Failed to fetch client: ${result.status}`);
      }
      
      const data = await result.json();
      console.log("Client data received:", JSON.stringify(data));
      return data;
    },
  });

  // Fetch allies
  const { data: allies = [], isLoading: isLoadingAllies } = useQuery<Ally[]>({
    queryKey: ['/api/clients', clientId, 'allies'],
    queryFn: async () => {
      console.log("Fetching allies for client ID:", clientId);
      const response = await fetch(`/api/clients/${clientId}/allies`);
      const data = await response.json();
      console.log("Allies data received:", JSON.stringify(data));
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch goals
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/clients', clientId, 'goals'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch budget items
  const { data: budgetItems = [], isLoading: isLoadingBudgetItems } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch budget settings
  const { data: budgetSettings, isLoading: isLoadingBudgetSettings } = useQuery<BudgetSettings>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Create a state to store subgoals by goalId
  const [subgoalsByGoal, setSubgoalsByGoal] = useState<Record<number, Subgoal[]>>({});
  const [isLoadingSubgoals, setIsLoadingSubgoals] = useState(false);
  
  // Use useEffect to fetch subgoals when goals are loaded
  useEffect(() => {
    // Only run if goals are valid
    if (!goals || goals.length === 0) {
      return;
    }
    
    // Set loading state
    setIsLoadingSubgoals(true);
    
    // Create an array of promises to fetch subgoals for each goal
    const fetchSubgoals = async () => {
      try {
        const result: Record<number, Subgoal[]> = {};
        
        // Fetch subgoals for each goal
        for (const goal of goals) {
          if (goal && goal.id) {
            try {
              console.log(`Fetching subgoals for goal ${goal.id}`);
              const response = await fetch(`/api/goals/${goal.id}/subgoals`);
              if (response.ok) {
                const data = await response.json();
                result[goal.id] = data;
                console.log(`Found ${data.length} subgoals for goal ${goal.id}`);
              }
            } catch (error) {
              console.error(`Error fetching subgoals for goal ${goal.id}:`, error);
              result[goal.id] = [];
            }
          }
        }
        
        // Update state with all fetched subgoals
        setSubgoalsByGoal(result);
        setIsLoadingSubgoals(false);
      } catch (error) {
        console.error("Error fetching subgoals:", error);
        setIsLoadingSubgoals(false);
      }
    };
    
    fetchSubgoals();
  }, [goals]); // Only re-run when goals change

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL with tab parameter without navigating
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url.toString());
  };

  // Go back to client list
  const handleBack = () => {
    setLocation("/clients");
  };

  // Calculate total budget
  const totalBudget = React.useMemo(() => {
    return budgetItems.reduce((acc: number, item: BudgetItem) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return acc + (unitPrice * quantity);
    }, 0);
  }, [budgetItems]);

  // Calculate budget percentage - safely handle nullish values
  const budgetPercentage = React.useMemo(() => {
    if (!budgetSettings || !budgetSettings.availableFunds) return 0;
    
    const availableFunds = typeof budgetSettings.availableFunds === 'string' 
      ? parseFloat(budgetSettings.availableFunds) 
      : budgetSettings.availableFunds;
    
    return availableFunds > 0 ? (totalBudget / availableFunds) * 100 : 0;
  }, [totalBudget, budgetSettings]);

  // Loading state
  const isLoading = isLoadingClient || isLoadingAllies || isLoadingGoals || 
    isLoadingBudgetItems || isLoadingBudgetSettings || isLoadingSubgoals;

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-4" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-8" />
            <div className="space-y-8">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-4" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Client Not Found</h1>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-medium mb-2">Client not found</h2>
            <p className="text-gray-500 mb-4">The client you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={handleBack}>Return to Client List</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const clientAge = client.dateOfBirth ? calculateAge(client.dateOfBirth) : null;

  // New ally form schema
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

  type NewAllyFormValues = z.infer<typeof newAllySchema>;

  // Define all state hooks at the top level to avoid conditional hooks
  const [showAddAllyDialog, setShowAddAllyDialog] = useState(false);
  const [openRelationship, setOpenRelationship] = useState(false);
  const [openLanguage, setOpenLanguage] = useState(false);

  // Initialize the form - make sure this is NOT in a conditional
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

  // Create ally mutation - make sure this is NOT in a conditional
  const createAllyMutation = useMutation({
    mutationFn: (data: NewAllyFormValues) => {
      return apiRequest('POST', `/api/clients/${clientId}/allies`, data);
    },
    onSuccess: () => {
      setShowAddAllyDialog(false);
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
    <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4" 
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Client Profile</h1>
      </div>
      
      {/* Add Ally Dialog */}
      <Dialog 
        open={showAddAllyDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddAllyDialog(false);
          }
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
              Add a new ally for {client?.name}'s support network.
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
                  onClick={() => setShowAddAllyDialog(false)}
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
      
      {/* Tabs section */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-6 mb-6">
          <TabsTrigger value="personal" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Personal Info</span>
            <span className="inline md:hidden">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="allies" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            <span>Allies</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            <span>Goals</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>Budget</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            <span>Reports</span>
          </TabsTrigger>
        </TabsList>
        
        <Card>
          <CardContent className="p-6">
            <TabsContent value="personal" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Personal Information</h3>
              <p className="text-gray-500 mb-6">
                View and edit the client's personal details, contact information, and preferences.
              </p>
              
              {/* Use the ClientPersonalInfo component */}
              {client && (
                <>
                  {console.log("Client data from parent component:", JSON.stringify(client))}
                  {/* Force date conversion and data passing */}
                  <ClientPersonalInfo 
                    client={{
                      ...client
                      // No type casting needed - we'll handle this in the component
                    }}
                    onEdit={() => console.log("Edit personal info clicked")} 
                  />
                </>
              )}
            </TabsContent>
            
            <TabsContent value="allies" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Support Network</h3>
              <p className="text-gray-500 mb-6">
                Manage the client's support network including family members, caregivers, and therapists.
              </p>
              
              {/* Use the ClientAllies component */}
              <ClientAllies
                allies={allies}
                clientId={clientId}
                onAddAlly={() => {
                  // Reset form and show dialog
                  form.reset({
                    name: "",
                    email: "",
                    relationship: "",
                    preferredLanguage: "",
                    phone: "",
                    notes: "",
                    accessTherapeutics: false,
                    accessFinancials: false,
                  });
                  setShowAddAllyDialog(true);
                }}
                onEditAlly={(ally) => {
                  // We've implemented this already in ClientAllies
                  // This is just a fallback in case something's wrong
                  console.log("Edit ally clicked from parent:", ally);
                }}
                onDeleteAlly={(ally) => {
                  // Note: We're using archive instead of delete now
                  console.log("Delete ally clicked from parent:", ally);
                }}
                onContactAlly={(ally) => {
                  // Direct email is already implemented in ClientAllies
                  // This is just a fallback
                  window.location.href = `mailto:${ally.email}`;
                }}
              />
            </TabsContent>
            
            <TabsContent value="goals" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Therapeutic Goals</h3>
              <p className="text-gray-500 mb-6">
                Track and manage the client's therapeutic goals and sub-goals.
              </p>
              
              {/* Create a subgoals map to pass to the ClientGoals component */}
              <ClientGoals 
                goals={goals || []}
                subgoals={subgoalsByGoal || {}}
                onAddGoal={() => console.log("Add goal clicked")}
                onEditGoal={(goal) => console.log("Edit goal clicked", goal)}
                onArchiveGoal={(goal) => console.log("Archive goal clicked", goal)}
                onAddSubgoal={(goalId) => console.log("Add subgoal clicked for goal", goalId)}
                onEditSubgoal={(subgoal) => console.log("Edit subgoal clicked", subgoal)}
                onToggleSubgoalStatus={(subgoal) => console.log("Toggle subgoal status clicked", subgoal)}
              />
            </TabsContent>
            
            <TabsContent value="budget" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Budget Management</h3>
              <p className="text-gray-500 mb-6">
                Track and manage the client's budget, funding sources, and expenditures.
              </p>
              
              {/* Use the ClientBudget component */}
              <ClientBudget 
                budgetSettings={budgetSettings}
                budgetItems={budgetItems}
                onEditSettings={() => console.log("Edit budget settings clicked")}
                onAddItem={() => console.log("Add budget item clicked")}
                onEditItem={(item) => console.log("Edit budget item clicked", item)}
                onDeleteItem={(item) => console.log("Delete budget item clicked", item)}
              />
            </TabsContent>
            
            <TabsContent value="sessions" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Therapy Sessions</h3>
              <p className="text-gray-500 mb-6">
                Schedule and track therapy sessions, view session history and notes.
              </p>
              
              {/* Use the ClientSessions component */}
              <ClientSessions />
            </TabsContent>
            
            <TabsContent value="reports" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Progress Reports</h3>
              <p className="text-gray-500 mb-6">
                Generate, view, and share progress reports and assessments.
              </p>
              
              {/* Use the ClientReports component */}
              <ClientReports />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}