import * as React from "react";
// Using the React namespace for hooks instead of direct imports
import "./FixedDialog.css"; // Import the CSS fix for dialog
const { useState, useEffect } = React;
import { format, subMonths, startOfMonth } from "date-fns";
import { X, Plus, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/custom-dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { progressDataService, MilestonePerformanceData } from "@/lib/services/progressDataService";

// Define the milestone performance data structure
interface MilestonePerformance {
  id: number;
  title: string;
  description?: string;
  isEmpty?: boolean;
  hasValidDataForLine?: boolean; // Add matching property from MilestonePerformanceData
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

// Interface for valid subgoal structure
interface SubgoalData {
  id: number;
  title: string;
  description?: string;
}

// Utility function to generate loading state placeholder with no synthetic data
function generatePlaceholderData(goalId: number, goalTitle: string, subgoals: any[]): GoalPerformance {
  console.log("generatePlaceholderData called with:", { goalId, goalTitle, subgoalsLength: subgoals?.length });
  
  // Use progressDataService's helper for month data to ensure consistency
  const months = progressDataService.getLast6Months();
  
  try {
    // Create empty score data - all zeros to represent no data
    const monthlyScores = months.map(month => ({
      month: month.value,
      score: 0 // No synthetic scores
    }));
    
    // Default scores to 0 to indicate no data
    const currentScore = 0;
    const previousScore = 0;
    
    // Process subgoals to create placeholder cards
    let processedSubgoals: any[] = [];
    
    // Ensure we're working with an array and validate subgoals
    if (Array.isArray(subgoals)) {
      processedSubgoals = subgoals.filter(s => s && typeof s === 'object' && s.id !== undefined && s.title);
    }
    
    // Generate milestone placeholder cards - no synthetic scores
    const milestones: MilestonePerformance[] = [];
    
    if (processedSubgoals.length > 0) {
      // Create placeholders for valid subgoals
      processedSubgoals.forEach(subgoal => {
        milestones.push({
          id: subgoal.id,
          title: subgoal.title || "Untitled Milestone",
          description: subgoal.description || "",
          isEmpty: true, // Mark as empty since we don't have real data yet
          hasValidDataForLine: false, // Ensure we don't render polyline for empty data
          values: months.map(month => ({
            month: month.value,
            score: 0 // No data
          }))
        });
      });
    }
    
    // Fill remaining slots with empty placeholders to reach 6 cards
    const totalSlots = 6;
    const emptySlots = totalSlots - milestones.length;
    
    if (emptySlots > 0) {
      for (let i = 0; i < emptySlots; i++) {
        milestones.push({
          id: -1 - i, // Negative IDs to avoid conflicts
          title: "Loading...",
          description: "Loading milestone data",
          isEmpty: true,
          hasValidDataForLine: false, // Add this to all placeholders to prevent empty sparklines
          values: months.map(month => ({
            month: month.value,
            score: 0
          }))
        });
      }
    }
    
    return {
      id: goalId,
      title: goalTitle || "Untitled Goal",
      description: goalTitle ? `Working towards ${goalTitle.toLowerCase()}` : "Goal details",
      currentScore,
      previousScore,
      monthlyScores,
      milestones
    };
  } catch (error) {
    console.error("Error in generatePlaceholderData:", error);
    
    // Create minimal error state with no synthetic data
    const emptyScores = months.map(month => ({ month: month.value, score: 0 }));
    const errorMilestones: MilestonePerformance[] = Array(6).fill(null).map((_, i) => ({
      id: -1 - i,
      title: i === 0 ? "Error loading data" : "No milestone data",
      description: i === 0 ? "There was a problem loading the performance data" : "Please try again",
      isEmpty: true,
      hasValidDataForLine: false, // Add to error case placeholders as well
      values: months.map(month => ({ month: month.value, score: 0 }))
    }));
    
    return {
      id: goalId,
      title: goalTitle || "Error Loading Goal",
      description: "Error loading performance data",
      currentScore: 0,
      previousScore: 0,
      monthlyScores: emptyScores,
      milestones: errorMilestones
    };
  }
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
  const clientId = 88; // TODO: Get client ID from context or URL params
  
  // State to store subgoals fetched directly in this component
  const [directSubgoals, setDirectSubgoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Enhanced function to fetch subgoals directly from the API with improved reliability
  const fetchSubgoalsDirectly = async (goalId: number) => {
    try {
      setIsLoading(true);
      console.log(`GoalPerformanceModal: Directly fetching subgoals for goal ${goalId}`);
      
      // Directly use fetch to avoid any potential issues with dynamic imports
      const response = await fetch(`/api/goals/${goalId}/subgoals`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Check if the response is ok first
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      console.log(`GoalPerformanceModal: Directly fetched subgoals:`, data);
      
      if (Array.isArray(data)) {
        if (data.length > 0) {
          console.log(`GoalPerformanceModal: Successfully fetched ${data.length} subgoals for goal ${goalId}`);
          setDirectSubgoals(data);
        } else {
          // If no subgoals were found, create placeholder data
          console.log(`GoalPerformanceModal: No subgoals found in API response for goal ${goalId}`);
          setDirectSubgoals([
            { id: -1, title: "No subgoals available", description: "Please add subgoals to this goal to track progress" }
          ]);
        }
      } else {
        console.warn(`GoalPerformanceModal: API returned non-array response:`, data);
        setDirectSubgoals([
          { id: -1, title: "No subgoals available", description: "Please add subgoals to this goal to track progress" }
        ]);
      }
    } catch (error) {
      console.error(`GoalPerformanceModal: Error fetching subgoals:`, error);
      setDirectSubgoals([
        { id: -1, title: "Error loading subgoals", description: "There was a problem loading the subgoals for this goal" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Use React Query to fetch real milestone performance data
  const { 
    data: realMilestoneData,
    isLoading: isLoadingRealData,
    isError: isRealDataError
  } = useQuery({
    queryKey: ['milestone-performance', clientId, goalId],
    queryFn: async () => {
      if (goalId === null || !open) return null;
      
      // Only fetch real data if we have valid subgoals
      if (directSubgoals.length > 0 && directSubgoals[0].id > 0) {
        console.log(`Fetching real milestone performance data for goal ${goalId}`);
        return await progressDataService.getMilestonePerformanceData(
          clientId,
          Number(goalId),
          directSubgoals
        );
      }
      return null;
    },
    enabled: open && goalId !== null && directSubgoals.length > 0 && directSubgoals[0].id > 0
  });
  
  // Initial load effect - runs once when the modal opens
  useEffect(() => {
    if (goalId !== null && goalId !== undefined && !isNaN(Number(goalId)) && open) {
      const validGoalId = Number(goalId); // Ensure goalId is a valid number
      
      console.log(`GoalPerformanceModal: Modal opened for goal ${validGoalId}`);
      
      // Reset state when modal opens with a new goal
      setPerformanceData(null);
      setDirectSubgoals([]);
      setIsLoading(true);
      
      // Try to show initial UI with passed subgoals if available
      if (Array.isArray(subgoals) && subgoals.length > 0) {
        console.log(`GoalPerformanceModal: Parent passed ${subgoals.length} subgoals`);
        // Generate loading placeholder UI with the passed subgoals 
        const data = generatePlaceholderData(validGoalId, goalTitle, subgoals);
        setPerformanceData(data);
      }
      
      // Always fetch directly to ensure we have the most up-to-date data
      console.log(`GoalPerformanceModal: Fetching subgoals directly to ensure fresh data`);
      fetchSubgoalsDirectly(validGoalId);
    } else if (!open) {
      // Clean up when modal closes
      setPerformanceData(null);
      setDirectSubgoals([]);
    }
  }, [goalId, goalTitle, open, subgoals]); // Remove performanceData from dependencies
  
  // Updated effect for handling real milestone data
  useEffect(() => {
    if (realMilestoneData && realMilestoneData.length > 0 && open) {
      console.log(`Using REAL milestone performance data for visualization:`, realMilestoneData);
      
      // Create goal performance object using real milestone data
      if (goalId !== null && goalId !== undefined) {
        const validGoalId = Number(goalId);
        
        const months = progressDataService.getLast6Months();
        
        // Generate scores for the goal (average of milestone scores)
        const monthlyScores = months.map(month => {
          // Calculate average score across all milestones for this month
          let totalScore = 0;
          let countWithData = 0;
          
          realMilestoneData.forEach(milestone => {
            const monthData = milestone.values.find(v => v.month === month.value);
            if (monthData && monthData.score > 0) {
              totalScore += monthData.score;
              countWithData++;
            }
          });
          
          // Calculate average if we have any data points
          const averageScore = countWithData > 0 
            ? Math.round(totalScore / countWithData) 
            : 0;
          
          return {
            month: month.value,
            score: Math.min(Math.max(averageScore, 0), 10) // Ensure 0-10 range
          };
        });
        
        // Get current and previous month scores
        const currentScore = monthlyScores[monthlyScores.length - 1].score || 0;
        const previousScore = monthlyScores.length > 1 ? monthlyScores[monthlyScores.length - 2].score || 0 : currentScore;
        
        // Ensure we have exactly 6 milestone cards by adding empty placeholders if needed
        let processedMilestones = [...realMilestoneData];
        const totalSlots = 6;
        const emptySlots = Math.max(0, totalSlots - processedMilestones.length);
        
        if (emptySlots > 0) {
          for (let i = 0; i < emptySlots; i++) {
            processedMilestones.push({
              id: -1 - i,
              title: "No milestone set yet",
              description: "Add a milestone to track progress on specific skill areas",
              isEmpty: true,
              hasValidDataForLine: false, // Ensure we don't show a line for empty placeholders
              values: months.map(month => ({
                month: month.value,
                score: 0
              }))
            });
          }
        }
        
        const data = {
          id: validGoalId,
          title: goalTitle || "Untitled Goal",
          description: goalTitle ? `Working towards ${goalTitle.toLowerCase()}` : "Goal details",
          currentScore,
          previousScore,
          monthlyScores,
          milestones: processedMilestones as MilestonePerformance[]
        };
        
        setPerformanceData(data);
      }
    } else if (goalId !== null && goalId !== undefined && directSubgoals.length > 0 && open && !isLoadingRealData) {
      // Show placeholder with empty state when no real data is available
      console.log(`Showing empty state placeholder with ${directSubgoals.length} direct subgoals`);
      const validGoalId = Number(goalId);
      const data = generatePlaceholderData(validGoalId, goalTitle, directSubgoals);
      setPerformanceData(data);
    }
  }, [realMilestoneData, isLoadingRealData, directSubgoals, goalId, goalTitle, open]);

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

  // Log the state for debugging
  console.log("GoalPerformanceModal render state:", {
    isLoading,
    directSubgoalsLength: directSubgoals.length,
    passedSubgoalsLength: subgoals?.length || 0,
    hasPerformanceData: !!performanceData,
    goalId
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] p-0 bg-white overflow-auto max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center flex-1">
              {/* Goal Title with Tooltip */}
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <DialogTitle className="text-2xl font-bold text-gray-900 mr-4 cursor-help">
                      {performanceData?.title || goalTitle}
                    </DialogTitle>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px] p-3">
                    <p className="text-sm">{performanceData?.description || goalDescription || "Goal details"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Scores in the middle */}
            <div className="flex gap-3 flex-1 justify-center">
              {performanceData && (
                <>
                  {/* Current month score */}
                  <div className="border rounded-md py-1 px-2 text-center bg-white shadow-sm flex items-center gap-1">
                    <div className="text-lg font-bold text-blue-600">{performanceData.currentScore}</div>
                    <div className="text-xs text-gray-500">this mo</div>
                  </div>
                  
                  {/* Previous month score */}
                  <div className="border rounded-md py-1 px-2 text-center bg-white shadow-sm flex items-center gap-1">
                    <div className="text-lg font-bold text-gray-600">{performanceData.previousScore}</div>
                    <div className="text-xs text-gray-500">prev</div>
                  </div>
                  
                  {/* Difference indicator */}
                  <div className={cn(
                    "rounded-md py-1 px-2 text-center flex items-center gap-1 shadow-sm",
                    scoreDifference > 0 ? "bg-green-50 border border-green-100" : 
                    scoreDifference < 0 ? "bg-red-50 border border-red-100" : "bg-gray-50 border border-gray-100"
                  )}>
                    <div className={cn(
                      "text-lg font-bold",
                      scoreDifference > 0 ? "text-green-600" : 
                      scoreDifference < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {scoreDifference > 0 ? "+" : ""}{scoreDifference}
                    </div>
                    <div className="text-xs text-gray-500">Δ</div>
                  </div>
                </>
              )}
            </div>
            
            {/* Close button */}
            <div className="flex items-center justify-end flex-1">
              <button 
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </DialogHeader>
        
        {isLoading && (
          <div className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-3"></div>
              <div className="text-sm text-gray-500">Loading goal data...</div>
            </div>
          </div>
        )}
        
        {!isLoading && !performanceData && (
          <div className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="text-red-500 mb-2">Failed to load goal performance data</div>
              <div className="text-sm text-gray-500">
                No subgoals available for this goal. Please try again or add subgoals to this goal.
              </div>
              <div className="text-xs text-gray-400 mt-3">
                Goal ID: {goalId}, Subgoals available: {subgoals?.length || 0}, 
                Direct subgoals: {directSubgoals.length}
              </div>
            </div>
          </div>
        )}
        
        {!isLoading && performanceData && (
          <div className="p-6">
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
            
            {/* Milestones grid - 3x2 layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {performanceData.milestones.map((milestone, index) => (
                <Card key={milestone.id} className={cn(
                  "shadow-sm border-gray-200",
                  milestone.isEmpty && "bg-gray-50 border-dashed"
                )}>
                  <CardContent className="pt-4">
                    <div className="text-sm font-medium mb-3 text-gray-800">
                      {milestone.title}
                    </div>
                    
                    {milestone.isEmpty || !milestone.values.some(v => v.score > 0) ? (
                      // Empty milestone placeholder
                      <div className="flex items-center justify-center h-[150px] text-center">
                        <div className="text-gray-400 text-xs max-w-[200px]">
                          <div className="mb-2">
                            {milestone.id < 0 ? (
                              <Plus className="h-8 w-8 mx-auto opacity-30" />
                            ) : (
                              <AlertCircle className="h-8 w-8 mx-auto opacity-40" />
                            )}
                          </div>
                          {milestone.id < 0 ? 
                            milestone.description : 
                            <>
                              <p>No performance data recorded yet</p>
                              <p className="text-[10px] mt-1 text-gray-400">
                                Data will appear as sessions are documented
                              </p>
                            </>
                          }
                        </div>
                      </div>
                    ) : (
                      // Regular milestone with chart - ONLY when we have actual data
                      <div className="relative h-[150px] pt-2">
                        <div className="absolute left-0 right-0 top-0 bottom-5">
                          <svg width="100%" height="100%" viewBox="0 0 600 150" preserveAspectRatio="none">
                            <line x1="0" y1="0" x2="600" y2="0" stroke="#e5e7eb" strokeWidth="1" />
                            <line x1="0" y1="75" x2="600" y2="75" stroke="#e5e7eb" strokeWidth="1" />
                            <line x1="0" y1="150" x2="600" y2="150" stroke="#e5e7eb" strokeWidth="1" />
                            
                            {/* Only render polyline if we have at least 2 valid points */}
                            {milestone.hasValidDataForLine && (
                              <polyline
                                points={milestone.values
                                  .map((point, i) => {
                                    if (point.score === 0) return null;
                                    const x = (i / (milestone.values.length - 1)) * 600;
                                    const y = (1 - point.score / 10) * 150;
                                    return `${x},${y}`;
                                  })
                                  .filter(Boolean)
                                  .join(' ')}
                                fill="none"
                                stroke="#ff5252"
                                strokeWidth="2"
                              />
                            )}
                            
                            {milestone.values.map((point, i) => {
                              if (point.score === 0) return null;
                              
                              const x = (i / (milestone.values.length - 1)) * 600;
                              const y = (1 - point.score / 10) * 150;
                              
                              const monthObj = progressDataService.getLast6Months()[i];
                              const month = monthObj ? monthObj.display : '';
                              
                              return (
                                <g key={i} className="group">
                                  <rect 
                                    x={x-40} 
                                    y={y-30} 
                                    width="80" 
                                    height="25" 
                                    rx="4"
                                    fill="#3B82F6" 
                                    className="opacity-0 group-hover:opacity-90 transition-opacity"
                                  />
                                  <text 
                                    x={x} 
                                    y={y-15} 
                                    textAnchor="middle" 
                                    fill="white" 
                                    fontSize="11"
                                    fontWeight="bold"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    {`${month}: ${point.score}/10`}
                                  </text>
                                  
                                  <circle 
                                    cx={x} 
                                    cy={y} 
                                    r="4" 
                                    fill="#3B82F6" 
                                    stroke="#ffffff" 
                                    strokeWidth="1.5" 
                                    className="transition-all hover:scale-125"
                                  />
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                        
                        <div className="absolute left-0 right-0 bottom-[-5px] flex justify-between text-[9px] text-gray-500">
                          {progressDataService.getLast6Months().map((month, i) => (
                            <div key={i} className="text-center px-0">{month.display}</div>
                          ))}
                        </div>
                      </div>
                    )}
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