import React from 'react';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Edit, 
  FileArchive,
  PlusCircle, 
  Star,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BudgetSettings, BudgetItem } from "@shared/schema";

// Define BudgetPlan for enhanced UI representation
interface BudgetPlan {
  id: number;
  clientId: number;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endOfPlan: string | null;
  // Display values
  percentUsed: number;
  totalUsed: number;
  itemCount: number;
}

interface BudgetCardGridProps {
  budgetSettings: BudgetSettings | undefined;
  budgetItems: BudgetItem[];
  onCreatePlan: () => void;
  onArchivePlan: (plan: BudgetPlan) => void;
  onSetActivePlan: (plan: BudgetPlan) => void;
}

export default function BudgetCardGrid({
  budgetSettings,
  budgetItems,
  onCreatePlan,
  onArchivePlan,
  onSetActivePlan
}: BudgetCardGridProps) {
  // Convert budget settings to a plan format with additional display properties
  const createBudgetPlan = (settings: BudgetSettings): BudgetPlan => {
    const itemsForSettings = budgetItems.filter(
      item => item.budgetSettingsId === settings.id
    );
    
    // Calculate total used
    const totalUsed = itemsForSettings.reduce(
      (sum, item) => sum + (item.unitPrice * item.quantity), 
      0
    );
    
    // Parse available funds
    const availableFunds = typeof settings.availableFunds === 'string' 
      ? parseFloat(settings.availableFunds) || 0
      : settings.availableFunds || 0;
    
    // Calculate percentage used
    const percentUsed = availableFunds > 0 
      ? (totalUsed / availableFunds) * 100
      : 0;
    
    return {
      id: settings.id,
      clientId: settings.clientId,
      planCode: settings.planCode,
      isActive: settings.isActive,
      availableFunds,
      endOfPlan: settings.endOfPlan,
      totalUsed,
      percentUsed,
      itemCount: itemsForSettings.length
    };
  };
  
  // If no budget settings exist, show empty state
  if (!budgetSettings) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-10 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Budget Plans</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              No budget plans have been created for this client yet. You'll need to set up a budget plan to track funding and expenses.
            </p>
            <Button onClick={onCreatePlan}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Budget Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Convert settings to plan for display
  const plan = createBudgetPlan(budgetSettings);
  
  // Determine status color based on percentage used
  const getStatusColor = (percentUsed: number) => {
    if (percentUsed >= 100) return "bg-red-500";
    if (percentUsed >= 90) return "bg-amber-500";
    if (percentUsed >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  // Format date string
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Budget Plan</h3>
        <Button size="sm" onClick={onCreatePlan}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Budget Plan
        </Button>
      </div>
      
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <Badge variant={plan.isActive ? "default" : "secondary"} className="mb-2">
                {plan.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <CardTitle className="text-lg">
                {plan.planCode || 'Unnamed Plan'} 
              </CardTitle>
              {plan.endOfPlan && (
                <div className="text-xs text-gray-500 mt-1">
                  Ends: {formatDate(plan.endOfPlan)}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {!plan.isActive && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onSetActivePlan(plan)}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Set Active
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onArchivePlan(plan)}
              >
                <FileArchive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Available Funds</h4>
              <p className="text-2xl font-bold">${plan.availableFunds.toFixed(2)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Used</h4>
              <p className="text-2xl font-bold">${plan.totalUsed.toFixed(2)}</p>
              <div className="text-xs text-gray-500 mt-1">
                ({plan.itemCount} budget items)
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Remaining</h4>
              <p className={`text-2xl font-bold ${plan.totalUsed > plan.availableFunds ? 'text-red-600' : ''}`}>
                ${(plan.availableFunds - plan.totalUsed).toFixed(2)}
              </p>
              <div className="text-xs text-gray-500 mt-1">
                {plan.totalUsed > plan.availableFunds ? 'Over budget' : 'Under budget'}
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Budget Utilization</span>
              <span>{Math.min(100, plan.percentUsed).toFixed(0)}%</span>
            </div>
            <Progress 
              value={Math.min(100, plan.percentUsed)} 
              className="h-2"
              indicatorClassName={getStatusColor(plan.percentUsed)}
            />
            {plan.percentUsed > 100 && (
              <div className="text-xs text-red-600 mt-1">
                Budget exceeded by ${(plan.totalUsed - plan.availableFunds).toFixed(2)}
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 flex justify-center">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onCreatePlan}
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Edit Budget Settings
          </Button>
        </CardFooter>
      </Card>
      
      {/* Budget Items Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Budget Items ({budgetItems.length})</h4>
          <Button size="sm" onClick={onCreatePlan}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Manage Budget Items
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {budgetItems.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base">
                  {item.name || item.itemCode || 'Unnamed Item'}
                </CardTitle>
                {item.category && (
                  <Badge variant="outline" className="mt-1">
                    {item.category}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="py-2 px-4">
                <div className="flex justify-between text-sm">
                  <span>Unit Price:</span>
                  <span className="font-medium">${typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice).toFixed(2) : item.unitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Quantity:</span>
                  <span className="font-medium">{item.quantity}</span>
                </div>
                <div className="flex justify-between text-sm mt-1 font-medium">
                  <span>Total:</span>
                  <span>${(
                    (typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice) * 
                    (typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity)
                  ).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {budgetItems.length === 0 && (
            <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg">
              <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-500 mb-2">No budget items added</h4>
              <p className="text-gray-500 mb-4">Add items to track expenses related to therapy services.</p>
              <Button onClick={onCreatePlan}>Add First Budget Item</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}