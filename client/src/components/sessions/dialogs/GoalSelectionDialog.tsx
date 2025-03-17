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
  goals: propGoals, 
  selectedGoalIds, 
  onSelectGoal 
}: GoalSelectionDialogProps) {
  const [localGoals, setLocalGoals] = useState<Goal[]>([]);
  const queryClient = useQueryClient();
  
  // Prioritize using provided prop goals first, which come from parent component
  useEffect(() => {
    if (open) {
      console.log("### GOAL DIALOG OPENED ###");
      console.log("propGoals received:", propGoals);
      console.log("propGoals length:", propGoals?.length || 0);
      console.log("selectedGoalIds:", selectedGoalIds);
      
      // First use the goals passed in as props if they're available
      if (propGoals && propGoals.length > 0) {
        console.log("Using goals from props:", propGoals);
        setLocalGoals(propGoals);
        
        // Also log the selectedGoalIds to check for filtering issues
        if (selectedGoalIds.length > 0) {
          console.log("Selected goal IDs:", selectedGoalIds);
          const remainingGoals = propGoals.filter(goal => !selectedGoalIds.includes(goal.id));
          console.log("Available goals after filtering selected ones:", remainingGoals);
        }
        return;
      }
      
      // If no prop goals, try to get clientId and fetch them
      const formClientId = queryClient.getQueryData<any>(['formState'])?.clientId;
      if (!formClientId) {
        console.error("No clientId found in form state");
        return;
      }
      
      console.log("GoalSelectionDialog fetching goals for clientId:", formClientId);

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
            
            // Log after setting to check what's available for selection
            console.log("Goals set from direct fetch. Available count:", data.length);
            if (selectedGoalIds.length > 0) {
              const remainingGoals = data.filter(goal => !selectedGoalIds.includes(goal.id));
              console.log("Available goals after filtering selected ones:", remainingGoals);
            }
          } else {
            console.log("No goals found for client");
            setLocalGoals([]);
          }
        })
        .catch(error => {
          console.error("Error fetching goals:", error);
          setLocalGoals([]);
        });
    }
  }, [open, propGoals, queryClient, selectedGoalIds]);

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