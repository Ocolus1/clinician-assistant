import React, { createContext, useContext, useState, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";

// Context interface
interface BudgetFeatureContextType {
  // Plan ID generation
  generatePlanCode: () => string;
  
  // Selected plan state
  selectedPlanId: number | null;
  setSelectedPlanId: (id: number | null) => void;
  
  // Dialog states
  showEditPlanDialog: boolean;
  setShowEditPlanDialog: (show: boolean) => void;
  
  // Edit mode
  isEditMode: boolean;
  setIsEditMode: (isEdit: boolean) => void;
}

// Create the context
const BudgetFeatureContext = createContext<BudgetFeatureContextType | undefined>(undefined);

// Provider component
interface BudgetFeatureProviderProps {
  children: ReactNode;
}

export function BudgetFeatureProvider({ children }: BudgetFeatureProviderProps) {
  // Plan ID generation
  const generatePlanCode = () => {
    // Create a plan code with format BP-YYYY-XXXX where XXXX is random alphanumeric
    const year = new Date().getFullYear();
    const randomPart = uuidv4().substring(0, 4).toUpperCase();
    return `BP-${year}-${randomPart}`;
  };
  
  // Selected plan state
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  
  // Dialog states
  const [showEditPlanDialog, setShowEditPlanDialog] = useState(false);
  
  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Context value
  const value = {
    // Plan ID generation
    generatePlanCode,
    
    // Selected plan state
    selectedPlanId,
    setSelectedPlanId,
    
    // Dialog states
    showEditPlanDialog,
    setShowEditPlanDialog,
    
    // Edit mode
    isEditMode,
    setIsEditMode,
  };
  
  return (
    <BudgetFeatureContext.Provider value={value}>
      {children}
    </BudgetFeatureContext.Provider>
  );
}

// Custom hook to use the context
export function useBudgetFeature() {
  const context = useContext(BudgetFeatureContext);
  
  if (context === undefined) {
    throw new Error("useBudgetFeature must be used within a BudgetFeatureProvider");
  }
  
  return context;
}