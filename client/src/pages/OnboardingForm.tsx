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
  const [alliesData, setAlliesData] = useState<any[]>([]);
  const [goalsData, setGoalsData] = useState<any[]>([]);
  const [budgetData, setBudgetData] = useState<any | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const progress = ((step + 1) / steps.length) * 100;

  // Mutation for creating a client - only called at the end of the process
  const createClient = useMutation<Client, Error, any>({
    mutationFn: async (data: any) => {
      console.log("Creating client with data:", data);
      const response = await apiRequest("POST", "/api/clients", data);
      // Parse the JSON response
      const clientData = await response.json();
      return clientData as Client;
    },
    onSuccess: (newClientData) => {
      setClientId(newClientData.id);
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      
      // Only redirect to client list after successful client creation at the end of the process
      if (step === steps.length - 1) {
        setLocation('/clients');
      }
    },
    onError: (error) => {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
      setIsCompleting(false);
    },
  });

  // This will be called after completing all steps to actually save everything
  const completeOnboarding = async () => {
    setIsCompleting(true);
    
    try {
      // Only now do we create the client with all the collected data
      if (!clientData) {
        throw new Error("Client data is missing");
      }
      
      // Create the client
      createClient.mutate({
        ...clientData,
        availableFunds: 0
      });
      
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding process",
        variant: "destructive",
      });
      setIsCompleting(false);
    }
  };

  const handleNext = () => {
    if (step === steps.length - 1) {
      // This is the final step, complete the onboarding
      completeOnboarding();
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
    if (step > 0 || clientData) {
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
              Add allies to the client's support network. This step is optional and can be completed later.
            </p>
            <div className="space-y-4 w-full max-w-md">
              <Button 
                variant="outline" 
                onClick={() => setStep(step + 1)} 
                className="w-full py-6"
              >
                Skip this step
              </Button>
              <Button 
                onClick={() => setStep(step + 1)}
                className="w-full py-6"
              >
                Continue without adding allies
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
              Define therapeutic goals for the client. This step is optional and can be completed later.
            </p>
            <div className="space-y-4 w-full max-w-md">
              <Button 
                variant="outline" 
                onClick={() => setStep(step + 1)} 
                className="w-full py-6"
              >
                Skip this step
              </Button>
              <Button 
                onClick={() => setStep(step + 1)}
                className="w-full py-6"
              >
                Continue without adding goals
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
            <h2 className="text-2xl font-semibold mb-4">Budget Information</h2>
            <p className="text-center text-gray-500 mb-8">
              Set up budget information for the client. Click "Complete" to save all information and create the client.
            </p>
            <div className="space-y-4 w-full max-w-md">
              <Button 
                onClick={completeOnboarding}
                className="w-full py-6"
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creating client...
                  </div>
                ) : (
                  "Complete Onboarding"
                )}
              </Button>
              <Button 
                variant="ghost" 
                onClick={handlePrevious}
                className="w-full"
                disabled={isCompleting}
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