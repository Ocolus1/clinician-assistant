import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client, Session, Ally, insertSessionSchema } from "@shared/schema";
import { 
  Card, 
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar as CalendarIcon,
  Clock,
  Search,
  Plus,
  MapPin,
  User,
  Filter,
  Grid,
  List
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { useSafeForm } from "@/hooks/use-safe-hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

export default function Sessions() {
  // State for search, filters, and view type
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [createSessionDialogOpen, setCreateSessionDialogOpen] = useState(false);
  
  // Fetch clients to associate with session data
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Fetch sessions from the API
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  
  // Combine sessions with client names
  const sessionsWithClientNames = sessions.map(session => {
    const client = clients.find(c => c.id === session.clientId);
    return {
      ...session,
      clientName: client?.name || "Unknown Client",
      // Make sure dates are Date objects
      sessionDate: new Date(session.sessionDate),
      createdAt: session.createdAt ? new Date(session.createdAt) : new Date()
    };
  });
  
  // Filter sessions based on search and status
  const filteredSessions = sessionsWithClientNames.filter(session => {
    // Apply search filter
    const matchesSearch = searchQuery === "" || 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.location?.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Apply status filter
    const matchesStatus = statusFilter === null || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort sessions by date (most recent first)
  const sortedSessions = [...filteredSessions].sort((a, b) => 
    new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
  );
  
  // Session status badge colors
  const getStatusBadge = (status: string) => {
    switch(status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      case "rescheduled":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Rescheduled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <Button onClick={() => setCreateSessionDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Session
        </Button>
      </div>
      
      {/* Create Session Dialog */}
      <CreateSessionDialog 
        open={createSessionDialogOpen} 
        onOpenChange={setCreateSessionDialogOpen} 
      />
      
      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            placeholder="Search sessions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || null)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rescheduled">Rescheduled</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="bg-gray-100 rounded-md p-1 flex">
            <Button
              variant={viewType === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewType("grid")}
              className="h-8 w-8"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewType === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewType("list")}
              className="h-8 w-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* View tabs for upcoming vs. past sessions */}
      <Tabs defaultValue="upcoming" className="mb-6">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
          <TabsTrigger value="past">Past Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {/* Show loading skeleton during data fetch */}
          {sessionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Filter for upcoming sessions (scheduled, rescheduled)
            sortedSessions.filter(s => 
              s.status === "scheduled" || 
              s.status === "rescheduled"
            ).length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-500 mb-2">No upcoming sessions</h4>
                <p className="text-gray-500 mb-4">Schedule therapy sessions to start tracking progress.</p>
                <Button>Schedule First Session</Button>
              </div>
            ) : (
              viewType === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedSessions
                    .filter(s => s.status === "scheduled" || s.status === "rescheduled")
                    .map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedSessions
                    .filter(s => s.status === "scheduled" || s.status === "rescheduled")
                    .map(session => (
                      <SessionListItem key={session.id} session={session} />
                    ))}
                </div>
              )
            )
          )}
        </TabsContent>
        <TabsContent value="past">
          {/* Filter for past sessions (completed, cancelled) */}
          {sessionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            sortedSessions.filter(s => 
              s.status === "completed" || 
              s.status === "cancelled"
            ).length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-500 mb-2">No past sessions</h4>
                <p className="text-gray-500">Session history will appear here once sessions are completed.</p>
              </div>
            ) : (
              viewType === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedSessions
                    .filter(s => s.status === "completed" || s.status === "cancelled")
                    .map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedSessions
                    .filter(s => s.status === "completed" || s.status === "cancelled")
                    .map(session => (
                      <SessionListItem key={session.id} session={session} />
                    ))}
                </div>
              )
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Card view component for sessions
interface SessionProps {
  session: Session & { clientName: string };
}

function SessionCard({ session }: SessionProps) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-primary/10 p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-medium">{session.title}</h3>
          {getStatusBadge(session.status)}
        </div>
        <p className="text-sm text-gray-500 mt-1">{session.description}</p>
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm">
              {format(new Date(session.sessionDate), "MMM d, yyyy · h:mm a")}
            </span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm">{session.duration} minutes</span>
          </div>
          <div className="flex items-center">
            <User className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm">{session.clientName}</span>
          </div>
          {session.location && (
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm">{session.location}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end p-4 pt-0">
        <Button variant="outline" size="sm">View Details</Button>
      </CardFooter>
    </Card>
  );
}

// List view component for sessions
function SessionListItem({ session }: SessionProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h5 className="font-medium">{session.title}</h5>
              <div className="text-sm text-gray-500">
                {format(new Date(session.sessionDate), "MMM d, yyyy · h:mm a")} · {session.duration} min
              </div>
            </div>
          </div>
          {getStatusBadge(session.status)}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="text-sm">
            <span className="text-gray-500">Client:</span> {session.clientName}
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Therapist:</span> Sarah Johnson
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Location:</span> {session.location}
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="outline" size="sm">View Details</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function for status badges
function getStatusBadge(status: string) {
  switch(status) {
    case "scheduled":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
    case "rescheduled":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Rescheduled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

// Create a form schema for the session creation
const sessionFormSchema = insertSessionSchema.extend({
  sessionDate: z.coerce.date({
    required_error: "Session date is required",
  }),
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  therapistId: z.coerce.number().optional(),
  duration: z.coerce.number({
    required_error: "Duration is required",
  }).min(1, "Duration must be at least 1 minute"),
  status: z.string({
    required_error: "Status is required",
  }),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateSessionDialog({ open, onOpenChange }: CreateSessionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients for client dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch allies for therapist dropdown
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const { data: allies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", selectedClientId, "allies"],
    enabled: !!selectedClientId,
  });

  // Default form values
  const defaultValues: Partial<SessionFormValues> = {
    title: "",
    description: "",
    sessionDate: new Date(),
    duration: 60,
    status: "scheduled",
    location: "Main Office",
  };

  // Form definition
  const form = useSafeForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues,
  });

  // Watch clientId to update allies list
  const clientId = form.watch("clientId");
  React.useEffect(() => {
    if (clientId) {
      setSelectedClientId(clientId);
    }
  }, [clientId]);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (data: SessionFormValues) => {
      return apiRequest("POST", "/api/sessions", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      form.reset(defaultValues);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
      console.error("Error creating session:", error);
    },
  });

  // Form submission handler
  function onSubmit(data: SessionFormValues) {
    createSessionMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Schedule a new therapy session for a client
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Selection */}
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Therapist Selection */}
              <FormField
                control={form.control}
                name="therapistId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Therapist</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                      disabled={!selectedClientId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select therapist" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allies.map((ally) => (
                          <SelectItem key={ally.id} value={ally.id.toString()}>
                            {ally.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {!selectedClientId && "Select a client first"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Session Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Initial Assessment, Speech Therapy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Session Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the session"
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Session Date */}
              <FormField
                control={form.control}
                name="sessionDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date & Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value ? "text-muted-foreground" : ""
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP p")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Input
                            type="time"
                            onChange={(e) => {
                              const date = new Date(field.value);
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              date.setHours(hours, minutes);
                              field.onChange(date);
                            }}
                            defaultValue={field.value ? 
                              format(field.value, "HH:mm") : 
                              format(new Date(), "HH:mm")
                            }
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Session Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Session Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="rescheduled">Rescheduled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Office Room 101, Virtual Meeting" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes for this session"
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createSessionMutation.isPending}
              >
                {createSessionMutation.isPending ? "Creating..." : "Create Session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}