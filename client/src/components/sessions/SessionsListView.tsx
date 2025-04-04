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
  Calendar as CalendarIcon,
  Eye,
  Download,
  Edit
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

// Helper function to get performance-based border color 
const getPerformanceBorderColor = (session: any) => {
  // For actual sessions with performance data
  if (session.status === "completed" && session.performanceScore !== undefined) {
    const score = session.performanceScore;
    
    // Use the score to determine color (same logic as in session form)
    if (score >= 4) return "border-l-green-500"; // High performance - green
    if (score >= 2.5) return "border-l-yellow-500"; // Medium performance - yellow
    return "border-l-red-500"; // Low performance - red
  }
  
  // For cancellation fees
  if (session.type === "cancellation") {
    return "border-l-black";
  }
  
  // For documents
  if (session.type === "document") {
    return "border-l-purple-500";
  }
  
  // Default color for sessions without performance data
  return "border-l-gray-300";
};

// Helper function to format the time range
const formatTimeRange = (timeFrom: string, timeTo: string) => {
  if (!timeFrom || !timeTo) return "";
  return `${timeFrom}-${timeTo}`;
};

// Extended Session type with additional fields needed for the card
interface ExtendedSession extends Session {
  // These fields might not exist in the database schema but are needed for UI display
  timeFrom?: string;
  timeTo?: string;
  therapistName?: string;
  location?: string;
  performanceScore?: number;
  type?: 'session' | 'cancellation' | 'document';
}

// Session Card component
interface SessionCardProps {
  session: ExtendedSession;
  onClick?: () => void;
}

function SessionCard({ session, onClick }: SessionCardProps) {
  // Convert date string to Date object safely
  const sessionDate = new Date(session.sessionDate);
  
  // Extract time from and time to if available in the session data
  const timeFrom = session.timeFrom || ""; 
  const timeTo = session.timeTo || "";
  
  return (
    <Card 
      className={`hover:shadow transition-shadow duration-200 h-full border-l-4 ${getPerformanceBorderColor(session)} cursor-pointer`} 
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          {/* Left section: Session ID and title */}
          <div className="flex-grow">
            <div className="flex items-center mb-1">
              <h5 className="font-medium text-slate-800">
                {session.title} 
                <span className="text-sm text-slate-500 ml-2">#{session.id}</span>
              </h5>
            </div>
            
            {/* Date and time range */}
            <div className="flex items-center text-sm text-slate-600 mb-3">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <span>{format(sessionDate, 'MMM d, yyyy')}</span>
              
              {(timeFrom && timeTo) && (
                <>
                  <span className="mx-1.5">•</span>
                  <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <span>{formatTimeRange(timeFrom, timeTo)}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Right section: Action buttons */}
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); alert('Preview'); }}>
              <Eye className="h-4 w-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); alert('Download'); }}>
              <Download className="h-4 w-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); alert('Edit'); }}>
              <Edit className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </div>
        
        {/* Therapist and location info section with improved spacing */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          {/* Always show therapist info */}
          <div className="flex items-center text-sm text-slate-600 mb-2">
            <User className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{session.therapistName}</span>
          </div>
          
          {/* Always show location info */}
          <div className="flex items-center text-sm text-slate-600">
            <MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{session.location}</span>
          </div>
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
  onViewSession: (session: Session | ExtendedSession) => void;
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
  
  // Process the sessions to include additional UI-specific data
  // For demonstration purposes, we'll add mock time and performance data 
  const processedSessions = sessions.map(session => {
    // Extract hours from the session date for the time range demo
    const sessionDate = new Date(session.sessionDate);
    const hour = sessionDate.getHours();
    const hourEnd = (hour + 1) % 24;
    
    // Format hours in 12-hour format with AM/PM
    const formatHour = (h: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${hour12}:00 ${period}`;
    };
    
    // Calculate a mock performance score based on the session ID
    // This ensures consistent colors for the same session
    const mockScore = ((session.id % 5) + 1); // Returns 1-5 based on ID
    
    // Generate a consistent location for demonstration purposes
    const locations = ["Remote", "Office", "Client Home", "Australia", "School"];
    const locationIndex = session.id % locations.length;
    
    return {
      ...session,
      status: "completed", // Force all sessions to be completed
      timeFrom: formatHour(hour),
      timeTo: formatHour(hourEnd),
      performanceScore: mockScore,
      type: 'session' as const,
      location: session.location || locations[locationIndex], // Ensure location is always provided
      // Ensure therapist name is always provided
      therapistName: `Therapist ${session.therapistId || (session.id % 10 + 1)}`
    } as ExtendedSession;
  });
  
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