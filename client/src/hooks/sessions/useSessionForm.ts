import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { insertSessionSchema, Caregiver, Goal, Subgoal, BudgetItem, Strategy } from "@shared/schema";

// Session form schema
export const sessionFormSchema = insertSessionSchema.extend({
  sessionDate: z.coerce.date({
    required_error: "Session date is required",
  }),
  patientId: z.coerce.number({
    required_error: "Patient is required",
  }),
  therapistId: z.coerce.number({
    required_error: "Clinician is required",
  }).optional(), // Using coerce to handle string inputs from Select
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  location: z.string().optional(),
  sessionId: z.string().optional(), // Added session ID field for display
});

// Performance assessment schema
export const performanceAssessmentSchema = z.object({
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

// Product schema for session notes
export const sessionProductSchema = z.object({
  budgetItemId: z.number(),
  productCode: z.string(),
  productDescription: z.string(),
  quantity: z.number().min(0.01),
  unitPrice: z.number(),
  availableQuantity: z.number(), // For validation only, not sent to server
});

// Session notes schema
export const sessionNoteSchema = z.object({
  presentCaregivers: z.array(z.string()).default([]),
  presentCaregiverIds: z.array(z.number()).default([]), // Store caregiver IDs for data integrity
  moodRating: z.number().min(0).max(10).default(5),
  focusRating: z.number().min(0).max(10).default(5),
  cooperationRating: z.number().min(0).max(10).default(5),
  physicalActivityRating: z.number().min(0).max(10).default(5),
  notes: z.string().optional(),
  products: z.array(sessionProductSchema).default([]),
  status: z.enum(["draft", "completed"]).default("draft"),
});

// Complete form schema
export const integratedSessionFormSchema = z.object({
  session: sessionFormSchema,
  sessionNote: sessionNoteSchema,
  performanceAssessments: z.array(performanceAssessmentSchema).default([]),
});

export type IntegratedSessionFormValues = z.infer<typeof integratedSessionFormSchema>;

// Types for performance assessment management
type MilestoneAssessment = {
  milestoneId: number;
  milestoneTitle?: string;
  rating?: number;
  strategies: string[];
  notes?: string;
};

type PerformanceAssessment = {
  goalId: number;
  goalTitle?: string;
  notes?: string;
  milestones: MilestoneAssessment[];
};

// Hook for session form state management
export function useSessionForm(initialPatientId?: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // UI state
  const [activeTab, setActiveTab] = useState("details");
  
  // Dialog states
  const [goalSelectionOpen, setGoalSelectionOpen] = useState(false);
  const [milestoneSelectionOpen, setMilestoneSelectionOpen] = useState(false);
  const [strategySelectionOpen, setStrategySelectionOpen] = useState(false);
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);
  
  // Selection state
  const [currentGoalIndex, setCurrentGoalIndex] = useState<number | null>(null);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState<number | null>(null);
  const [milestoneGoalId, setMilestoneGoalId] = useState<number | null>(null);
  
  // Form state (separated from UI state)
  const [performanceAssessments, setPerformanceAssessments] = useState<PerformanceAssessment[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [selectedPresentCaregivers, setSelectedPresentCaregivers] = useState<number[]>([]);
  
  // Derived state
  const selectedGoalIds = useMemo(() => 
    performanceAssessments.map(assessment => assessment.goalId),
    [performanceAssessments]
  );
  
  const selectedMilestoneIds = useMemo(() => {
    if (currentGoalIndex === null) return [];
    
    return performanceAssessments[currentGoalIndex]?.milestones.map(m => m.milestoneId) || [];
  }, [performanceAssessments, currentGoalIndex]);
  
  // Handlers
  const handleGoalSelection = useCallback((goal: Goal) => {
    setPerformanceAssessments(prev => {
      // Check if goal is already selected
      if (prev.some(assessment => assessment.goalId === goal.id)) {
        toast({
          title: "Goal already added",
          description: "This goal has already been added to the session.",
          variant: "destructive",
        });
        return prev;
      }
      
      // Add new goal assessment
      return [
        ...prev,
        {
          goalId: goal.id,
          goalTitle: goal.title,
          notes: "",
          milestones: [],
        },
      ];
    });
    
    setGoalSelectionOpen(false);
  }, [toast]);
  
  const handleMilestoneSelection = useCallback((subgoal: Subgoal) => {
    if (currentGoalIndex === null) {
      toast({
        title: "No goal selected",
        description: "Please select a goal first.",
        variant: "destructive",
      });
      return;
    }
    
    setPerformanceAssessments(prev => {
      const updated = [...prev];
      
      // Check if milestone is already added
      if (updated[currentGoalIndex].milestones.some(m => m.milestoneId === subgoal.id)) {
        toast({
          title: "Milestone already added",
          description: "This milestone has already been added to the goal.",
          variant: "destructive",
        });
        return prev;
      }
      
      // Add new milestone
      updated[currentGoalIndex].milestones.push({
        milestoneId: subgoal.id,
        milestoneTitle: subgoal.title,
        rating: undefined,
        strategies: [],
        notes: "",
      });
      
      return updated;
    });
    
    setMilestoneSelectionOpen(false);
  }, [currentGoalIndex, toast]);
  
  const handleStrategySelection = useCallback((strategy: Strategy) => {
    if (currentGoalIndex === null || currentMilestoneIndex === null) {
      toast({
        title: "No milestone selected",
        description: "Please select a milestone first.",
        variant: "destructive",
      });
      return;
    }
    
    setPerformanceAssessments(prev => {
      const updated = [...prev];
      
      // Check if strategy is already added
      if (updated[currentGoalIndex].milestones[currentMilestoneIndex].strategies.includes(strategy.name)) {
        toast({
          title: "Strategy already added",
          description: "This strategy has already been added to the milestone.",
          variant: "destructive",
        });
        return prev;
      }
      
      // Add new strategy
      updated[currentGoalIndex].milestones[currentMilestoneIndex].strategies.push(strategy.name);
      
      return updated;
    });
    
    setStrategySelectionOpen(false);
  }, [currentGoalIndex, currentMilestoneIndex, toast]);
  
  const handleRemoveGoal = useCallback((goalIndex: number) => {
    setPerformanceAssessments(prev => {
      const updated = [...prev];
      updated.splice(goalIndex, 1);
      return updated;
    });
    
    // Reset current indices if needed
    if (currentGoalIndex === goalIndex) {
      setCurrentGoalIndex(null);
      setCurrentMilestoneIndex(null);
    } else if (currentGoalIndex !== null && currentGoalIndex > goalIndex) {
      setCurrentGoalIndex(currentGoalIndex - 1);
    }
  }, [currentGoalIndex]);
  
  const handleRemoveMilestone = useCallback((goalIndex: number, milestoneIndex: number) => {
    setPerformanceAssessments(prev => {
      const updated = [...prev];
      if (updated[goalIndex]?.milestones) {
        updated[goalIndex].milestones.splice(milestoneIndex, 1);
      }
      return updated;
    });
    
    // Reset current milestone index if needed
    if (currentGoalIndex === goalIndex && currentMilestoneIndex === milestoneIndex) {
      setCurrentMilestoneIndex(null);
    } else if (currentGoalIndex === goalIndex && currentMilestoneIndex !== null && currentMilestoneIndex > milestoneIndex) {
      setCurrentMilestoneIndex(currentMilestoneIndex - 1);
    }
  }, [currentGoalIndex, currentMilestoneIndex]);
  
  const handleRemoveStrategy = useCallback((goalIndex: number, milestoneIndex: number, strategyName: string) => {
    setPerformanceAssessments(prev => {
      const updated = [...prev];
      if (updated[goalIndex]?.milestones[milestoneIndex]) {
        updated[goalIndex].milestones[milestoneIndex].strategies = 
          updated[goalIndex].milestones[milestoneIndex].strategies.filter(s => s !== strategyName);
      }
      return updated;
    });
  }, []);
  
  const handleUpdateMilestoneRating = useCallback((goalIndex: number, milestoneIndex: number, rating: number) => {
    setPerformanceAssessments(prev => {
      const updated = [...prev];
      if (updated[goalIndex]?.milestones[milestoneIndex]) {
        updated[goalIndex].milestones[milestoneIndex].rating = rating;
      }
      return updated;
    });
  }, []);
  
  const handleUpdateMilestoneNotes = useCallback((goalIndex: number, milestoneIndex: number, notes: string) => {
    setPerformanceAssessments(prev => {
      const updated = [...prev];
      if (updated[goalIndex]?.milestones[milestoneIndex]) {
        updated[goalIndex].milestones[milestoneIndex].notes = notes;
      }
      return updated;
    });
  }, []);
  
  const handleProductSelection = useCallback((product: BudgetItem & { availableQuantity: number }, quantity: number) => {
    // This handler would add a product to the session notes
    // Implementation would depend on how the form manages products
    setSelectedProductIds(prev => [...prev, product.id]);
  }, []);
  
  const handleTogglePresentCaregiver = useCallback((caregiverId: number) => {
    setSelectedPresentCaregivers(prev => {
      if (prev.includes(caregiverId)) {
        return prev.filter(id => id !== caregiverId);
      } else {
        return [...prev, caregiverId];
      }
    });
  }, []);
  
  return {
    // UI state
    activeTab,
    setActiveTab,
    
    // Dialog states
    goalSelectionOpen,
    setGoalSelectionOpen,
    milestoneSelectionOpen,
    setMilestoneSelectionOpen,
    strategySelectionOpen,
    setStrategySelectionOpen,
    productSelectionOpen,
    setProductSelectionOpen,
    
    // Selection state
    currentGoalIndex,
    setCurrentGoalIndex,
    currentMilestoneIndex,
    setCurrentMilestoneIndex,
    milestoneGoalId,
    setMilestoneGoalId,
    
    // Derived state
    selectedGoalIds,
    selectedMilestoneIds,
    
    // Form state
    performanceAssessments,
    setPerformanceAssessments,
    selectedProductIds,
    setSelectedProductIds,
    selectedPresentCaregivers,
    setSelectedPresentCaregivers,
    
    // Handlers
    handleGoalSelection,
    handleMilestoneSelection,
    handleStrategySelection,
    handleRemoveGoal,
    handleRemoveMilestone,
    handleRemoveStrategy,
    handleUpdateMilestoneRating,
    handleUpdateMilestoneNotes,
    handleProductSelection,
    handleTogglePresentCaregiver
  };
}