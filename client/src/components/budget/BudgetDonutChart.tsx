import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetDonutChartProps {
  total: number;
  used: number;
  size?: number;
  strokeWidth?: number;
  colors?: {
    total: string;
    used: string;
    background: string;
  };
}

/**
 * A donut chart component for visualizing budget item usage
 * Shows total allocation and used amount in a circular format
 * 
 * This visualization uses a segmented approach where:
 * - The donut is divided into equal segments based on the total quantity
 * - Used segments are colored blue, balance segments are gray
 * - Hovering shows detailed information about total/used/balance
 */
export function BudgetDonutChart({
  total,
  used,
  size = 80,
  strokeWidth = 10,
  colors = {
    used: '#3B82F6', // Blue for used portion
    total: '#D1D5DB', // Light gray for balance
    background: '#F3F4F6' // Very light gray for background
  }
}: BudgetDonutChartProps) {
  // Calculate derived values
  const balance = Math.max(0, total - used);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  
  // Don't render donut if total is 0
  if (total <= 0) {
    return (
      <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.background}
            strokeWidth={strokeWidth}
          />
        </svg>
      </div>
    );
  }
  
  // Create segments for the donut chart
  // Each segment is the same size, but colored differently based on whether it's used or balance
  const segments = [];
  const segmentAngle = 360 / total; // Angle per unit in degrees
  const segmentRadians = (Math.PI * 2) / total; // Angle per unit in radians
  
  // Calculate the arc path for each segment
  for (let i = 0; i < total; i++) {
    const isUsed = i < used;
    const startAngle = i * segmentRadians;
    const endAngle = (i + 0.95) * segmentRadians; // 0.95 to create small gap between segments
    
    // Create SVG arc path
    // Calculate if this arc is more than half the circle (large-arc-flag)
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    
    // Create the SVG path
    const pathData = [
      `M ${center + (radius - strokeWidth/2) * Math.cos(startAngle - Math.PI/2)} ${center + (radius - strokeWidth/2) * Math.sin(startAngle - Math.PI/2)}`,
      `A ${radius - strokeWidth/2} ${radius - strokeWidth/2} 0 ${largeArcFlag} 1 ${center + (radius - strokeWidth/2) * Math.cos(endAngle - Math.PI/2)} ${center + (radius - strokeWidth/2) * Math.sin(endAngle - Math.PI/2)}`,
      `L ${center + (radius + strokeWidth/2) * Math.cos(endAngle - Math.PI/2)} ${center + (radius + strokeWidth/2) * Math.sin(endAngle - Math.PI/2)}`,
      `A ${radius + strokeWidth/2} ${radius + strokeWidth/2} 0 ${largeArcFlag} 0 ${center + (radius + strokeWidth/2) * Math.cos(startAngle - Math.PI/2)} ${center + (radius + strokeWidth/2) * Math.sin(startAngle - Math.PI/2)}`,
      'Z'
    ].join(' ');
    
    segments.push(
      <path 
        key={i}
        d={pathData}
        fill={isUsed ? colors.used : colors.total}
      />
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="relative" style={{ width: size, height: size }}>
            {/* Background circle */}
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute">
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={colors.background}
                strokeWidth={strokeWidth}
              />
            </svg>
            
            {/* Segmented donut */}
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute">
              {segments}
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-2">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold">Total:</span>
              <span>{total} units</span>
            </div>
            <div className="flex justify-between gap-4">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="font-semibold">Used:</span>
              </div>
              <span>{used} units</span>
            </div>
            <div className="flex justify-between gap-4">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                <span className="font-semibold">Balance:</span>
              </div>
              <span>{balance} units</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}