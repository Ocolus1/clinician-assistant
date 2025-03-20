import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Session } from "@shared/schema";
import { format } from "date-fns";

import { 
  Calendar, 
  Clock, 
  MapPin,
  User,
  Filter,
  Search,
  Calendar as CalendarIcon
} from "lucide-react";

// Helper function to get status badge
const getStatusBadge = (status: string) => {
  switch(status) {
    case "scheduled":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
    case "waived":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Waived</Badge>;
    case "rescheduled":
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Rescheduled</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
  }
};

// Session Card component
interface SessionCardProps {
  session: Session;
  onClick?: () => void;
}

function SessionCard({ session, onClick }: SessionCardProps) {
  // Convert date string to Date object safely
  const sessionDate = new Date(session.sessionDate);
  
  return (
    <Card className="mb-3 hover:shadow-md transition-shadow duration-200" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h5 className="font-medium">{session.title}</h5>
              <div className="text-sm text-gray-500">
                {format(sessionDate, 'MMM d, yyyy')} · {session.duration} min
              </div>
            </div>
          </div>
          {getStatusBadge(session.status)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {session.description && (
            <div className="text-sm col-span-2">
              <span className="text-gray-500">Notes:</span> {session.description}
            </div>
          )}
          {session.therapistId && (
            <div className="text-sm">
              <span className="text-gray-500">Therapist:</span> ID: {session.therapistId}
            </div>
          )}
          {session.location && (
            <div className="text-sm">
              <span className="text-gray-500">Location:</span> {session.location}
            </div>
          )}
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="outline" size="sm" onClick={onClick}>View Details</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientSessions() {
  const params = useParams();
  const clientId = parseInt(params.id);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // Fetch sessions for this client
  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['/api/clients', clientId, 'sessions'],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/sessions`);
      if (!response.ok) {
        throw new Error(`Error fetching sessions: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // Filter sessions
  const upcomingSessions = sessions.filter(session => 
    session.status === 'scheduled' || session.status === 'rescheduled'
  );
  
  const pastSessions = sessions.filter(session => 
    session.status === 'completed' || session.status === 'cancelled' || session.status === 'waived'
  );
  
  // Sort sessions by date (most recent first)
  const sortedUpcoming = [...upcomingSessions].sort((a, b) => 
    new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
  );
  
  const sortedPast = [...pastSessions].sort((a, b) => 
    new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
  );
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past Sessions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          <div className="mb-6">
            <h4 className="font-medium mb-4">Upcoming Sessions</h4>
            
            {sortedUpcoming.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-500 mb-2">No upcoming sessions</h4>
                <p className="text-gray-500 mb-4">Future scheduled sessions will appear here.</p>
              </div>
            ) : (
              sortedUpcoming.map(session => (
                <SessionCard 
                  key={session.id} 
                  session={session}
                  onClick={() => setSelectedSession(session)}
                />
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="past">
          <div className="mb-6">
            <h4 className="font-medium mb-4">Past Sessions</h4>
            
            {sortedPast.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h5 className="text-md font-medium text-gray-500 mb-2">No past sessions</h5>
                <p className="text-gray-500">Completed, cancelled, and waived sessions will appear here.</p>
              </div>
            ) : (
              sortedPast.map(session => (
                <SessionCard 
                  key={session.id} 
                  session={session} 
                  onClick={() => setSelectedSession(session)}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Session details modal could be added here */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{selectedSession.title}</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                  &times;
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{format(new Date(selectedSession.sessionDate), 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{selectedSession.duration} minutes</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{selectedSession.location || 'No location specified'}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Therapist ID: {selectedSession.therapistId || 'Not assigned'}</span>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Status</h4>
                {getStatusBadge(selectedSession.status)}
              </div>
              
              {selectedSession.description && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedSession.description}</p>
                </div>
              )}
              
              {selectedSession.notes && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedSession.notes}</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <Button variant="outline" className="mr-2" onClick={() => setSelectedSession(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}