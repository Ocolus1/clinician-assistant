import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CatalogItem {
  id: number;
  itemCode: string;
  description: string;
  defaultUnitPrice: number;
  category: string | null;
}

interface CatalogSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogItems: CatalogItem[];
  onSelectItem: (item: CatalogItem) => void;
}

export function CatalogSelectionModal({
  open,
  onOpenChange,
  catalogItems,
  onSelectItem,
}: CatalogSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Get unique categories from catalog items
  const uniqueCategories = Array.from(new Set(catalogItems.map(item => item.category || "uncategorized")));
  const categories = ["all", ...uniqueCategories];
  
  // Filter catalog items based on search term and selected category
  const filteredItems = catalogItems.filter(item => {
    const matchesSearch = 
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = 
      selectedCategory === "all" || 
      item.category === selectedCategory ||
      (selectedCategory === "uncategorized" && !item.category);
      
    return matchesSearch && matchesCategory;
  });
  
  // Group catalog items by type for visual separation
  const categorizeItem = (item: CatalogItem) => {
    if (item.itemCode.startsWith("THERAPY")) return "Therapy";
    if (item.itemCode.startsWith("ASSESS")) return "Assessment";
    return item.category || "Other";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Item from Catalog</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Choose an item from the catalog or add a new catalog item.
          </p>
        </DialogHeader>
        
        <div className="my-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input 
              className="pl-8" 
              placeholder="Search by item code or description" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "All Categories" : 
                    category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto border rounded-md">
          {filteredItems.length > 0 ? (
            <div className="divide-y">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className="p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectItem(item)}
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{item.itemCode}</div>
                      <div className="text-sm text-gray-600">{item.description}</div>
                      <div className="text-xs text-gray-500 mt-1">{categorizeItem(item)}</div>
                    </div>
                    <div className="font-semibold text-right">
                      {formatCurrency(item.defaultUnitPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No items match your search criteria
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between items-center">
          <Button 
            type="button" 
            variant="outline"
            className="flex items-center gap-1 text-sm"
            onClick={() => {/* Implement add new catalog item */}}
          >
            <Plus className="h-4 w-4" />
            Add New Catalog Item
          </Button>
          
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}