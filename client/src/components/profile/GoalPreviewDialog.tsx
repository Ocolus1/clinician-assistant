import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Plus, Check, Circle, Target, Gauge, TrendingUp } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader 
} from '../ui/card';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/ui/sparkline';

interface Milestone {
  id: number;
  title: string;
  description?: string;
  progress: number;
  progressHistory?: number[];
}

interface GoalPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  priority: string;
  progress: number;
  milestones: Milestone[];
}

const GoalPreviewDialog: React.FC<GoalPreviewDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  priority,
  progress,
  milestones,
}) => {
  // Generate sample progress history data if none exists
  const getProgressHistory = (milestone: Milestone) => {
    if (milestone.progressHistory && milestone.progressHistory.length > 0) {
      return milestone.progressHistory;
    }

    // Generate random history data trending toward the current progress
    const historyLength = 10;
    const result = [];
    let value = milestone.progress > 50 ? 30 : 70;

    for (let i = 0; i < historyLength - 1; i++) {
      const direction = milestone.progress > value ? 1 : -1;
      const change = Math.random() * 15 * direction;
      value = Math.max(0, Math.min(100, value + change));
      result.push(value);
    }

    // Add current value at the end
    result.push(milestone.progress);
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="w-5 h-5 text-primary" />
            {title}
            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
              {priority}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">{description}</div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-16 relative flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-gray-200"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="text-primary"
                    strokeWidth="10"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 * (1 - progress / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                </svg>
                <span className="absolute text-lg font-bold">{progress}%</span>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-medium mt-6 mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" />
            Milestones
          </h3>

          <div className="grid gap-4">
            {milestones.map((milestone) => (
              <Card key={milestone.id} className="overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{milestone.title}</h4>
                    <span className="text-sm text-muted-foreground">{milestone.progress}%</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                  )}
                  <div className="mt-2">
                    <Sparkline 
                      data={getProgressHistory(milestone)} 
                      height={40} 
                      strokeWidth={2}
                      className="text-primary"
                    />
                  </div>
                </CardContent>
                <CardFooter className="p-0">
                  <div className="w-full bg-muted h-1">
                    <div 
                      className={cn(
                        "h-full bg-primary", 
                        milestone.progress >= 100 ? "bg-green-500" : ""
                      )} 
                      style={{ width: `${milestone.progress}%` }} 
                    />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalPreviewDialog;