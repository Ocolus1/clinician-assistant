import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { BudgetItemCatalog, BudgetItem } from "@shared/schema";
import { BudgetItemForm } from "./BudgetItemForm";
import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  budgetSettingsId: number;
  totalBudgeted: number;
  currentTotal: number;
  onSuccess?: () => void;
  onValidationFailure?: () => void;
}

/**
 * A dialog wrapper component for the BudgetItemForm that prevents form context conflicts
 * by creating a separate React tree/context for the form
 */
export function AddItemDialog({
  open,
  onOpenChange,
  clientId,
  budgetSettingsId,
  totalBudgeted,
  currentTotal,
  onSuccess,
  onValidationFailure
}: AddItemDialogProps) {
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [confirmationProps, setConfirmationProps] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmAction: () => void;
    cancelLabel?: string;
    cancelAction?: () => void;
    cancelHidden?: boolean;
  }>({
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmAction: () => {},
  });
  const [pendingItemData, setPendingItemData] = useState<any>(null);
  
  // This function handles validation when adding items,
  // separated from the form context to avoid conflicts
  const handleValidation = async (data: any, difference: number) => {
    // Store the pending item data temporarily
    setPendingItemData(data);
    
    // If over budget, show warning dialog
    if (difference > 0) {
      setConfirmationProps({
        title: "Budget Allocation Exceeds Available Funds",
        message: `Adding this item would exceed the available budget by ${formatCurrency(difference)}. Please adjust your allocations accordingly.`,
        confirmLabel: "Adjust Allocations",
        confirmAction: () => {
          // Close the confirmation dialog
          setConfirmationDialogOpen(false);
          // Don't proceed with item creation
          setPendingItemData(null);
          if (onValidationFailure) {
            onValidationFailure();
          }
        },
        cancelHidden: true,
      });
      setConfirmationDialogOpen(true);
      return false;
    } 
    
    // If under budget, show confirmation dialog
    if (difference < 0) {
      return new Promise<boolean>((resolve) => {
        setConfirmationProps({
          title: "Budget Allocation Below Available Funds",
          message: `Adding this item would leave ${formatCurrency(Math.abs(difference))} unallocated in the budget. Do you want to proceed?`,
          confirmLabel: "Yes, Add Item",
          confirmAction: () => {
            // Close the confirmation dialog
            setConfirmationDialogOpen(false);
            // Proceed with item creation
            resolve(true);
          },
          cancelLabel: "No, Adjust Allocations",
          cancelAction: () => {
            // Close the confirmation dialog
            setConfirmationDialogOpen(false);
            // Don't proceed with item creation
            setPendingItemData(null);
            resolve(false);
          },
        });
        setConfirmationDialogOpen(true);
      });
    }
    
    // If exactly on budget, proceed without confirmation
    return true;
  };

  return (
    <>
      {/* Main Add Item Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Budget Item</DialogTitle>
            <DialogDescription>
              Add a new item to the budget plan. You can select from the catalog or create a custom item.
            </DialogDescription>
          </DialogHeader>
          
          {/* Budget Item Form without dialog wrapper */}
          <BudgetItemForm
            clientId={clientId}
            budgetSettingsId={budgetSettingsId}
            totalBudgeted={totalBudgeted}
            currentTotal={currentTotal}
            standalone={true}
            onSuccess={() => {
              onOpenChange(false);
              if (onSuccess) {
                onSuccess();
              }
            }}
            onValidationRequired={handleValidation}
          />
        </DialogContent>
      </Dialog>
      
      {/* Separate Confirmation Dialog */}
      <Dialog 
        open={confirmationDialogOpen} 
        onOpenChange={setConfirmationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmationProps.title}</DialogTitle>
            <DialogDescription>
              {confirmationProps.message}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex justify-between gap-2">
            {!confirmationProps.cancelHidden && confirmationProps.cancelAction && (
              <Button 
                variant="outline" 
                onClick={confirmationProps.cancelAction}
              >
                {confirmationProps.cancelLabel || "Cancel"}
              </Button>
            )}
            <Button 
              onClick={confirmationProps.confirmAction}
              className={confirmationProps.cancelHidden ? "w-full" : ""}
            >
              {confirmationProps.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}