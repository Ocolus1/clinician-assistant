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
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useBudgetFeature } from "./BudgetFeatureContext";
import { BudgetPlanEditDialog } from "./BudgetPlanEditDialog";

/**
 * A full-screen detailed view of a budget plan with its items and usage statistics
 */
interface BudgetPlanFullViewProps {
  onBackToPlansList: () => void;
}

export function BudgetPlanFullView({ onBackToPlansList }: BudgetPlanFullViewProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { 
    selectedPlanId, 
    getBudgetPlanById, 
    selectedPlanItems, 
    updatePlan,
    createBudgetItem,
    deleteBudgetItem,
    viewPlanDetails,
    setActivePlan
  } = useBudgetFeature();
  
  // Get the selected plan details
  const plan = selectedPlanId ? getBudgetPlanById(selectedPlanId) : null;
  
  // Handle back button click to return to plans view
  const handleBackToPlansList = () => {
    // Set selected plan to null to return to grid view
    if (selectedPlanId) {
      // Reset the selected plan in context - using 0 as a signal value
      // The context will handle this as "no plan selected"
      viewPlanDetails(0);
      // Call the parent component's handler to switch tabs
      onBackToPlansList();
    }
  };
  
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
  const itemsByCategory: Record<string, typeof selectedPlanItems> = {};
  selectedPlanItems.forEach(item => {
    const category = item.category || "Uncategorized";
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(item);
  });
  
  // Handle edit button click
  const handleEditPlan = () => {
    setShowEditDialog(true);
  };
  
  // Handle activating this plan
  const handleSetActive = async () => {
    if (!plan || plan.isActive) return;
    
    try {
      await setActivePlan(plan.id);
      // Success feedback is handled by the toast in the context
    } catch (error) {
      console.error("Failed to set plan as active:", error);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header with back button and actions */}
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          className="gap-1"
          onClick={handleBackToPlansList}
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
                  <span>{plan.itemCount}</span>
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
                    {plan.percentUsed}%
                  </div>
                </div>
                <Progress 
                  value={plan.percentUsed} 
                  className="h-2"
                  indicatorClassName={cn(
                    plan.percentUsed >= 90 ? "bg-red-500" :
                    plan.percentUsed >= 75 ? "bg-amber-500" :
                    "bg-emerald-500"
                  )} 
                />
                <div className="flex justify-between mt-1.5 text-sm">
                  <span className="font-medium">
                    {formatCurrency(plan.totalUsed)}
                  </span>
                  <span className="text-muted-foreground">
                    of {formatCurrency(plan.availableFunds)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="rounded-md border p-3">
                  <div className="text-sm text-muted-foreground mb-1">Remaining</div>
                  <div className="text-lg font-medium">
                    {formatCurrency(plan.availableFunds - plan.totalUsed)}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-sm text-muted-foreground mb-1">Items</div>
                  <div className="text-lg font-medium">{plan.itemCount}</div>
                </div>
              </div>
            </div>
            
            {/* Actions & Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Actions</h3>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => {}}>
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
                <Button variant="outline" className="w-full">
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
              <Button variant="outline" size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {selectedPlanItems.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-background p-3 mb-4">
                    <CircleDollarSign className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Budget Items</h3>
                  <p className="text-center text-muted-foreground mb-4 max-w-md">
                    Add budget items to track therapy expenses and funding allocations for this plan.
                  </p>
                  <Button>
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
                            <TableCell className="text-right">{item.usedQuantity}</TableCell>
                            <TableCell className="text-right">{item.balanceQuantity}</TableCell>
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
                                  <DropdownMenuItem>Edit Item</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">Delete Item</DropdownMenuItem>
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
      <BudgetPlanEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        planId={selectedPlanId}
      />
    </div>
  );
}