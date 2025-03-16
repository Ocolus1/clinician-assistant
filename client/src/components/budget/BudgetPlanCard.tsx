import React from "react";
import { format } from "date-fns";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, DollarSign, Calendar, PlusCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { useBudgetFeature } from "./BudgetFeatureContext";

import type { BudgetSettings, BudgetItem } from "@shared/schema";

interface BudgetPlanCardProps {
  plan: BudgetSettings;
  budgetItems: BudgetItem[];
  onEdit: (plan: BudgetSettings) => void;
  onAddItem: (plan: BudgetSettings) => void;
  onArchive?: (plan: BudgetSettings) => void;
}

export function BudgetPlanCard({ 
  plan, 
  budgetItems, 
  onEdit, 
  onAddItem, 
  onArchive 
}: BudgetPlanCardProps) {
  // Get selected plan ID from context
  const { selectedPlanId, setSelectedPlanId } = useBudgetFeature();
  
  // Filter budget items for this plan
  const planItems = budgetItems.filter(item => item.budgetSettingsId === plan.id);
  
  // Calculate total allocated funds for this plan
  const totalAllocated = planItems.reduce((sum, item) => {
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
    const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
    return sum + (unitPrice * quantity);
  }, 0);
  
  // Calculate remaining funds
  const ndisFunds = typeof plan.ndisFunds === 'string' ? parseFloat(plan.ndisFunds) : plan.ndisFunds;
  const remainingFunds = ndisFunds - totalAllocated;
  
  // Calculate percentage used
  const percentUsed = ndisFunds > 0 ? (totalAllocated / ndisFunds) * 100 : 0;
  
  // Format dates
  const formattedEndDate = plan.endOfPlan 
    ? format(new Date(plan.endOfPlan), 'MMM d, yyyy')
    : 'Not specified';
    
  // Generate status badge
  const getStatusBadge = () => {
    if (!plan.isActive) return <Badge variant="outline">Inactive</Badge>;
    if (percentUsed >= 100) return <Badge variant="destructive">Fully Allocated</Badge>;
    if (percentUsed >= 80) return <Badge className="bg-yellow-500 hover:bg-yellow-600">Near Capacity</Badge>;
    return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
  };
  
  // Handle card selection
  const handleCardClick = () => {
    setSelectedPlanId(selectedPlanId === plan.id ? null : plan.id);
  };
  
  return (
    <Card 
      className={`
        cursor-pointer transition-all 
        ${selectedPlanId === plan.id ? 'border-primary shadow-md' : ''}
        ${!plan.isActive ? 'opacity-70' : ''}
      `}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">
              {plan.planCode || 'Untitled Plan'}
            </CardTitle>
            <CardDescription>
              {/* Use fundsManagement from client if available */}
              Self-Managed
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(plan);
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onAddItem(plan);
                }}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Budget Item
                </DropdownMenuItem>
                {onArchive && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onArchive(plan);
                  }}>
                    {plan.isActive ? 'Archive Plan' : 'Restore Plan'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-muted-foreground mr-2" />
              <span className="text-sm font-medium">Total Funds</span>
            </div>
            <span className="font-semibold">{formatCurrency(ndisFunds)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
              <span className="text-sm font-medium">End Date</span>
            </div>
            <span>{formattedEndDate}</span>
          </div>
          
          <div className="pt-2">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Allocation Progress</span>
              <span className="text-sm">{Math.round(percentUsed)}%</span>
            </div>
            <Progress value={percentUsed} className="h-2" />
            
            <div className="flex justify-between mt-2 text-sm">
              <span>Allocated: {formatCurrency(totalAllocated)}</span>
              <span>Remaining: {formatCurrency(remainingFunds)}</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onAddItem(plan);
          }}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Budget Item
        </Button>
      </CardFooter>
    </Card>
  );
}