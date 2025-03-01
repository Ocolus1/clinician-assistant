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

  // Mutation for creating a client
  const createClient = useMutation<Client, Error, any>({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/clients", data);
      // Parse the JSON response
      const clientData = await response.json();
      return clientData as Client;
    },
    onSuccess: (clientData) => {
      setClientId(clientData.id);
      toast({
        title: "Success",
        description: "Client information saved successfully",
      });
    },
    onError: (error) => {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: "Failed to save client information",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === steps.length - 1) {
      // After completing the budget step, go to client list page
      setLocation('/clients');
    } else if (step === 0 && clientData) {
      // Create client when moving from step 1 to step 2
      createClient.mutate({
        ...clientData,
        availableFunds: 0
      }, {
        onSuccess: () => {
          // Move to next step after successful client creation
          setStep(step + 1);
        }
      });
    } else {
      // For other steps, just move forward
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
              // Store client data without creating the client yet
              setClientData(data);
              // Just move to the next step
              handleNext();
            }} 
          />
        )}
        {step === 1 && (
          <>
            {clientId ? (
              <AllyForm 
                clientId={clientId} 
                onComplete={handleNext} 
                onPrevious={handlePrevious} 
              />
            ) : (
              <div className="text-center py-10">
                <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
                <p>Preparing form... please wait.</p>
              </div>
            )}
          </>
        )}
        {step === 2 && (
          <>
            {clientId ? (
              <GoalsForm 
                clientId={clientId} 
                onComplete={handleNext} 
                onPrevious={handlePrevious} 
              />
            ) : (
              <div className="text-center py-10">
                <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
                <p>Preparing form... please wait.</p>
              </div>
            )}
          </>
        )}
        {step === 3 && (
          <>
            {clientId ? (
              <BudgetForm 
                clientId={clientId} 
                onComplete={handleNext} 
                onPrevious={handlePrevious} 
              />
            ) : (
              <div className="text-center py-10">
                <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
                <p>Preparing form... please wait.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}