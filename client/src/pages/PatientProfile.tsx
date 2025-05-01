import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Users, 
  Target, 
  DollarSign, 
  Calendar, 
  FileText,
  ArrowLeft,
  Edit,
  Clock,
  ChevronRight,
  MessageSquare,
  Award,
  PlusCircle,
  Mail,
  Phone,
  Archive,
  Star
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RELATIONSHIP_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Patient, Caregiver, Goal, Subgoal, BudgetSettings, BudgetItem } from "@shared/schema";

// Tab components
import PatientPersonalInfo from "@/components/profile/PatientPersonalInfo";
import PatientCaregivers from "@/components/profile/PatientCaregivers";
import PatientGoals from "@/components/profile/PatientGoals";
import PatientClinicians from "@/components/profile/PatientClinicians";
import { BudgetManagerView } from "@/components/budget/BudgetManagerView";
import { UnifiedBudgetManager } from "@/components/budget/UnifiedBudgetManager";
import { BudgetFeatureProvider } from "@/components/budget/BudgetFeatureContext";
import { EnhancedBudgetCardGrid } from "@/components/budget/EnhancedBudgetCardGrid";
import { BudgetPlanView } from "@/components/budget/BudgetPlanView";
import PatientSessions from "@/components/profile/PatientSessions";
import { PatientReports } from "@/components/profile/PatientReports";
import AddCaregiverDialog from "@/components/profile/AddCaregiverDialog";
import AddGoalDialog from "@/components/profile/AddGoalDialog";
import AddSubgoalDialog from "@/components/profile/AddSubgoalDialog";
import EditGoalDialog from "@/components/profile/EditGoalDialog";
import EditSubgoalDialog from "@/components/profile/EditSubgoalDialog";
import { EditPatientInfoDialog } from "@/components/profile/EditPatientInfoDialog";

// Function to parse URL parameters for active tab
function getActiveTabFromURL(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tab') || 'personal';
}

export default function PatientProfile() {
  // Initialize toast hook
  const { toast } = useToast();
  
  // The route parameter is 'id' not 'patientId'
  const params = useParams();
  console.log("All URL params:", params); // Debug all params
  
  // Get the id parameter using destructuring
  const { id } = params;
  console.log("Raw ID from URL params:", id); // Add this for debugging
  
  // Parse the ID into a number, ensuring it's a valid number
  const patientId = id && !isNaN(parseInt(id)) ? parseInt(id) : NaN;
  console.log("Parsed patient ID:", patientId); // Add this for debugging
  
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());
  // IMPORTANT: Define all state hooks at the top level, before any conditional returns
  const [subgoalsByGoal, setSubgoalsByGoal] = useState<Record<number, Subgoal[]>>({});
  const [isLoadingSubgoals, setIsLoadingSubgoals] = useState(false);
  const [showAddCaregiverDialog, setShowAddCaregiverDialog] = useState(false);
  const [showEditPatientDialog, setShowEditPatientDialog] = useState(false);
  
  // State for edit goal dialog
  const [showEditGoalDialog, setShowEditGoalDialog] = useState(false);
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  
  // State for edit subgoal dialog
  const [showEditSubgoalDialog, setShowEditSubgoalDialog] = useState(false);
  const [showAddSubgoalDialog, setShowAddSubgoalDialog] = useState(false);
  const [selectedSubgoal, setSelectedSubgoal] = useState<Subgoal | null>(null);
  const [selectedGoalForSubgoal, setSelectedGoalForSubgoal] = useState<Goal | null>(null);

  // Fetch patient data with enhanced logging
  const { data: patient, isLoading: isLoadingPatient } = useQuery<Patient>({
    queryKey: ['/api/patients', patientId],
    queryFn: async (context) => {
      console.log("Fetching patient data for ID:", patientId);
      const url = `/api/patients/${patientId}`;
      console.log("Requesting URL:", url);
      
      const result = await fetch(url);
      if (!result.ok) {
        throw new Error(`Failed to fetch patient: ${result.status}`);
      }
      
      const data = await result.json();
      console.log("Patient data received:", JSON.stringify(data));
      return data;
    },
  });

  // Fetch caregivers
  const { data: caregivers = [], isLoading: isLoadingCaregivers } = useQuery<Caregiver[]>({
    queryKey: ['/api/patients', patientId, 'caregivers'],
    queryFn: async () => {
      console.log("Fetching caregivers for patient ID:", patientId);
      const response = await fetch(`/api/patients/${patientId}/caregivers`);
      const data = await response.json();
      console.log("Caregivers data received:", JSON.stringify(data));
      return data;
    },
    enabled: !!patientId,
  });

  // Fetch goals - using explicit fetch to debug
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['/api/patients', patientId, 'goals'],
    queryFn: async () => {
      console.log("Explicitly fetching goals for patient ID:", patientId);
      const response = await fetch(`/api/patients/${patientId}/goals`);
      const data = await response.json();
      console.log("Goals data received:", data);
      return data;
    },
    enabled: !!patientId,
  });

  // Fetch budget items with logging for debugging
  const { data: budgetItems = [], isLoading: isLoadingBudgetItems } = useQuery<BudgetItem[]>({
    queryKey: ['/api/patients', patientId, 'budget-items'],
    queryFn: async () => {
      console.log("Explicitly fetching budget items for patient ID:", patientId);
      const response = await fetch(`/api/patients/${patientId}/budget-items`);
      if (!response.ok) {
        console.error("Error fetching budget items:", response.status, response.statusText);
        throw new Error(`Error fetching budget items: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Budget items data received:", data);
      return data;
    },
    enabled: !!patientId,
  });

  // Fetch budget settings with logging for debugging
  const { data: budgetSettings, isLoading: isLoadingBudgetSettings } = useQuery<BudgetSettings>({
    queryKey: ['/api/patients', patientId, 'budget-settings'],
    queryFn: async () => {
      console.log("Explicitly fetching budget settings for patient ID:", patientId);
      const response = await fetch(`/api/patients/${patientId}/budget-settings`);
      if (!response.ok) {
        console.error("Error fetching budget settings:", response.status, response.statusText);
        throw new Error(`Error fetching budget settings: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Budget settings data received:", data);
      return data;
    },
    enabled: !!patientId,
  });
  
  // Fetch ALL budget settings to pass to the enhanced budget tab
  const { data: allBudgetSettings = [], isLoading: isLoadingAllBudgetSettings } = useQuery<BudgetSettings[]>({
    queryKey: ['/api/patients', patientId, 'budget-settings', 'all'],
    queryFn: async () => {
      console.log(`Explicitly fetching ALL budget settings for patient ${patientId}`);
      const response = await fetch(`/api/patients/${patientId}/budget-settings?all=true`);
      if (!response.ok) {
        console.error("Error fetching all budget settings:", response.status, response.statusText);
        throw new Error(`Error fetching all budget settings: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`Received ${Array.isArray(data) ? data.length : 0} budget settings:`, data);
      return data;
    },
    enabled: !!patientId,
  });
  
  // Use useEffect to fetch subgoals when goals are loaded
  useEffect(() => {
    // Only run if goals are valid
    if (!goals || goals.length === 0) {
      console.log("No goals found, skipping subgoal fetch");
      return;
    }
    
    // Set loading state
    setIsLoadingSubgoals(true);
    console.log(`Found ${goals.length} goals, fetching subgoals for each goal`);
    
    // Create an array of promises to fetch subgoals for each goal
    const fetchSubgoals = async () => {
      try {
        const result: Record<number, Subgoal[]> = {};
        
        // Fetch subgoals for each goal
        for (const goal of goals) {
          if (goal && goal.id) {
            try {
              console.log(`Fetching subgoals for goal ID: ${goal.id}, Title: ${goal.title}`);
              const response = await fetch(`/api/goals/${goal.id}/subgoals`);
              if (response.ok) {
                const data = await response.json();
                console.log(`Received ${data.length} subgoals for goal ${goal.id}:`, data);
                result[goal.id] = data;
              } else {
                console.error(`Failed to fetch subgoals for goal ${goal.id}, status: ${response.status}`);
                result[goal.id] = [];
              }
            } catch (error) {
              console.error(`Error fetching subgoals for goal ${goal.id}:`, error);
              result[goal.id] = [];
            }
          }
        }
        
        // Update state with all fetched subgoals
        console.log("Final subgoals by goal:", result);
        setSubgoalsByGoal(result);
        setIsLoadingSubgoals(false);
      } catch (error) {
        console.error("Error fetching subgoals:", error);
        setIsLoadingSubgoals(false);
      }
    };
    
    fetchSubgoals();
  }, [goals]); // Only re-run when goals change

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL with tab parameter without navigating
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url.toString());
  };

  // Go back to patient list
  const handleBack = () => {
    setLocation("/patients");
  };

  // Calculate total budget
  const totalBudget = useMemo(() => {
    return budgetItems.reduce((acc: number, item: BudgetItem) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return acc + (unitPrice * quantity);
    }, 0);
  }, [budgetItems]);

  // Calculate budget percentage - safely handle nullish values
  const budgetPercentage = useMemo(() => {
    if (!budgetSettings || !budgetSettings.ndisFunds) return 0;
    
    const ndisFunds = typeof budgetSettings.ndisFunds === 'string' 
      ? parseFloat(budgetSettings.ndisFunds) 
      : budgetSettings.ndisFunds;
    
    return ndisFunds > 0 ? (totalBudget / ndisFunds) * 100 : 0;
  }, [totalBudget, budgetSettings]);

  // Loading state
  const isLoading = isLoadingPatient || isLoadingCaregivers || isLoadingGoals || 
    isLoadingBudgetItems || isLoadingBudgetSettings || isLoadingAllBudgetSettings || isLoadingSubgoals;

  // Calculate age from date of birth - Define this BEFORE any conditional returns
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Calculate patient age - Safely handle this to avoid errors
  const patientAge = patient && patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;

  // Now we can have conditional returns after ALL hooks have been defined
  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-4" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-8" />
            <div className="space-y-8">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-4" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-medium mb-2">Patient not found</h2>
            <p className="text-gray-500 mb-4">The patient you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={handleBack}>Return to Patient List</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine if we're on a tab that should use full-width layout
  const isFullScreenTab = activeTab === 'reports' || activeTab === 'budget' || activeTab === 'goals' || activeTab === 'caregivers' || activeTab === 'sessions' || activeTab === 'personal';
  
  return (
    <div className={`w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 ${!isFullScreenTab ? 'max-w-6xl' : ''}`}>
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4" 
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      
      {/* Edit Patient Info Dialog */}
      {patient && (
        <EditPatientInfoDialog
          open={showEditPatientDialog}
          onOpenChange={setShowEditPatientDialog}
          patient={patient}
        />
      )}
      
      {/* Add Caregiver Dialog - using separate component to avoid React hooks issues */}
      {patient && (
        <AddCaregiverDialog
          open={showAddCaregiverDialog}
          onOpenChange={setShowAddCaregiverDialog}
          patientId={patientId}
          patientName={patient.name}
        />
      )}
      
      {/* Edit Goal Dialog */}
      {selectedGoal && (
        <>
          {console.log("Rendering EditGoalDialog with goal:", JSON.stringify(selectedGoal))}
          <EditGoalDialog
            key={`goal-edit-${selectedGoal.id}`}
            open={showEditGoalDialog}
            onOpenChange={(open) => {
              console.log("EditGoalDialog onOpenChange called with:", open);
              setShowEditGoalDialog(open);
              // When dialog closes, refresh the goals and subgoals
              if (!open) {
                // Invalidate the goals query to trigger a refresh
                queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'goals'] });
                // Reset selectedGoal to null to ensure clean state for next edit
                setSelectedGoal(null);
              }
            }}
            goal={selectedGoal}
          />
        </>
      )}
      
      {/* Edit Subgoal Dialog */}
      {selectedSubgoal && (
        <>
          {console.log("Rendering EditSubgoalDialog with subgoal:", JSON.stringify(selectedSubgoal))}
          <EditSubgoalDialog
            key={`subgoal-edit-${selectedSubgoal.id}`} 
            open={showEditSubgoalDialog}
            onOpenChange={(open) => {
              console.log("EditSubgoalDialog onOpenChange called with:", open);
              setShowEditSubgoalDialog(open);
              // When dialog closes, refresh the subgoals data
              if (!open && selectedSubgoal) {
                // Fetch the specific subgoals for the related goal
                const goalId = selectedSubgoal.goalId;
                console.log(`Refreshing subgoals for goal ${goalId} after dialog closed`);
                fetch(`/api/goals/${goalId}/subgoals`)
                  .then(response => response.json())
                  .then(data => {
                    console.log(`Refreshed subgoals for goal ${goalId}:`, data);
                    // Update the subgoals in state
                    setSubgoalsByGoal(prevState => ({
                      ...prevState,
                      [goalId]: data
                    }));
                    // Reset selectedSubgoal to null to ensure clean state for next edit
                    setSelectedSubgoal(null);
                  })
                  .catch(error => {
                    console.error(`Error refreshing subgoals for goal ${goalId}:`, error);
                  });
              }
            }}
            subgoal={selectedSubgoal}
          />
        </>
      )}
      
      {/* Add Goal Dialog */}
      <AddGoalDialog
        open={showAddGoalDialog}
        onOpenChange={(open) => {
          setShowAddGoalDialog(open);
          // When dialog closes, refresh the goals
          if (!open) {
            // Invalidate the goals query to trigger a refresh
            queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'goals'] });
          }
        }}
        patientId={patientId}
      />
      
      {/* Add Subgoal Dialog */}
      {selectedGoalForSubgoal && (
        <AddSubgoalDialog
          key={`subgoal-add-${selectedGoalForSubgoal.id}`}
          open={showAddSubgoalDialog}
          onOpenChange={(open) => {
            setShowAddSubgoalDialog(open);
            // When dialog closes, refresh the subgoals
            if (!open) {
              // Fetch the updated subgoals
              const goalId = selectedGoalForSubgoal.id;
              console.log(`Refreshing subgoals for goal ${goalId} after adding new subgoal`);
              fetch(`/api/goals/${goalId}/subgoals`)
                .then(response => response.json())
                .then(data => {
                  console.log(`Refreshed subgoals for goal ${goalId}:`, data);
                  // Update the subgoals in state
                  setSubgoalsByGoal(prevState => ({
                    ...prevState,
                    [goalId]: data
                  }));
                  // Reset selected goal for clean state
                  setSelectedGoalForSubgoal(null);
                })
                .catch(error => {
                  console.error(`Error refreshing subgoals for goal ${goalId}:`, error);
                });
            }
          }}
          goalId={selectedGoalForSubgoal.id}
          goalTitle={selectedGoalForSubgoal.title}
        />
      )}
      
      {/* Tabs section */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-6 mb-8">
          <TabsTrigger value="personal" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Personal Info</span>
            <span className="inline md:hidden">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="caregivers" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            <span>Caregivers</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            <span>Goals</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>Budget</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            <span>Reports</span>
          </TabsTrigger>
        </TabsList>
        
        <Card className={isFullScreenTab ? 'w-full' : ''}>
          <CardContent className={isFullScreenTab ? 'p-6 w-full' : 'p-6'}>
            <TabsContent value="personal" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Personal Information</h3>
              <p className="text-gray-500 mb-6">
                View and edit the patient's personal details, contact information, and preferences.
              </p>
              
              {/* Use the PatientPersonalInfo component */}
              {patient && (
                <>
                  {console.log("Patient data from parent component:", JSON.stringify(patient))}
                  {/* Pass the edit dialog handler via onEdit prop */}
                  <PatientPersonalInfo 
                    patient={{
                      ...patient
                      // No type casting needed - we'll handle this in the component
                    }}
                    onEdit={() => setShowEditPatientDialog(true)} 
                  />
                  
                  {/* Add Clinician Assignment Component */}
                  <PatientClinicians patientId={patientId} />
                </>
              )}
            </TabsContent>
            
            <TabsContent value="caregivers" className="mt-0">
              {/* Use the PatientCaregivers component */}
              <PatientCaregivers
                caregivers={caregivers}
                patientId={patientId}
                onAddCaregiver={() => {
                }}
                onEditCaregiver={(caregiver) => {
                  // We've implemented this already in PatientCaregivers
                  // This is just a fallback in case something's wrong
                  console.log("Edit caregiver clicked from parent:", caregiver);
                }}
                onDeleteCaregiver={(caregiver) => {
                  // Note: We're using archive instead of delete now
                  console.log("Delete caregiver clicked from parent:", caregiver);
                }}
                onContactCaregiver={(caregiver) => {
                  // Direct email is already implemented in PatientCaregivers
                  // This is just a fallback
                  window.location.href = `mailto:${caregiver.email}`;
                }}
              />
            </TabsContent>
            
            <TabsContent value="goals" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Therapeutic Goals</h3>
              <p className="text-gray-500 mb-6">
                Track and manage the patient's therapeutic goals and sub-goals.
              </p>
              
              {/* Create a subgoals map to pass to the PatientGoals component */}
              <PatientGoals 
                goals={goals || []}
                subgoals={subgoalsByGoal || {}}
                onAddGoal={() => {
                  console.log("Add goal clicked");
                  setShowAddGoalDialog(true);
                }}
                onEditGoal={(goal) => {
                  console.log("Edit goal clicked", goal);
                  setSelectedGoal(goal);
                  setShowEditGoalDialog(true);
                }}
                onArchiveGoal={(goal) => console.log("Archive goal clicked", goal)}
                onAddSubgoal={(goalId) => {
                  console.log("Add subgoal clicked for goal", goalId);
                  // Find the goal by its ID
                  const goal = goals.find(g => g.id === goalId);
                  if (goal) {
                    setSelectedGoalForSubgoal(goal);
                    setShowAddSubgoalDialog(true);
                  } else {
                    console.error("Could not find goal with ID:", goalId);
                    toast({
                      title: "Error",
                      description: "Could not find the specified goal.",
                      variant: "destructive",
                    });
                  }
                }}
                onEditSubgoal={(subgoal) => {
                  console.log("Edit subgoal clicked", subgoal);
                  setSelectedSubgoal(subgoal);
                  setShowEditSubgoalDialog(true);
                }}
                onToggleSubgoalStatus={(subgoal) => console.log("Toggle subgoal status clicked", subgoal)}
              />
            </TabsContent>
            
            <TabsContent value="budget" className="mt-0">
              <div className="space-y-8">
                <BudgetPlanView 
                  patientId={patientId}
                  budgetItems={budgetItems}
                  budgetSettings={budgetSettings}
                  allBudgetSettings={allBudgetSettings}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="sessions" className="mt-0">
              {/* Use the PatientSessions component with explicit patient ID */}
              <PatientSessions key={patientId} patientId={patientId} />
            </TabsContent>
            
            <TabsContent value="reports" className="mt-0">
              <div className={isFullScreenTab ? 'w-full' : ''}>
                {/* Use the PatientReports component */}
                <PatientReports patientId={patientId} />
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
