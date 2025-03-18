import React, { useMemo } from 'react';
import { 
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { BudgetItem, BudgetSettings } from '@shared/schema';
import type { BubbleChartData } from '@/lib/agent/types';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { transformBudgetItemsToBubbleChart, getCategoryColor } from '@/lib/utils/chartDataUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BudgetBubbleTooltipProps {
  active?: boolean;
  payload?: Array<any>;
}

const BudgetBubbleTooltip = ({ active, payload }: BudgetBubbleTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-white p-2 border rounded shadow-sm">
      <p className="font-medium">{data.label}</p>
      <p className="text-sm text-gray-600">Category: {data.category}</p>
      <p className="text-sm">Allocated: ${data.value.toFixed(2)}</p>
      <p className="text-sm">Used: {data.percentUsed.toFixed(1)}%</p>
    </div>
  );
};

interface BudgetBubbleChartProps {
  clientId: number;
  onBubbleClick?: (bubbleData: BubbleChartData) => void;
  className?: string;
}

export function BudgetBubbleChart({ 
  clientId, 
  onBubbleClick,
  className
}: BudgetBubbleChartProps) {
  const { data: budgetItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/budget-items/client', clientId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/budget-items/client/${clientId}`);
      return response as BudgetItem[];
    },
    enabled: !!clientId // Only run query if clientId is valid
  });
  
  const { data: budgetSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/budget-settings/active', clientId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/budget-settings/active/${clientId}`);
      return response as BudgetSettings;
    },
    enabled: !!clientId // Only run query if clientId is valid
  });
  
  // Transform data for bubble chart
  const chartData = useMemo(() => {
    if (!budgetItems) return [];
    
    // We can continue even without budget settings
    return transformBudgetItemsToBubbleChart(budgetItems);
  }, [budgetItems]);
  
  // Group by category
  const categories = useMemo(() => {
    if (!chartData.length) return [];
    
    // Use Array.from instead of [...new Set()] for better compatibility
    const uniqueCategories = Array.from(new Set(chartData.map(item => item.category)));
    return uniqueCategories;
  }, [chartData]);
  
  const isLoading = isLoadingItems || isLoadingSettings;
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Budget Allocation</CardTitle>
        <CardDescription>
          Visualization of budget items by size and usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full h-[400px]" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-gray-500">
            No budget data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="category" 
                dataKey="category" 
                name="Category" 
                allowDuplicatedCategory={false} 
              />
              <YAxis 
                type="number" 
                dataKey="percentUsed" 
                name="Used (%)" 
                domain={[0, 100]} 
                label={{ value: 'Used (%)', angle: -90, position: 'insideLeft' }} 
              />
              <ZAxis 
                type="number" 
                dataKey="value" 
                range={[50, 500]} 
                name="Amount" 
              />
              <Tooltip content={<BudgetBubbleTooltip />} />
              <Legend />
              
              {categories.map(category => (
                <Scatter 
                  key={category}
                  name={category} 
                  data={chartData.filter(item => item.category === category)}
                  fill={getCategoryColor(category)}
                  onClick={onBubbleClick}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}