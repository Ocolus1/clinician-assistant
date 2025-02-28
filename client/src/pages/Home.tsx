import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import ClientForm from "@/components/onboarding/ClientForm";
import AllyForm from "@/components/onboarding/AllyForm";
import GoalsForm from "@/components/onboarding/GoalsForm";
import BudgetForm from "@/components/onboarding/BudgetForm";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const steps = ["Client Information", "Allies", "Goals", "Budget"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  
  const progress = ((step + 1) / steps.length) * 100;

  const handleNext = () => {
    if (step === steps.length - 1) {
      // After completing the budget step, go to client list page
      setLocation('/clients');
    } else {
      setStep(step + 1);
    }
  };
  
  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const navigateToClientList = () => {
    setLocation('/clients');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Speech Therapy Onboarding</h1>
        <Button 
          onClick={navigateToClientList}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Users size={16} />
          View All Clients
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
          <ClientForm onComplete={(id) => {
            setClientId(id);
            handleNext();
          }} />
        )}
        {step === 1 && clientId && (
          <AllyForm 
            clientId={clientId} 
            onComplete={handleNext} 
            onPrevious={handlePrevious} 
          />
        )}
        {step === 2 && clientId && (
          <GoalsForm 
            clientId={clientId} 
            onComplete={handleNext} 
            onPrevious={handlePrevious} 
          />
        )}
        {step === 3 && clientId && (
          <BudgetForm 
            clientId={clientId} 
            onComplete={handleNext} 
            onPrevious={handlePrevious} 
          />
        )}
      </div>
    </div>
  );
}
