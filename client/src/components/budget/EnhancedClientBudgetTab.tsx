import React from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle } from "lucide-react";
import { BudgetProvider } from "./BudgetFeatureContext";
import { EnhancedBudgetCardGrid } from "./EnhancedBudgetCardGrid";
import type { BudgetSettings, BudgetItem } from "@shared/schema";

interface EnhancedClientBudgetTabProps {
  clientId: number;
  budgetSettings?: BudgetSettings;
  budgetItems?: BudgetItem[];
}

export default function EnhancedClientBudgetTab({ 
  clientId,
  budgetSettings: initialBudgetSettings,
  budgetItems: initialBudgetItems 
}: EnhancedClientBudgetTabProps) {
  // If we don't have a client ID, show an error
  if (!clientId) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Cannot load budget management without a valid client.
        </AlertDescription>
      </Alert>
    );
  }

  // Render the component with the budget provider
  return (
    <BudgetProvider clientId={clientId}>
      <EnhancedBudgetCardGrid clientId={clientId} />
    </BudgetProvider>
  );
}