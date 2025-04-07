import React from 'react';

interface PerformanceComparisonCardProps {
  currentValue: number;
  previousValue: number;
  label?: string;
}

export function PerformanceComparisonCard({
  currentValue,
  previousValue,
  label = 'month'
}: PerformanceComparisonCardProps) {
  // Calculate the difference and determine if it's positive or negative
  const difference = currentValue - previousValue;
  const isDifferenceFavorable = difference >= 0;
  
  return (
    <div className="flex space-x-1">
      <div className="border rounded-md text-center px-3 py-2">
        <div className="text-xs text-gray-500">this {label}</div>
        <div className="text-2xl font-semibold">{currentValue}</div>
      </div>
      
      <div className="border rounded-md text-center px-3 py-2">
        <div className="text-xs text-gray-500">prev {label}</div>
        <div className="text-2xl font-semibold">{previousValue}</div>
      </div>
      
      <div className={`border rounded-md text-center px-3 py-2 ${isDifferenceFavorable ? 'border-green-500' : 'border-red-500'}`}>
        <div className="text-xs text-gray-500">Difference</div>
        <div className={`text-2xl font-semibold ${isDifferenceFavorable ? 'text-green-500' : 'text-red-500'}`}>
          {isDifferenceFavorable ? '+' : ''}{difference}
        </div>
      </div>
    </div>
  );
}