import { useState } from "react";
import { BudgetPlanCard } from "./BudgetPlanCard";
import { BudgetSettings } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Search, Grid3X3, ListFilter } from "lucide-react";

interface BudgetPlansGridProps {
  plans: BudgetSettings[];
  clientId: number;
}

export function BudgetPlansGrid({ plans, clientId }: BudgetPlansGridProps) {
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  
  // Apply filters and sorting
  const filteredPlans = plans.filter(plan => {
    // Filter by search query
    const matchesSearch = searchQuery 
      ? plan.planCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.planSerialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
      
    // Filter by status
    const matchesStatus = 
      statusFilter === "all" ? true :
      statusFilter === "active" ? plan.isActive === true :
      statusFilter === "inactive" ? plan.isActive === false :
      true;
      
    return matchesSearch && matchesStatus;
  });
  
  // Sort filtered plans
  const sortedPlans = [...filteredPlans].sort((a, b) => {
    if (sortBy === "date") {
      // Most recent plans first (sort by end date if available, otherwise plan ID)
      if (a.endOfPlan && b.endOfPlan) {
        return new Date(b.endOfPlan).getTime() - new Date(a.endOfPlan).getTime();
      }
      // Plans with end dates come before those without
      if (a.endOfPlan && !b.endOfPlan) return -1;
      if (!a.endOfPlan && b.endOfPlan) return 1;
      // If neither has end date, sort by ID (assuming higher ID is more recent)
      return b.id - a.id;
    }
    
    if (sortBy === "name") {
      // Sort alphabetically by plan code
      return (a.planCode || "").localeCompare(b.planCode || "");
    }
    
    if (sortBy === "status") {
      // Active plans first
      return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
    }
    
    return 0;
  });
  
  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
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
          
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">End Date</SelectItem>
              <SelectItem value="name">Plan Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Grid Layout */}
      {sortedPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPlans.map((plan) => (
            <BudgetPlanCard key={plan.id} plan={plan} clientId={clientId} />
          ))}
        </div>
      ) : (
        // Empty state
        <div className="text-center p-8 border border-dashed rounded-lg">
          <ListFilter className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No Plans Found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchQuery || statusFilter !== "all" 
              ? "Try adjusting your filters or search query"
              : "There are no budget plans created yet. Click on 'Create New Plan' to get started."}
          </p>
        </div>
      )}
    </div>
  );
}