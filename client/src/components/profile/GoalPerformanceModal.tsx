import * as React from "react";
// Using the React namespace for hooks instead of direct imports
const { useState, useEffect } = React;
import { format, subMonths, startOfMonth } from "date-fns";
import { X, Plus } from "lucide-react";

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
  description?: string;
  isEmpty?: boolean;
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

// Improved utility function to generate performance data with better error handling
function generatePerformanceData(goalId: number, goalTitle: string, subgoals: any[]): GoalPerformance {
  console.log("generatePerformanceData called with:", { goalId, goalTitle, subgoalsType: typeof subgoals, subgoalsLength: subgoals?.length });
  
  const months = getLast12Months();
  
  try {
    // Generate scores for the goal (consistent 3-8 range)
    const monthlyScores = months.map((month, index) => {
      // Use deterministic values based on goalId and index to ensure consistent display
      const safeGoalId = typeof goalId === 'number' && !isNaN(goalId) ? goalId : 1;
      const baseValue = ((safeGoalId % 5) + 3) / 10; // 0.3 to 0.8 range
      const modifier = Math.sin(index * 0.5) * 0.2; // Slight variation
      const score = Math.min(Math.max(Math.round((baseValue + modifier) * 10), 3), 8);
      
      return {
        month: month.value,
        score: score
      };
    });
    
    // Current month's score and previous month's score
    const currentScore = monthlyScores[monthlyScores.length - 1].score;
    const previousScore = monthlyScores.length > 1 ? monthlyScores[monthlyScores.length - 2].score : currentScore;
    
    // Enhanced subgoal processing with much more robust checks
    // Start with a defensive copy
    let processedSubgoals: any[] = [];
    
    // Log the raw input for debugging
    console.log(`Raw subgoals input type: ${typeof subgoals}, isArray: ${Array.isArray(subgoals)}, length: ${Array.isArray(subgoals) ? subgoals.length : 'N/A'}`);
    
    // Ensure we're working with an array
    if (Array.isArray(subgoals)) {
      processedSubgoals = [...subgoals]; // safe copy
    } else if (subgoals && typeof subgoals === 'object') {
      // Try to extract from object if it's not an array
      if ('data' in subgoals && Array.isArray(subgoals.data)) {
        processedSubgoals = subgoals.data;
        console.log("Extracted subgoals from data property:", processedSubgoals);
      } else {
        // Last resort - try to extract any array-like properties
        const possibleArrayProps = Object.entries(subgoals)
          .filter(([_, value]) => Array.isArray(value))
          .map(([key, value]) => ({ key, length: (value as any[]).length }))
          .sort((a, b) => b.length - a.length); // Sort by array length descending
        
        if (possibleArrayProps.length > 0) {
          const bestProp = possibleArrayProps[0];
          processedSubgoals = (subgoals as any)[bestProp.key];
          console.log(`Extracted ${processedSubgoals.length} subgoals from ${bestProp.key} property`);
        }
      }
    }
    
    // Handle edge cases where subgoals might be nested or in unexpected formats
    if (processedSubgoals.length === 1 && Array.isArray(processedSubgoals[0])) {
      console.log("Detected nested subgoals array, flattening:", processedSubgoals[0]);
      processedSubgoals = processedSubgoals[0];
    }
    
    // Special handling for when subgoal data might be in a different format
    if (processedSubgoals.length === 1 && processedSubgoals[0] && typeof processedSubgoals[0] === 'object') {
      if ('subgoals' in processedSubgoals[0] && Array.isArray(processedSubgoals[0].subgoals)) {
        console.log("Detected subgoals nested in 'subgoals' property:", processedSubgoals[0].subgoals);
        processedSubgoals = processedSubgoals[0].subgoals;
      } else if ('data' in processedSubgoals[0] && Array.isArray(processedSubgoals[0].data)) {
        console.log("Detected subgoals nested in 'data' property:", processedSubgoals[0].data);
        processedSubgoals = processedSubgoals[0].data;
      }
    }
    
    // Super robust filtering to ensure subgoals have required properties, with detailed logging
    const validSubgoals = Array.isArray(processedSubgoals) 
      ? processedSubgoals.filter(s => {
          // Detailed validity check
          if (!s) {
            console.warn("Subgoal is null or undefined");
            return false;
          }
          
          if (typeof s !== 'object') {
            console.warn(`Subgoal is not an object, type: ${typeof s}`);
            return false;
          }
          
          if (s.id === undefined) {
            console.warn("Subgoal missing id property:", s);
            return false;
          }
          
          if (!s.title) {
            console.warn("Subgoal missing title property:", s);
            return false;
          }
          
          return true;
        }) as SubgoalData[] 
      : [];
    
    console.log(`Processed ${processedSubgoals.length} raw subgoals into ${validSubgoals.length} valid subgoals for goal ${goalId}: ${goalTitle}`);
    
    // Generate milestone (subgoal) performance data
    let milestones: MilestonePerformance[] = [];
    
    // Add actual subgoals first
    if (validSubgoals.length > 0) {
      console.log(`Creating milestone visualizations for ${validSubgoals.length} subgoals`);
      milestones = validSubgoals.map(subgoal => {
        // Generate deterministic values based on subgoal.id
        const safeId = typeof subgoal.id === 'number' && !isNaN(subgoal.id) ? subgoal.id : 1;
        
        return {
          id: safeId,
          title: subgoal.title || "Untitled Milestone",
          description: subgoal.description || "",
          isEmpty: false,
          values: months.map((month, index) => {
            // Use a more reliable formula based on goal ID and subgoal ID
            const seed = (safeId * 17 + goalId * 13) % 100;
            const baseValue = (seed % 10 + 1) / 10; // 0.1 to 1.0 range
            const modifier = Math.cos(index * 0.7) * 0.3; // Variation
            const score = Math.min(Math.max(Math.round((baseValue + modifier) * 10), 1), 10);
            
            return {
              month: month.value,
              score: score
            };
          })
        };
      });
    }
    
    // Always ensure we have exactly 6 milestone cards (3x2 grid)
    // Fill remaining slots with empty placeholders
    const totalSlots = 6;
    const emptySlots = totalSlots - milestones.length;
    
    // Generate empty placeholder milestone cards
    if (emptySlots > 0) {
      for (let i = 0; i < emptySlots; i++) {
        milestones.push({
          id: -1 - i, // Negative IDs to avoid conflicts
          title: "No milestone set yet",
          description: "Add a milestone to track progress on specific skill areas",
          isEmpty: true,
          values: months.map((month) => ({
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
    console.error("Error in generatePerformanceData:", error);
    
    // Create fallback performance data in case of error
    const fallbackScores = months.map(() => ({ month: "", score: 5 }));
    const fallbackMilestones: MilestonePerformance[] = Array(6).fill(null).map((_, i) => ({
      id: -1 - i,
      title: i === 0 ? "Error creating performance data" : "No milestone data",
      description: i === 0 ? "There was a problem generating the performance data" : "Placeholder milestone",
      isEmpty: true,
      values: months.map(month => ({ month: month.value, score: 0 }))
    }));
    
    return {
      id: goalId,
      title: goalTitle || "Error Loading Goal",
      description: "Error generating performance data",
      currentScore: 5,
      previousScore: 5,
      monthlyScores: fallbackScores,
      milestones: fallbackMilestones
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
  
  // Enhanced useEffect with more reliable behavior for loading subgoals
  useEffect(() => {
    if (goalId !== null && goalId !== undefined && !isNaN(Number(goalId)) && open) {
      const validGoalId = Number(goalId); // Ensure goalId is a valid number
      
      console.log(`GoalPerformanceModal: Modal opened for goal ${validGoalId}`);
      
      // First try with passed subgoals, but ALSO double-check directly to ensure we have the latest data
      let shouldFetchDirectly = true;
      
      if (Array.isArray(subgoals) && subgoals.length > 0) {
        console.log(`GoalPerformanceModal: Parent passed ${subgoals.length} subgoals`);
        // Generate UI with the passed subgoals first for faster loading
        const data = generatePerformanceData(validGoalId, goalTitle, subgoals);
        setPerformanceData(data);
        
        // But still fetch directly to ensure we have the latest data, just don't show loading state
        shouldFetchDirectly = true;
      }
      
      // Always fetch directly to ensure we have the most up-to-date data
      if (shouldFetchDirectly) {
        // If we already have performance data from passed subgoals, don't show loading state
        if (!performanceData) {
          setIsLoading(true);
        }
        
        console.log(`GoalPerformanceModal: Fetching subgoals directly to ensure fresh data`);
        fetchSubgoalsDirectly(validGoalId);
      }
    } else {
      setPerformanceData(null);
      setDirectSubgoals([]);
    }
  }, [goalId, goalTitle, open, performanceData]);
  
  // When direct subgoals are fetched, generate performance data with them
  useEffect(() => {
    if (goalId !== null && directSubgoals.length > 0) {
      console.log(`GoalPerformanceModal: Generating performance data with ${directSubgoals.length} direct subgoals`);
      const validGoalId = Number(goalId);
      const data = generatePerformanceData(validGoalId, goalTitle, directSubgoals);
      setPerformanceData(data);
    }
  }, [directSubgoals, goalId, goalTitle]);

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
      <DialogContent className="max-w-4xl p-0 bg-white overflow-auto max-h-[90vh]">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {performanceData?.title || goalTitle}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {performanceData?.description || goalDescription || "Goal details"}
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
                    
                    {milestone.isEmpty ? (
                      // Empty milestone placeholder
                      <div className="flex items-center justify-center h-[150px] text-center">
                        <div className="text-gray-400 text-xs max-w-[200px]">
                          <div className="mb-2">
                            <Plus className="h-8 w-8 mx-auto opacity-30" />
                          </div>
                          {milestone.description}
                        </div>
                      </div>
                    ) : (
                      // Regular milestone with chart
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
                            i % 3 === 0 && <div key={i} className="text-center">{month.display}</div>
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