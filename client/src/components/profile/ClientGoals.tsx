import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Target, Award, Edit, Plus, Archive, CheckCircle, Circle } from "lucide-react";
import type { Goal, Subgoal } from "@shared/schema";

interface ClientGoalsProps {
  goals: Goal[];
  subgoals: Record<number, Subgoal[]>; // Map of goalId -> subgoals
  onAddGoal?: () => void;
  onEditGoal?: (goal: Goal) => void;
  onArchiveGoal?: (goal: Goal) => void;
  onAddSubgoal?: (goalId: number) => void;
  onEditSubgoal?: (subgoal: Subgoal) => void;
  onToggleSubgoalStatus?: (subgoal: Subgoal) => void;
}

export default function ClientGoals({ 
  goals, 
  subgoals,
  onAddGoal,
  onEditGoal,
  onArchiveGoal,
  onAddSubgoal,
  onEditSubgoal,
  onToggleSubgoalStatus
}: ClientGoalsProps) {
  // Added debugging
  console.log("ClientGoals: Goals received:", goals);
  console.log("ClientGoals: Subgoals received:", subgoals);
  
  // Calculate goal progress based on subgoals status
  const calculateProgress = (goalId: number): number => {
    const goalSubgoals = subgoals[goalId] || [];
    console.log(`Calculating progress for goal ${goalId}, found ${goalSubgoals.length} subgoals`);
    
    if (goalSubgoals.length === 0) return 0;
    
    const completedSubgoals = goalSubgoals.filter(sg => sg.status === 'completed').length;
    return Math.round((completedSubgoals / goalSubgoals.length) * 100);
  };
  
  return (
    <div className="space-y-6">
      {goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-500 mb-2">No goals set yet</h4>
          <p className="text-gray-500 mb-4">Set therapeutic goals and track progress over time.</p>
          <Button onClick={onAddGoal}>Add First Goal</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {goals.map((goal) => {
            const progress = calculateProgress(goal.id);
            const goalSubgoals = subgoals[goal.id] || [];
            
            return (
              <Card key={goal.id} className="overflow-hidden shadow-sm">
                <CardHeader className="pt-5 pb-4 px-6 relative">
                  <div className="absolute top-4 right-4 flex space-x-1">
                    {onEditGoal && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditGoal(goal)}
                        title="Edit goal"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onArchiveGoal && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onArchiveGoal(goal)}
                        title="Archive goal"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <CardTitle className="text-xl font-semibold">{goal.title}</CardTitle>
                  
                  <div className="flex items-center justify-between mt-1">
                    <Badge 
                      className={
                        progress >= 100 ? "bg-green-100 text-green-700 border-green-200" :
                        progress > 50 ? "bg-blue-100 text-blue-700 border-blue-200" :
                        progress > 0 ? "bg-amber-100 text-amber-700 border-amber-200" : 
                        "bg-gray-100 text-gray-700 border-gray-200"
                      }
                    >
                      {progress >= 100 ? "Completed" :
                       progress > 0 ? "In Progress" : 
                       "Not Started"}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Progress: {progress}%
                    </div>
                  </div>
                </CardHeader>
                
                <Progress value={progress} className="h-1" />
                
                <CardContent className="p-6">
                  <div className="mb-5">
                    <p className="text-gray-700">{goal.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-medium text-base border-b pb-2 mb-3">Milestones</h3>
                    
                    {goalSubgoals.length === 0 ? (
                      <div className="text-sm text-gray-500 italic py-2 border rounded-md border-dashed p-4 text-center">
                        No milestones added yet. Add milestones to track specific progress points.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {goalSubgoals.map((subgoal) => (
                          <div 
                            key={subgoal.id} 
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start">
                              <div 
                                className="flex-shrink-0 mt-0.5 mr-3 cursor-pointer"
                                onClick={() => onToggleSubgoalStatus && onToggleSubgoalStatus(subgoal)}
                              >
                                {subgoal.status === 'completed' ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className={`font-medium text-md ${subgoal.status === 'completed' ? 'text-gray-500' : ''}`}>
                                  {subgoal.title}
                                </h4>
                                {subgoal.description && (
                                  <p className="text-sm text-gray-600 mt-1">{subgoal.description}</p>
                                )}
                              </div>
                              {onEditSubgoal && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="ml-2 h-7 w-7 flex-shrink-0" 
                                  onClick={() => onEditSubgoal(subgoal)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 py-3 px-6 border-t">
                  {onAddSubgoal && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => onAddSubgoal(goal.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
          
          <div className="flex justify-end pt-4">
            <Button className="flex items-center" onClick={onAddGoal}>
              <Target className="h-4 w-4 mr-2" />
              Add New Goal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}