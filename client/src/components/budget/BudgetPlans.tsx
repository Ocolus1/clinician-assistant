import React, { useState } from 'react';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Edit, 
  FileArchive,
  PlusCircle, 
  Star,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { BudgetSettings, BudgetItem } from "@shared/schema";

// Define BudgetPlan for enhanced UI representation
export interface BudgetPlan {
  id: number;
  clientId: number;
  planCode: string | null;
  planSerialNumber: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endOfPlan: string | null;
  // Display values
  percentUsed: number;
  totalUsed: number;
  itemCount: number;
  remainingFunds: number;
}

interface BudgetPlansProps {
  budgetSettings: BudgetSettings[];
  budgetItems: BudgetItem[];
  onCreatePlan: () => void;
  onSelectPlan: (plan: BudgetPlan) => void;
  onArchivePlan: (plan: BudgetPlan) => void;
  onSetActivePlan: (plan: BudgetPlan) => void;
}

export default function BudgetPlans({
  budgetSettings = [],
  budgetItems = [],
  onCreatePlan,
  onSelectPlan,
  onArchivePlan,
  onSetActivePlan
}: BudgetPlansProps) {
  // Convert budget settings to budget plans with calculated properties
  const budgetPlans: BudgetPlan[] = budgetSettings.map(settings => {
    const itemsForSettings = budgetItems.filter(
      item => item.budgetSettingsId === settings.id
    );
    
    // Calculate total used
    const totalUsed = itemsForSettings.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === 'string' 
        ? parseFloat(item.unitPrice) || 0 
        : item.unitPrice || 0;
        
      const quantity = typeof item.quantity === 'string' 
        ? parseInt(item.quantity) || 0 
        : item.quantity || 0;
        
      return sum + (unitPrice * quantity);
    }, 0);
    
    // Parse available funds
    const availableFunds = typeof settings.availableFunds === 'string' 
      ? parseFloat(settings.availableFunds) || 0
      : settings.availableFunds || 0;
    
    // Calculate percentage used
    const percentUsed = availableFunds > 0 
      ? (totalUsed / availableFunds) * 100
      : 0;
      
    // Calculate remaining funds
    const remainingFunds = availableFunds - totalUsed;
    
    return {
      id: settings.id,
      clientId: settings.clientId,
      planCode: settings.planCode,
      planSerialNumber: settings.planSerialNumber,
      isActive: settings.isActive,
      availableFunds,
      endOfPlan: settings.endOfPlan,
      totalUsed,
      percentUsed,
      itemCount: itemsForSettings.length,
      remainingFunds
    };
  });
  
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
  
  // If no budget plans exist, show empty state
  if (budgetPlans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Budget Plans</h3>
          <Button size="sm" onClick={onCreatePlan}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Budget Plan
          </Button>
        </div>
        
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
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Budget Plans ({budgetPlans.length})</h3>
        <Button size="sm" onClick={onCreatePlan}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Budget Plan
        </Button>
      </div>
      
      {/* Grid of budget plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetPlans.map(plan => (
          <Card 
            key={plan.id} 
            className={`hover:shadow-md transition-shadow duration-200 ${
              plan.isActive ? 'border-primary border-2' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <Badge variant={plan.isActive ? "default" : "secondary"} className="mb-2">
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <CardTitle className="text-lg">
                    {plan.planCode || plan.planSerialNumber || 'Unnamed Plan'} 
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetActivePlan(plan);
                      }}
                      className="h-8"
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Set Active
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Available Funds</div>
                    <div className="text-xl font-bold">${plan.availableFunds.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Used Funds</div>
                    <div className="text-xl font-bold">${plan.totalUsed.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{plan.itemCount} items</div>
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
                  
                  {plan.remainingFunds < 0 && (
                    <div className="mt-2">
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="text-xs font-medium">Budget Exceeded</AlertTitle>
                        <AlertDescription className="text-xs">
                          Over by ${Math.abs(plan.remainingFunds).toFixed(2)}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-0 flex justify-between">
              <Button 
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchivePlan(plan);
                }}
                className="h-8"
              >
                <FileArchive className="h-4 w-4 mr-1" />
                Archive
              </Button>
              
              <Button
                onClick={() => onSelectPlan(plan)}
                size="sm"
                className="ml-auto"
              >
                View Details
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}