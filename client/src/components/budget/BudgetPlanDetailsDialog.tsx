
import { useState, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/index";
import { 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Info,
  Edit,
  PackageOpen,
  FileText
} from "lucide-react";
import { BudgetPlan, BudgetItem } from "../../types";

// Add types for the budget item detail with usage tracking
interface BudgetItemDetail extends BudgetItem {
  usedQuantity: number;
  remainingQuantity: number;
  totalPrice: number;
  usedAmount: number;
  remainingAmount: number;
}

interface BudgetPlanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BudgetPlan | null;
  budgetItems: BudgetItem[];
  sessions?: any[]; // Add sessions to track usage
  onEdit?: () => void;
}

export function BudgetPlanDetailsDialog({
  open,
  onOpenChange,
  plan,
  budgetItems,
  sessions = [],
  onEdit
}: BudgetPlanDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  if (!plan) return null;
  
  // Calculate days remaining until plan end
  const calculateDaysRemaining = () => {
    if (!plan.endDate) return null;
    
    try {
      const endDate = new Date(plan.endDate);
      const today = new Date();
      const daysRemaining = differenceInDays(endDate, today);
      return daysRemaining > 0 ? daysRemaining : 0;
    } catch (e) {
      return null;
    }
  };
  
  const daysRemaining = calculateDaysRemaining();
  
  // Format date with proper error handling
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    
    try {
      return format(new Date(dateString), 'PPP');
    } catch (e) {
      return dateString;
    }
  };
  
  // Calculate item usage from sessions
  const calculateItemUsage = (itemCode: string) => {
    // In a real implementation, this would sum up the actual usage
    // of each item from sessions data
    return Math.floor(Math.random() * 5); // Placeholder for demo
  };
  
  // Process budget items with usage information
  const processedItems: BudgetItemDetail[] = budgetItems.map(item => {
    const usedQuantity = calculateItemUsage(item.itemCode);
    const remainingQuantity = Math.max(0, item.quantity - usedQuantity);
    const totalPrice = item.unitPrice * item.quantity;
    const usedAmount = item.unitPrice * usedQuantity;
    const remainingAmount = item.unitPrice * remainingQuantity;
    
    return {
      ...item,
      usedQuantity,
      remainingQuantity,
      totalPrice,
      usedAmount,
      remainingAmount
    };
  });
  
  // Calculate financial summaries
  const totalAllocated = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalUsed = processedItems.reduce((sum, item) => sum + item.usedAmount, 0);
  const remainingFunds = Math.max(0, totalAllocated - totalUsed);
  const usagePercentage = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;
  
  // Determine status based on usage and dates
  const getPlanStatus = () => {
    if (!plan.active) return { label: 'Inactive', color: 'gray' };
    
    if (plan.endDate) {
      const endDate = new Date(plan.endDate);
      if (endDate < new Date()) {
        return { label: 'Expired', color: 'red' };
      }
    }
    
    if (usagePercentage >= 100) {
      return { label: 'Depleted', color: 'red' };
    } else if (usagePercentage >= 90) {
      return { label: 'Critical', color: 'amber' };
    } else if (usagePercentage >= 70) {
      return { label: 'High Usage', color: 'yellow' };
    }
    
    return { label: 'Active', color: 'green' };
  };
  
  const status = getPlanStatus();
  
  // Create the appropriate badge color class
  const getBadgeColorClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'amber':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'red':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {plan.planName || "Budget Plan"}
            </DialogTitle>
            <Badge className={getBadgeColorClass(status.color)}>
              {status.label}
            </Badge>
          </div>
          <DialogDescription>
            Plan ID: {plan.planSerialNumber || "Not set"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Plan summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Financial summary card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-primary" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Budget:</span>
                  <span className="font-medium">${totalAllocated.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Used Funds:</span>
                  <span className="font-medium">${totalUsed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Remaining:</span>
                  <span className="font-medium">${remainingFunds.toFixed(2)}</span>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Usage: {usagePercentage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={usagePercentage} 
                    max={100} 
                    className={`h-2 ${
                      usagePercentage >= 90 ? 'bg-red-200' : 
                      usagePercentage >= 70 ? 'bg-amber-200' : 
                      'bg-green-200'
                    }`}
                    indicatorClassName={`${
                      usagePercentage >= 90 ? 'bg-red-500' : 
                      usagePercentage >= 70 ? 'bg-amber-500' : 
                      'bg-green-500'
                    }`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Date information card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-primary" />
                Plan Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Start Date:</span>
                  <span className="font-medium">{formatDate(plan.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">End Date:</span>
                  <span className="font-medium">{formatDate(plan.endDate)}</span>
                </div>
                {daysRemaining !== null && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm">Time Remaining:</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysRemaining} days
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Items summary card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <PackageOpen className="h-4 w-4 mr-1 text-primary" />
                Items Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Items:</span>
                  <span className="font-medium">{processedItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Categories:</span>
                  <span className="font-medium">
                    {new Set(processedItems.map(item => item.category)).size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Fully Used Items:</span>
                  <span className="font-medium">
                    {processedItems.filter(item => item.remainingQuantity === 0).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs for different views */}
        <Tabs defaultValue="overview" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Item Details</TabsTrigger>
            <TabsTrigger value="usage">Usage Tracking</TabsTrigger>
          </TabsList>
          
          {/* Overview tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Overview</CardTitle>
                <CardDescription>
                  Summary of budget allocation and usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Visual representation of budget usage */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Budget Usage</h4>
                    <div className="h-8 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          usagePercentage >= 90 ? 'bg-red-500' : 
                          usagePercentage >= 70 ? 'bg-amber-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, usagePercentage)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>$0</span>
                      <span>${totalAllocated.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Categories breakdown */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Category Allocation</h4>
                    <div className="space-y-2">
                      {Array.from(new Set(processedItems.map(item => item.category || 'Uncategorized'))).map(category => {
                        const categoryItems = processedItems.filter(item => (item.category || 'Uncategorized') === category);
                        const categoryTotal = categoryItems.reduce((sum, item) => sum + item.totalPrice, 0);
                        const categoryPercentage = (categoryTotal / totalAllocated) * 100;
                        
                        return (
                          <div key={category}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm">{category}</span>
                              <span className="text-xs font-medium">{categoryPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary"
                                style={{ width: `${categoryPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Items tab */}
          <TabsContent value="items">
            <div className="rounded-md border">
              <Table>
                <TableCaption>Budget items with usage details</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty.</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedItems.map((item) => {
                    const isFullyUsed = item.remainingQuantity === 0;
                    const isPartiallyUsed = item.usedQuantity > 0 && !isFullyUsed;
                    
                    return (
                      <TableRow key={item.id} className={isFullyUsed ? 'bg-gray-50' : ''}>
                        <TableCell className="font-medium">{item.itemCode}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.usedQuantity}</TableCell>
                        <TableCell className="text-right">{item.remainingQuantity}</TableCell>
                        <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${item.totalPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {isFullyUsed ? (
                            <Badge variant="outline" className="bg-gray-100">
                              <XCircle className="h-3 w-3 text-red-500 mr-1" />
                              Depleted
                            </Badge>
                          ) : isPartiallyUsed ? (
                            <Badge variant="outline" className="bg-yellow-50">
                              <AlertCircle className="h-3 w-3 text-yellow-500 mr-1" />
                              In Use
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50">
                              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                              Available
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          {/* Usage tracking tab */}
          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle>Usage Tracking</CardTitle>
                <CardDescription>
                  Detailed breakdown of item usage over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 space-y-4">
                  <Info className="h-10 w-10 text-gray-300 mx-auto" />
                  <p className="text-gray-500">
                    Usage tracking information will be displayed here.
                    This will include detailed session usage data and trends.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {onEdit && (
            <Button onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Budget Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
