import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { PencilIcon, CheckCircle, AlertCircle, ShoppingCart, ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";
import type { BudgetItem } from "@shared/schema";
import { BudgetPlan } from "./BudgetFeatureContext";

interface BudgetPlanFullViewProps {
  plan: BudgetPlan;
  budgetItems: BudgetItem[];
  onBack?: () => void;
  onEdit?: () => void;
  onToggleActive?: () => void;
}

/**
 * Displays a detailed view of a single budget plan with all its items
 * This matches the design in the screenshot (simpler layout with cards for key totals and a table for budget items)
 */
export function BudgetPlanFullView({ 
  plan, 
  budgetItems, 
  onBack, 
  onEdit, 
  onToggleActive 
}: BudgetPlanFullViewProps) {
  // Calculate total allocated from budget items
  const totalAllocated = budgetItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  // Calculate remaining funds
  const remainingFunds = plan.ndisFunds - totalAllocated;
  
  // Calculate percentage used
  const percentUsed = plan.ndisFunds > 0 ? (totalAllocated / plan.ndisFunds) * 100 : 0;
  
  // Format dates for display
  const planEndDate = plan.endOfPlan 
    ? format(typeof plan.endOfPlan === 'string' ? parseISO(plan.endOfPlan) : plan.endOfPlan, 'MMMM d, yyyy')
    : 'No end date';

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Plans
        </Button>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{plan.planCode || 'Untitled Plan'}</h1>
          <p className="text-muted-foreground">
            Serial Number: {plan.planSerialNumber || '-'}
          </p>
        </div>
        <div className="flex gap-2">
          {plan.isActive ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500">
              Active Plan
            </Badge>
          ) : (
            <Button onClick={onToggleActive} size="sm" variant="outline">
              Set as Active
            </Button>
          )}
          <Button onClick={onEdit} size="sm" variant="outline">
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(plan.ndisFunds)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalAllocated)}</p>
            <p className="text-sm text-muted-foreground">
              {budgetItems.length} item{budgetItems.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(remainingFunds)}</p>
            <p className="text-sm text-muted-foreground">
              End date: {planEndDate}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-medium">Budget Utilization</h3>
          <span className="text-sm font-medium">{Math.min(100, Math.round(percentUsed))}%</span>
        </div>
        <Progress value={Math.min(100, percentUsed)} className="h-2" />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Budget Items</h3>
          <Button variant="outline" size="sm">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
        
        {budgetItems.length === 0 ? (
          <div className="text-center p-6 border rounded-md bg-muted/10">
            <p className="text-muted-foreground">No budget items found for this plan.</p>
            <p className="text-xs text-muted-foreground mt-1">Click 'Add Item' to allocate funds to services.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell>{item.itemCode}</TableCell>
                  <TableCell>{item.category || "Uncategorized"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5} className="text-right font-medium">
                  Total Allocated
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(totalAllocated)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}