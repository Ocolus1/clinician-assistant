import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Edit, Loader2 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Session, SessionNote, PerformanceAssessment, MilestoneAssessment, Goal, Subgoal } from "@shared/schema";

interface SessionNoteViewProps {
  session: Session & { clientName: string };
  onEdit: () => void;
  initialTabValue?: string;
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
    <div className="flex flex-col">
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

export function SessionNoteView({ session, onEdit, initialTabValue = "general" }: SessionNoteViewProps) {
  const [activeTab, setActiveTab] = React.useState(initialTabValue);
  
  const { 
    data: completeNote,
    isLoading: noteLoading,
    error: noteError
  } = useQuery({
    queryKey: ["/api/sessions", session.id, "notes", "complete"],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${session.id}/notes/complete`);
      if (!response.ok) {
        throw new Error("Failed to fetch session note");
      }
      return response.json();
    },
  });

  // Fetch goals to get their titles
  const { 
    data: goals = [],
    isLoading: goalsLoading
  } = useQuery<Goal[]>({
    queryKey: ["/api/clients", session.clientId, "goals"],
    enabled: !!completeNote,
  });

  // Fetch subgoals for each goal
  const subgoalQueries = goals.map((goal) => ({
    queryKey: ["/api/goals", goal.id, "subgoals"],
    enabled: !!goals.length,
  }));

  const subgoalsResults = subgoalQueries.map((query) => useQuery<Subgoal[]>(query));
  
  // Map performance assessments to goals
  const assessmentsWithGoals = React.useMemo(() => {
    if (!completeNote?.performanceAssessments || !goals.length) return [];
    
    return completeNote.performanceAssessments.map((assessment: PerformanceAssessment) => {
      const goal = goals.find(g => g.id === assessment.goalId);
      const subgoals = subgoalsResults.find(
        (_, index) => goals[index].id === assessment.goalId
      )?.data || [];
      
      return {
        ...assessment,
        goal,
        subgoals,
        milestones: (assessment as any).milestones || [],
      };
    });
  }, [completeNote, goals, subgoalsResults]);

  if (noteLoading || goalsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg text-muted-foreground">Loading session note...</span>
      </div>
    );
  }

  if (noteError || !completeNote) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Session Notes</span>
            <Button size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </CardTitle>
          <CardDescription>
            No notes have been recorded for this session yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Session Notes</span>
          <Button size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Note
          </Button>
        </CardTitle>
        <CardDescription>
          Session notes for {session.title} - {typeof session.sessionDate === 'string' ? 
            new Date(session.sessionDate).toLocaleDateString() : 
            (session.sessionDate as any)?.toLocaleDateString() || ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="general">General Observations</TabsTrigger>
            <TabsTrigger value="present">Present in Session</TabsTrigger>
            <TabsTrigger value="performance">Performance Assessment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <div className="border rounded-md p-4 bg-muted/10">
              <h4 className="text-sm font-medium mb-2">Notes</h4>
              <p className="whitespace-pre-line">
                {completeNote.notes || "No general notes recorded for this session."}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <RatingDisplay label="Mood" value={completeNote.moodRating || 0} />
              <RatingDisplay label="Physical Activity" value={completeNote.physicalActivityRating || 0} />
              <RatingDisplay label="Focus" value={completeNote.focusRating || 0} />
              <RatingDisplay label="Cooperation" value={completeNote.cooperationRating || 0} />
            </div>
          </TabsContent>
          
          <TabsContent value="present">
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-2">Present in Session</h4>
              {completeNote.presentAllies && completeNote.presentAllies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {completeNote.presentAllies.map((ally: string) => (
                    <Badge key={ally} variant="secondary">
                      {ally}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No allies were present in this session.</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="performance">
            <ScrollArea className="h-[400px] pr-4">
              {assessmentsWithGoals.length > 0 ? (
                <div className="space-y-6">
                  {assessmentsWithGoals.map((assessment: any) => (
                    <div key={assessment.id} className="border rounded-md p-4">
                      <h4 className="text-base font-medium mb-1">
                        {assessment.goal?.title || "Unknown Goal"}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {assessment.goal?.description || ""}
                      </p>
                      
                      {assessment.notes && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium mb-1">Goal Notes</h5>
                          <p className="text-sm bg-muted/10 p-2 rounded-md whitespace-pre-line">
                            {assessment.notes}
                          </p>
                        </div>
                      )}
                      
                      {assessment.milestones && assessment.milestones.length > 0 && (
                        <div className="space-y-4 mt-4">
                          <h5 className="text-sm font-medium">Milestone Assessments</h5>
                          
                          {assessment.milestones.map((milestone: MilestoneAssessment) => {
                            // Find corresponding subgoal using milestoneId
                            // The milestoneId is a combination of goalId and subgoalId
                            const milestoneIdStr = milestone.milestoneId.toString();
                            const subgoalIdStr = milestoneIdStr.substring(
                              assessment.goal?.id.toString().length
                            );
                            
                            const subgoal = assessment.subgoals.find(
                              (s: Subgoal) => s.id.toString() === subgoalIdStr
                            );
                            
                            return (
                              <div key={milestone.id} className="border rounded-md p-3">
                                <h6 className="text-sm font-medium mb-1">
                                  {subgoal?.title || "Unknown Milestone"}
                                </h6>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {subgoal?.description || ""}
                                </p>
                                
                                <div className="flex items-center mb-3">
                                  <span className="text-xs font-medium text-gray-500 mr-2">Progress Rating:</span>
                                  <div className="w-full max-w-[200px] bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="h-2 rounded-full bg-primary" 
                                      style={{ width: `${(milestone.rating || 0) * 10}%` }}
                                    ></div>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className="ml-2 text-xs"
                                  >
                                    {milestone.rating || 0}/10
                                  </Badge>
                                </div>
                                
                                {milestone.strategies && milestone.strategies.length > 0 && (
                                  <div className="mb-2">
                                    <span className="text-xs font-medium text-gray-500 block mb-1">Strategies Used:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {milestone.strategies.map((strategy: string) => (
                                        <Badge key={strategy} variant="outline" className="text-xs">
                                          {strategy}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {milestone.notes && (
                                  <div>
                                    <span className="text-xs font-medium text-gray-500 block mb-1">Notes:</span>
                                    <p className="text-xs bg-muted/10 p-2 rounded-md whitespace-pre-line">
                                      {milestone.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-md">
                  <p className="text-muted-foreground">
                    No performance assessments have been recorded for this session.
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}