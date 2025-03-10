import React from "react";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardDescription, 
  CardTitle, 
  CardFooter 
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Switch } from "../ui/switch";
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  Eye, 
  Pencil, 
  Star,
  FileArchive
} from "lucide-react";
import { format } from "date-fns";

// BudgetPlan interface matches what's used in BudgetPlansView
interface BudgetPlan {
  id: number;
  clientId: number;
  planSerialNumber: string | null;
  planCode: string | null;
  isActive: boolean | null;
  availableFunds: number;
  endOfPlan: string | null;
  createdAt: Date | null;
  
  // UI display properties
  active: boolean;
  archived: boolean;
  totalUsed: number;
  itemCount: number;
  percentUsed: number;
  
  // Mapped properties
  planName: string;
  fundingSource: string;
  startDate: string | null;
  endDate: string | null;
}

interface BudgetPlanToggleCardProps {
  plan: BudgetPlan;
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onToggleActive: (isActive: boolean) => void;
}

export default function BudgetPlanToggleCard({
  plan,
  onView,
  onEdit,
  onArchive,
  onToggleActive
}: BudgetPlanToggleCardProps) {
  // Format currency to display cleanly
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Format date with error handling
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  // Determine status based on plan properties
  const getPlanStatus = () => {
    if (plan.archived) return { label: 'Archived', color: 'gray' };
    
    if (!plan.active) return { label: 'Inactive', color: 'gray' };
    
    // Check if plan is expired
    if (plan.endDate) {
      const endDate = new Date(plan.endDate);
      if (endDate < new Date()) {
        return { label: 'Expired', color: 'red' };
      }
    }
    
    // Check usage level
    if (plan.percentUsed >= 100) {
      return { label: 'Depleted', color: 'red' };
    } else if (plan.percentUsed >= 90) {
      return { label: 'Critical', color: 'amber' };
    } else if (plan.percentUsed >= 70) {
      return { label: 'High Usage', color: 'yellow' };
    }
    
    return { label: 'Active', color: 'green' };
  };
  
  const status = getPlanStatus();
  
  // Handle toggle change
  const handleToggleChange = (checked: boolean) => {
    console.log(`Toggling plan ${plan.id} active status to: ${checked}`);
    onToggleActive(checked);
  };

  return (
    <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${
      plan.active ? 'border-2 border-primary' : ''
    }`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              {plan.planName || 'Budget Plan'}
            </CardTitle>
            <CardDescription>
              {plan.planSerialNumber ? (
                <>
                  {plan.planSerialNumber} 
                  {(plan.startDate || plan.endDate) && ' • '}
                  {plan.startDate && formatDate(plan.startDate)}
                  {plan.startDate && plan.endDate && ' - '}
                  {plan.endDate && formatDate(plan.endDate)}
                </>
              ) : 'No plan details available'}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge 
              className={`
                ${status.color === 'green' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                ${status.color === 'amber' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : ''}
                ${status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : ''}
                ${status.color === 'red' ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}
                ${status.color === 'gray' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' : ''}
              `}
            >
              {status.label}
            </Badge>
            
            {/* This is the toggle switch that was missing */}
            <div className="flex items-center gap-2">
              <Switch 
                checked={plan.active} 
                onCheckedChange={handleToggleChange}
                disabled={plan.archived}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="py-4">
        {/* Budget amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">Available Funds</div>
            <div className="text-xl font-bold">{formatCurrency(plan.availableFunds)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Used</div>
            <div className="text-xl font-bold">{formatCurrency(plan.totalUsed)}</div>
          </div>
        </div>
        
        {/* Usage information */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Budget Utilization</span>
            <span>{Math.min(100, plan.percentUsed).toFixed(0)}%</span>
          </div>
          <Progress 
            value={Math.min(100, plan.percentUsed)} 
            className="h-2"
            indicatorClassName={
              plan.percentUsed >= 100 ? "bg-red-500" :
              plan.percentUsed >= 90 ? "bg-amber-500" :
              plan.percentUsed >= 70 ? "bg-yellow-500" :
              "bg-green-500"
            }
          />
          <div className="text-xs text-gray-500 mt-1">
            {plan.itemCount} budget items • {plan.fundingSource || 'Unknown source'}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            Details
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        </div>
        <div>
          {!plan.archived && (
            <Button size="sm" variant="outline" onClick={onArchive}>
              <FileArchive className="h-3.5 w-3.5 mr-1" />
              Archive
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}