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

  // Mutation for creating a client - will be called only at the final step in BudgetForm
  const createClient = useMutation<Client, Error, any>({
    mutationFn: async (data: any) => {
      console.log("Creating client with data:", data);
      const response = await apiRequest("POST", "/api/clients", data);
      const clientData = await response.json();
      return clientData as Client;
    },
    onSuccess: (clientData) => {
      setClientId(clientData.id);
      toast({
        title: "Success",
        description: "Client created successfully",
      });
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Support Network</h2>
                <p className="text-gray-500 mb-8">
                  Add allies to the client's support network. This information can be completed after client creation.
                </p>
                <div className="h-64 bg-muted/30 rounded-xl flex items-center justify-center">
                  <div className="text-center p-6">
                    <Users size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">Ally Information</h3>
                    <p className="text-muted-foreground">
                      Support people who help this client with their therapy journey.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Support Network</h3>
                <p className="text-muted-foreground mb-6">
                  Add allies to the client's support network. This information can be completed after client creation.
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between space-x-4">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      className="w-1/2"
                    >
                      Back to previous step
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="w-1/2"
                    >
                      Continue to next step
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Therapeutic Goals</h2>
                <p className="text-gray-500 mb-8">
                  Define therapeutic goals for the client. This information can be completed after client creation.
                </p>
                <div className="h-64 bg-muted/30 rounded-xl flex items-center justify-center">
                  <div className="text-center p-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground mb-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    <h3 className="text-xl font-medium mb-2">Goal Setting</h3>
                    <p className="text-muted-foreground">
                      Establish therapy goals and measurable outcomes for this client.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-lg border shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Therapeutic Goals</h3>
                <p className="text-muted-foreground mb-6">
                  Define therapeutic goals for the client. This information can be completed after client creation.
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between space-x-4">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      className="w-1/2"
                    >
                      Back to previous step
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="w-1/2"
                    >
                      Continue to next step
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <BudgetForm
            clientId={-1} // This is a placeholder - client will be created in BudgetForm
            clientData={clientData}
            createClientFn={createClient}
            onComplete={() => {
              // Navigate to client list after budget is set up
              setLocation('/clients');
            }}
            onPrevious={handlePrevious}
          />
        )}
      </div>
    </div>
  );
}