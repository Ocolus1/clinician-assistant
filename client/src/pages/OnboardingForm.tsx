import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import ClientForm from "@/components/onboarding/ClientForm";
import AllyForm from "@/components/onboarding/AllyForm";
import GoalsForm from "@/components/onboarding/GoalsForm";
import BudgetForm from "@/components/onboarding/BudgetForm";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@shared/schema";
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

const steps = ["Client Information", "Allies", "Goals", "Budget"];

export default function OnboardingForm() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [clientData, setClientData] = useState<Partial<Client> | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);
  
  const progress = ((step + 1) / steps.length) * 100;

  // Mutation for creating a client - will be called only at the final step
  const createClient = useMutation<Client, Error, any>({
    mutationFn: async (data: any) => {
      console.log("Creating client with data:", data);
      const response = await apiRequest("POST", "/api/clients", data);
      const clientData = await response.json();
      return clientData as Client;
    },
    onSuccess: (clientData) => {
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      // After successfully creating the client, navigate to client list
      setLocation('/clients');
    },
    onError: (error) => {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  // This function is called when we're ready to complete the onboarding
  // and actually create the client with all collected data
  const completeOnboarding = () => {
    if (!clientData) {
      toast({
        title: "Error",
        description: "Missing client information. Please go back to step 1.",
        variant: "destructive",
      });
      return;
    }
    
    // Create client with all the collected data
    createClient.mutate({
      ...clientData,
      availableFunds: 0
    });
  };

  const handleNext = () => {
    if (step === steps.length - 1) {
      // After completing the budget step, create the client and finalize
      completeOnboarding();
    } else {
      // For all other steps, just move to the next one
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
    if (step > 0 || clientId || clientData) {
      setShowExitDialog(true);
    } else {
      navigateToClientList();
    }
  };

  const navigateToClientList = () => {
    setLocation('/clients');
  };

  return (
    <div className="w-full">
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit onboarding process?</AlertDialogTitle>
            <AlertDialogDescription>
              {step === 0 
                ? "You are about to start creating a new client. No data has been saved yet."
                : `You are at step ${step + 1} of ${steps.length} (${steps[step]}). All progress for this client will be lost.`}
              Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue onboarding</AlertDialogCancel>
            <AlertDialogAction 
              onClick={navigateToClientList}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">New Client Onboarding</h1>
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
          <ClientForm 
            onComplete={(data) => {
              setClientData(data);
              // Just store the data and move to the next step, don't create client yet
              setStep(step + 1);
            }} 
          />
        )}
        {step === 1 && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-4">Support Network</h2>
            <p className="text-center text-gray-500 mb-8">
              Add allies to the client's support network. This information can be completed after client creation.
            </p>
            <div className="space-y-4 w-full max-w-md">
              <Button 
                onClick={handleNext}
                className="w-full py-6"
              >
                Continue to next step
              </Button>
              <Button 
                variant="ghost" 
                onClick={handlePrevious}
                className="w-full"
              >
                Back to previous step
              </Button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-4">Therapeutic Goals</h2>
            <p className="text-center text-gray-500 mb-8">
              Define therapeutic goals for the client. This information can be completed after client creation.
            </p>
            <div className="space-y-4 w-full max-w-md">
              <Button 
                onClick={handleNext}
                className="w-full py-6"
              >
                Continue to next step
              </Button>
              <Button 
                variant="ghost" 
                onClick={handlePrevious}
                className="w-full"
              >
                Back to previous step
              </Button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-4">Complete Client Registration</h2>
            <p className="text-center text-gray-500 mb-8">
              Review the client information and click "Complete" to create the client record.
            </p>
            <div className="bg-gray-50 rounded-lg p-6 mb-6 w-full max-w-md">
              <h3 className="font-medium mb-2">Client Summary</h3>
              {clientData && (
                <dl className="divide-y">
                  <div className="py-2 flex justify-between">
                    <dt className="text-gray-600">Name:</dt>
                    <dd>{clientData.name}</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-gray-600">Date of Birth:</dt>
                    <dd>{clientData.dateOfBirth}</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-gray-600">Funds Management:</dt>
                    <dd>{clientData.fundsManagement || 'Not specified'}</dd>
                  </div>
                </dl>
              )}
            </div>
            <div className="space-y-4 w-full max-w-md">
              <Button 
                onClick={handleNext}
                className="w-full py-6"
              >
                Complete Registration
              </Button>
              <Button 
                variant="ghost" 
                onClick={handlePrevious}
                className="w-full"
              >
                Back to previous step
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}