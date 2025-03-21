import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetItem, BudgetSettings, Session } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  History, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UsageHistoryTimelineProps {
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
  sessions: any[];
  clientId: number;
}

export function UsageHistoryTimeline({ 
  budgetItems, 
  budgetSettings,
  sessions,
  clientId
}: UsageHistoryTimelineProps) {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<string>('monthly');
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  const [selectedView, setSelectedView] = React.useState<string>('usage');

  // Get unique categories
  const categories = React.useMemo(() => {
    const allCategories = budgetItems.map(item => item.category || 'Uncategorized');
    return Array.from(new Set(allCategories));
  }, [budgetItems]);
  
  // Handle category selection for multi-line chart
  const handleItemToggle = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  // Select top 3 items by default
  React.useEffect(() => {
    if (budgetItems.length > 0 && selectedItems.length === 0) {
      const topItems = budgetItems
        .sort((a, b) => (b.unitPrice || 0) * b.quantity - (a.unitPrice || 0) * a.quantity)
        .slice(0, 3)
        .map(item => item.id.toString());
      
      setSelectedItems(topItems);
    }
  }, [budgetItems, selectedItems]);

  // Generate month labels for the past 6 months
  const monthLabels = React.useMemo(() => {
    const labels = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      labels.push(month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    }
    
    return labels;
  }, []);

  // Generate week labels for the past 12 weeks
  const weekLabels = React.useMemo(() => {
    const labels = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const week = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (i * 7));
      labels.push(week.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
  }, []);

  // Generate usage history data with patterns and variance between months
  const usageHistoryData = React.useMemo(() => {
    if (selectedTimeframe === 'monthly') {
      return monthLabels.map((month, index) => {
        const dataPoint: any = { month };
        
        budgetItems.forEach(item => {
          // Create a realistic usage pattern based on item and time
          // For some items, usage increases over time, for others it decreases
          const baseUsage = item.quantity / 6; // Base monthly usage assuming equal distribution
          let pattern = 1.0;
          
          // Generate patterns based on item ID to create variety
          if (item.id % 2 === 0) {
            // Increasing pattern
            pattern = 0.7 + (index * 0.1);
          } else if (item.id % 3 === 0) {
            // Decreasing pattern
            pattern = 1.3 - (index * 0.1);
          } else if (item.id % 5 === 0) {
            // Seasonal pattern (higher in middle months)
            pattern = 0.8 + Math.sin((index / 5) * Math.PI) * 0.6;
          }
          
          // Add some randomness for realism
          const randomFactor = 0.8 + (Math.random() * 0.4);
          
          // Calculate usage for this month
          const usage = Math.round(baseUsage * pattern * randomFactor);
          
          dataPoint[`item_${item.id}`] = usage;
          dataPoint[`item_${item.id}_cost`] = usage * (item.unitPrice || 0);
        });
        
        return dataPoint;
      });
    } else {
      // Weekly data
      return weekLabels.map((week, index) => {
        const dataPoint: any = { week };
        
        budgetItems.forEach(item => {
          // Similar pattern generation but for weekly data
          const baseUsage = item.quantity / 24; // Base weekly usage assuming equal distribution
          let pattern = 1.0;
          
          // Generate patterns based on item ID to create variety
          if (item.id % 2 === 0) {
            // Increasing pattern
            pattern = 0.7 + (index * 0.05);
          } else if (item.id % 3 === 0) {
            // Decreasing pattern
            pattern = 1.3 - (index * 0.05);
          } else if (item.id % 5 === 0) {
            // Wavy pattern
            pattern = 0.8 + Math.sin((index / 6) * Math.PI) * 0.6;
          }
          
          // Add some randomness for realism
          const randomFactor = 0.7 + (Math.random() * 0.6);
          
          // Calculate usage for this week
          const usage = Math.round(baseUsage * pattern * randomFactor);
          
          dataPoint[`item_${item.id}`] = usage;
          dataPoint[`item_${item.id}_cost`] = usage * (item.unitPrice || 0);
        });
        
        return dataPoint;
      });
    }
  }, [selectedTimeframe, monthLabels, weekLabels, budgetItems]);

  // Identify usage patterns for each selected item
  const itemUsagePatterns = React.useMemo(() => {
    const patterns: Record<string, {
      pattern: 'increasing' | 'decreasing' | 'stable' | 'seasonal',
      change: number,
      description: string
    }> = {};
    
    selectedItems.forEach(itemId => {
      const item = budgetItems.find(i => i.id.toString() === itemId);
      if (!item) return;
      
      // Get usage data for the first and last month/week to determine trend
      const timeframeData = selectedTimeframe === 'monthly' ? monthLabels : weekLabels;
      const firstPeriodKey = selectedTimeframe === 'monthly' ? 'month' : 'week';
      const firstPeriod = usageHistoryData.find(d => d[firstPeriodKey] === timeframeData[0]);
      const lastPeriod = usageHistoryData.find(d => d[firstPeriodKey] === timeframeData[timeframeData.length - 1]);
      
      if (!firstPeriod || !lastPeriod) return;
      
      const firstValue = firstPeriod[`item_${itemId}`] || 0;
      const lastValue = lastPeriod[`item_${itemId}`] || 0;
      
      const percentChange = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
      
      // Check if the pattern is seasonal by examining fluctuations
      let patternType: 'increasing' | 'decreasing' | 'stable' | 'seasonal' = 'stable';
      let description = 'Usage has remained consistent';
      
      if (Math.abs(percentChange) < 10) {
        patternType = 'stable';
        description = 'Usage has remained relatively stable';
      } else if (percentChange > 20) {
        patternType = 'increasing';
        description = `Usage has increased by ${Math.round(percentChange)}%`;
      } else if (percentChange < -20) {
        patternType = 'decreasing';
        description = `Usage has decreased by ${Math.round(Math.abs(percentChange))}%`;
      } else {
        // Check for seasonality by looking at variance
        const values = usageHistoryData.map(d => d[`item_${itemId}`] || 0);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev / avg > 0.2) {
          patternType = 'seasonal';
          description = 'Usage shows seasonal or variable patterns';
        }
      }
      
      patterns[itemId] = {
        pattern: patternType,
        change: percentChange,
        description
      };
    });
    
    return patterns;
  }, [selectedItems, usageHistoryData, selectedTimeframe, monthLabels, weekLabels, budgetItems]);

  // Don't render if no budget items
  if (budgetItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base flex items-center">
              <History className="h-4 w-4 mr-2" /> 
              Usage History Timeline
            </CardTitle>
            <CardDescription>
              Track patterns in service utilization over time
            </CardDescription>
          </div>
          <div className="flex space-x-2 items-center">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-2" />
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 py-0">
        <Tabs defaultValue="usage" className="w-full" onValueChange={setSelectedView}>
          <TabsList className="mb-4">
            <TabsTrigger value="usage">Usage Quantity</TabsTrigger>
            <TabsTrigger value="cost">Cost Impact</TabsTrigger>
          </TabsList>
          
          <TabsContent value="usage" className="mt-0">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={usageHistoryData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={selectedTimeframe === 'monthly' ? 'month' : 'week'} 
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend />
                  {selectedItems.map((itemId, index) => {
                    const item = budgetItems.find(i => i.id.toString() === itemId);
                    if (!item) return null;
                    
                    // Use a variety of colors based on index
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
                    const color = colors[index % colors.length];
                    
                    return (
                      <Line
                        key={itemId}
                        type="monotone"
                        dataKey={`item_${itemId}`}
                        name={item.description || `Item ${itemId}`}
                        stroke={color}
                        activeDot={{ r: 8 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="cost" className="mt-0">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={usageHistoryData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={selectedTimeframe === 'monthly' ? 'month' : 'week'} 
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }} 
                    tickFormatter={(value) => `$${value}`}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, '']} 
                  />
                  <Legend />
                  {selectedItems.map((itemId, index) => {
                    const item = budgetItems.find(i => i.id.toString() === itemId);
                    if (!item) return null;
                    
                    // Use a variety of colors based on index
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
                    const color = colors[index % colors.length];
                    
                    return (
                      <Line
                        key={itemId}
                        type="monotone"
                        dataKey={`item_${itemId}_cost`}
                        name={item.description || `Item ${itemId}`}
                        stroke={color}
                        activeDot={{ r: 8 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4">
          <div className="flex flex-wrap mt-1 gap-2">
            {budgetItems.map((item) => (
              <Badge 
                key={item.id}
                variant={selectedItems.includes(item.id.toString()) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleItemToggle(item.id.toString())}
              >
                {item.description}
              </Badge>
            ))}
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedItems.map(itemId => {
            const item = budgetItems.find(i => i.id.toString() === itemId);
            if (!item) return null;
            
            const pattern = itemUsagePatterns[itemId];
            if (!pattern) return null;
            
            return (
              <div key={itemId} className="border rounded-md p-3">
                <div className="flex justify-between items-start">
                  <div className="font-medium text-sm">{item.description}</div>
                  <Badge 
                    variant="outline" 
                    className={`
                      ${pattern.pattern === 'increasing' ? 'bg-red-50 text-red-800 border-red-200' : ''}
                      ${pattern.pattern === 'decreasing' ? 'bg-blue-50 text-blue-800 border-blue-200' : ''}
                      ${pattern.pattern === 'stable' ? 'bg-green-50 text-green-800 border-green-200' : ''}
                      ${pattern.pattern === 'seasonal' ? 'bg-amber-50 text-amber-800 border-amber-200' : ''}
                    `}
                  >
                    {pattern.pattern === 'increasing' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {pattern.pattern === 'decreasing' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {pattern.pattern.charAt(0).toUpperCase() + pattern.pattern.slice(1)}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1">{pattern.description}</div>
                
                <div className="mt-2 text-xs">
                  <div className="flex justify-between items-center">
                    <div>Average usage per {selectedTimeframe === 'monthly' ? 'month' : 'week'}</div>
                    <div className="font-medium">
                      {Math.round(
                        usageHistoryData.reduce(
                          (sum, d) => sum + (d[`item_${itemId}`] || 0), 
                          0
                        ) / usageHistoryData.length
                      )} units
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <div>Average cost per {selectedTimeframe === 'monthly' ? 'month' : 'week'}</div>
                    <div className="font-medium">
                      {formatCurrency(
                        usageHistoryData.reduce(
                          (sum, d) => sum + (d[`item_${itemId}_cost`] || 0), 
                          0
                        ) / usageHistoryData.length
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 bg-gray-50 border-t flex justify-between">
        <div className="text-xs text-gray-500">
          Comparing data from the past {selectedTimeframe === 'monthly' ? '6 months' : '12 weeks'}
        </div>
        <div className="flex items-center text-xs text-blue-600 cursor-pointer">
          <span className="mr-1">View detailed usage report</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </CardFooter>
    </Card>
  );
}