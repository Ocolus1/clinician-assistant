import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { MilestoneDataPoint, PerformanceDataPoint } from "@/lib/services/goalPerformanceService";
import { Separator } from '@/components/ui/separator';
import { GoalGauge } from './GoalGauge';
import { PerformanceBarChart } from './PerformanceBarChart';
import { ScrollArea } from '@/components/ui/scroll-area';

// Interface for milestone data
export interface Milestone {
  id: string;
  title: string;
  description: string;
  data: MilestoneDataPoint[];
}

// Interface for goal data
export interface Goal {
  id: string;
  title: string;
  description: string;
  score: number;
  lastMonthScore: number;
  performanceData: PerformanceDataPoint[];
  milestones: Milestone[];
}

interface GoalPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  budgetStartDate: Date;
  budgetEndDate: Date;
}

export function GoalPerformanceModal({
  isOpen,
  onClose,
  goals,
  budgetStartDate,
  budgetEndDate
}: GoalPerformanceModalProps) {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Select the first goal by default when goals change or modal opens
  useEffect(() => {
    if (goals && goals.length > 0 && isOpen) {
      setSelectedGoal(goals[0]);
    }
  }, [goals, isOpen]);

  // Helper function to get color based on score
  const getScoreColor = (score: number) => {
    if (score < 4) return 'text-red-500';
    if (score < 7) return 'text-amber-500';
    return 'text-green-500';
  };

  const handleGoalSelect = (goal: Goal) => {
    setSelectedGoal(goal);
  };

  // Format date range for display
  const dateRangeText = `${format(budgetStartDate, 'MMM d, yyyy')} - ${format(budgetEndDate, 'MMM d, yyyy')}`;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[85%] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Goals & Milestones Progress</DialogTitle>
          <DialogDescription>
            Performance tracking for therapeutic goals from {dateRangeText}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full max-h-[80vh]">
          {/* Top Section - Goal Gauges */}
          <div className="py-4 border-b">
            <h3 className="text-base font-medium mb-4">Goal Performance Overview</h3>
            <div className="flex justify-center items-center gap-4 md:gap-8 flex-wrap">
              {goals.map((goal) => (
                <div 
                  key={goal.id}
                  className={`cursor-pointer transition-all duration-200 ${selectedGoal?.id === goal.id ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                  onClick={() => handleGoalSelect(goal)}
                >
                  <GoalGauge 
                    score={goal.score} 
                    title={goal.title} 
                    isSelected={selectedGoal?.id === goal.id}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section - Details */}
          {selectedGoal && (
            <div className="py-4 flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-medium">{selectedGoal.title}</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Current Score:</span>
                  <span className={`text-base font-semibold ${getScoreColor(selectedGoal.score)}`}>
                    {selectedGoal.score.toFixed(1)}/10
                  </span>
                </div>
              </div>
              
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="h-[calc(100%-40px)]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                    <Card className="md:col-span-2">
                      <CardContent className="p-6">
                        <h4 className="text-sm font-medium mb-4">Performance History</h4>
                        <div className="h-[300px]">
                          <PerformanceBarChart 
                            data={selectedGoal.performanceData}
                            maxValue={10}
                            minValue={0}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <h4 className="text-sm font-medium mb-4">Month-to-Month Comparison</h4>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Current Month</p>
                            <div className="flex items-center">
                              <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    selectedGoal.score < 4 ? 'bg-red-500' : 
                                    selectedGoal.score < 7 ? 'bg-amber-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${(selectedGoal.score / 10) * 100}%` }}
                                />
                              </div>
                              <span className={`ml-2 font-semibold ${getScoreColor(selectedGoal.score)}`}>
                                {selectedGoal.score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Previous Month</p>
                            <div className="flex items-center">
                              <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    selectedGoal.lastMonthScore < 4 ? 'bg-red-500' : 
                                    selectedGoal.lastMonthScore < 7 ? 'bg-amber-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${(selectedGoal.lastMonthScore / 10) * 100}%` }}
                                />
                              </div>
                              <span className={`ml-2 font-semibold ${getScoreColor(selectedGoal.lastMonthScore)}`}>
                                {selectedGoal.lastMonthScore.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Change</p>
                            <div className="flex items-center">
                              {(() => {
                                const change = selectedGoal.score - selectedGoal.lastMonthScore;
                                const changeText = change >= 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`;
                                const changeClass = change > 0 ? 'text-green-500' : 
                                                   change < 0 ? 'text-red-500' : 'text-gray-500';
                                return (
                                  <span className={`text-lg font-bold ${changeClass}`}>
                                    {changeText}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="milestones" className="h-[calc(100%-40px)]">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-8">
                      {selectedGoal.milestones.map((milestone) => (
                        <Card key={milestone.id} className="overflow-hidden">
                          <CardContent className="p-6">
                            <div className="mb-4">
                              <h4 className="text-base font-medium">{milestone.title}</h4>
                              <p className="text-sm text-muted-foreground">{milestone.description}</p>
                            </div>
                            <div className="h-[150px]">
                              {milestone.data.length > 0 ? (
                                <div className="w-full h-full">
                                  {/* Milestone chart would go here */}
                                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                    Milestone progression data visualization
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                  No milestone data recorded yet
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="details" className="h-[calc(100%-40px)]">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-6">
                      <Card>
                        <CardContent className="p-6">
                          <h4 className="text-base font-medium mb-2">Goal Description</h4>
                          <p className="text-sm">{selectedGoal.description}</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <h4 className="text-base font-medium mb-4">Goal Analysis</h4>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Performance Rating</p>
                              <p className="text-sm">
                                This goal is currently rated at <span className={`font-semibold ${getScoreColor(selectedGoal.score)}`}>{selectedGoal.score.toFixed(1)}/10</span>, which is considered {
                                  selectedGoal.score < 4 ? "below target" : 
                                  selectedGoal.score < 7 ? "progressing" : "on target"
                                }.
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Trend Analysis</p>
                              <p className="text-sm">
                                {(() => {
                                  const change = selectedGoal.score - selectedGoal.lastMonthScore;
                                  if (change > 1) return "Showing significant improvement from last month.";
                                  if (change > 0) return "Showing slight improvement from last month.";
                                  if (change === 0) return "Maintaining consistent performance from last month.";
                                  if (change > -1) return "Showing slight decline from last month.";
                                  return "Showing significant decline from last month.";
                                })()}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Related Milestones</p>
                              <p className="text-sm">
                                This goal has {selectedGoal.milestones.length} associated {selectedGoal.milestones.length === 1 ? "milestone" : "milestones"}.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}