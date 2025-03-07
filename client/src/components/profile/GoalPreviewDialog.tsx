import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Check, Circle, Target, Gauge, TrendingUp } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";

interface Goal {
  id: number;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  milestones: Milestone[];
}

interface Milestone {
  id: number;
  title: string;
  description: string;
  progress: number;
  progressHistory: number[];
}

interface GoalPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
}

export default function GoalPreviewDialog({
  open,
  onOpenChange,
  goal
}: GoalPreviewDialogProps) {
  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            {goal.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Goal Overview Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Goal Overview</h3>
            <p className="text-gray-600">{goal.description}</p>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Target Date</p>
                <p>{new Date(goal.targetDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Overall Progress</p>
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">{goal.progress}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Milestones</h3>
            <div className="grid gap-3">
              {goal.milestones && goal.milestones.length > 0 ? goal.milestones.map((milestone) => (
                <Card key={milestone.id} className="overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{milestone.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {milestone.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">{milestone.progress}%</span>
                      </div>
                      <div className="w-24 h-8">
                        <Sparkline 
                          data={milestone.progressHistory || [0, 0, milestone.progress]} 
                          width={96} 
                          height={32} 
                          color="#3A86FF"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-gray-600 text-sm italic">No milestones added yet.</p>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Notes</h3>
            <p className="text-gray-600 text-sm italic">
              No notes added yet.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}