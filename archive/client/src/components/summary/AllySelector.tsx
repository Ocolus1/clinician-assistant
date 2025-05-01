import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Ally } from "@shared/schema";

interface AllySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allies: Ally[];
  onSelectAllies: (selectedAllies: Ally[]) => void;
}

export function AllySelector({ open, onOpenChange, allies, onSelectAllies }: AllySelectorProps) {
  const [selectedAllyIds, setSelectedAllyIds] = useState<number[]>([]);

  const handleToggleAlly = (allyId: number) => {
    setSelectedAllyIds((prev) => {
      if (prev.includes(allyId)) {
        return prev.filter((id) => id !== allyId);
      } else {
        return [...prev, allyId];
      }
    });
  };

  const handleSubmit = () => {
    const selectedAllies = allies.filter(ally => selectedAllyIds.includes(ally.id));
    onSelectAllies(selectedAllies);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Allies to Email</DialogTitle>
          <DialogDescription>
            Choose which allies should receive a copy of this report by email.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[300px] overflow-y-auto">
          {allies.length === 0 ? (
            <p className="text-muted-foreground text-center">No allies available</p>
          ) : (
            allies.map((ally) => (
              <div key={ally.id} className="flex items-start space-x-3">
                <Checkbox 
                  id={`ally-${ally.id}`} 
                  checked={selectedAllyIds.includes(ally.id)}
                  onCheckedChange={() => handleToggleAlly(ally.id)}
                />
                <div className="grid gap-1.5">
                  <Label htmlFor={`ally-${ally.id}`} className="font-medium">{ally.name}</Label>
                  <p className="text-sm text-muted-foreground">{ally.email} • {ally.relationship}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedAllyIds.length === 0}
          >
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}