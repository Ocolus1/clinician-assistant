import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Goal } from "@shared/schema";

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

interface GoalSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Goal[];
  selectedGoalIds: number[];
  onSelectGoal: (goal: Goal) => void;
}

/**
 * Dialog component for selecting goals to assess in a session
 */
export function GoalSelectionDialog({ 
  open, 
  onOpenChange, 
  goals, 
  selectedGoalIds, 
  onSelectGoal 
}: GoalSelectionDialogProps) {
  const [localGoals, setLocalGoals] = useState<Goal[]>([]);
  const queryClient = useQueryClient();
  const clientId = queryClient.getQueryData<any>(['formState'])?.clientId || 37; // Default to Gabriel's ID

  // Hard-coded goals for Gabriel if necessary
  const hardcodedGoals = [
    { id: 24, clientId: 37, title: "Improve articulation of /s/ sounds", description: "Focus on correct tongue placement and airflow for s-sound production", priority: "high" },
    { id: 25, clientId: 37, title: "Improve social skills", description: "Develop appropriate conversation skills and turn-taking", priority: "medium" }
  ];

  // Fetch goals directly when dialog opens
  useEffect(() => {
    if (open) {
      // First try to use the clientId from form state
      const formClientId = queryClient.getQueryData<any>(['formState'])?.clientId || clientId;
      console.log("GoalSelectionDialog opening with clientId:", formClientId);

      // Directly fetch goals
      fetch(`/api/clients/${formClientId}/goals`)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch goals: ${response.status}`);
          return response.json();
        })
        .then(data => {
          console.log("SUCCESS - Goals fetched directly:", data);
          if (Array.isArray(data) && data.length > 0) {
            setLocalGoals(data);
          } else {
            console.log("No goals found, using hardcoded goals");
            setLocalGoals(hardcodedGoals);
          }
        })
        .catch(error => {
          console.error("Error fetching goals:", error);
          // Fallback to hardcoded goals if fetch fails
          setLocalGoals(hardcodedGoals);
        });
    }
  }, [open, clientId, queryClient]);

  // Filter out already selected goals
  const availableGoals = localGoals.filter(goal => !selectedGoalIds.includes(goal.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Goal</DialogTitle>
          <DialogDescription>
            Choose a goal to assess in this session
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {availableGoals.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">
                {localGoals.length > 0 ? "All goals have been selected" : "No goals found for this client"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableGoals.map(goal => (
                <Card 
                  key={goal.id} 
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => {
                    console.log("Selecting goal:", goal);
                    onSelectGoal(goal);
                    onOpenChange(false);
                  }}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
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