import React, { useState, useMemo } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table";
import { 
  ArrowUpDown, 
  Search, 
  Filter, 
  AlertTriangle 
} from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { BudgetItemDetail } from "./BudgetPlanFullView";

interface BudgetItemsDetailTableProps {
  items: BudgetItemDetail[];
}

type SortField = "name" | "category" | "unitPrice" | "quantity" | "usagePercentage" | "remainingQuantity";
type SortOrder = "asc" | "desc";

export function BudgetItemsDetailTable({ items }: BudgetItemsDetailTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // Get unique categories for filtering
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    
    items.forEach(item => {
      uniqueCategories.add(item.category || "Uncategorized");
    });
    
    return Array.from(uniqueCategories).sort();
  }, [items]);
  
  // Handle sort button click
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortOrder("asc");
    }
  };
  
  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    // Filter by search query and category
    let result = [...items];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.name?.toLowerCase().includes(query) || false) ||
        item.description.toLowerCase().includes(query) ||
        item.itemCode.toLowerCase().includes(query) ||
        (item.category?.toLowerCase().includes(query) || false)
      );
    }
    
    if (categoryFilter) {
      result = result.filter(item => 
        (item.category || "Uncategorized") === categoryFilter
      );
    }
    
    // Sort by selected field
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "");
          break;
        case "category":
          comparison = (a.category || "Uncategorized").localeCompare(b.category || "Uncategorized");
          break;
        case "unitPrice":
          comparison = a.unitPrice - b.unitPrice;
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "usagePercentage":
          comparison = a.usagePercentage - b.usagePercentage;
          break;
        case "remainingQuantity":
          comparison = a.remainingQuantity - b.remainingQuantity;
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [items, searchQuery, categoryFilter, sortField, sortOrder]);
  
  // Get status color based on usage percentage
  const getUsageStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 90) return "bg-amber-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Items Detail</CardTitle>
        <CardDescription>
          Detailed breakdown of all budget items and their usage
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Search and filter controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex-shrink-0">
              <div className="relative">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => setCategoryFilter(null)}
                >
                  <Filter className="h-4 w-4" />
                  {categoryFilter || "All Categories"}
                  {categoryFilter && (
                    <span 
                      className="ml-1 text-xs cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryFilter(null);
                      }}
                    >
                      ✕
                    </span>
                  )}
                </Button>
                
                {categories.length > 0 && !categoryFilter && (
                  <div className="absolute right-0 z-10 mt-1 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      {categories.map(category => (
                        <button
                          key={category}
                          onClick={() => setCategoryFilter(category)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Items table */}
          {filteredAndSortedItems.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium"
                        onClick={() => handleSort("name")}
                      >
                        Item Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium"
                        onClick={() => handleSort("category")}
                      >
                        Category
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium"
                        onClick={() => handleSort("unitPrice")}
                      >
                        Unit Price
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium"
                        onClick={() => handleSort("quantity")}
                      >
                        Quantity
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium"
                        onClick={() => handleSort("remainingQuantity")}
                      >
                        Remaining
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium"
                        onClick={() => handleSort("usagePercentage")}
                      >
                        Usage
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name || item.description}
                        <div className="text-xs text-gray-500">{item.itemCode}</div>
                      </TableCell>
                      <TableCell>
                        {item.category ? (
                          <Badge variant="outline">{item.category}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">Uncategorized</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <span className={item.remainingQuantity === 0 ? "text-red-500 font-medium" : ""}>
                          {item.remainingQuantity}
                        </span>
                        {item.remainingQuantity === 0 && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 inline ml-1" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">${item.totalPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-[100px]">
                            <Progress 
                              value={item.usagePercentage} 
                              max={100}
                              className="h-2"
                              indicatorClassName={getUsageStatusColor(item.usagePercentage)}
                            />
                          </div>
                          <div className="text-sm">{item.usagePercentage.toFixed(0)}%</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 border rounded-md border-dashed text-gray-500">
              <AlertTriangle className="h-12 w-12 mb-3 text-yellow-500" />
              <h3 className="text-lg font-medium mb-1">No items found</h3>
              <p className="text-sm text-center max-w-md">
                {searchQuery || categoryFilter ? 
                  "No items match your current search and filters. Try adjusting your criteria." : 
                  "There are no budget items in this plan. Add items to start tracking your budget."}
              </p>
              {(searchQuery || categoryFilter) && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter(null);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}