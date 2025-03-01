import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Target, Award, Edit, Plus, Archive, Trash2 } from "lucide-react";
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
  // Calculate goal progress based on subgoals status
  const calculateProgress = (goalId: number): number => {
    const goalSubgoals = subgoals[goalId] || [];
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
              <Card key={goal.id} className="overflow-hidden">
                <CardHeader className="py-4 px-6 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                        <Award className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{goal.title}</h4>
                        <div className="text-sm text-gray-500">
                          Added {format(new Date(), 'PP')}
                        </div>
                      </div>
                    </div>
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
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <p className="text-gray-600">{goal.description}</p>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="text-sm font-medium">Overall Progress</h5>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Subgoals</h5>
                    
                    {goalSubgoals.length === 0 ? (
                      <div className="text-sm text-gray-500 italic py-2">
                        No subgoals added yet. Add subgoals to track specific milestones.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {goalSubgoals.map((subgoal) => (
                          <div 
                            key={subgoal.id} 
                            className="flex items-center py-2 px-3 border border-gray-100 rounded-md hover:bg-gray-50"
                            onClick={() => onToggleSubgoalStatus && onToggleSubgoalStatus(subgoal)}
                          >
                            <div 
                              className={`h-6 w-6 rounded-full flex items-center justify-center mr-3
                                ${subgoal.status === 'completed' 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-blue-50 text-blue-600'}`}
                            >
                              <Target className="h-3 w-3" />
                            </div>
                            <div className="flex-1">
                              <h6 className={`font-medium text-sm ${subgoal.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                {subgoal.title}
                              </h6>
                              {subgoal.description && (
                                <p className="text-xs text-gray-500">{subgoal.description}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {subgoal.status || 'Pending'}
                            </Badge>
                            {onEditSubgoal && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="ml-2" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSubgoal(subgoal);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 py-3 px-6 bg-gray-50 border-t">
                  {onArchiveGoal && (
                    <Button variant="outline" size="sm" onClick={() => onArchiveGoal(goal)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                  )}
                  {onEditGoal && (
                    <Button variant="outline" size="sm" onClick={() => onEditGoal(goal)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Goal
                    </Button>
                  )}
                  {onAddSubgoal && (
                    <Button size="sm" onClick={() => onAddSubgoal(goal.id)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subgoal
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