import React, { useState } from "react";
import { 
  ArrowLeft, 
  CheckCircle, 
  FileText, 
  Trash2, 
  CircleDollarSign, 
  Star, 
  Clock,
  MoreVertical,
  PlusCircle,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { BudgetPlanEditDialog } from "./BudgetPlanEditDialog";

/**
 * A full-screen detailed view of a budget plan with its items and usage statistics
 */
interface BudgetPlanFullViewProps {
  plan: any; // Using any temporarily to fix type issues
  budgetItems: any[];
  onBack: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}

export function BudgetPlanFullView({ 
  plan, 
  budgetItems, 
  onBack, 
  onEdit, 
  onToggleActive 
}: BudgetPlanFullViewProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();
  
  if (!plan) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No budget plan selected</p>
      </div>
    );
  }
  
  // Format dates if available
  const formattedStartDate = plan.startDate ? format(new Date(plan.startDate), "MMMM d, yyyy") : "Not set";
  const formattedEndDate = plan.endDate ? format(new Date(plan.endDate), "MMMM d, yyyy") : "Not set";
  
  // Check if plan is expired
  const today = new Date();
  const isExpired = plan.endDate ? new Date(plan.endDate) < today : false;
  
  // Group budget items by category
  const itemsByCategory: Record<string, any[]> = {};
  // Safely iterate through budgetItems only if it's an array
  if (Array.isArray(budgetItems)) {
    budgetItems.forEach(item => {
      if (item) { // Ensure item exists
        const category = item.category || "Uncategorized";
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push(item);
      }
    });
  }
  
  // Pass the edit action to parent
  const handleEditPlan = () => {
    onEdit();
  };
  
  // Pass the activate action to parent
  const handleSetActive = () => {
    onToggleActive();
  };
  
  // Helper to get funds value considering both old and new schema
  const getFundsValue = (plan: any) => {
    // Support both schema versions and convert to number
    const fundValue = plan.ndisFunds !== undefined ? plan.ndisFunds : plan.availableFunds;
    
    // Ensure it's a number by parsing
    let numericValue = 0;
    if (typeof fundValue === 'string') {
      numericValue = parseFloat(fundValue || '0');
    } else {
      numericValue = fundValue || 0;
    }
    
    console.log(`Total available funds in plan: $${numericValue.toFixed(2)}`);
    return numericValue;
  };
  
  // Calculate total used amount from budget items
  const calculateTotalUsed = () => {
    if (!budgetItems || !Array.isArray(budgetItems)) {
      console.log("No budget items to calculate usage from");
      return 0;
    }
    
    let totalUsed = 0;
    
    budgetItems.forEach(item => {
      // Parse the usedQuantity explicitly - ensures it's treated as a number
      const usedQuantity = parseFloat(String(item.usedQuantity || '0'));
      
      // Parse unit price, ensuring it's a number
      const unitPrice = typeof item.unitPrice === 'string'
        ? parseFloat(item.unitPrice)
        : parseFloat(String(item.unitPrice || '0'));
      
      // Calculate cost for this item
      const itemCost = usedQuantity * unitPrice;
      
      console.log(`Budget item ${item.id} (${item.itemCode}): Used ${usedQuantity}/${item.quantity} at ${unitPrice} each = $${itemCost.toFixed(2)}`);
      
      // Add to total
      totalUsed += itemCost;
    });
    
    console.log(`Total budget used across all items: $${totalUsed.toFixed(2)}`);
    return totalUsed;
  };
  
  // Calculate percentage of budget used
  const calculatePercentUsed = () => {
    const totalUsed = calculateTotalUsed();
    const totalAvailable = getFundsValue(plan) || 0;
    
    if (totalAvailable <= 0) return 0;
    
    const percent = Math.round((totalUsed / totalAvailable) * 100);
    return Math.min(100, Math.max(0, percent)); // Ensure it's between 0-100
  };
  
  return (
    <div className="space-y-6">
      {/* Header with back button and actions */}
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          className="gap-1"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Plans</span>
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleEditPlan}
          >
            Edit Plan
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!plan.isActive && (
                <DropdownMenuItem 
                  className="text-primary"
                  onClick={handleSetActive}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Set as Active Plan
                </DropdownMenuItem>
              )}
              {plan.isActive && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Currently Active
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Export Plan Data
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Archive Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Plan header card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{plan.planName}</CardTitle>
              <CardDescription className="text-base">{plan.planCode}</CardDescription>
            </div>
            
            <div className="flex gap-2">
              {plan.isActive && (
                <Badge variant="outline" className="border-primary text-primary flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </Badge>
              )}
              
              {isExpired && (
                <Badge variant="outline" className="border-red-500 text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Expired
                </Badge>
              )}
              
              {!plan.isActive && !isExpired && (
                <Badge variant="outline" className="border-gray-500 text-gray-600">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Plan Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Plan Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span>{formattedStartDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date:</span>
                  <span>{formattedEndDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span>{plan.itemCount || (budgetItems && budgetItems.length) || 0}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={cn(
                    plan.isActive && "text-primary",
                    isExpired && "text-red-600",
                    !plan.isActive && !isExpired && "text-muted-foreground"
                  )}>
                    {plan.isActive ? "Active" : isExpired ? "Expired" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Budget Usage */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Budget Usage</h3>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="text-sm">Used Funds</div>
                  <div className="text-sm text-muted-foreground">
                    {calculatePercentUsed()}%
                  </div>
                </div>
                <Progress 
                  value={calculatePercentUsed()} 
                  className="h-2"
                  indicatorClassName={cn(
                    calculatePercentUsed() >= 90 ? "bg-red-500" :
                    calculatePercentUsed() >= 75 ? "bg-amber-500" :
                    "bg-emerald-500"
                  )} 
                />
                <div className="flex justify-between mt-1.5 text-sm">
                  <span className="font-medium">
                    {formatCurrency(calculateTotalUsed() || 0)}
                  </span>
                  <span className="text-muted-foreground">
                    of {formatCurrency(getFundsValue(plan) || 0)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="rounded-md border p-3">
                  <div className="text-sm text-muted-foreground mb-1">Remaining</div>
                  <div className="text-lg font-medium">
                    {formatCurrency((getFundsValue(plan) || 0) - (calculateTotalUsed() || 0))}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-sm text-muted-foreground mb-1">Items</div>
                  <div className="text-lg font-medium">{plan.itemCount || (budgetItems && budgetItems.length) || 0}</div>
                </div>
              </div>
            </div>
            
            {/* Actions & Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Actions</h3>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => toast({ title: "Coming Soon", description: "Add budget item feature will be available soon." })}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Budget Item
                </Button>
                {!plan.isActive && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleSetActive}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Set as Active Plan
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={() => toast({ title: "Coming Soon", description: "Generate report feature will be available soon." })}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
          
          {/* Budget Items Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Budget Items</h3>
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Coming Soon", description: "Add item feature will be available soon." })}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {!budgetItems || budgetItems.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-background p-3 mb-4">
                    <CircleDollarSign className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Budget Items</h3>
                  <p className="text-center text-muted-foreground mb-4 max-w-md">
                    Add budget items to track therapy expenses and funding allocations for this plan.
                  </p>
                  <Button onClick={() => toast({ title: "Coming Soon", description: "Add budget item feature will be available soon." })}>
                    Add First Budget Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Description</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Used</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(itemsByCategory).map(([category, items]) => (
                      <React.Fragment key={category}>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={8} className="font-medium py-2">
                            {category}
                          </TableCell>
                        </TableRow>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>{item.itemCode}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{item.usedQuantity || 0}</TableCell>
                            <TableCell className="text-right">
                              {Math.max(0, (parseFloat(String(item.quantity)) || 0) - (parseFloat(String(item.usedQuantity)) || 0))}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Edit item feature will be available soon." })}>
                                    Edit Item
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => toast({ title: "Coming Soon", description: "Delete item feature will be available soon." })}>
                                    Delete Item
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Budget Plan Edit Dialog */}
      {plan && (
        <BudgetPlanEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          plan={plan}
          budgetItems={budgetItems || []}
          catalogItems={[]}
          onSave={() => {
            toast({
              title: "Budget plan updated",
              description: "The budget plan has been updated successfully."
            });
            setShowEditDialog(false);
          }}
        />
      )}
    </div>
  );
}