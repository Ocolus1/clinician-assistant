import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit, Plus, Archive, Target, CheckCircle, Circle } from "lucide-react";
import type { Goal, Subgoal } from "@shared/schema";

// No longer need the SparkLine component - removed

// Component for the detailed gauge
const DetailedGauge = ({ value, size = 120, strokeWidth = 12 }: { value: number, size?: number, strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  let color = "";
  let textColor = "";
  if (value >= 75) {
    color = "stroke-green-500";
    textColor = "text-green-700";
  } else if (value >= 50) {
    color = "stroke-blue-500";
    textColor = "text-blue-700";
  } else if (value >= 25) {
    color = "stroke-amber-500";
    textColor = "text-amber-700";
  } else {
    color = "stroke-gray-400";
    textColor = "text-gray-700";
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e6e6e6"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${textColor}`}>{value}%</span>
        {/* Removed Progress label */}
      </div>
    </div>
  );
};

interface GoalPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  subgoals: Subgoal[];
  onAddMilestone: (goalId: number) => void;
  onEditMilestone: (subgoal: Subgoal) => void;
  onToggleMilestoneStatus: (subgoal: Subgoal) => void;
  onArchiveMilestone: (subgoal: Subgoal) => void; // Added archive function
}

const GoalPreviewDialog = ({ 
  open, 
  onOpenChange, 
  goal, 
  subgoals, 
  onAddMilestone,
  onEditMilestone,
  onToggleMilestoneStatus,
  onArchiveMilestone // Added archive function
}: GoalPreviewDialogProps) => {
  if (!goal) return null;

  // Calculate progress based on subgoals status
  const calculateProgress = (): number => {
    if (!subgoals || subgoals.length === 0) return 0;
    const completedSubgoals = subgoals.filter(sg => sg.status === 'completed').length;
    return Math.round((completedSubgoals / subgoals.length) * 100);
  };

  const progress = calculateProgress();

  // Determine priority color for badge
  const getPriorityColor = (priority: string | null) => {
    if (!priority) return "bg-gray-100 text-gray-700 border-gray-200";

    if (priority.toLowerCase().includes("high")) 
      return "bg-red-100 text-red-700 border-red-200";
    if (priority.toLowerCase().includes("medium")) 
      return "bg-amber-100 text-amber-700 border-amber-200";
    if (priority.toLowerCase().includes("low")) 
      return "bg-blue-100 text-blue-700 border-blue-200";

    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Generate mock progress data for sparklines (in real app, would use actual data)
  const generateMockProgressData = (subgoal: Subgoal): number[] => {
    // Generate 5 data points that trend upward if completed, or random if not
    const base = subgoal.id % 5; // Use ID to get varied starting points

    if (subgoal.status === 'completed') {
      return [base, base + 1, base + 3, base + 6, 10]; // Trending up to maximum
    } else {
      // Create some random variation
      return [
        base, 
        base + Math.floor(Math.random() * 3), 
        base + Math.floor(Math.random() * 4), 
        base + Math.floor(Math.random() * 5),
        base + Math.floor(Math.random() * 6),
      ];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{goal.title}</DialogTitle>
              <div className="flex items-center mt-2">
                <Badge className={getPriorityColor(goal.priority)}>
                  {goal.priority || "No Priority"}
                </Badge>
              </div>
            </div>
            <div className="flex-shrink-0">
              <DetailedGauge value={progress} />
            </div>
          </div>

          <DialogDescription className="mt-4 text-base text-gray-700">
            {goal.description}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Target className="h-5 w-5 mr-2 text-primary" />
              Milestones
            </h3>

            <Button 
              onClick={() => onAddMilestone(goal.id)}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Milestone
            </Button>
          </div>

          {subgoals.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-md bg-gray-50">
              <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-500 mb-2">No milestones set yet</h4>
              <p className="text-gray-500 mb-4">Add milestones to track progress towards this goal.</p>
              <Button 
                onClick={() => onAddMilestone(goal.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Milestone
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subgoals.map((subgoal) => {
                const progressData = generateMockProgressData(subgoal);

                return (
                  <div 
                    key={subgoal.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start">
                      <div 
                        className="flex-shrink-0 mt-0.5 mr-3 cursor-pointer"
                        onClick={() => onToggleMilestoneStatus(subgoal)}
                      >
                        {subgoal.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-medium text-md ${subgoal.status === 'completed' ? 'text-gray-500' : ''}`}>
                              {subgoal.title}
                            </h4>
                            {subgoal.description && (
                              <p className="text-sm text-gray-600 mt-1">{subgoal.description}</p>
                            )}
                          </div>

                          <div className="flex flex-col items-start ml-4">
                            <span className="text-sm text-gray-500 mb-1">Progress</span>
                            {/* Empty div in place of sparklines - completely removed */}
                            <div className="w-20 h-10 flex items-center justify-center">
                              <span className="text-sm text-gray-500">
                                {subgoal.status === 'completed' ? "Completed" : "In progress"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="ml-2 h-7 w-7 flex-shrink-0" 
                          onClick={() => onEditMilestone(subgoal)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="ml-2 h-7 w-7 flex-shrink-0" 
                          onClick={() => onArchiveMilestone(subgoal)}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoalPreviewDialog;