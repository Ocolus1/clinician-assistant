import { useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BudgetItemCatalog } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { BudgetItemFormValues } from "./BudgetFormSchema";

interface BudgetCatalogSelectorProps {
  onSelectItem: (item: BudgetItemFormValues) => void;
  clientId: number;
  budgetSettingsId: number;
  disabled?: boolean;
}

export function BudgetCatalogSelector({
  onSelectItem,
  clientId,
  budgetSettingsId,
  disabled = false
}: BudgetCatalogSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Fetch catalog items
  const { data: catalogItems = [] } = useQuery<BudgetItemCatalog[]>({
    queryKey: ["/api/budget-catalog"],
  });

  // Handle item selection
  const handleSelectItem = (item: BudgetItemCatalog) => {
    onSelectItem({
      itemCode: item.itemCode,
      description: item.description,
      quantity: 1, // Default quantity
      unitPrice: item.defaultUnitPrice,
      total: item.defaultUnitPrice, // Initial total based on quantity 1
      budgetSettingsId,
      clientId,
      isNew: true
    });
    setOpen(false);
    setSearchValue("");
  };

  // Filter items based on search
  const filteredItems = catalogItems.filter(item => {
    const searchLower = searchValue.toLowerCase();
    return (
      item.description.toLowerCase().includes(searchLower) ||
      item.itemCode.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search catalog items..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.itemCode}
                  onSelect={() => handleSelectItem(item)}
                >
                  <div className="flex flex-col">
                    <span>{item.description}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.itemCode} - ${item.defaultUnitPrice.toFixed(2)}
                    </span>
                  </div>
                  <Check
                    className="ml-auto h-4 w-4 opacity-0 group-data-[selected]:opacity-100"
                    aria-hidden="true"
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}