import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Edit, Archive, Eye } from "lucide-react";
import type { Goal, Subgoal } from "@shared/schema";

// Enhanced circular gauge with hover tooltip
const GaugeChart = ({ value, size = 60, strokeWidth = 8 }: { value: number, size?: number, strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  // Dynamic color based on measurement data with descriptive label
  let color = "";
  let statusLabel = "";
  
  if (value >= 75) {
    color = "stroke-green-500";
    statusLabel = "Strong Progress";
  } else if (value >= 50) {
    color = "stroke-blue-500";
    statusLabel = "Steady Progress";
  } else if (value >= 25) {
    color = "stroke-amber-500";
    statusLabel = "Initial Progress";
  } else {
    color = "stroke-gray-400";
    statusLabel = "No Data Yet";
  }

  return (
    <div className="relative inline-flex items-center justify-center group">
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
      <span className="absolute text-sm font-medium">{value}%</span>
      
      {/* Tooltip on hover */}
      <div className="absolute z-10 scale-0 group-hover:scale-100 transition-all duration-200 top-full mt-2 w-32 px-2 py-1 bg-black/80 rounded text-white text-xs text-center">
        {statusLabel}
      </div>
    </div>
  );
};

interface GoalCardProps {
  goal: Goal;
  subgoals: Subgoal[];
  onPreview: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onArchive: (goal: Goal) => void;
}

const GoalCard = ({ goal, subgoals, onPreview, onEdit, onArchive }: GoalCardProps) => {
  // Calculate progress based on subgoals status
  const calculateProgress = (): number => {
    if (!subgoals || subgoals.length === 0) return 0;
    const completedSubgoals = subgoals.filter(sg => sg.status === 'completed').length;
    return Math.round((completedSubgoals / subgoals.length) * 100);
  };

  const progress = calculateProgress();

  // Determine priority color
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

  const subgoalCount = subgoals.length;
  
  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pt-5 pb-4 px-6 bg-white">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold line-clamp-2">{goal.title}</h3>
            <Badge className={getPriorityColor(goal.priority)}>
              {goal.priority || "No Priority"}
            </Badge>
          </div>
          <GaugeChart value={progress} />
        </div>
      </CardHeader>

      <CardContent className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium">Measurement Points</h4>
          </div>
          <div className="flex items-center space-x-1.5">
            {[...Array(5)].map((_, index) => (
              <div 
                key={index}
                className="relative group"
                title={index < subgoalCount ? subgoals[index].title : "Empty measurement point"}
              >
                <Target 
                  className={`h-5 w-5 ${
                    index < subgoalCount ? "text-blue-500" : "text-gray-300"
                  }`} 
                />
                {index < subgoalCount && (
                  <span className="absolute z-10 scale-0 group-hover:scale-100 transition-all duration-200 top-full mt-2 -left-1/2 w-32 px-2 py-1 bg-black/80 rounded text-white text-xs">
                    {subgoals[index].title}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-2 bg-gray-50">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50" 
          onClick={() => onPreview(goal)}
        >
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>

        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100" 
            onClick={() => onEdit(goal)}
          >
            <Edit className="h-4 w-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100" 
            onClick={() => onArchive(goal)}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default GoalCard;