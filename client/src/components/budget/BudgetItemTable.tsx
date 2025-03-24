import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowDown, 
  ArrowUp, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BudgetItem } from "@/components/budget/BudgetFeatureContext";
import { calculateBudgetItemUtilization } from "@/lib/utils/budgetUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BudgetItemTableProps {
  items: BudgetItem[];
  clientId?: number;
  onEdit?: (item: BudgetItem) => void;
  onDelete?: (item: BudgetItem) => void;
}

// Extended BudgetItem with utilization data
interface EnhancedBudgetItem extends BudgetItem {
  used?: number;
  remaining?: number;
  utilizationRate?: number;
  totalCost?: number;
  usedCost?: number;
  remainingCost?: number;
  status?: 'normal' | 'warning' | 'critical';
  usagePattern?: 'accelerating' | 'decelerating' | 'steady' | 'fluctuating';
}

type SortField = 'itemCode' | 'description' | 'category' | 'unitPrice' | 'quantity' | 'used' | 'remaining';
type SortDirection = 'asc' | 'desc';

/**
 * A component for displaying and filtering budget items in a table format
 */
export function BudgetItemTable({ items, clientId, onEdit, onDelete }: BudgetItemTableProps) {
  const [enhancedItems, setEnhancedItems] = useState<EnhancedBudgetItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<EnhancedBudgetItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('itemCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isLoadingUtilization, setIsLoadingUtilization] = useState(false);
  
  // Fetch sessions data to calculate usage
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: [`/api/clients/${clientId}/sessions`],
    queryFn: async () => {
      if (!clientId) return [];
      setIsLoadingUtilization(true);
      try {
        const response = await fetch(`/api/clients/${clientId}/sessions`);
        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Fetched ${data.length} sessions for client ${clientId} to calculate budget item utilization`);
        return data;
      } catch (error) {
        console.error("Error fetching sessions:", error);
        return [];
      } finally {
        setIsLoadingUtilization(false);
      }
    },
    enabled: !!clientId
  });
  
  // Calculate budget item utilization when sessions are loaded
  useEffect(() => {
    if (items.length > 0 && sessions && sessions.length > 0) {
      try {
        // Use the utility function to calculate utilization
        const itemsWithUtilization = calculateBudgetItemUtilization(items, sessions);
        console.log(`Calculated utilization for ${itemsWithUtilization.length} budget items from ${sessions.length} sessions`);
        setEnhancedItems(itemsWithUtilization);
      } catch (error) {
        console.error("Error enhancing items with utilization data:", error);
        // Fall back to original items
        setEnhancedItems(items.map(item => ({
          ...item,
          used: 0,
          remaining: Number(item.quantity),
          utilizationRate: 0,
          totalCost: Number(item.quantity) * Number(item.unitPrice),
          usedCost: 0,
          remainingCost: Number(item.quantity) * Number(item.unitPrice),
          status: 'normal' as const
        })));
      }
    } else {
      // If no sessions, initialize with zero utilization
      setEnhancedItems(items.map(item => ({
        ...item,
        used: 0,
        remaining: Number(item.quantity),
        utilizationRate: 0,
        totalCost: Number(item.quantity) * Number(item.unitPrice),
        usedCost: 0,
        remainingCost: Number(item.quantity) * Number(item.unitPrice),
        status: 'normal' as const
      })));
    }
  }, [items, sessions]);
  
  // Get unique categories from items
  const categories = Array.from(
    new Set(
      items
        .map(item => item.category)
        .filter(category => category !== null && category !== "")
    )
  ) as string[];
  
  // Filter and sort enhanced items when search term, category, or sort options change
  useEffect(() => {
    let result = [...enhancedItems];
    
    // Apply search filter if search term exists
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        item => 
          item.description.toLowerCase().includes(searchLower) ||
          item.itemCode.toLowerCase().includes(searchLower) ||
          (item.category && item.category.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply category filter if category is selected
    if (selectedCategory) {
      result = result.filter(item => item.category === selectedCategory);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      // Handle different data types appropriately
      let valueA: any, valueB: any;
      
      switch (sortField) {
        case 'unitPrice':
        case 'quantity':
          valueA = Number(a[sortField]);
          valueB = Number(b[sortField]);
          break;
        case 'used':
          valueA = Number(a.used || 0);
          valueB = Number(b.used || 0);
          break;
        case 'remaining':
          valueA = Number(a.remaining || 0);
          valueB = Number(b.remaining || 0);
          break;
        default:
          valueA = String(a[sortField as keyof BudgetItem] || "").toLowerCase();
          valueB = String(b[sortField as keyof BudgetItem] || "").toLowerCase();
      }
      
      // Apply sort direction
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });
    
    setFilteredItems(result);
  }, [enhancedItems, searchTerm, selectedCategory, sortField, sortDirection]);
  
  // Handle column header click for sorting
  const handleSortChange = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Render sort indicator for table headers
  const getSortIndicator = (field: SortField) => {
    if (field !== sortField) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Items</CardTitle>
        <CardDescription>
          {filteredItems.length} of {items.length} items
        </CardDescription>
        
        {/* Search and filter controls */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full sm:w-[200px]">
            <Select 
              value={selectedCategory || "all"} 
              onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="w-[100px] cursor-pointer"
                  onClick={() => handleSortChange('itemCode')}
                >
                  <div className="flex items-center">
                    Code
                    {getSortIndicator('itemCode')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSortChange('description')}
                >
                  <div className="flex items-center">
                    Description
                    {getSortIndicator('description')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSortChange('category')}
                >
                  <div className="flex items-center">
                    Category
                    {getSortIndicator('category')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer"
                  onClick={() => handleSortChange('unitPrice')}
                >
                  <div className="flex items-center justify-end">
                    Unit Price
                    {getSortIndicator('unitPrice')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer"
                  onClick={() => handleSortChange('quantity')}
                >
                  <div className="flex items-center justify-end">
                    Quantity
                    {getSortIndicator('quantity')}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer"
                  onClick={() => handleSortChange('remaining')}
                >
                  <div className="flex items-center justify-end">
                    Balance
                    {getSortIndicator('remaining')}
                  </div>
                </TableHead>
                <TableHead className="text-right">Total</TableHead>
                {(onEdit || onDelete) && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUtilization ? (
                <TableRow>
                  <TableCell colSpan={(onEdit || onDelete) ? 8 : 7} className="text-center py-6">
                    <div className="flex justify-center items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">Loading utilization data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  // Calculate utilization percentage for display
                  const utilizationPercent = Math.min(100, Math.round((item.used || 0) / Number(item.quantity) * 100));
                  
                  // Determine color based on utilization level
                  let progressColor = "bg-blue-500";
                  if (utilizationPercent > 90) {
                    progressColor = "bg-red-500"; // Critical - almost used up
                  } else if (utilizationPercent > 70) {
                    progressColor = "bg-amber-500"; // Warning - getting low
                  } else if (utilizationPercent > 30) {
                    progressColor = "bg-emerald-500"; // Good - healthy usage
                  }
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemCode}</TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <span>{item.description}</span>
                          
                          {/* Utilization progress bar */}
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${progressColor} rounded-full`} 
                              style={{ width: `${utilizationPercent}%` }} 
                            />
                          </div>
                          
                          {/* Utilization percentage */}
                          <span className="text-xs text-muted-foreground">
                            {utilizationPercent}% used
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.category && (
                          <Badge variant="outline" className="font-normal">
                            {item.category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {item.remaining !== undefined ? item.remaining : Number(item.quantity)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <div className="space-y-1">
                                <p className="text-xs">
                                  <strong>Total:</strong> {item.quantity} units
                                </p>
                                <p className="text-xs">
                                  <strong>Used:</strong> {item.used || 0} units
                                </p>
                                <p className="text-xs">
                                  <strong>Remaining:</strong> {item.remaining !== undefined ? item.remaining : Number(item.quantity)} units
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                          {item.usedCost !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(item.usedCost || 0)} used
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {(onEdit || onDelete) && (
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {onEdit && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => onEdit(item)}
                                title="Edit item"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </Button>
                            )}
                            {onDelete && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" 
                                onClick={() => onDelete(item)}
                                title="Delete item"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  <line x1="10" x2="10" y1="11" y2="17" />
                                  <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={(onEdit || onDelete) ? 8 : 7} className="text-center py-6 text-muted-foreground">
                    {items.length === 0 
                      ? "No budget items available" 
                      : "No items match the current filters"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}