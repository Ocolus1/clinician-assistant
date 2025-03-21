import * as React from "react";
import { useState, useEffect } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Define the milestone performance data structure
interface MilestonePerformance {
  id: number;
  title: string;
  values: {
    month: string; // Format: "YYYY-MM"
    score: number;
  }[];
}

// Define the goal performance data structure
interface GoalPerformance {
  id: number;
  title: string;
  description: string;
  currentScore: number;
  previousScore: number;
  monthlyScores: {
    month: string; // Format: "YYYY-MM"
    score: number;
  }[];
  milestones: MilestonePerformance[];
}

interface GoalPerformanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: number | null;
  goalTitle: string;
  goalDescription?: string;
  subgoals: any[];
}

// Utility function to generate last 12 months in "YYYY-MM" format
function getLast12Months() {
  const months = [];
  const currentDate = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = subMonths(currentDate, i);
    const monthStr = format(date, "yyyy-MM");
    const displayMonth = format(date, "MMM");
    months.unshift({ value: monthStr, display: displayMonth });
  }
  
  return months;
}

// Utility function to generate mock performance data that matches the subgoal data
function generatePerformanceData(goalId: number, goalTitle: string, subgoals: any[]): GoalPerformance {
  const months = getLast12Months();
  
  // Generate random scores for the goal (3-8 range to have variation)
  const monthlyScores = months.map(month => ({
    month: month.value,
    score: Math.floor(Math.random() * 6) + 3
  }));
  
  // Current month's score and previous month's score
  const currentScore = monthlyScores[monthlyScores.length - 1].score;
  const previousScore = monthlyScores[monthlyScores.length - 2].score;
  
  // Generate milestone (subgoal) performance data
  const milestones = subgoals.map(subgoal => {
    return {
      id: subgoal.id,
      title: subgoal.title,
      values: months.map(month => ({
        month: month.value,
        score: Math.floor(Math.random() * 10) + 1 // 1-10 range
      }))
    };
  });
  
  return {
    id: goalId,
    title: goalTitle,
    description: "Working towards " + goalTitle.toLowerCase(),
    currentScore,
    previousScore,
    monthlyScores,
    milestones
  };
}

export function GoalPerformanceModal({
  open,
  onOpenChange,
  goalId,
  goalTitle,
  goalDescription,
  subgoals
}: GoalPerformanceModalProps) {
  const [performanceData, setPerformanceData] = useState<GoalPerformance | null>(null);
  const months = getLast12Months();
  
  // When the goal ID changes, generate new performance data
  useEffect(() => {
    if (goalId && open) {
      const data = generatePerformanceData(goalId, goalTitle, subgoals);
      setPerformanceData(data);
    } else {
      setPerformanceData(null);
    }
  }, [goalId, goalTitle, subgoals, open]);

  // Calculate difference for current vs previous month
  const scoreDifference = performanceData 
    ? performanceData.currentScore - performanceData.previousScore
    : 0;
  
  // Find min and max scores for the goal
  const minScore = performanceData?.monthlyScores.reduce(
    (min, item) => (item.score < min ? item.score : min),
    10
  ) || 0;
  
  const maxScore = performanceData?.monthlyScores.reduce(
    (max, item) => (item.score > max ? item.score : max),
    0
  ) || 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-white overflow-auto max-h-[90vh]">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {performanceData?.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {performanceData?.description}
              </DialogDescription>
            </div>
            <button 
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </DialogHeader>
        
        {performanceData && (
          <div className="p-6">
            {/* Monthly performance summary row */}
            <div className="flex mb-8 gap-4">
              {/* Current month score */}
              <div className="border rounded-md w-24 p-4 text-center">
                <div className="text-3xl font-bold">{performanceData.currentScore}</div>
                <div className="text-xs text-gray-500 mt-1">this month</div>
              </div>
              
              {/* Previous month score */}
              <div className="border rounded-md w-24 p-4 text-center">
                <div className="text-3xl font-bold">{performanceData.previousScore}</div>
                <div className="text-xs text-gray-500 mt-1">prev month</div>
              </div>
              
              {/* Difference indicator */}
              <div className={cn(
                "rounded-md w-24 p-4 text-center",
                scoreDifference > 0 ? "bg-green-100" : 
                scoreDifference < 0 ? "bg-red-100" : "bg-gray-100"
              )}>
                <div className={cn(
                  "text-3xl font-bold",
                  scoreDifference > 0 ? "text-green-600" : 
                  scoreDifference < 0 ? "text-red-600" : "text-gray-600"
                )}>
                  {scoreDifference > 0 ? "+" : ""}{scoreDifference}
                </div>
                <div className="text-xs text-gray-500 mt-1">Difference</div>
              </div>
            </div>
            
            {/* Monthly performance graph */}
            <div className="mb-8">
              <div className="flex justify-between items-end h-[120px]">
                {performanceData.monthlyScores.map((item, index) => {
                  const month = format(new Date(item.month + "-01"), "MMM");
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-xs font-medium">{item.score}</div>
                      <div 
                        className={cn(
                          "w-7 transition-all rounded-t",
                          item.score === maxScore ? "bg-blue-500" : 
                          item.score === minScore ? "bg-red-500" : 
                          "bg-gray-500"
                        )}
                        style={{ height: `${(item.score / 10) * 100}px` }}
                      />
                      <div className="text-xs text-gray-500 mt-1">{month}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Milestones grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {performanceData.milestones.map((milestone, index) => (
                <Card key={milestone.id} className="shadow-sm border-gray-200">
                  <CardContent className="pt-4">
                    <div className="text-sm font-medium mb-3 text-gray-800">
                      {milestone.title}
                    </div>
                    
                    <div className="relative h-[150px]">
                      {/* Y-axis labels */}
                      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500">
                        <div>10</div>
                        <div>5</div>
                        <div>0</div>
                      </div>
                      
                      {/* Line chart */}
                      <div className="absolute left-5 right-2 top-0 bottom-0">
                        <svg width="100%" height="100%" viewBox="0 0 600 150" preserveAspectRatio="none">
                          {/* Background grid lines */}
                          <line x1="0" y1="0" x2="600" y2="0" stroke="#e5e7eb" strokeWidth="1" />
                          <line x1="0" y1="75" x2="600" y2="75" stroke="#e5e7eb" strokeWidth="1" />
                          <line x1="0" y1="150" x2="600" y2="150" stroke="#e5e7eb" strokeWidth="1" />
                          
                          {/* Performance line */}
                          <polyline
                            points={milestone.values.map((point, i) => {
                              const x = (i / (milestone.values.length - 1)) * 600;
                              const y = (1 - point.score / 10) * 150;
                              return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="black"
                            strokeWidth="2"
                          />
                          
                          {/* Data points */}
                          {milestone.values.map((point, i) => {
                            const x = (i / (milestone.values.length - 1)) * 600;
                            const y = (1 - point.score / 10) * 150;
                            return (
                              <g key={i}>
                                <circle 
                                  cx={x} 
                                  cy={y} 
                                  r="4" 
                                  fill="white" 
                                  stroke="black" 
                                  strokeWidth="2" 
                                />
                                <text 
                                  x={x} 
                                  y={y - 8} 
                                  textAnchor="middle" 
                                  fill="black" 
                                  fontSize="10"
                                >
                                  {point.score}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                      
                      {/* X-axis month labels */}
                      <div className="absolute left-5 right-2 bottom-[-20px] flex justify-between text-xs text-gray-500">
                        {months.map((month, i) => (
                          i % 2 === 0 && <div key={i} className="text-center">{month.display}</div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}