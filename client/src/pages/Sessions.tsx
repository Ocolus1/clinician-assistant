import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Client, Session } from "@shared/schema";
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon,
  Clock,
  Search,
  Plus,
  MapPin,
  User,
  Grid,
  List,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Import our components
import { SessionDetails } from "@/components/sessions/SessionDetails";
import { FullScreenSessionForm } from "@/components/sessions/FullScreenSessionForm";

// Session status badge helper - moved outside component for global access
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

// Cleanup Sessions button component
function CleanupSessionsButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get sessions data from parent context
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });
  
  const cleanupSessions = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('DELETE', '/api/sessions/cleanup');
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Sessions Cleaned Up",
          description: `Successfully deleted ${result.deleted} sessions, keeping one reference session.`,
          variant: "default",
        });
        
        // Invalidate the sessions cache to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      } else {
        toast({
          title: "Error",
          description: "Failed to clean up sessions. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="text-center py-4 bg-red-50 rounded-lg">
        <p className="text-red-800 font-medium mb-2">Warning</p>
        <p className="text-gray-600 text-sm mb-2">
          You're about to delete {isLoading ? '...' : (sessions.length - 1)} session records.
        </p>
        <p className="text-gray-600 text-sm">
          This action cannot be undone.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button variant="outline" disabled={isLoading}>
            Cancel
          </Button>
        </DialogClose>
        <Button variant="destructive" onClick={cleanupSessions} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span> Cleaning Up...
            </>
          ) : (
            <>Confirm Cleanup</>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function Sessions() {
  // State for search, filters, view type, and selected session
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("all");
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [createSessionDialogOpen, setCreateSessionDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<(Session & { clientName: string }) | null>(null);
  
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
      
    // Apply status filter (if 'all' or null, show all statuses)
    const matchesStatus = statusFilter === null || statusFilter === "all" || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort sessions by date (most recent first)
  const sortedSessions = [...filteredSessions].sort((a, b) => 
    new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
  );
  
  // Function to handle session selection
  const handleSelectSession = (session: Session & { clientName: string }) => {
    setSelectedSession(session);
  };

  return (
    <div className="container mx-auto py-6">
      {selectedSession ? (
        // Display session details and notes when a session is selected
        <SessionDetails 
          session={selectedSession} 
          onBack={() => setSelectedSession(null)}
        />
      ) : (
        // Display sessions list when no session is selected
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Clean Up Sessions
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clean Up Sessions</DialogTitle>
                    <DialogDescription>
                      This will delete all sessions except for one reference session. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <CleanupSessionsButton />
                </DialogContent>
              </Dialog>
              <Button onClick={() => setCreateSessionDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Session
              </Button>
            </div>
          </div>
          
          {/* Open the FullScreenSessionForm component */}
          <FullScreenSessionForm 
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
                  <SelectItem value="all">All Statuses</SelectItem>
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
                  <div className="text-center py-8 bg-gray-50 rounded-lg max-w-md mx-auto">
                    <h4 className="text-lg font-medium text-gray-500 mb-2">No upcoming sessions</h4>
                    <p className="text-gray-500 mb-4">No scheduled therapy sessions found.</p>
                    <Button onClick={() => setCreateSessionDialogOpen(true)}>Schedule New Session</Button>
                  </div>
                ) : (
                  viewType === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedSessions
                        .filter(s => s.status === "scheduled" || s.status === "rescheduled")
                        .map(session => (
                          <SessionCard 
                            key={session.id} 
                            session={session}
                            onClick={() => handleSelectSession(session)}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedSessions
                        .filter(s => s.status === "scheduled" || s.status === "rescheduled")
                        .map(session => (
                          <SessionListItem 
                            key={session.id} 
                            session={session}
                            onClick={() => handleSelectSession(session)}
                          />
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
                  <div className="text-center py-8 bg-gray-50 rounded-lg max-w-md mx-auto">
                    <h4 className="text-lg font-medium text-gray-500 mb-2">No past sessions</h4>
                    <p className="text-gray-500">Session history will appear here once sessions are completed.</p>
                  </div>
                ) : (
                  viewType === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedSessions
                        .filter(s => s.status === "completed" || s.status === "cancelled")
                        .map(session => (
                          <SessionCard 
                            key={session.id} 
                            session={session}
                            onClick={() => handleSelectSession(session)}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedSessions
                        .filter(s => s.status === "completed" || s.status === "cancelled")
                        .map(session => (
                          <SessionListItem 
                            key={session.id} 
                            session={session}
                            onClick={() => handleSelectSession(session)}
                          />
                        ))}
                    </div>
                  )
                )
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// Card view component for sessions
interface SessionProps {
  session: Session & { clientName: string };
  onClick?: () => void;
}

function SessionCard({ session, onClick }: SessionProps) {
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
            <CalendarIcon className="h-4 w-4 text-gray-500 mr-2" />
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
        <Button variant="outline" size="sm" onClick={onClick}>View Details</Button>
      </CardFooter>
    </Card>
  );
}

// List view component for sessions
function SessionListItem({ session, onClick }: SessionProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
              <CalendarIcon className="h-5 w-5 text-primary" />
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
            <span className="text-gray-500">Therapist:</span> {session.therapistId ? "Assigned" : "Unassigned"}
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Location:</span> {session.location || "Not specified"}
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="outline" size="sm" onClick={onClick}>View Details</Button>
        </div>
      </CardContent>
    </Card>
  );
}
