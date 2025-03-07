import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Edit, Archive, Eye } from "lucide-react";
import type { Goal, Subgoal } from "@shared/schema";

// Component for the circular gauge
const GaugeChart = ({ value, size = 60, strokeWidth = 8 }: { value: number, size?: number, strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  let color = "";
  if (value >= 75) color = "stroke-green-500";
  else if (value >= 50) color = "stroke-blue-500";
  else if (value >= 25) color = "stroke-amber-500";
  else color = "stroke-gray-400";
  
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
      <span className="absolute text-sm font-medium">{value}%</span>
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
          <div>
            <span className="text-sm font-medium text-gray-700">Milestones</span>
            <div className="flex items-center mt-1">
              <span className="text-xl font-bold mr-2">{subgoals.length}</span>
              <span className="text-sm text-gray-500">
                {subgoals.filter(sg => sg.status === 'completed').length} completed
              </span>
            </div>
          </div>
          
          {/* Tooltip to show milestone titles on hover */}
          <div className="relative group">
            <div className="cursor-help p-2 rounded-full hover:bg-gray-100">
              <Target className="h-5 w-5 text-gray-500" />
            </div>
            
            {subgoals.length > 0 && (
              <div className="absolute z-10 w-64 p-2 mt-2 right-0 bg-white shadow-lg rounded-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 invisible group-hover:visible">
                <p className="text-xs font-medium text-gray-700 mb-1">Milestones:</p>
                <ul className="space-y-1">
                  {subgoals.map((subgoal) => (
                    <li key={subgoal.id} className="text-xs text-gray-600 flex items-start">
                      <span className={`w-2 h-2 rounded-full mt-1 mr-1 flex-shrink-0 ${subgoal.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span className="line-clamp-1">{subgoal.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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