import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { BudgetItemDetail } from "./BudgetPlanFullView";

interface BudgetUsageChartProps {
  budgetItems: BudgetItemDetail[];
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-md shadow-sm">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-green-600">
          Allocated: ${payload[0].value.toFixed(2)}
        </p>
        <p className="text-xs text-red-600">
          Used: ${payload[1].value.toFixed(2)}
        </p>
        <p className="text-xs text-blue-600">
          Remaining: ${payload[2].value.toFixed(2)}
        </p>
      </div>
    );
  }

  return null;
};

export function BudgetUsageChart({ budgetItems }: BudgetUsageChartProps) {
  // Prepare data for the chart
  // Group items by category
  const categorizedData = budgetItems.reduce((acc: Record<string, any>, item) => {
    const category = item.category || "Uncategorized";
    
    if (!acc[category]) {
      acc[category] = {
        name: category,
        allocated: 0,
        used: 0,
        remaining: 0
      };
    }
    
    acc[category].allocated += item.totalPrice;
    acc[category].used += item.usedAmount;
    acc[category].remaining += item.remainingAmount;
    
    return acc;
  }, {});
  
  // Convert to array format
  const chartData = Object.values(categorizedData);
  
  // If there are too many categories, limit to top 5 by allocated amount
  let processedData = chartData;
  if (chartData.length > 5) {
    processedData = [...chartData]
      .sort((a: any, b: any) => b.allocated - a.allocated)
      .slice(0, 5);
  }
  
  return (
    <div className="w-full">
      <h4 className="text-sm font-medium mb-2">Usage by Category</h4>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              fontSize={12}
              tickFormatter={(value) => 
                value.length > 10 ? `${value.substring(0, 10)}...` : value
              }
            />
            <YAxis tickFormatter={(value) => `$${value}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="allocated" name="Allocated" fill="#4ade80" />
            <Bar dataKey="used" name="Used" fill="#f87171" />
            <Bar dataKey="remaining" name="Remaining" fill="#60a5fa" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}