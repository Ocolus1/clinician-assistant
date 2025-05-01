import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import PatientForm from "@/components/onboarding/PatientForm";
import CaregiverForm from "@/components/onboarding/CaregiverForm";
import GoalsForm from "@/components/onboarding/GoalsForm";
import BudgetForm from "@/components/onboarding/BudgetForm";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Patient } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const steps = ["Patient Information", "Caregivers", "Goals", "Budget"];

export default function OnboardingForm() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [patientData, setPatientData] = useState<Partial<Patient> | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);

  const progress = ((step + 1) / steps.length) * 100;

  // Mutation for creating a patient
  const createPatient = useMutation<Patient, Error, any>({
    mutationFn: async (data: any) => {
      // Create a temporary patient with 'pending' onboarding status
      const patientData = {
        ...data,
        availableFunds: 0,
        onboardingStatus: 'pending'  // Set onboarding status to pending during initial creation
      };
      
      const response = await apiRequest("POST", "/api/patients", patientData);
      // Parse the JSON response
      const result = await response.json();
      return result as Patient;
    },
    onSuccess: (patientData) => {
      setPatientId(patientData.id);
      toast({
        title: "Success",
        description: "Patient information saved successfully",
      });
    },
    onError: (error) => {
      console.error("Error creating patient:", error);
      toast({
        title: "Error",
        description: "Failed to save patient information",
        variant: "destructive",
      });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: (patientId: number) => 
      apiRequest("POST", `/api/patients/${patientId}/complete-onboarding`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Patient onboarding completed successfully!",
        variant: "default",
      });
      setLocation(`/patients/${patientId}/profile`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete patient onboarding. Patient data not saved.",
        variant: "destructive",
      });
      // Optionally delete the temporary patient if it exists
      if (patientId) {
        apiRequest("DELETE", `/api/patients/${patientId}`);
      }
    }
  });


  const handleNext = () => {
    if (step === steps.length - 1) {
      // After completing the budget step, go to patient list page
      completeOnboardingMutation.mutate(patientId!); // Assuming patientId is available
    } else {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleExit = () => {
    // Show exit confirmation dialog if we're in any step of onboarding
    if (step > 0 || patientId || patientData) {
      setShowExitDialog(true);
    } else {
      navigateToPatientList();
    }
  };

  const navigateToPatientList = () => {
    setLocation('/patients');
  };

  // Placeholder function - needs implementation based on your database
  const deleteIncompletePatients = async () => {
    try {
      await apiRequest("DELETE", "/api/patients/incomplete"); // Replace with actual endpoint
      toast({ title: "Success", description: "Incomplete patients deleted." });
    } catch (error) {
      console.error("Error deleting incomplete patients:", error);
      toast({
        title: "Error",
        description: "Failed to delete incomplete patients.",
        variant: "destructive",
      });
    }
  };

  // Placeholder function - needs implementation to prevent saving incomplete patients
  const preventIncompletePatientSave = () => {
    // Add logic here to check for incomplete onboarding and prevent save
    console.log("preventIncompletePatientSave needs implementation");
  }


  return (
    <div className="w-full">
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit onboarding process?</AlertDialogTitle>
            <AlertDialogDescription>
              {step === 0 
                ? "You are about to start creating a new patient. No data has been saved yet."
                : `You are at step ${step + 1} of ${steps.length} (${steps[step]}). All progress for this patient will be lost.`}
              Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue onboarding</AlertDialogCancel>
            <AlertDialogAction 
              onClick={navigateToPatientList}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">New Patient Onboarding</h1>
        <Button 
          onClick={handleExit}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Users size={16} />
          Cancel
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((s, i) => (
            <span
              key={s}
              className={`text-sm ${
                i <= step ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="bg-card rounded-lg shadow-sm p-6 md:p-8">
        {step === 0 && (
          <PatientForm 
            onComplete={async (data) => {
              setPatientData(data);
              // Create patient and wait for response
              const result = await createPatient.mutateAsync({
                ...data,
                ndisFunds: 0
              });
              setPatientId(result.id);
              handleNext();
            }} 
          />
        )}
        {step === 1 && patientId && (
          <CaregiverForm 
            patientId={patientId} 
            onComplete={handleNext} 
            onPrevious={handlePrevious} 
          />
        )}
        {step === 2 && patientId && (
          <GoalsForm 
            clientId={patientId}
            patientId={patientId}
            onComplete={handleNext} 
            onPrevious={handlePrevious} 
          />
        )}
        {step === 3 && patientId && (
          <BudgetForm 
            clientId={patientId}
            patientId={patientId}
            onComplete={handleNext} 
            onPrevious={handlePrevious} 
          />
        )}
      </div>
    </div>
  );
}
