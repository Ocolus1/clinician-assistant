import { useState, useEffect } from "react";
import { BudgetPlansGrid } from "./BudgetPlansGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, CreditCard, RefreshCw, AlertCircle, Filter, ArrowUpDown, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnhancedBudgetPlanCreateWizard } from "./EnhancedBudgetPlanCreateWizard";
import { useBudgetFeature, BudgetPlan } from "./BudgetFeatureContext";
import { formatCurrency } from "@/lib/utils";

interface EnhancedBudgetPlansViewProps {
  clientId: number;
  onViewPlan?: (planId: number) => void;
}

/**
 * Enhanced Budget Plans Overview with grid display and filtering
 * Shows a list of budget plans with filtering and sorting capabilities
 */
export function EnhancedBudgetPlansView({ clientId, onViewPlan }: EnhancedBudgetPlansViewProps) {
  // State for the create wizard dialog
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  
  // Filtering and sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  
  // Get budget plans from context
  const { 
    budgetPlans, 
    isLoading, 
    error, 
    refreshData,
    viewPlanDetails 
  } = useBudgetFeature();
  
  // Filter and sort budget plans
  const getFilteredAndSortedPlans = () => {
    // First filter the plans
    const filtered = budgetPlans.filter(plan => {
      // Filter by search term
      const searchMatches = !searchQuery ? true : 
        (plan.planCode?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         plan.planSerialNumber?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by status
      const statusMatches = statusFilter === "all" ? true :
        statusFilter === "active" ? plan.isActive === true :
        statusFilter === "inactive" ? plan.isActive === false :
        true;
        
      return searchMatches && statusMatches;
    });
    
    // Then sort the filtered plans
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          // Most recent end date first
          if (a.endOfPlan && b.endOfPlan) {
            return new Date(b.endOfPlan).getTime() - new Date(a.endOfPlan).getTime();
          }
          // Plans with end dates come before those without
          if (a.endOfPlan && !b.endOfPlan) return -1;
          if (!a.endOfPlan && b.endOfPlan) return 1;
          // If neither has end date, sort by ID (assuming higher ID is more recent)
          return b.id - a.id;
          
        case "date-asc":
          // Oldest end date first
          if (a.endOfPlan && b.endOfPlan) {
            return new Date(a.endOfPlan).getTime() - new Date(b.endOfPlan).getTime();
          }
          // Plans without end dates come before those with
          if (a.endOfPlan && !b.endOfPlan) return 1;
          if (!a.endOfPlan && b.endOfPlan) return -1;
          // If neither has end date, sort by ID (assuming lower ID is older)
          return a.id - b.id;
          
        case "name-asc":
          // Alphabetical by plan code
          return (a.planCode || "").localeCompare(b.planCode || "");
          
        case "name-desc":
          // Reverse alphabetical by plan code
          return (b.planCode || "").localeCompare(a.planCode || "");
          
        case "funds-desc":
          // Highest funds first
          return b.ndisFunds - a.ndisFunds;
          
        case "funds-asc":
          // Lowest funds first
          return a.ndisFunds - b.ndisFunds;
          
        default:
          return 0;
      }
    });
  };
  
  // Get the filtered and sorted plans
  const filteredAndSortedPlans = getFilteredAndSortedPlans();
  
  // Calculate total funds across all plans
  const totalFunds = budgetPlans.reduce((total, plan) => total + plan.ndisFunds, 0);
  
  // Find active plan, if any
  const activePlan = budgetPlans.find(plan => plan.isActive === true);
  
  // Handle create wizard success
  const handleCreateSuccess = () => {
    // Refresh the data
    refreshData();
  };
  
  // Handle view plan details
  const handleViewPlanDetails = (planId: number) => {
    // Update the context state
    viewPlanDetails(planId);
    
    // Call the onViewPlan callback if provided
    if (onViewPlan) {
      onViewPlan(planId);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Budget Plans</h2>
          <Button onClick={() => refreshData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load budget plans. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with Stats and Create Button */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Budget Plans</h2>
          <p className="text-sm text-gray-500 mb-4">
            Manage budget allocations for therapy and related services
          </p>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-1">Total Budget Plans</span>
                  <span className="text-2xl font-bold">{budgetPlans.length}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-1">Total NDIS Funds</span>
                  <span className="text-2xl font-bold">{formatCurrency(totalFunds)}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-1">Active Plan</span>
                  {activePlan ? (
                    <span className="text-lg font-semibold truncate">{activePlan.planCode || "No name"}</span>
                  ) : (
                    <span className="text-lg text-gray-400">None active</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Button 
          className="max-w-max"
          onClick={() => setCreateWizardOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Plan
        </Button>
      </div>
      
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search plans..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="active">Active Plans</SelectItem>
              <SelectItem value="inactive">Inactive Plans</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-between">
                <span>Sort by</span>
                <ArrowUpDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("date-desc")}>
                End Date (newest first)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("date-asc")}>
                End Date (oldest first)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name-asc")}>
                Plan Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name-desc")}>
                Plan Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("funds-desc")}>
                Funds (highest first)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("funds-asc")}>
                Funds (lowest first)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Budget Plans Grid */}
      {filteredAndSortedPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedPlans.map((plan) => (
            <div 
              key={plan.id} 
              onClick={() => handleViewPlanDetails(plan.id)}
              className="cursor-pointer"
            >
              <Card 
                className="overflow-hidden border border-gray-200 hover:border-primary/40 transition-all duration-200"
              >
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-md font-semibold text-gray-800">
                        {plan.planCode || "Unnamed Plan"}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Plan ID: {plan.planSerialNumber || "N/A"}
                      </p>
                    </div>
                    
                    <div className={`px-2 py-1 rounded-full text-xs font-medium 
                      ${plan.isActive 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-600"}`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Funds Available:</span>
                    <span className="font-medium">{formatCurrency(plan.ndisFunds)}</span>
                  </div>
                  
                  {/* Progress bar for funds usage */}
                  <Progress 
                    value={0} 
                    max={100} 
                    className="h-2 mb-1" 
                  />
                  
                  <div className="text-xs text-right text-gray-500 mb-4">
                    0% used
                  </div>
                  
                  {/* End Date */}
                  {plan.endOfPlan && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">End Date:</span>
                        <span className="text-sm">
                          {new Date(plan.endOfPlan).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-10 border border-dashed rounded-lg">
          <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No Budget Plans Found</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-4">
            {searchQuery || statusFilter !== "all" 
              ? "Try adjusting your filters or search query"
              : "There are no budget plans created yet. Click on 'Create New Plan' to get started."}
          </p>
          
          {searchQuery === "" && statusFilter === "all" && (
            <Button onClick={() => setCreateWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Plan
            </Button>
          )}
        </div>
      )}
      
      {/* Create Plan Wizard Dialog */}
      <EnhancedBudgetPlanCreateWizard
        open={createWizardOpen}
        onOpenChange={setCreateWizardOpen}
        clientId={clientId}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}