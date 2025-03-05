import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PerformanceHeaderProps {
  isEmpty: boolean;
  onAddGoal: () => void;
  clientId: number | null;
}

/**
 * A component that displays the header for the Performance Assessment section
 * When empty, it shows an Add Goal button inside the empty state
 */
export function PerformanceHeader({ isEmpty, onAddGoal, clientId }: PerformanceHeaderProps) {
  if (!isEmpty) {
    return (
      <div className="mb-4">
        <h4 className="text-lg font-medium text-primary">Therapeutic Performance</h4>
        <div className="flex justify-end mt-2">
          <Button 
            type="button" 
            onClick={onAddGoal}
            disabled={!clientId}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="mb-4">
        <h4 className="text-lg font-medium text-primary">Therapeutic Performance</h4>
      </div>
      <div className="border rounded-md p-8 text-center bg-muted/10 flex flex-col items-center space-y-4">
        <p className="text-muted-foreground">
          No goals selected yet. Add a goal to start assessment.
        </p>
        <Button 
          type="button" 
          onClick={onAddGoal}
          disabled={!clientId}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>
    </>
  );
}