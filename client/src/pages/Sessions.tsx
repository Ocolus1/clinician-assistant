import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Calendar,
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

export default function Sessions() {
  // State for search, filters, and view type
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  
  // Fetch clients to associate with session data
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // In a real implementation, we'd fetch sessions from the API
  // For now, use mock data
  const mockSessions: (Session & { clientName: string })[] = [
    {
      id: 1,
      clientId: 37,
      clientName: "Gabriel",
      therapistId: 35,
      title: "Initial Assessment",
      description: "First session to assess communication needs",
      sessionDate: new Date("2025-03-15T10:00:00"),
      duration: 60,
      status: "scheduled",
      location: "Main Office - Room 101",
      notes: "Prepare assessment materials",
      createdAt: new Date("2025-03-01T14:32:00")
    },
    {
      id: 2,
      clientId: 37,
      clientName: "Gabriel",
      therapistId: 35,
      title: "Articulation Therapy",
      description: "Focus on 's' and 'r' sounds",
      sessionDate: new Date("2025-03-05T14:00:00"),
      duration: 45,
      status: "completed",
      location: "Main Office - Room 103",
      notes: "Good progress with 's' sounds, continue practice with 'r'",
      createdAt: new Date("2025-02-20T09:15:00")
    },
    {
      id: 3,
      clientId: 37,
      clientName: "Gabriel",
      therapistId: 36,
      title: "Language Development",
      description: "Working on expressive language skills",
      sessionDate: new Date("2025-03-20T11:00:00"),
      duration: 60,
      status: "scheduled",
      location: "Virtual Session",
      notes: "Prepare picture cards and interactive games",
      createdAt: new Date("2025-03-02T16:45:00")
    }
  ];
  
  // In a real implementation, we'd query the API with filters
  // For now, filter the mock data
  const filteredSessions = mockSessions.filter(session => {
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
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add Session
        </Button>
      </div>
      
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
          {sortedSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-500 mb-2">No upcoming sessions</h4>
              <p className="text-gray-500 mb-4">Schedule therapy sessions to start tracking progress.</p>
              <Button>Schedule First Session</Button>
            </div>
          ) : (
            viewType === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedSessions.map(session => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {sortedSessions.map(session => (
                  <SessionListItem key={session.id} session={session} />
                ))}
              </div>
            )
          )}
        </TabsContent>
        <TabsContent value="past">
          {/* Similar structure for past sessions */}
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-500 mb-2">No past sessions</h4>
            <p className="text-gray-500">Session history will appear here once sessions are completed.</p>
          </div>
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