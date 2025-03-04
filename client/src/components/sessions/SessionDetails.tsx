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
  Users,
  Package,
  BarChart
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionNoteView } from "./SessionNoteView";
import { SessionNoteForm } from "./SessionNoteForm";
import { Session, SessionNote } from "@shared/schema";

interface SessionDetailsProps {
  session: Session & { clientName: string };
  onBack: () => void;
}

interface RatingDisplayProps {
  label: string;
  value: number;
}

const RatingDisplay = ({ label, value }: RatingDisplayProps) => {
  const getColorClass = (val: number) => {
    if (val >= 8) return "bg-green-100 text-green-800 border-green-300";
    if (val >= 5) return "bg-blue-100 text-blue-800 border-blue-300";
    if (val >= 3) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  return (
    <div className="flex flex-col mb-3">
      <span className="text-sm font-medium text-gray-500 mb-1">{label}</span>
      <div className="flex items-center">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="h-2.5 rounded-full bg-primary" 
            style={{ width: `${value * 10}%` }}
          ></div>
        </div>
        <Badge 
          variant="outline" 
          className={`ml-2 ${getColorClass(value)}`}
        >
          {value}/10
        </Badge>
      </div>
    </div>
  );
};

export function SessionDetails({ session, onBack }: SessionDetailsProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
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

  // Fetch complete note for additional details
  const { 
    data: completeNote,
    isLoading: completeNoteLoading
  } = useQuery({
    queryKey: ["/api/sessions", session.id, "notes", "complete"],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${session.id}/notes/complete`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch complete session note");
      }
      return response.json();
    },
    enabled: !!sessionNote,
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

  // Render the Session Details tab with three-column layout
  const renderSessionDetailsTab = () => {
    return (
      <div className="space-y-6">
        {/* Session Information (Full Width) */}
        <div className="bg-white rounded-md border p-4 shadow-sm">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Session ID: #{session.id}</p>
                <h2 className="text-2xl font-bold">{session.title}</h2>
              </div>
              <div className="flex items-start space-x-2">
                {getStatusBadge(session.status)}
                {session.status === "completed" && !sessionNote && (
                  <Button size="sm" onClick={() => setEditingNote(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                )}
                {session.status === "completed" && sessionNote && (
                  <Button size="sm" onClick={() => setEditingNote(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Note
                  </Button>
                )}
              </div>
            </div>
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
        </div>

        {/* Show loading state while fetching notes */}
        {(noteLoading || completeNoteLoading) && (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading session notes...</span>
          </div>
        )}

        {/* Three-column layout if we have session notes */}
        {!noteLoading && !completeNoteLoading && sessionNote && completeNote && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left Column - Present Section */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  Present in Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completeNote.presentAllies && completeNote.presentAllies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {completeNote.presentAllies.map((ally: string) => (
                      <Badge key={ally} variant="secondary">
                        {ally}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No allies were present in this session.</p>
                )}
              </CardContent>
            </Card>

            {/* Middle Column - Products Used Section */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                  Products Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completeNote.products && completeNote.products.length > 0 ? (
                  <div className="space-y-2">
                    {completeNote.products.map((product: any, index: number) => (
                      <div key={index} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.code}</p>
                        </div>
                        <Badge>{product.quantity} used</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No products were used in this session.</p>
                )}
              </CardContent>
            </Card>

            {/* Right Column - Observations Section */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <BarChart className="h-4 w-4 mr-2 text-muted-foreground" />
                  Observations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RatingDisplay label="Mood" value={completeNote.moodRating || 0} />
                <RatingDisplay label="Physical Activity" value={completeNote.physicalActivityRating || 0} />
                <RatingDisplay label="Focus" value={completeNote.focusRating || 0} />
                <RatingDisplay label="Cooperation" value={completeNote.cooperationRating || 0} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* If no session notes yet, show placeholder */}
        {!noteLoading && !sessionNote && session.status === "completed" && (
          <div className="text-center py-8 border rounded-md">
            <h3 className="text-lg font-medium mb-2">No Session Notes</h3>
            <p className="text-muted-foreground mb-4">
              No notes have been recorded for this session yet.
            </p>
            <Button onClick={() => setEditingNote(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Add Session Note
            </Button>
          </div>
        )}

        {!noteLoading && !sessionNote && session.status === "scheduled" && (
          <div className="text-center py-8 border rounded-md">
            <h3 className="text-lg font-medium mb-2">No Session Notes</h3>
            <p className="text-muted-foreground mb-4">
              Notes can be added after the session is completed.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Session Details</TabsTrigger>
          <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          {renderSessionDetailsTab()}
        </TabsContent>
        
        <TabsContent value="performance">
          {editingNote ? (
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
              initialTabValue="performance"
            />
          ) : (
            <div className="text-center py-8 border rounded-md">
              <h3 className="text-lg font-medium mb-2">No Performance Assessment</h3>
              <p className="text-muted-foreground mb-4">
                {session.status === "scheduled" 
                  ? "Performance assessment can be added after the session is completed." 
                  : "No performance assessment has been recorded for this session yet."}
              </p>
              {session.status === "completed" && (
                <Button onClick={() => setEditingNote(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Add Session Note
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}