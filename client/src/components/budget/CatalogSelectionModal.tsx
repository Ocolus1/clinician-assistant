import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Search, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CatalogItem } from "./BudgetTypes";

interface CatalogSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogItems: CatalogItem[];
  onSelectItem: (item: CatalogItem) => void;
  currentItems?: CatalogItem[]; // Currently selected items to filter out
}

export function CatalogSelectionModal({
  open,
  onOpenChange,
  catalogItems,
  onSelectItem,
  currentItems = []
}: CatalogSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);

  // Reset search when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm("");
    }
  }, [open]);

  // Get the list of item codes that are already added to the budget
  const existingItemCodes = currentItems.map(item => item.itemCode);

  // Filter catalog items based on search term and exclude already added items
  useEffect(() => {
    if (!catalogItems) {
      setFilteredItems([]);
      return;
    }

    // First filter out any items that are already in the budget plan
    const availableItems = catalogItems.filter(item => 
      !existingItemCodes.includes(item.itemCode)
    );

    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) {
      setFilteredItems(availableItems);
      return;
    }

    const filtered = availableItems.filter(
      (item) =>
        item.itemCode.toLowerCase().includes(lowerSearchTerm) ||
        (item.description && item.description.toLowerCase().includes(lowerSearchTerm)) ||
        (item.category && item.category.toLowerCase().includes(lowerSearchTerm))
    );
    setFilteredItems(filtered);
  }, [searchTerm, catalogItems, existingItemCodes]);

  // Group items by category for better organization
  const groupedItems = filteredItems.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedItems).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Select from Catalog</DialogTitle>
          <DialogDescription>
            Choose an item from the catalog to add to your budget plan
          </DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by code, description or category..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Catalog items */}
        <div className="overflow-y-auto flex-1 pr-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {catalogItems.length === 0
                ? "No catalog items available. Add items in Settings."
                : "No items match your search criteria."}
            </div>
          ) : (
            <div className="space-y-6">
              {sortedCategories.map((category) => (
                <div key={category}>
                  <h3 className="font-medium text-sm text-gray-500 mb-2">{category}</h3>
                  <div className="space-y-2">
                    {groupedItems[category].map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-3 hover:border-primary/60 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onSelectItem(item)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {item.itemCode}
                              {item.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {item.description}
                            </div>
                          </div>
                          <div className="font-medium text-right">
                            {formatCurrency(item.defaultUnitPrice)}
                            <div className="text-xs text-gray-500">per unit</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <span className="font-medium">{filteredItems.length}</span> of{" "}
            <span className="font-medium">{catalogItems.length}</span> items shown
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}