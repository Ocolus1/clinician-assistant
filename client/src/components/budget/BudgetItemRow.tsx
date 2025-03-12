import { Control, useController } from "react-hook-form";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { UnifiedBudgetFormValues } from "./BudgetFormSchema";

interface BudgetItemRowProps {
  index: number;
  control: Control<UnifiedBudgetFormValues>;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

/**
 * Component for displaying and editing a budget item row
 */
export function BudgetItemRow({
  index,
  control,
  onRemove,
  disabled = false
}: BudgetItemRowProps) {
  // Use controllers to manage form fields
  const { field: itemCodeField } = useController({
    name: `items.${index}.itemCode`,
    control
  });
  
  const { field: descriptionField } = useController({
    name: `items.${index}.description`,
    control
  });
  
  const { field: quantityField, fieldState: quantityFieldState } = useController({
    name: `items.${index}.quantity`,
    control,
    rules: {
      min: { value: 0, message: "Quantity must be at least 0" }
    }
  });
  
  const { field: unitPriceField } = useController({
    name: `items.${index}.unitPrice`,
    control
  });
  
  const total = Number(quantityField.value) * Number(unitPriceField.value);
  
  return (
    <TableRow className={quantityFieldState.invalid ? "bg-red-50" : ""}>
      <TableCell className="font-medium">
        {itemCodeField.value}
      </TableCell>
      <TableCell>
        {descriptionField.value}
      </TableCell>
      <TableCell className="w-[100px]">
        {disabled ? (
          quantityField.value
        ) : (
          <Input
            type="number"
            className="h-8 w-20"
            value={quantityField.value}
            onChange={(e) => {
              const value = e.target.value === "" ? 0 : parseInt(e.target.value);
              quantityField.onChange(value);
            }}
            min={0}
            disabled={disabled}
            aria-invalid={!!quantityFieldState.error}
          />
        )}
      </TableCell>
      <TableCell>
        ${Number(unitPriceField.value).toFixed(2)}
      </TableCell>
      <TableCell className="font-medium">
        ${total.toFixed(2)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive-foreground"
          onClick={() => onRemove(index)}
          disabled={disabled}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}