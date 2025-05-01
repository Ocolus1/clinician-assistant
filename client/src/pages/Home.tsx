import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import PatientForm from "@/components/onboarding/PatientForm";
import CaregiverForm from "@/components/onboarding/CaregiverForm";
import GoalsForm from "@/components/onboarding/GoalsForm";
import BudgetForm from "@/components/onboarding/BudgetForm";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const steps = ["Patient Information", "Caregivers", "Goals", "Budget"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  
  const progress = ((step + 1) / steps.length) * 100;

  const handleNext = () => {
    if (step === steps.length - 1) {
      // After completing the budget step, go to patient list page
      setLocation('/patients');
    } else {
      setStep(step + 1);
    }
  };
  
  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const navigateToPatientList = () => {
    setLocation('/patients');
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Speech Therapy Onboarding</h1>
        <Button 
          onClick={navigateToPatientList}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Users size={16} />
          View All Patients
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
          <PatientForm onComplete={(id) => {
            setPatientId(id);
            handleNext();
          }} />
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
