// This is a temporary file to update the BudgetForm interface
export interface BudgetFormProps {
  clientId: number; // Keeping for backward compatibility
  patientId?: number; // Adding this for new code
  onComplete: () => void;
  onPrevious: () => void;
}
