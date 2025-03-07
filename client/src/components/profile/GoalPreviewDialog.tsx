import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit, Plus, Archive, Target, CheckCircle, Circle } from "lucide-react";
import type { Goal, Subgoal } from "@shared/schema";

// Sparkline component for milestone progress
const SparkLine = ({ data, height = 20, width = 80 }: { data: number[], height?: number, width?: number }) => {
  // Simple implementation - could be enhanced for real data visualization
  const max = Math.max(...data, 10); // Ensure we have a minimum scale
  
  return (
    <svg width={width} height={height} className="sparkline">
      {data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - (value / max) * height;
        
        return (
          <circle 
            key={index} 
            cx={x} 
            cy={y} 
            r={2} 
            className={value >= 7 ? "fill-green-500" : value >= 4 ? "fill-blue-500" : "fill-amber-500"}
          />
        );
      })}
      
      {data.length > 1 && data.map((value, index) => {
        if (index === 0) return null;
        
        const x1 = ((index - 1) / (data.length - 1)) * width;
        const y1 = height - (data[index - 1] / max) * height;
        const x2 = (index / (data.length - 1)) * width;
        const y2 = height - (value / max) * height;
        
        return (
          <line 
            key={`line-${index}`} 
            x1={x1} 
            y1={y1} 
            x2={x2} 
            y2={y2} 
            stroke="#cbd5e1" 
            strokeWidth={1} 
          />
        );
      })}
    </svg>
  );
};

// Component for the detailed gauge
const DetailedGauge = ({ value, size = 120, strokeWidth = 12 }: { value: number, size?: number, strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  let color = "";
  let textColor = "";
  if (value >= 75) {
    color = "stroke-green-500";
    textColor = "text-green-700";
  } else if (value >= 50) {
    color = "stroke-blue-500";
    textColor = "text-blue-700";
  } else if (value >= 25) {
    color = "stroke-amber-500";
    textColor = "text-amber-700";
  } else {
    color = "stroke-gray-400";
    textColor = "text-gray-700";
  }
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e6e6e6"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${textColor}`}>{value}%</span>
        <span className="text-xs text-gray-500">Progress</span>
      </div>
    </div>
  );
};

interface GoalPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  subgoals: Subgoal[];
  onAddMilestone: (goalId: number) => void;
  onEditMilestone: (subgoal: Subgoal) => void;
  onToggleMilestoneStatus: (subgoal: Subgoal) => void;
}

const GoalPreviewDialog = ({ 
  open, 
  onOpenChange, 
  goal, 
  subgoals, 
  onAddMilestone,
  onEditMilestone,
  onToggleMilestoneStatus
}: GoalPreviewDialogProps) => {
  if (!goal) return null;
  
  // Calculate progress based on subgoals status
  const calculateProgress = (): number => {
    if (!subgoals || subgoals.length === 0) return 0;
    const completedSubgoals = subgoals.filter(sg => sg.status === 'completed').length;
    return Math.round((completedSubgoals / subgoals.length) * 100);
  };

  const progress = calculateProgress();
  
  // Determine priority color for badge
  const getPriorityColor = (priority: string | null) => {
    if (!priority) return "bg-gray-100 text-gray-700 border-gray-200";
    
    if (priority.toLowerCase().includes("high")) 
      return "bg-red-100 text-red-700 border-red-200";
    if (priority.toLowerCase().includes("medium")) 
      return "bg-amber-100 text-amber-700 border-amber-200";
    if (priority.toLowerCase().includes("low")) 
      return "bg-blue-100 text-blue-700 border-blue-200";
    
    return "bg-gray-100 text-gray-700 border-gray-200";
  };
  
  // Generate mock progress data for sparklines (in real app, would use actual data)
  const generateMockProgressData = (subgoal: Subgoal): number[] => {
    // Generate 5 data points that trend upward if completed, or random if not
    const base = subgoal.id % 5; // Use ID to get varied starting points
    
    if (subgoal.status === 'completed') {
      return [base, base + 1, base + 3, base + 6, 10]; // Trending up to maximum
    } else {
      // Create some random variation
      return [
        base, 
        base + Math.floor(Math.random() * 3), 
        base + Math.floor(Math.random() * 4), 
        base + Math.floor(Math.random() * 5),
        base + Math.floor(Math.random() * 6),
      ];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{goal.title}</DialogTitle>
              <div className="flex items-center mt-2">
                <Badge className={getPriorityColor(goal.priority)}>
                  {goal.priority || "No Priority"}
                </Badge>
              </div>
            </div>
            <div className="flex-shrink-0">
              <DetailedGauge value={progress} />
            </div>
          </div>
          
          <DialogDescription className="mt-4 text-base text-gray-700">
            {goal.description}
          </DialogDescription>
        </DialogHeader>
        
        <Separator className="my-4" />
        
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Target className="h-5 w-5 mr-2 text-primary" />
              Milestones
            </h3>
            
            <Button 
              onClick={() => onAddMilestone(goal.id)}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Milestone
            </Button>
          </div>
          
          {subgoals.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-md bg-gray-50">
              <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-500 mb-2">No milestones set yet</h4>
              <p className="text-gray-500 mb-4">Add milestones to track progress towards this goal.</p>
              <Button 
                onClick={() => onAddMilestone(goal.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Milestone
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subgoals.map((subgoal) => {
                const progressData = generateMockProgressData(subgoal);
                
                return (
                  <div 
                    key={subgoal.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start">
                      <div 
                        className="flex-shrink-0 mt-0.5 mr-3 cursor-pointer"
                        onClick={() => onToggleMilestoneStatus(subgoal)}
                      >
                        {subgoal.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-medium text-md ${subgoal.status === 'completed' ? 'text-gray-500' : ''}`}>
                              {subgoal.title}
                            </h4>
                            {subgoal.description && (
                              <p className="text-sm text-gray-600 mt-1">{subgoal.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <div className="text-xs text-gray-500">Progress</div>
                            <SparkLine data={progressData} />
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="ml-2 h-7 w-7 flex-shrink-0" 
                        onClick={() => onEditMilestone(subgoal)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoalPreviewDialog;
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Plus, Check, Circle, Target, Gauge, TrendingUp } from 'lucide-react';
import { Goal, Subgoal } from '@/types';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface GoalPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  subgoals: Subgoal[];
  onAddMilestone: (goalId: number) => void;
  onEditMilestone: (subgoal: Subgoal) => void;
  onToggleMilestoneStatus: (subgoal: Subgoal) => void;
}

const GoalPreviewDialog = ({ 
  open, 
  onOpenChange, 
  goal, 
  subgoals, 
  onAddMilestone,
  onEditMilestone,
  onToggleMilestoneStatus
}: GoalPreviewDialogProps) => {
  if (!goal) return null;
  
  // Calculate progress based on subgoals status
  const calculateProgress = (): number => {
    if (!subgoals || subgoals.length === 0) return 0;
    const completedSubgoals = subgoals.filter(sg => sg.status === 'completed').length;
    return Math.round((completedSubgoals / subgoals.length) * 100);
  };

  // Function to generate random sparkline data (for demonstration)
  const generateSparklineData = () => {
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * 70) + 30);
  };

  // Function to render sparkline based on data
  const renderSparkline = (data: number[]) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    const height = 20;
    const width = 80;
    
    // Calculate points for the polyline
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const normalizedValue = range === 0 ? 0.5 : (value - min) / range;
      const y = height - (normalizedValue * height);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="ml-2">
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  // Function to render a gauge chart
  const renderGauge = (percentage: number) => {
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width="70" height="70" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            className="opacity-25"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={percentage >= 75 ? "#22c55e" : percentage >= 50 ? "#3b82f6" : percentage >= 25 ? "#f59e0b" : "#ef4444"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
          />
          <text
            x="50"
            y="55"
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill="currentColor"
          >
            {percentage}%
          </text>
        </svg>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>{goal.title}</DialogTitle>
            <Badge variant={goal.priority === 'High' ? 'destructive' : goal.priority === 'Medium' ? 'warning' : 'outline'}>
              {goal.priority} Priority
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <p className="text-sm text-muted-foreground mb-4">
              {goal.description}
            </p>
          </div>
          <div className="flex-shrink-0">
            {renderGauge(calculateProgress())}
            <p className="text-xs text-center mt-1 text-muted-foreground">Progress</p>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2" /> Milestones
            </h4>
            <Button size="sm" onClick={() => onAddMilestone(goal.id)}>
              <Plus className="h-3 w-3 mr-1" /> Add Milestone
            </Button>
          </div>
          
          {subgoals.length === 0 ? (
            <div className="border rounded-md p-4 text-center text-muted-foreground">
              No milestones have been added yet.
            </div>
          ) : (
            <div className="space-y-3">
              {subgoals.map((subgoal) => {
                const sparklineData = generateSparklineData();
                
                return (
                  <Card key={subgoal.id} className={`border ${subgoal.status === 'completed' ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <button 
                              onClick={() => onToggleMilestoneStatus(subgoal)}
                              className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${subgoal.status === 'completed' ? 'bg-green-500 text-white' : 'border border-gray-300'}`}
                            >
                              {subgoal.status === 'completed' && <Check className="h-3 w-3" />}
                            </button>
                            <h5 className="font-medium text-sm">{subgoal.title}</h5>
                          </div>
                          <p className="text-xs text-muted-foreground ml-7 mt-1">
                            {subgoal.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground mr-1">Avg. Score</span>
                            <div className="flex items-center">
                              <TrendingUp className="h-3 w-3 text-blue-500" />
                              {renderSparkline(sparklineData)}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0" 
                            onClick={() => onEditMilestone(subgoal)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalPreviewDialog;
