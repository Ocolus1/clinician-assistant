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
  
  const creationDate = plan.createdAt 
    ? format(typeof plan.createdAt === 'string' ? parseISO(plan.createdAt) : plan.createdAt, 'MMMM d, yyyy')
    : 'Unknown date';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle className="text-2xl font-bold">
                {plan.planCode || 'Untitled Plan'}
              </CardTitle>
              <CardDescription>
                {plan.planSerialNumber && `Serial Number: ${plan.planSerialNumber}`}
                {!plan.planSerialNumber && `Created on ${creationDate}`}
              </CardDescription>
            </div>
            <div className="flex items-center mt-2 sm:mt-0">
              {plan.isActive ? (
                <Badge variant="outline" className="border-green-500 bg-green-500/10 text-green-700">
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Active Plan
                </Badge>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onToggleActive}
                  className="text-xs"
                >
                  Set as Active Plan
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="ml-2"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-background">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-medium">Total Budget</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-2xl font-bold">{formatCurrency(plan.ndisFunds)}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-background">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-medium">Allocated</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-2xl font-bold">{formatCurrency(totalAllocated)}</p>
                <p className="text-sm text-muted-foreground">
                  {budgetItems.length} item{budgetItems.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            
            <Card className={`bg-background ${remainingFunds < 0 ? 'border-red-500' : ''}`}>
              <CardHeader className="py-4">
                <CardTitle className="text-base font-medium">Remaining</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className={`text-2xl font-bold ${remainingFunds < 0 ? 'text-red-500' : ''}`}>
                  {formatCurrency(remainingFunds)}
                </p>
                <p className="text-sm text-muted-foreground">
                  End date: {planEndDate}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Budget Utilization</h3>
              <span className="text-sm font-medium">{Math.min(100, Math.round(percentUsed))}%</span>
            </div>
            <Progress value={Math.min(100, percentUsed)} className="h-2" />
            {percentUsed > 100 && (
              <div className="flex items-center mt-1 text-red-500 text-xs">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                Budget exceeded by {formatCurrency(Math.abs(remainingFunds))}
              </div>
            )}
          </div>
          
          <div className="pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Budget Items</h3>
              <Button variant="outline" size="sm" className="text-xs">
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
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
                      <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}