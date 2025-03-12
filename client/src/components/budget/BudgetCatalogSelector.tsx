import { useState } from "react";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type BudgetItemCatalog = {
  id: number;
  itemCode: string;
  description: string;
  defaultUnitPrice: number;
  category: string | null;
  isActive: boolean | null;
};

type GroupedCatalogItems = {
  [key: string]: BudgetItemCatalog[];
};

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
 * with search and category filtering
 */
export function BudgetCatalogSelector({
  onSelectItem,
  disabled = false
}: BudgetCatalogSelectorProps) {
  const [selectedItemCode, setSelectedItemCode] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  
  // Fetch catalog items
  const { data: catalogItems = [] } = useQuery<BudgetItemCatalog[]>({
    queryKey: ["/api/budget-catalog"],
  });
  
  // Filter items by search term
  const filteredItems = catalogItems.filter(item => 
    item.isActive !== false && 
    (searchTerm === "" || 
     item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Group items by category
  const groupedItems = filteredItems.reduce<GroupedCatalogItems>((acc, item) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
  
  // Get selected item details
  const selectedItem = catalogItems.find(item => item.itemCode === selectedItemCode);
  
  // Handle adding item
  const handleAddItem = () => {
    if (selectedItem) {
      onSelectItem({
        itemCode: selectedItem.itemCode,
        description: selectedItem.description,
        unitPrice: selectedItem.defaultUnitPrice,
        quantity,
        name: null,
        category: selectedItem.category
      });
      
      // Reset form
      setSelectedItemCode("");
      setQuantity(1);
      setSearchTerm("");
    }
  };
  
  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Add Budget Item</h3>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={disabled}
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-select">Select Item</Label>
              <Select
                value={selectedItemCode}
                onValueChange={setSelectedItemCode}
                disabled={disabled || filteredItems.length === 0}
              >
                <SelectTrigger id="item-select">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{category}</SelectLabel>
                      {items.map((item) => (
                        <SelectItem 
                          key={item.id} 
                          value={item.itemCode}
                        >
                          {item.itemCode} - {item.description}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity-input">Quantity</Label>
              <Input
                id="quantity-input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={disabled || !selectedItem}
              />
            </div>
          </div>
          
          {selectedItem && (
            <div className="text-sm">
              <p><span className="font-medium">Unit Price:</span> ${selectedItem.defaultUnitPrice.toFixed(2)}</p>
              <p><span className="font-medium">Total:</span> ${(selectedItem.defaultUnitPrice * quantity).toFixed(2)}</p>
            </div>
          )}
          
          <Button
            type="button"
            onClick={handleAddItem}
            disabled={disabled || !selectedItem}
            className="w-full"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}