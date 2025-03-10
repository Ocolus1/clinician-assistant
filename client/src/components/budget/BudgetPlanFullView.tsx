import React, { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";
import { 
  DollarSign, 
  Calendar, 
  PackageOpen, 
  ChevronLeft,
  BarChart,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import {
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow
} from "../ui/table";

// Add types for the budget item detail with usage tracking
export interface BudgetItemDetail {
  id: number;
  clientId: number;
  budgetSettingsId: number;
  itemCode: string;
  name: string | null;
  description: string;
  unitPrice: number;
  quantity: number;
  category: string | null;
  usedQuantity: number;
  remainingQuantity: number;
  totalPrice: number;
  usedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
}

export interface BudgetPlan {
  id: number;
  clientId: number;
  planCode: string | null;
  planSerialNumber: string | null;
  planName: string;
  active: boolean;
  availableFunds: number;
  endDate: string | null;
  startDate: string | null;
  totalUsed: number;
  percentUsed: number;
  itemCount: number;
  remainingFunds: number;
  archived: boolean;
  fundingSource: string;
  daysRemaining?: number | null;
  createdAt?: Date | null;
  enhancedItems?: BudgetItemDetail[];
}

interface BudgetPlanHeaderCardProps {
  plan: BudgetPlan;
  status: { label: string; color: string };
  totalUsed: number;
  totalAllocated: number;
  remainingFunds: number;
  usagePercentage: number;
  daysRemaining: number | null;
  startDate: string | null;
  endDate: string | null;
  formatDate: (date: string | null) => string;
}

// Implement BudgetPlanHeaderCard component inline
function BudgetPlanHeaderCard({
  plan,
  status,
  totalUsed,
  totalAllocated,
  remainingFunds,
  usagePercentage,
  daysRemaining,
  startDate,
  endDate,
  formatDate
}: BudgetPlanHeaderCardProps) {
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div>
            <CardTitle>{plan.planName}</CardTitle>
            <CardDescription>
              {plan.planSerialNumber && `Serial: ${plan.planSerialNumber}`}
              {plan.fundingSource && ` • ${plan.fundingSource} Funding`}
            </CardDescription>
          </div>
          
          <Badge className={getBadgeColorClass(status.color)}>
            {status.label}
            {daysRemaining !== null && daysRemaining < 30 && status.label === 'Active' && 
              ` (${daysRemaining} days left)`
            }
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6 justify-between">
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Total Budget</div>
            <div className="text-2xl font-bold">${totalAllocated.toFixed(2)}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Used</div>
            <div className="text-2xl font-bold">${totalUsed.toFixed(2)}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Remaining</div>
            <div className="text-2xl font-bold">${remainingFunds.toFixed(2)}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Usage</div>
            <div className="text-2xl font-bold">{usagePercentage.toFixed(1)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface BudgetItemsDetailTableProps {
  items: BudgetItemDetail[];
}

// Implement BudgetItemsDetailTable component inline
function BudgetItemsDetailTable({ items }: BudgetItemsDetailTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Item Details</CardTitle>
        <CardDescription>
          Detailed information about each budget item and its usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Usage %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No budget items found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.itemCode}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.category || 'Uncategorized'}</TableCell>
                  <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.usedQuantity}</TableCell>
                  <TableCell className="text-right">{item.remainingQuantity}</TableCell>
                  <TableCell className="text-right">${item.totalPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.usagePercentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface BudgetUsageChartProps {
  budgetItems: BudgetItemDetail[];
}

// Implement BudgetUsageChart component inline
function BudgetUsageChart({ budgetItems }: BudgetUsageChartProps) {
  // Simple implementation showing a horizontal bar chart of usage per item
  if (budgetItems.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
        <p className="text-gray-500">No budget items to display</p>
      </div>
    );
  }

  // Sort items by usage percentage (highest first)
  const sortedItems = [...budgetItems]
    .sort((a, b) => b.usagePercentage - a.usagePercentage)
    .slice(0, 5);  // Only show top 5 for simplicity

  return (
    <div>
      <h4 className="text-sm font-medium mb-4">Top 5 Items by Usage</h4>
      <div className="space-y-4">
        {sortedItems.map(item => (
          <div key={item.id}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium truncate max-w-[70%]" title={item.description}>
                {item.description}
              </span>
              <span className="text-xs">
                {item.usedQuantity} of {item.quantity} ({item.usagePercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  item.usagePercentage >= 90 ? 'bg-red-500' : 
                  item.usagePercentage >= 70 ? 'bg-amber-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, item.usagePercentage)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BudgetPlanFullViewProps {
  plan: BudgetPlan;
  budgetItems: BudgetItemDetail[];
  onBack: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onSetActive: () => void;
}

export function BudgetPlanFullView({
  plan,
  budgetItems,
  onBack,
  onEdit,
  onArchive,
  onSetActive
}: BudgetPlanFullViewProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Format date with proper error handling
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
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
  
  // Calculate financial summaries
  const totalAllocated = budgetItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalUsed = budgetItems.reduce((sum, item) => sum + item.usedAmount, 0);
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
  
  // Get status color class for various UI elements
  const getStatusColorClass = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 90) return "bg-amber-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  // Get badge color class
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
    <div className="space-y-6">
      {/* Back button and section title */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back to Plans
        </Button>
        
        <div className="flex items-center gap-2">
          {!plan.active && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSetActive}
              className="gap-1"
            >
              <CheckCircle className="h-4 w-4" />
              Set as Active
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            className="gap-1"
          >
            <CreditCard className="h-4 w-4" />
            Edit Items
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onArchive}
            className="gap-1 text-red-600 hover:text-red-700"
          >
            <XCircle className="h-4 w-4" />
            Archive Plan
          </Button>
        </div>
      </div>
      
      {/* Plan header with key information */}
      <BudgetPlanHeaderCard 
        plan={plan}
        status={status}
        totalUsed={totalUsed}
        totalAllocated={totalAllocated}
        remainingFunds={remainingFunds}
        usagePercentage={usagePercentage}
        daysRemaining={daysRemaining}
        startDate={plan.startDate}
        endDate={plan.endDate}
        formatDate={formatDate}
      />
      
      {/* Summary cards for financial, date, and items info */}
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
                  <Badge variant="outline" className={`flex items-center gap-1 ${
                    daysRemaining < 30 ? 'text-amber-600' : ''
                  }`}>
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
                <span className="font-medium">{budgetItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Categories:</span>
                <span className="font-medium">
                  {new Set(budgetItems.map(item => item.category || 'Uncategorized')).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Fully Used Items:</span>
                <span className="font-medium">
                  {budgetItems.filter(item => item.remainingQuantity === 0).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for different views */}
      <Tabs defaultValue="overview" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <BarChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="items">
            <PackageOpen className="h-4 w-4 mr-2" />
            Item Details
          </TabsTrigger>
        </TabsList>
        
        {/* Overview tab with charts and analysis */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>
                Summary of budget allocation and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
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
                  <h4 className="text-sm font-medium mb-4">Category Allocation</h4>
                  <div className="space-y-3">
                    {Array.from(new Set(budgetItems.map(item => item.category || 'Uncategorized'))).map(category => {
                      const categoryItems = budgetItems.filter(item => (item.category || 'Uncategorized') === category);
                      const categoryTotal = categoryItems.reduce((sum, item) => sum + item.totalPrice, 0);
                      const categoryPercentage = (categoryTotal / totalAllocated) * 100;
                      
                      return (
                        <div key={category}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{category}</span>
                            <span className="text-xs">${categoryTotal.toFixed(2)} ({categoryPercentage.toFixed(1)}%)</span>
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
                
                {/* Usage chart */}
                <BudgetUsageChart budgetItems={budgetItems} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Items tab with detailed table */}
        <TabsContent value="items">
          <BudgetItemsDetailTable items={budgetItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}