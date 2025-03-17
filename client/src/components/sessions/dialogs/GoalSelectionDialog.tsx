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
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Debug function to help identify issues
  const logGoalState = (source: string) => {
    console.log(`[${source}] Goals state:`, {
      propGoals: propGoals?.length || 0,
      localGoals: localGoals?.length || 0,
      selectedGoalIds: selectedGoalIds?.length || 0,
      open
    });
    
    if (propGoals?.length > 0) {
      console.table(propGoals.map(g => ({id: g.id, title: g.title, isSelected: selectedGoalIds.includes(g.id)})));
    }
  };
  
  // Reset error when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);
  
  // Prioritize using provided prop goals first, which come from parent component
  useEffect(() => {
    if (open) {
      console.log("### GOAL DIALOG OPENED ###");
      logGoalState("Dialog opened");
      
      // **** FIRST FIX: Always use propGoals if they exist, regardless of length ****
      // First use the goals passed in as props if they're available
      if (propGoals) {
        console.log("Using goals from props:", propGoals);
        setLocalGoals(propGoals);
        
        if (propGoals.length === 0) {
          setError("No goals found for this client.");
          console.warn("WARNING: propGoals array is empty");
        }
        
        // Also log the selectedGoalIds to check for filtering issues
        if (selectedGoalIds.length > 0) {
          console.log("Selected goal IDs:", selectedGoalIds);
          const remainingGoals = propGoals.filter(goal => !selectedGoalIds.includes(goal.id));
          console.log("Available goals after filtering selected ones:", remainingGoals);
          
          if (remainingGoals.length === 0 && propGoals.length > 0) {
            console.warn("WARNING: All goals have been selected already");
          }
        }
        return;
      }
      
      // If no prop goals, try to get clientId and fetch them
      const formClientId = queryClient.getQueryData<any>(['formState'])?.clientId;
      if (!formClientId) {
        console.error("No clientId found in form state");
        setError("Could not determine client ID. Please try again.");
        return;
      }
      
      console.log("GoalSelectionDialog fetching goals for clientId:", formClientId);
      setError("Loading goals...");

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
            setError(null);
            
            // Log after setting to check what's available for selection
            console.log("Goals set from direct fetch. Available count:", data.length);
            if (selectedGoalIds.length > 0) {
              const remainingGoals = data.filter(goal => !selectedGoalIds.includes(goal.id));
              console.log("Available goals after filtering selected ones:", remainingGoals);
              
              if (remainingGoals.length === 0) {
                setError("All goals for this client have already been selected for assessment.");
              }
            }
          } else {
            console.log("No goals found for client");
            setLocalGoals([]);
            setError("No goals found for this client. Please add goals in the client profile before creating a session.");
          }
        })
        .catch(error => {
          console.error("Error fetching goals:", error);
          setLocalGoals([]);
          setError(`Error loading goals: ${error.message}`);
        });
    }
  }, [open, propGoals, queryClient, selectedGoalIds]);

  // **** SECOND FIX: Add debug logging when filtering happens ****
  // Filter out already selected goals
  const availableGoals = React.useMemo(() => {
    console.log("FILTERING GOALS: Local goals:", localGoals);
    console.log("FILTERING GOALS: Selected goal IDs:", selectedGoalIds);
    
    // Ensure we have valid arrays to work with
    if (!Array.isArray(localGoals)) {
      console.error("localGoals is not an array:", localGoals);
      return [];
    }
    
    if (!Array.isArray(selectedGoalIds)) {
      console.error("selectedGoalIds is not an array:", selectedGoalIds);
      return localGoals;
    }
    
    // CRITICAL FIX: Convert IDs to numbers for reliable comparison
    const selectedIdsAsNumbers = selectedGoalIds.map(id => Number(id));
    console.log("Selected IDs as numbers:", selectedIdsAsNumbers);
    
    // Filter out goals that are already selected
    const filtered = localGoals.filter(goal => !selectedIdsAsNumbers.includes(Number(goal.id)));
    console.log(`Filtering ${localGoals.length} goals - ${filtered.length} available, ${selectedGoalIds.length} selected`);
    
    return filtered;
  }, [localGoals, selectedGoalIds]);

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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!error && availableGoals.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center">
              <p className="text-muted-foreground">
                {localGoals.length > 0 
                  ? "All goals have been selected for assessment" 
                  : "No goals found for this client"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableGoals.map(goal => (
                <Card 
                  key={goal.id} 
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() => {
                    console.log("Goal Card Clicked - Selecting goal:", goal);
                    
                    // Wrap in try/catch to debug any potential issues
                    try {
                      // Call the parent component's selection handler
                      onSelectGoal(goal);
                      
                      // Log the selection action occurred
                      console.log("Goal selection handler called successfully");
                      
                      // Close the dialog
                      onOpenChange(false);
                    } catch (error) {
                      console.error("Error selecting goal:", error);
                      // Don't close dialog if there's an error
                    }
                  }}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                  </CardHeader>
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