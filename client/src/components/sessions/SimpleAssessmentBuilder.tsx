import React, { useState, useEffect } from "react";
import { Goal, Subgoal } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Plus,
  X,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Trash2
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
import { SimpleGoalSelector } from "./SimpleGoalSelector";

// Schema for a performance assessment
const assessmentSchema = z.object({
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

type Assessment = z.infer<typeof assessmentSchema>;

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

// Rating slider component
const RatingSlider = ({ value, onChange, label, description }: RatingSliderProps) => {
  // Generate a badge color class based on value
  const getBadgeClass = () => {
    if (value <= 3) return 'bg-red-100 border-red-200 text-red-700';
    if (value <= 6) return 'bg-amber-100 border-amber-200 text-amber-700';
    return 'bg-green-100 border-green-200 text-green-700';
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
      <Slider
        value={[value]}
        min={0}
        max={10}
        step={1}
        onValueChange={(vals) => onChange(vals[0])}
        className="py-2"
      />
    </div>
  );
};

interface SimpleAssessmentBuilderProps {
  clientId: number;
  assessments: Assessment[];
  onChange: (assessments: Assessment[]) => void;
}

export function SimpleAssessmentBuilder({
  clientId,
  assessments = [],
  onChange
}: SimpleAssessmentBuilderProps) {
  // Currently editing assessment
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(null);
  
  // State for step management during milestone addition
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<{
    id: number;
    title: string;
    description?: string;
    rating: number;
    strategies: string[];
    notes?: string;
  } | null>(null);
  
  // Get all selected goal IDs
  const selectedGoalIds = assessments.map(a => a.goalId);
  
  // Fetch subgoals for the currently selected goal
  const { data: subgoals = [] } = useQuery<Subgoal[]>({
    queryKey: ["/api/goals", currentAssessment?.goalId, "subgoals"],
    enabled: !!currentAssessment?.goalId,
  });
  
  // Handle goal selection
  const handleSelectGoal = (goal: Goal) => {
    const newAssessment: Assessment = {
      goalId: goal.id,
      goalTitle: goal.title,
      notes: "",
      milestones: []
    };
    
    setCurrentAssessment(newAssessment);
    
    // Add to the list of assessments
    onChange([...assessments, newAssessment]);
  };
  
  // Handle removal of an assessment
  const handleRemoveAssessment = (goalId: number) => {
    onChange(assessments.filter(a => a.goalId !== goalId));
    if (currentAssessment?.goalId === goalId) {
      setCurrentAssessment(null);
    }
  };
  
  // Start adding a milestone for a goal
  const handleAddMilestone = (assessment: Assessment) => {
    setCurrentAssessment(assessment);
    setAddingMilestone(true);
  };
  
  // Handle milestone selection
  const handleSelectMilestone = (subgoal: Subgoal) => {
    setCurrentMilestone({
      id: subgoal.id,
      title: subgoal.title,
      description: subgoal.description,
      rating: 5, // Default rating
      strategies: [],
      notes: ""
    });
  };
  
  // Handle rating change
  const handleRatingChange = (rating: number) => {
    if (currentMilestone) {
      setCurrentMilestone({
        ...currentMilestone,
        rating
      });
    }
  };
  
  // Handle milestone notes change
  const handleMilestoneNotesChange = (notes: string) => {
    if (currentMilestone) {
      setCurrentMilestone({
        ...currentMilestone,
        notes
      });
    }
  };
  
  // Handle strategy toggle
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
  
  // Complete milestone addition
  const handleCompleteMilestone = () => {
    if (!currentAssessment || !currentMilestone) return;
    
    // Find the assessment in the list
    const assessmentIndex = assessments.findIndex(a => a.goalId === currentAssessment.goalId);
    if (assessmentIndex === -1) return;
    
    // Add the milestone
    const updatedAssessments = [...assessments];
    updatedAssessments[assessmentIndex] = {
      ...updatedAssessments[assessmentIndex],
      milestones: [
        ...updatedAssessments[assessmentIndex].milestones,
        {
          milestoneId: currentMilestone.id,
          milestoneTitle: currentMilestone.title,
          rating: currentMilestone.rating,
          strategies: currentMilestone.strategies,
          notes: currentMilestone.notes
        }
      ]
    };
    
    // Update the state
    onChange(updatedAssessments);
    setCurrentAssessment(updatedAssessments[assessmentIndex]);
    setCurrentMilestone(null);
    setAddingMilestone(false);
  };
  
  // Cancel milestone addition
  const handleCancelMilestone = () => {
    setCurrentMilestone(null);
    setAddingMilestone(false);
  };
  
  // Get already selected milestone IDs for the current goal
  const getSelectedMilestoneIds = (): number[] => {
    if (!currentAssessment) return [];
    
    const assessment = assessments.find(a => a.goalId === currentAssessment.goalId);
    return assessment?.milestones?.map(m => m.milestoneId) || [];
  };
  
  // Filter available subgoals
  const availableSubgoals = subgoals.filter(
    subgoal => !getSelectedMilestoneIds().includes(subgoal.id)
  );
  
  // Render milestone selection section
  const renderMilestoneSelection = () => {
    if (!currentAssessment) return null;
    
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Add Milestone</CardTitle>
          <CardDescription>
            Select a milestone for goal: {currentAssessment.goalTitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableSubgoals.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Milestones Available</AlertTitle>
              <AlertDescription>
                All milestones for this goal have been selected or no milestones exist.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {!currentMilestone ? (
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-2">
                    {availableSubgoals.map(subgoal => (
                      <Card 
                        key={subgoal.id} 
                        className="cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => handleSelectMilestone(subgoal)}
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
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{currentMilestone.title}</h3>
                  <p className="text-sm text-muted-foreground">{currentMilestone.description}</p>
                  
                  <div className="border rounded-md p-4 space-y-4">
                    <RatingSlider
                      value={currentMilestone.rating}
                      onChange={handleRatingChange}
                      label="Performance Rating"
                      description="How well did the client perform on this milestone?"
                    />
                    
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Enter notes about this milestone performance..."
                        value={currentMilestone.notes || ""}
                        onChange={(e) => handleMilestoneNotesChange(e.target.value)}
                        className="resize-none min-h-[80px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Strategies (Select up to 5)</Label>
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
                      <p className="text-xs text-muted-foreground">
                        {currentMilestone.strategies.length}/5 strategies selected
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleCancelMilestone}>
                      Cancel
                    </Button>
                    <Button onClick={handleCompleteMilestone}>
                      Add Milestone
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
        {!currentMilestone && (
          <CardFooter className="flex justify-end">
            <Button variant="outline" onClick={handleCancelMilestone}>
              Cancel
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Goal selector */}
      <SimpleGoalSelector
        clientId={clientId}
        selectedGoalIds={selectedGoalIds}
        onSelectGoal={handleSelectGoal}
      />
      
      {/* Milestone addition section */}
      {addingMilestone && renderMilestoneSelection()}
      
      {/* List of assessments */}
      {assessments.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Assessments Added</AlertTitle>
          <AlertDescription>
            Click "Add Goal" to begin creating performance assessments.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <Card key={assessment.goalId} className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium">{assessment.goalTitle}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => handleRemoveAssessment(assessment.goalId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assessment.milestones.length === 0 ? (
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm text-muted-foreground">No milestones added yet</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleAddMilestone(assessment)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {assessment.milestones.map((milestone) => (
                        <div 
                          key={milestone.milestoneId} 
                          className="border rounded-md p-3"
                        >
                          <h4 className="font-medium text-sm">{milestone.milestoneTitle}</h4>
                          <div className="flex items-center mt-1">
                            <Badge className="mr-2">Rating: {milestone.rating}/10</Badge>
                            {milestone.strategies.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {milestone.strategies.map(strategy => (
                                  <Badge key={strategy} variant="outline" className="text-xs">
                                    {strategy}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {milestone.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{milestone.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleAddMilestone(assessment)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another Milestone
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}