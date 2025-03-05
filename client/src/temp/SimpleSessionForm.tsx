import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Simplified version with minimal dependencies
interface SimpleSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimpleSessionForm({ open, onOpenChange }: SimpleSessionFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4">
          <p>This is a simplified session form for testing.</p>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button>Create Session</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}