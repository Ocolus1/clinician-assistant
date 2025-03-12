import { useState, useEffect } from "react";
import { Control, useWatch } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { 
  UnifiedBudgetFormValues,
  BudgetItemFormValues
} from "./BudgetFormSchema";

interface BudgetItemRowProps {
  index: number;
  control: Control<UnifiedBudgetFormValues>;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export function BudgetItemRow({ 
  index, 
  control, 
  onRemove,
  disabled = false
}: BudgetItemRowProps) {
  // Watch this specific item's values
  const item = useWatch({
    control,
    name: `items.${index}`
  }) as BudgetItemFormValues;

  // Local state for quantity to handle intermediate invalid values
  const [quantityInput, setQuantityInput] = useState<string>(item?.quantity?.toString() || "0");
  
  // Update local state when item changes from parent
  useEffect(() => {
    if (item?.quantity !== undefined) {
      setQuantityInput(item.quantity.toString());
    }
  }, [item?.quantity]);

  // Calculate item total (derived from quantity and unit price)
  const itemTotal = item?.quantity && item?.unitPrice 
    ? (item.quantity * item.unitPrice)
    : 0;

  return (
    <TableRow className={item?.isNew ? "bg-accent/20" : ""}>
      <TableCell className="font-medium">{item?.itemCode || "Unknown"}</TableCell>
      <TableCell>{item?.description || "No description"}</TableCell>
      <TableCell className="w-24">
        <Input
          type="number"
          min="0"
          value={quantityInput}
          onChange={(e) => {
            const rawValue = e.target.value;
            setQuantityInput(rawValue);
            
            // Only update form value if it's a valid number
            const parsedValue = parseInt(rawValue, 10);
            if (!isNaN(parsedValue) && parsedValue >= 0) {
              // This will be handled by parent component through the field array
            }
          }}
          onBlur={(e) => {
            const parsedValue = parseInt(e.target.value, 10);
            if (isNaN(parsedValue) || parsedValue < 0) {
              setQuantityInput("0");
              // This will be handled by parent component
            }
          }}
          disabled={disabled}
          className="w-full"
        />
      </TableCell>
      <TableCell>${item?.unitPrice?.toFixed(2) || "0.00"}</TableCell>
      <TableCell>${itemTotal.toFixed(2)}</TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove item</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}