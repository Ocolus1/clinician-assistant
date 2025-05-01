import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Target, Plus } from "lucide-react";
import type { Goal, Subgoal } from "@shared/schema";
import GoalCard from './GoalCard';
import GoalPreviewDialog from './GoalPreviewDialog';

interface PatientGoalsProps {
  goals: Goal[];
  subgoals: Record<number, Subgoal[]>; // Map of goalId -> subgoals
  onAddGoal?: () => void;
  onEditGoal?: (goal: Goal) => void;
  onArchiveGoal?: (goal: Goal) => void;
  onAddSubgoal?: (goalId: number) => void;
  onEditSubgoal?: (subgoal: Subgoal) => void;
  onToggleSubgoalStatus?: (subgoal: Subgoal) => void;
}

export default function PatientGoals({ 
  goals, 
  subgoals,
  onAddGoal,
  onEditGoal,
  onArchiveGoal,
  onAddSubgoal,
  onEditSubgoal,
  onToggleSubgoalStatus
}: PatientGoalsProps) {
  // Added debugging
  console.log("PatientGoals: Goals received:", goals);
  console.log("PatientGoals: Subgoals received:", subgoals);
  
  // State for the goal preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  
  // Handler for opening the preview dialog
  const handlePreviewGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setPreviewOpen(true);
  };
  
  return (
    <div className="space-y-6">
      {/* Preview Dialog */}
      <GoalPreviewDialog 
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        goal={selectedGoal}
        subgoals={selectedGoal ? (subgoals[selectedGoal.id] || []) : []}
        onAddMeasurementPoint={onAddSubgoal || (() => {})}
        onEditMeasurementPoint={onEditSubgoal || (() => {})}
        onToggleMeasurementStatus={onToggleSubgoalStatus || (() => {})}
        onArchiveMeasurementPoint={() => {}}
      />
      
      {goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-500 mb-2">No goals set yet</h4>
          <p className="text-gray-500 mb-4">Set therapeutic goals and track progress over time.</p>
          <Button onClick={onAddGoal}>Add First Goal</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grid layout for goal cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <GoalCard 
                key={goal.id}
                goal={goal}
                subgoals={subgoals[goal.id] || []}
                onPreview={handlePreviewGoal}
                onEdit={onEditGoal || (() => {})}
                onArchive={onArchiveGoal || (() => {})}
              />
            ))}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button className="flex items-center" onClick={onAddGoal}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Goal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
