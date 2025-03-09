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
  ArrowLeft,
  Plus,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BudgetItem } from "@shared/schema";
import { BudgetPlan } from './BudgetPlans';

interface BudgetPlanDetailsProps {
  plan: BudgetPlan;
  budgetItems: BudgetItem[];
  onBack: () => void;
  onEditPlan: (plan: BudgetPlan) => void;
  onAddItem: () => void;
  onEditItem: (item: BudgetItem) => void;
  onDeleteItem: (item: BudgetItem) => void;
}

export default function BudgetPlanDetails({
  plan,
  budgetItems = [],
  onBack,
  onEditPlan,
  onAddItem,
  onEditItem,
  onDeleteItem
}: BudgetPlanDetailsProps) {
  // Items for this specific plan
  const planItems = budgetItems.filter(item => item.budgetSettingsId === plan.id);
  
  // Calculate progress colors
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
        <div className="flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Button>
          <h3 className="text-lg font-medium">
            {plan.planCode || plan.planSerialNumber || 'Budget Plan Details'}
          </h3>
        </div>
        
        <Button size="sm" onClick={() => onEditPlan(plan)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Plan
        </Button>
      </div>
      
      {/* Plan Overview Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <Badge variant={plan.isActive ? "default" : "secondary"} className="mb-2">
                {plan.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <CardTitle className="text-xl">
                {plan.planCode || plan.planSerialNumber || 'Unnamed Plan'}
              </CardTitle>
              {plan.planCode && (
                <div className="text-sm text-gray-500 mt-1">
                  Plan Code: {plan.planCode}
                </div>
              )}
            </div>
            {plan.endOfPlan && (
              <div className="text-right">
                <div className="text-sm text-gray-500">End Date</div>
                <div className="font-medium">{formatDate(plan.endOfPlan)}</div>
              </div>
            )}
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
              <p className={`text-2xl font-bold ${plan.remainingFunds < 0 ? 'text-red-600' : ''}`}>
                ${plan.remainingFunds.toFixed(2)}
              </p>
              <div className="text-xs text-gray-500 mt-1">
                {plan.remainingFunds < 0 ? 'Over budget' : 'Under budget'}
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
                Budget exceeded by ${Math.abs(plan.remainingFunds).toFixed(2)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Budget Items Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Budget Items ({planItems.length})</h4>
          <Button size="sm" onClick={onAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Budget Item
          </Button>
        </div>
        
        {planItems.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-500 mb-2">No budget items added</h4>
            <p className="text-gray-500 mb-4">Add items to track expenses related to therapy services.</p>
            <Button onClick={onAddItem}>Add First Budget Item</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {planItems.map(item => {
              // Handle null/undefined values
              const unitPrice = typeof item.unitPrice === 'string' 
                ? parseFloat(item.unitPrice) || 0 
                : (item.unitPrice || 0);
                
              const quantity = typeof item.quantity === 'string' 
                ? parseInt(item.quantity) || 0 
                : (item.quantity || 0);
                
              const total = unitPrice * quantity;
              
              return (
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
                      <span className="font-medium">${unitPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>Quantity:</span>
                      <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1 font-medium">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="py-2 px-4 flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEditItem(item)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDeleteItem(item)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}