import React, { useState, useEffect } from "react";
import { Goal, Subgoal } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Plus,
  X,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// This defines each step in our progressive assessment journey
enum AssessmentStep {
  GOAL_SELECTION = 0,
  MILESTONE_SELECTION = 1,
  PERFORMANCE_RATING = 2,
  STRATEGY_SELECTION = 3,
  COMPLETED = 4
}

// Available strategies that can be selected
const AVAILABLE_STRATEGIES = [
  "Visual Support", 
  "Verbal Prompting", 
  "Physical Guidance", 
  "Modeling", 
  "Reinforcement",
  "Social Stories",
  "Task Breakdown",
  "Positive Reinforcement",
  "Sensory Integration",
  "Repetition"
];

// Schema for a performance assessment
const performanceAssessmentSchema = z.object({
  goalId: z.number(),
  goalTitle: z.string().optional(),
  notes: z.string().optional(),
  milestones: z.array(z.object({
    milestoneId: z.number(),
    milestoneTitle: z.string().optional(),
    rating: z.number().min(0).max(10).optional(),
    strategies: z.array(z.string()).default([]),
    notes: z.string().optional(),
  })).default([]),
});

type PerformanceAssessment = z.infer<typeof performanceAssessmentSchema>;

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

// Rating slider component for performance assessment
const RatingSlider = ({ value, onChange, label, description }: RatingSliderProps) => {
  // Generate a badge color class based on value
  const getBadgeClass = () => {
    if (value <= 3) return 'bg-red-100 border-red-200 text-red-700';
    if (value <= 6) return 'bg-amber-100 border-amber-200 text-amber-700';
    return 'bg-green-100 border-green-200 text-green-700';
  };
  
  // Get range class for the slider
  const getRangeClass = () => {
    if (value <= 3) return 'range-low';
    if (value <= 6) return 'range-mid';
    return 'range-high';
  };
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="font-medium text-sm">{label}</Label>
        <Badge variant="outline" className={`font-medium ${getBadgeClass()}`}>
          {value}
        </Badge>
      </div>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      <div className="relative">
        <Slider
          value={[value]}
          min={0}
          max={10}
          step={1}
          onValueChange={(vals) => onChange(vals[0])}
          className={`py-2 rating-slider color-slider ${getRangeClass()}`}
        />
      </div>
    </div>
  );
};

interface ProgressiveAssessmentBuilderProps {
  clientId: number;
  existingAssessments: PerformanceAssessment[];
  onChange: (assessments: PerformanceAssessment[]) => void;
}

export function ProgressiveAssessmentBuilder({ 
  clientId, 
  existingAssessments,
  onChange
}: ProgressiveAssessmentBuilderProps) {
  // Track the current step in the assessment process
  const [currentStep, setCurrentStep] = useState<AssessmentStep>(AssessmentStep.GOAL_SELECTION);
  
  // Current assessment being built
  const [currentAssessment, setCurrentAssessment] = useState<PerformanceAssessment | null>(null);
  
  // Currently selected milestone
  const [currentMilestone, setCurrentMilestone] = useState<{
    id: number;
    title: string;
    description?: string;
    rating?: number;
    strategies: string[];
    notes?: string;
  } | null>(null);
  
  // Fetch goals for the selected client
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/clients", clientId, "goals"],
    enabled: !!clientId
  });
  
  // Force fetch the goals on mount
  useEffect(() => {
    if (clientId) {
      fetch(`/api/clients/${clientId}/goals`)
        .then(response => response.json())
        .then(data => {
          console.log("Direct fetch goals:", data);
        })
        .catch(error => console.error("Error fetching goals:", error));
    }
  }, [clientId]);
  
  // Debug goal fetching
  console.log("Client ID:", clientId);
  console.log("Goals data:", goals);
  
  // Log debugging information
  React.useEffect(() => {
    console.log("ProgressiveAssessmentBuilder - clientId:", clientId);
    console.log("ProgressiveAssessmentBuilder - goals:", goals);
  }, [clientId, goals]);
  
  // Fetch subgoals for the currently selected goal
  const { data: subgoals = [] } = useQuery<Subgoal[]>({
    queryKey: ["/api/goals", currentAssessment?.goalId, "subgoals"],
    enabled: !!currentAssessment?.goalId,
  });
  
  // Helper function to get all selected goal IDs
  const getSelectedGoalIds = (): number[] => {
    return existingAssessments.map(assessment => assessment.goalId);
  };
  
  // Helper function to get all selected milestone IDs for a specific goal
  const getSelectedMilestoneIds = (goalId: number): number[] => {
    const assessment = existingAssessments.find(a => a.goalId === goalId);
    return assessment?.milestones?.map(m => m.milestoneId) || [];
  };
  
  // Filter goals to only show those not already selected
  const availableGoals = goals.filter(goal => !getSelectedGoalIds().includes(goal.id));
  
  // Log available goals for debugging
  console.log("Available goals for selection:", availableGoals);
  
  // Filter subgoals to only show those not already selected
  const availableSubgoals = subgoals.filter(
    subgoal => !getSelectedMilestoneIds(currentAssessment?.goalId || 0).includes(subgoal.id)
  );
  
  // Handler for selecting a goal
  const handleGoalSelection = (goal: Goal) => {
    setCurrentAssessment({
      goalId: goal.id,
      goalTitle: goal.title,
      notes: "",
      milestones: []
    });
    
    // Move to the next step
    setCurrentStep(AssessmentStep.MILESTONE_SELECTION);
  };
  
  // Handler for selecting a milestone
  const handleMilestoneSelection = (subgoal: Subgoal) => {
    setCurrentMilestone({
      id: subgoal.id,
      title: subgoal.title,
      description: subgoal.description,
      rating: 5, // Default rating
      strategies: [],
      notes: ""
    });
    
    // Move to the next step
    setCurrentStep(AssessmentStep.PERFORMANCE_RATING);
  };
  
  // Handler for rating a milestone
  const handleRatingChange = (rating: number) => {
    if (currentMilestone) {
      setCurrentMilestone({
        ...currentMilestone,
        rating
      });
    }
  };
  
  // Handler for milestone notes
  const handleMilestoneNotesChange = (notes: string) => {
    if (currentMilestone) {
      setCurrentMilestone({
        ...currentMilestone,
        notes
      });
    }
  };
  
  // Handler for toggling a strategy
  const handleStrategyToggle = (strategy: string) => {
    if (!currentMilestone) return;
    
    const strategies = [...currentMilestone.strategies];
    
    if (strategies.includes(strategy)) {
      // Remove strategy if already selected
      setCurrentMilestone({
        ...currentMilestone,
        strategies: strategies.filter(s => s !== strategy)
      });
    } else if (strategies.length < 5) {
      // Add strategy if less than 5 are selected
      setCurrentMilestone({
        ...currentMilestone,
        strategies: [...strategies, strategy]
      });
    }
  };
  
  // Handler for completing the current milestone assessment
  const handleCompleteMilestone = () => {
    if (!currentAssessment || !currentMilestone) return;
    
    // Add the current milestone to the assessment
    const updatedAssessment = { ...currentAssessment };
    updatedAssessment.milestones = [
      ...updatedAssessment.milestones,
      {
        milestoneId: currentMilestone.id,
        milestoneTitle: currentMilestone.title,
        rating: currentMilestone.rating,
        strategies: currentMilestone.strategies,
        notes: currentMilestone.notes
      }
    ];
    
    // Update the assessment
    setCurrentAssessment(updatedAssessment);
    
    // Clear the current milestone
    setCurrentMilestone(null);
    
    // Go back to milestone selection to potentially add more milestones
    setCurrentStep(AssessmentStep.MILESTONE_SELECTION);
  };
  
  // Handler for completing the entire assessment
  const handleCompleteAssessment = () => {
    if (!currentAssessment) return;
    
    // Add the current assessment to the list of assessments
    const updatedAssessments = [...existingAssessments, currentAssessment];
    
    // Notify parent component of the change
    onChange(updatedAssessments);
    
    // Reset the builder
    setCurrentAssessment(null);
    setCurrentMilestone(null);
    setCurrentStep(AssessmentStep.GOAL_SELECTION);
  };
  
  // Cancel the current assessment process
  const handleCancelAssessment = () => {
    setCurrentAssessment(null);
    setCurrentMilestone(null);
    setCurrentStep(AssessmentStep.GOAL_SELECTION);
  };
  
  // Get the step progress as a percentage
  const getStepProgress = (): number => {
    return (currentStep / AssessmentStep.COMPLETED) * 100;
  };
  
  // Render the appropriate content based on the current step
  const renderStepContent = () => {
    switch (currentStep) {
      case AssessmentStep.GOAL_SELECTION:
        return (
          <div className="space-y-4">
            <Alert className="bg-muted/20 border">
              <AlertTitle className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Select a Goal
              </AlertTitle>
              <AlertDescription>
                Choose a goal to assess for this session. You will be guided through selecting milestones, 
                rating performance, and tagging strategies.
              </AlertDescription>
            </Alert>
            
            {availableGoals.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Goals Available</AlertTitle>
                <AlertDescription>
                  All goals have been selected for assessment. You can continue working with the existing assessments.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableGoals.map(goal => (
                    <Card 
                      key={goal.id} 
                      className="cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => handleGoalSelection(goal)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">{goal.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        );
        
      case AssessmentStep.MILESTONE_SELECTION:
        if (!currentAssessment) return null;
        
        const goal = goals.find(g => g.id === currentAssessment.goalId);
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{goal?.title}</h3>
                <p className="text-sm text-muted-foreground">{goal?.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelAssessment}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
            
            <Alert className="bg-muted/20 border">
              <AlertTitle className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Select a Milestone
              </AlertTitle>
              <AlertDescription>
                Choose a milestone to assess for this goal. You'll rate the client's performance on this milestone next.
              </AlertDescription>
            </Alert>
            
            {currentAssessment.milestones.length > 0 && (
              <div className="border rounded-md p-3 bg-primary/5">
                <h4 className="text-sm font-medium mb-2">Already Selected Milestones:</h4>
                <div className="space-y-1">
                  {currentAssessment.milestones.map(milestone => {
                    const subgoal = subgoals.find(s => s.id === milestone.milestoneId);
                    return (
                      <div key={milestone.milestoneId} className="text-sm flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1 text-primary" />
                        {subgoal?.title || milestone.milestoneTitle}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {availableSubgoals.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Milestones Available</AlertTitle>
                <AlertDescription>
                  All milestones for this goal have been selected. You can continue with another goal or complete this assessment.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-2">
                  {availableSubgoals.map(subgoal => (
                    <Card 
                      key={subgoal.id} 
                      className="cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => handleMilestoneSelection(subgoal)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">{subgoal.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground">{subgoal.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <div className="flex justify-end space-x-2">
              {currentAssessment.milestones.length > 0 && (
                <Button onClick={handleCompleteAssessment}>
                  Complete Assessment
                </Button>
              )}
            </div>
          </div>
        );
        
      case AssessmentStep.PERFORMANCE_RATING:
        if (!currentAssessment || !currentMilestone) return null;
        
        const milestone = subgoals.find(s => s.id === currentMilestone.id);
        
        // Generate badge color class based on rating value
        const getBadgeClass = () => {
          const value = currentMilestone.rating || 5;
          if (value <= 3) return 'text-red-700';
          if (value <= 6) return 'text-amber-700';
          return 'text-green-700';
        };
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {milestone?.title} 
                  <span className={`ml-2 ${getBadgeClass()}`}>
                    - Score {currentMilestone.rating || 5}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground">{milestone?.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(AssessmentStep.MILESTONE_SELECTION)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
            
            <Alert className="bg-muted/20 border">
              <AlertTitle className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Rate Performance
              </AlertTitle>
              <AlertDescription>
                Rate the client's performance on this milestone from 0 (lowest) to 10 (highest).
              </AlertDescription>
            </Alert>
            
            <div className="border rounded-md p-4 space-y-4">
              <div className="relative py-2">
                <Slider
                  value={[currentMilestone.rating || 5]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(vals) => handleRatingChange(vals[0])}
                  className={`py-2 rating-slider color-slider`}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Enter notes about this milestone performance..."
                  value={currentMilestone.notes || ""}
                  onChange={(e) => handleMilestoneNotesChange(e.target.value)}
                  className="resize-none min-h-[80px]"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setCurrentStep(AssessmentStep.MILESTONE_SELECTION)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(AssessmentStep.STRATEGY_SELECTION)}>
                Continue to Strategies
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        );
        
      case AssessmentStep.STRATEGY_SELECTION:
        if (!currentAssessment || !currentMilestone) return null;
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Select Strategies</h3>
                <p className="text-sm text-muted-foreground">For {currentMilestone.title}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(AssessmentStep.PERFORMANCE_RATING)}>
                <X className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            
            <Alert className="bg-muted/20 border">
              <AlertTitle className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Tag Strategies
              </AlertTitle>
              <AlertDescription>
                Select up to 5 strategies that were used during the session for this milestone.
              </AlertDescription>
            </Alert>
            
            <div className="border rounded-md p-4">
              <div className="flex flex-wrap gap-2 mb-2">
                {AVAILABLE_STRATEGIES.map((strategy) => (
                  <Badge 
                    key={strategy}
                    variant={currentMilestone.strategies.includes(strategy) ? "default" : "secondary"}
                    className={`cursor-pointer ${currentMilestone.strategies.length >= 5 && !currentMilestone.strategies.includes(strategy) ? 'opacity-50' : ''}`}
                    onClick={() => handleStrategyToggle(strategy)}
                  >
                    {strategy}
                  </Badge>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                {currentMilestone.strategies.length}/5 strategies selected
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setCurrentStep(AssessmentStep.PERFORMANCE_RATING)}>
                Back
              </Button>
              <Button onClick={handleCompleteMilestone}>
                Complete Milestone
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Start assessment button when in initial state
  const renderStartButton = () => {
    if (currentStep === AssessmentStep.GOAL_SELECTION && !currentAssessment) {
      return (
        <Button 
          onClick={() => setCurrentStep(AssessmentStep.GOAL_SELECTION)}
          disabled={availableGoals.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Start New Assessment
        </Button>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      {currentAssessment && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Goal Selection</span>
            <span>Milestone Selection</span>
            <span>Performance Rating</span>
            <span>Strategies</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>
      )}
      
      {/* Assessment builder content */}
      <Card className="border rounded-md shadow-sm">
        <CardContent className="p-4">
          {renderStepContent()}
          {renderStartButton()}
        </CardContent>
      </Card>
    </div>
  );
}