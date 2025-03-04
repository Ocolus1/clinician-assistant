import React, { useState, useEffect } from "react";
import { Goal, Subgoal } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Plus, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface SimpleGoalSelectorProps {
  clientId: number;
  onSelectGoal: (goal: Goal) => void;
  selectedGoalIds: number[];
}

export function SimpleGoalSelector({
  clientId,
  onSelectGoal,
  selectedGoalIds = []
}: SimpleGoalSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [clientGoals, setClientGoals] = useState<Goal[]>([]);
  
  // Fetch goals directly using a useEffect to avoid any issues with the query system
  useEffect(() => {
    if (clientId && isOpen) {
      console.log("Fetching goals for client ID:", clientId);
      
      fetch(`/api/clients/${clientId}/goals`)
        .then(response => response.json())
        .then(data => {
          console.log("Fetched goals:", data);
          setClientGoals(data || []);
        })
        .catch(error => {
          console.error("Error fetching goals:", error);
        });
    }
  }, [clientId, isOpen]);
  
  // Filter out already selected goals
  const availableGoals = clientGoals.filter(
    goal => !selectedGoalIds.includes(goal.id)
  );
  
  const handleGoalClick = (goal: Goal) => {
    onSelectGoal(goal);
    setIsOpen(false);
  };
  
  return (
    <>
      <Button 
        size="sm" 
        className="mb-4 flex items-center" 
        onClick={() => setIsOpen(true)}
        disabled={!clientId}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Goal
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select a Goal</DialogTitle>
            <DialogDescription>
              Choose a goal to assess for this session. You will be guided through selecting milestones,
              rating performance, and tagging strategies.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-auto py-4">
            {availableGoals.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Goals Available</AlertTitle>
                <AlertDescription>
                  {clientGoals.length > 0 
                    ? "All goals have been selected for assessment." 
                    : "No goals found for this client."}
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableGoals.map(goal => (
                    <Card 
                      key={goal.id} 
                      className="cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => handleGoalClick(goal)}
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
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}