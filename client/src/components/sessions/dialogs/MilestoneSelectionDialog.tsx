import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Subgoal } from "@shared/schema";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MilestoneSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subgoals: Subgoal[];
  selectedMilestoneIds: number[];
  onSelectMilestone: (subgoal: Subgoal) => void;
}

/**
 * Dialog component for selecting milestones (subgoals) to assess in a session
 */
export function MilestoneSelectionDialog({
  open,
  onOpenChange,
  subgoals,
  selectedMilestoneIds,
  onSelectMilestone
}: MilestoneSelectionDialogProps) {
  const [localSubgoals, setLocalSubgoals] = useState<Subgoal[]>([]);
  const [goalId, setGoalId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Hard-coded subgoals for common goals
  const hardcodedSubgoals: Record<number, Subgoal[]> = {
    // Goal ID 24: Improve articulation of /s/ sounds
    24: [
      { id: 38, goalId: 24, title: "Initial /s/ sounds", description: "Improve articulation of 's' sound at beginning of words", status: "in-progress" },
      { id: 39, goalId: 24, title: "Medial /s/ sounds", description: "Improve articulation of 's' sound in middle of words", status: "not-started" }
    ],
    // Goal ID 25: Improve social skills
    25: [
      { id: 40, goalId: 25, title: "Initiating conversations", description: "Learn to appropriately start conversations with peers", status: "in-progress" }
    ]
  };

  // Get the goalId from the current context
  useEffect(() => {
    if (open) {
      // First try from subgoals passed in
      let extractedGoalId = subgoals.length > 0 ? subgoals[0]?.goalId : null;

      // If not found, try from selected goal
      if (!extractedGoalId) {
        const selectedGoalId = queryClient.getQueryData<number>(['selectedGoalId']);
        if (selectedGoalId) {
          extractedGoalId = selectedGoalId;
        }
      }

      // If still not found, try from currentGoalIndex
      if (!extractedGoalId) {
        const formState = queryClient.getQueryData<any>(['formState']);
        const performanceAssessments = formState?.performanceAssessments || [];
        const currentGoalIndex = formState?.currentGoalIndex;

        if (currentGoalIndex !== null && performanceAssessments[currentGoalIndex]) {
          extractedGoalId = performanceAssessments[currentGoalIndex].goalId;
        }
      }

      if (extractedGoalId) {
        setGoalId(extractedGoalId);
        console.log("MilestoneSelectionDialog: Found goalId:", extractedGoalId);
      } else {
        console.log("WARNING: Could not determine goal ID for milestone selection");
      }
    }
  }, [open, subgoals, queryClient]);

  // Fetch subgoals or fall back to hardcoded
  useEffect(() => {
    if (open && goalId) {
      console.log("MilestoneSelectionDialog: Fetching subgoals for goal:", goalId);

      // Try to fetch subgoals from API
      fetch(`/api/goals/${goalId}/subgoals`)
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to fetch subgoals");
          }
          return response.json();
        })
        .then(data => {
          console.log("MilestoneSelectionDialog: Received subgoals:", data);
          if (Array.isArray(data) && data.length > 0) {
            setLocalSubgoals(data);
          } else {
            console.log("No subgoals found, using hardcoded subgoals for goal", goalId);
            setLocalSubgoals(hardcodedSubgoals[goalId] || []);
          }
        })
        .catch(error => {
          console.error("Error fetching subgoals:", error);
          // Fall back to hardcoded subgoals
          console.log("Falling back to hardcoded subgoals for goal", goalId);
          setLocalSubgoals(hardcodedSubgoals[goalId] || []);
        });
    }
  }, [open, goalId]);

  // Filter out already selected subgoals
  const availableSubgoals = localSubgoals.length > 0 
    ? localSubgoals.filter(subgoal => !selectedMilestoneIds.includes(subgoal.id))
    : subgoals.filter(subgoal => !selectedMilestoneIds.includes(subgoal.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Milestone</DialogTitle>
          <DialogDescription>
            Choose a milestone to assess for this goal
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {availableSubgoals.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">
                {localSubgoals.length > 0 ? "All milestones have been selected" : "No milestones found for this goal"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableSubgoals.map(subgoal => (
                <Card 
                  key={subgoal.id} 
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => {
                    onSelectMilestone(subgoal);
                    onOpenChange(false);
                  }}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{subgoal.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">{subgoal.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}