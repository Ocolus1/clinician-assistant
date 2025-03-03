import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  Edit,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionNoteView } from "./SessionNoteView";
import { SessionNoteForm } from "./SessionNoteForm";
import { Session, SessionNote } from "@/shared/schema";

interface SessionDetailsProps {
  session: Session & { clientName: string };
  onBack: () => void;
}

export function SessionDetails({ session, onBack }: SessionDetailsProps) {
  const [editingNote, setEditingNote] = useState(false);
  
  // Fetch the session note to determine if we should show the view or create form
  const { 
    data: sessionNote,
    isLoading: noteLoading,
    error: noteError
  } = useQuery<SessionNote>({
    queryKey: ["/api/sessions", session.id, "notes"],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${session.id}/notes`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch session note");
      }
      return response.json();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Scheduled</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
        {getStatusBadge(session.status)}
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{session.title}</h2>
        <p className="text-muted-foreground">
          {session.description || "No description provided."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center">
          <UserIcon className="h-5 w-5 mr-2 text-muted-foreground" />
          <span>Client: </span>
          <span className="ml-1 font-medium">{session.clientName}</span>
        </div>
        <div className="flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-muted-foreground" />
          <span>Date: </span>
          <span className="ml-1 font-medium">{formatDate(session.sessionDate)}</span>
        </div>
        <div className="flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-muted-foreground" />
          <span>Time: </span>
          <span className="ml-1 font-medium">
            {formatTime(session.sessionDate)} ({session.duration} minutes)
          </span>
        </div>
        <div className="flex items-center">
          <MapPinIcon className="h-5 w-5 mr-2 text-muted-foreground" />
          <span>Location: </span>
          <span className="ml-1 font-medium">{session.location || "No location specified"}</span>
        </div>
      </div>

      <div className="border-t mt-6 pt-6">
        {noteLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading session notes...</span>
          </div>
        ) : editingNote || (!sessionNote && session.status === "completed") ? (
          <SessionNoteForm
            open={true}
            onOpenChange={() => setEditingNote(false)}
            session={session}
            initialData={sessionNote}
          />
        ) : sessionNote ? (
          <SessionNoteView 
            session={session} 
            onEdit={() => setEditingNote(true)} 
          />
        ) : (
          <div className="text-center py-8 border rounded-md">
            <h3 className="text-lg font-medium mb-2">No Session Notes</h3>
            <p className="text-muted-foreground mb-4">
              {session.status === "scheduled" 
                ? "Notes can be added after the session is completed." 
                : "No notes have been recorded for this session yet."}
            </p>
            {session.status === "completed" && (
              <Button onClick={() => setEditingNote(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Add Session Note
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}