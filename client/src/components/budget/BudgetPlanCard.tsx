import React from "react";
import { motion } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  BarChart3,
  Star,
  FileArchive,
  Edit,
  Eye
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, differenceInDays, isAfter } from "date-fns";
import { BudgetPlan } from "./BudgetFeatureContext";

interface BudgetPlanCardProps {
  plan: BudgetPlan;
  isActive?: boolean;
  isArchived?: boolean;
  onView: () => void;
  onEdit?: () => void;
  onSetActive?: () => void;
  onArchive?: () => void;
}

export function BudgetPlanCard({ 
  plan, 
  isActive = false,
  isArchived = false,
  onView, 
  onEdit, 
  onSetActive, 
  onArchive 
}: BudgetPlanCardProps) {
  // Determine card border styling based on status
  const getBorderStyle = () => {
    if (isArchived) return "border-muted";
    if (isActive) return "border-2 border-primary";
    return "border";
  };
  
  // Calculate days remaining
  const daysRemainingDisplay = () => {
    if (plan.daysRemaining === null) return "No end date set";
    if (plan.daysRemaining <= 0) return "Expired";
    return `${plan.daysRemaining} days remaining`;
  };
  
  // Get status color classes
  const getStatusColorClass = () => {
    if (isArchived) return "text-muted-foreground";
    
    switch (plan.statusColor) {
      case 'green':
        return "text-green-600";
      case 'yellow':
        return "text-amber-600";
      case 'red':
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${getBorderStyle()} h-full transition-all ${isActive ? 'shadow-md' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">
                {plan.planName}
                {isActive && (
                  <Badge className="ml-2 bg-gradient-to-r from-primary to-primary/80">
                    Active
                  </Badge>
                )}
                {isArchived && (
                  <Badge variant="outline" className="ml-2">
                    Archived
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {plan.planSerialNumber || "No serial number"}
              </CardDescription>
            </div>
            <div className="flex items-center">
              <div 
                className={`w-3 h-3 rounded-full ${
                  isArchived ? 'bg-muted' : 
                  isActive ? 'bg-green-500' : 'bg-amber-500'
                }`}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Circular Progress Indicator */}
          <div className="flex justify-between items-center">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle 
                  className="text-muted stroke-current" 
                  strokeWidth="8" 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                />
                <circle 
                  className={`${
                    isArchived ? 'text-gray-400' :
                    plan.percentUsed > 80 ? 'text-destructive' :
                    plan.percentUsed > 50 ? 'text-amber-500' :
                    'text-green-500'
                  } stroke-current`}
                  strokeWidth="8" 
                  strokeLinecap="round" 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * Math.min(plan.percentUsed, 100)) / 100}
                  transform="rotate(-90 50 50)"
                />
                <text 
                  x="50" 
                  y="50" 
                  dominantBaseline="middle" 
                  textAnchor="middle"
                  className="text-xl font-medium fill-foreground"
                >
                  {Math.round(plan.percentUsed)}%
                </text>
              </svg>
            </div>
            
            <div className="flex-1 ml-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-medium">{formatCurrency(plan.availableFunds)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used:</span>
                  <span className="font-medium">{formatCurrency(plan.totalUsed)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium">{formatCurrency(plan.remainingFunds)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Timeline and Info */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center text-sm">
              <DollarSign className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">Funding Source:</span>
              <span className="ml-auto font-medium">{plan.fundingSource}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span className="ml-auto font-medium">
                {plan.startDate ? format(new Date(plan.startDate), 'MMM d, yyyy') : 'Not set'}
              </span>
            </div>
            
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">Expires:</span>
              <span className={`ml-auto font-medium ${getStatusColorClass()}`}>
                {plan.endDate ? format(new Date(plan.endDate), 'MMM d, yyyy') : 'Not set'}
              </span>
            </div>
            
            <div className="flex items-center text-sm">
              <BarChart3 className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">Items:</span>
              <span className="ml-auto font-medium">{plan.itemCount}</span>
            </div>
          </div>
          
          {/* Time Indicator */}
          {plan.daysRemaining !== null && (
            <div className="pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Time Remaining:</span>
                <span className={getStatusColorClass()}>
                  {daysRemainingDisplay()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                {plan.daysRemaining > 0 && plan.endDate && (
                  <div 
                    className={`h-full ${
                      plan.daysRemaining > 30 ? 'bg-green-500' :
                      plan.daysRemaining > 7 ? 'bg-amber-500' :
                      'bg-destructive'
                    }`}
                    style={{ 
                      width: `${Math.min(100, (plan.daysRemaining / 90) * 100)}%` 
                    }}
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Usage Badges */}
          {(plan.mostUsedItem || plan.mostUsedCategory) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {plan.mostUsedItem && (
                <Badge variant="secondary" className="text-xs">
                  Most used: {plan.mostUsedItem}
                </Badge>
              )}
              {plan.mostUsedCategory && (
                <Badge variant="secondary" className="text-xs">
                  Top category: {plan.mostUsedCategory}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-0 flex-wrap gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={onView}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View Details
          </Button>
          
          {!isArchived && (
            <>
              {onEdit && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={onEdit}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
              )}
              
              {onSetActive && !isActive && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1"
                  onClick={onSetActive}
                >
                  <Star className="h-3.5 w-3.5 mr-1" />
                  Set Active
                </Button>
              )}
              
              {onArchive && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={onArchive}
                >
                  <FileArchive className="h-3.5 w-3.5 mr-1" />
                  Archive
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}