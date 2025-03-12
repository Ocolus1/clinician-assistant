import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BudgetItemCatalog {
  id: number;
  itemCode: string;
  description: string;
  defaultUnitPrice: number;
  category: string | null;
  isActive: boolean | null;
}

interface BudgetCatalogSelectorProps {
  onSelectItem: (item: {
    itemCode: string;
    description: string;
    unitPrice: number;
    quantity: number;
    name: string | null;
    category: string | null;
  }) => void;
  clientId: number;
  budgetSettingsId: number;
  disabled?: boolean;
}

/**
 * Component for selecting items from the budget catalog
 */
export function BudgetCatalogSelector({
  onSelectItem,
  clientId,
  budgetSettingsId,
  disabled = false
}: BudgetCatalogSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BudgetItemCatalog | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // Fetch catalog items
  const { data: catalogItems = [], isLoading } = useQuery({
    queryKey: ["/api/budget-catalog"],
    queryFn: async () => {
      const response = await fetch("/api/budget-catalog");
      if (!response.ok) throw new Error("Failed to fetch budget catalog");
      return response.json();
    }
  });
  
  // Handle selecting an item from the dropdown
  const handleSelectItem = (item: BudgetItemCatalog) => {
    setSelectedItem(item);
    setOpen(false);
  };
  
  // Handle adding the selected item to the budget
  const handleAddItem = () => {
    if (!selectedItem) return;
    
    onSelectItem({
      itemCode: selectedItem.itemCode,
      description: selectedItem.description,
      unitPrice: selectedItem.defaultUnitPrice,
      quantity: quantity,
      name: null, // These are required by the schema but can be null
      category: selectedItem.category
    });
    
    // Reset the form
    setSelectedItem(null);
    setQuantity(1);
  };
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium mb-2">Add Budget Item</div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Item selector */}
        <div className="md:col-span-7">
          <Label htmlFor="item-selector" className="mb-2 block">
            Select Item
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id="item-selector"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                disabled={disabled || isLoading}
                className="w-full justify-between"
              >
                {selectedItem ? selectedItem.description : "Select an item..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search catalog items..." />
                <CommandEmpty>No items found.</CommandEmpty>
                <CommandGroup>
                  {catalogItems.map((item: BudgetItemCatalog) => (
                    <CommandItem
                      key={item.id}
                      value={item.itemCode}
                      onSelect={() => handleSelectItem(item)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedItem?.id === item.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{item.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.itemCode} - ${item.defaultUnitPrice.toFixed(2)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Quantity input */}
        <div className="md:col-span-3">
          <Label htmlFor="quantity-input" className="mb-2 block">
            Quantity
          </Label>
          <Input
            id="quantity-input"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min={1}
            className="w-full"
            disabled={!selectedItem || disabled}
          />
        </div>
        
        {/* Add button */}
        <div className="md:col-span-2">
          <Button
            onClick={handleAddItem}
            disabled={!selectedItem || disabled}
            className="w-full"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
      
      {/* Price preview */}
      {selectedItem && (
        <div className="text-sm text-muted-foreground mt-2">
          Item Total: ${(selectedItem.defaultUnitPrice * quantity).toFixed(2)}
          {' '}(${selectedItem.defaultUnitPrice.toFixed(2)} × {quantity})
        </div>
      )}
    </div>
  );
}