import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
  TooltipProps,
} from "recharts";
import { BudgetItem, BudgetSettings } from "@shared/schema";
import { 
  calculateBudgetItemUtilization, 
  calculateRemainingFunds, 
  calculateSpentFromSessions,
  calculateUtilizationFromNotes,
  fetchSessionNotesWithProducts
} from "@/lib/utils/budgetUtils";

// Interface for enhanced budget item with utilization data
interface EnhancedBudgetItem extends BudgetItem {
  used: number;
  remaining: number;
  utilizationRate: number;
  totalCost: number;
  usedCost: number;
  remainingCost: number;
  isOverutilized: boolean;
  isUnderutilized: boolean;
  status: 'normal' | 'warning' | 'critical';
  usagePattern: 'accelerating' | 'decelerating' | 'steady' | 'fluctuating';
}

interface BudgetItemUtilizationProps {
  clientId: number;
}

export function BudgetItemUtilization({ clientId }: BudgetItemUtilizationProps) {
  const [sortField, setSortField] = useState<'name' | 'utilizationRate' | 'category'>('utilizationRate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedView, setSelectedView] = useState<'grid' | 'chart'>('grid');
  const [filter, setFilter] = useState<'all' | 'overutilized' | 'underutilized' | 'normal'>('all');

  // Fetch budget items and budget settings
  const { data: budgetItems = [], isLoading: isLoadingItems } = useQuery<BudgetItem[]>({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    enabled: !!clientId,
  });

  const { data: budgetSettings, isLoading: isLoadingSettings } = useQuery<BudgetSettings>({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    enabled: !!clientId,
  });

  // Fetch sessions as backup method
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<any[]>({
    queryKey: ['/api/clients', clientId, 'sessions'],
    enabled: !!clientId,
  });
  
  // Fetch session notes directly to get product data - more reliable approach
  const { data: sessionNotes = [], isLoading: isLoadingNotes } = useQuery<any[]>({
    queryKey: ['/api/clients', clientId, 'session-notes-with-products'],
    enabled: !!clientId,
  });

  // Process budget items to add utilization data based on actual session products
  const enhancedBudgetItems: EnhancedBudgetItem[] = React.useMemo(() => {
    // If still loading or no budget items, return empty array
    if (isLoadingItems || isLoadingSettings || isLoadingNotes || !budgetItems) {
      return [];
    }

    // Only use active plan items
    const activePlanItems = budgetItems.filter(item => 
      // If there's an isActivePlan property, use that, otherwise assume all are active
      (item as any).isActivePlan !== false
    );

    console.log("Calculating utilization from session notes...");
    console.log(`Found ${sessionNotes.length} session notes with products`);
    
    // Try the new direct session notes approach first (more reliable)
    if (sessionNotes && sessionNotes.length > 0) {
      console.log("Using direct session notes for budget calculation (preferred method)");
      const enhancedItems = calculateUtilizationFromNotes(activePlanItems, sessionNotes as any[]);
      console.log("Enhanced budget items with utilization from notes:", enhancedItems.length);
      return enhancedItems;
    }
    
    // Fallback to the original method if direct session notes aren't available
    console.log("Falling back to session data for budget calculation");
    console.log(`Found ${sessions.length} sessions`);
    
    const enhancedItems = calculateBudgetItemUtilization(activePlanItems, sessions as any[]);
    console.log("Enhanced budget items with utilization from sessions:", enhancedItems.length);
    
    return enhancedItems;
  }, [budgetItems, budgetSettings, sessions, sessionNotes, isLoadingItems, isLoadingSettings, isLoadingNotes]);

  // Filter items based on selected filter
  const filteredItems = React.useMemo(() => {
    if (filter === 'all') return enhancedBudgetItems;
    if (filter === 'overutilized') return enhancedBudgetItems.filter(item => item.isOverutilized);
    if (filter === 'underutilized') return enhancedBudgetItems.filter(item => item.isUnderutilized);
    if (filter === 'normal') return enhancedBudgetItems.filter(item => !item.isOverutilized && !item.isUnderutilized);
    return enhancedBudgetItems;
  }, [enhancedBudgetItems, filter]);

  // Sort items based on selected sort field and direction
  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let compareValue = 0;
      
      if (sortField === 'name') {
        compareValue = (a.description || '').localeCompare(b.description || '');
      } else if (sortField === 'category') {
        compareValue = (a.category || '').localeCompare(b.category || '');
      } else if (sortField === 'utilizationRate') {
        compareValue = a.utilizationRate - b.utilizationRate;
      }
      
      return sortDirection === 'asc' ? compareValue : -compareValue;
    });
  }, [filteredItems, sortField, sortDirection]);

  // Calculate overall budget metrics
  const totalBudget = budgetSettings?.ndisFunds !== null && budgetSettings?.ndisFunds !== undefined 
    ? Number(budgetSettings.ndisFunds) 
    : 0;
  const totalAllocated = enhancedBudgetItems.reduce((sum, item) => sum + item.totalCost, 0);
  const totalUsed = enhancedBudgetItems.reduce((sum, item) => sum + item.usedCost, 0);
  const totalRemaining = Math.max(0, totalBudget - totalUsed);
  const overallUtilizationRate = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;

  // Calculate days until plan expiration
  const daysUntilExpiration = React.useMemo(() => {
    if (!budgetSettings?.endOfPlan) return 365; // Default to a year if no end date
    
    const endDate = new Date(budgetSettings.endOfPlan);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [budgetSettings]);

  // Don't render if still loading or no budget items
  if (isLoadingItems || isLoadingSettings || isLoadingSessions || isLoadingNotes || !budgetItems || budgetItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Item Utilization</CardTitle>
          <CardDescription>Loading budget data...</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base">Budget Item Utilization</CardTitle>
            <CardDescription>Track service usage from the active plan</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Badge 
              variant={filter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/90 transition-colors"
              onClick={() => setFilter('all')}
            >
              All
            </Badge>
            <Badge 
              variant={filter === 'overutilized' ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/90 transition-colors bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-200"
              onClick={() => setFilter('overutilized')}
            >
              High Usage
            </Badge>
            <Badge 
              variant={filter === 'underutilized' ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/90 transition-colors bg-blue-100 text-blue-900 hover:bg-blue-200 border-blue-200"
              onClick={() => setFilter('underutilized')}
            >
              Low Usage
            </Badge>
          </div>
        </div>
        
        {/* Overall budget metrics */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="text-xs text-gray-500">Total Budget</div>
            <div className="font-bold text-xl">{formatCurrency(totalBudget)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="text-xs text-gray-500">Used Amount</div>
            <div className="font-bold text-xl">{formatCurrency(totalUsed)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="text-xs text-gray-500">Remaining</div>
            <div className="font-bold text-xl">{formatCurrency(totalRemaining)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="text-xs text-gray-500">Plan Expiration</div>
            <div className="font-bold text-xl">{daysUntilExpiration} days</div>
          </div>
        </div>
        
        {/* Overall progress */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-medium">Overall Fund Utilization</div>
            <div className="text-sm font-medium">{overallUtilizationRate.toFixed(1)}%</div>
          </div>
          <Progress 
            value={overallUtilizationRate} 
            className="h-2" 
            indicatorClassName={overallUtilizationRate > 85 ? "bg-red-500" : overallUtilizationRate > 70 ? "bg-amber-500" : "bg-green-500"}
          />
        </div>
      </CardHeader>

      <CardContent className="px-4 py-0">
        <Tabs defaultValue="grid" className="w-full" onValueChange={(v) => setSelectedView(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid" className="mt-0">
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th 
                      className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortField === 'name') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('name');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Service Item {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortField === 'category') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('category');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Used / Total
                    </th>
                    <th 
                      className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortField === 'utilizationRate') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('utilizationRate');
                          setSortDirection('desc');
                        }
                      }}
                    >
                      Utilization {sortField === 'utilizationRate' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2 border-b">
                        <div className="font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-gray-500">
                          {item.itemCode}
                        </div>
                      </td>
                      <td className="p-2 border-b">
                        <Badge variant="secondary" className="font-normal">
                          {item.category || 'Uncategorized'}
                        </Badge>
                      </td>
                      <td className="p-2 border-b">
                        <div className="flex items-center">
                          <div className="mr-2 text-sm">
                            <span className="font-medium">{item.used}</span>
                            <span className="text-gray-500">/{item.quantity}</span>
                          </div>
                          {item.usagePattern === 'accelerating' && <TrendingUp className="h-4 w-4 text-red-500" />}
                          {item.usagePattern === 'decelerating' && <TrendingDown className="h-4 w-4 text-green-500" />}
                        </div>
                      </td>
                      <td className="p-2 border-b">
                        <div className="w-full">
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-xs">{(item.utilizationRate * 100).toFixed(0)}%</div>
                          </div>
                          <Progress 
                            value={item.utilizationRate * 100} 
                            className="h-1.5" 
                            indicatorClassName={
                              item.utilizationRate > 0.85 ? "bg-red-500" : 
                              item.utilizationRate > 0.7 ? "bg-amber-500" : 
                              item.utilizationRate < 0.3 ? "bg-blue-500" : 
                              "bg-green-500"
                            }
                          />
                        </div>
                      </td>
                      <td className="p-2 border-b">
                        <div>
                          <div className="text-sm">
                            <span className="font-medium">{formatCurrency(item.usedCost)}</span>
                            <span className="text-gray-500"> of {formatCurrency(item.totalCost)}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(item.remainingCost)} remaining
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          <TabsContent value="chart" className="mt-0">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sortedItems.map(item => ({
                    name: item.description,
                    utilized: item.utilizationRate * 100,
                    remaining: 100 - (item.utilizationRate * 100),
                    category: item.category,
                    id: item.id,
                    totalCost: item.totalCost,
                    usedCost: item.usedCost,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-bold">{data.name}</p>
                            <p className="text-sm">{data.category || 'Uncategorized'}</p>
                            <p className="text-sm">Utilized: {data.utilized.toFixed(1)}%</p>
                            <p className="text-sm">{formatCurrency(data.usedCost)} of {formatCurrency(data.totalCost)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="utilized" stackId="a" name="Utilized">
                    {sortedItems.map((item, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          item.utilizationRate > 0.85 ? "#ef4444" : 
                          item.utilizationRate > 0.7 ? "#f59e0b" : 
                          item.utilizationRate < 0.3 ? "#3b82f6" : 
                          "#10b981"
                        } 
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="remaining" stackId="a" name="Remaining" fill="#e5e7eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="p-4 bg-gray-50 border-t flex justify-between">
        <div className="text-xs text-gray-500">
          Data from active budget plan • Last updated: {new Date().toLocaleDateString()}
        </div>
        <div className="flex space-x-4">
          <div className="flex items-center text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
            <span>On Track</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>
            <span>Attention</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
            <span>Underutilized</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}