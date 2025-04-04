import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Session, Client } from "@shared/schema";
import { NewSessionForm } from '@/components/sessions';

import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  File,
  ChevronDown,
  Calendar as CalendarIcon
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <Card 
      className="hover:shadow-md transition-shadow duration-200 h-full flex flex-col" 
      onClick={onClick}
    >
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mr-3">
              <Calendar className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h5 className="font-medium line-clamp-1">{session.title}</h5>
              <div className="text-sm text-gray-500">
                {format(sessionDate, 'MMM d, yyyy')} · {session.duration} min
              </div>
            </div>
          </div>
          {getStatusBadge(session.status)}
        </div>
        
        {session.description && (
          <div className="mt-2 text-sm line-clamp-2 flex-grow">
            <span className="text-gray-500 font-medium">Notes: </span>
            <span className="text-gray-600">{session.description}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-1 mt-3">
          {session.therapistId && (
            <div className="text-xs flex items-center text-gray-500">
              <User className="h-3 w-3 mr-1" />
              <span>Therapist ID: {session.therapistId}</span>
            </div>
          )}
          {session.location && (
            <div className="text-xs flex items-center text-gray-500">
              <MapPin className="h-3 w-3 mr-1" />
              <span>{session.location}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" size="sm" onClick={onClick}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SessionsListViewProps {
  clientId: number;
  client: Client | null | undefined;
  onCreateSession: () => void;
  onCreateDocument: () => void;
  onViewSession: (session: Session) => void;
}

export default function SessionsListView({ 
  clientId, 
  client, 
  onCreateSession, 
  onCreateDocument, 
  onViewSession 
}: SessionsListViewProps) {
  // Fetch sessions for this client
  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['/api/clients', clientId, 'sessions'],
    queryFn: async () => {
      if (!clientId) {
        return [];
      }
      const response = await fetch(`/api/clients/${clientId}/sessions`);
      if (!response.ok) {
        throw new Error(`Error fetching sessions: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!clientId,
  });
  
  // All sessions should be treated as completed sessions
  // Set status to completed for all sessions to ensure they display correctly
  const processedSessions = sessions.map(session => ({
    ...session,
    status: "completed" // Force all sessions to be completed
  }));
  
  // Sort sessions by date (most recent first)
  const sortedSessions = [...processedSessions].sort((a, b) => 
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
      {/* Session List View */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Sessions</h3>
        
        {/* New dropdown menu button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-slate-800 hover:bg-slate-700">
              <Plus className="h-4 w-4 mr-2" /> 
              New
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreateSession} className="cursor-pointer">
              <Calendar className="mr-2 h-4 w-4" />
              <span>New Session</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateDocument} className="cursor-pointer">
              <File className="mr-2 h-4 w-4" />
              <span>New Document</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">Session History</h4>
        </div>
        
        {sortedSessions.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h5 className="text-md font-medium text-gray-500 mb-2">No sessions found</h5>
            <p className="text-gray-500">Create a new session to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedSessions.map(session => (
              <SessionCard 
                key={session.id} 
                session={session} 
                onClick={() => onViewSession(session)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}