import React from 'react';

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
 * - Used segments are colored differently than balance segments
 * - This creates a clear visual distinction between used and available units
 */
export function BudgetDonutChart({
  total,
  used,
  size = 80,
  strokeWidth = 10,
  colors = {
    total: '#3B82F6', // Blue for available balance
    used: '#D1D5DB', // Light gray for used portion
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-medium">0/0</span>
          <span className="text-[10px] text-gray-500">units</span>
        </div>
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
    
    // Calculate start and end points of the arc
    const startX = center + radius * Math.cos(startAngle - Math.PI/2);
    const startY = center + radius * Math.sin(startAngle - Math.PI/2);
    const endX = center + radius * Math.cos(endAngle - Math.PI/2);
    const endY = center + radius * Math.sin(endAngle - Math.PI/2);
    
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
      
      {/* Center text displaying used/total */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-medium">{used}/{total}</span>
        <span className="text-[10px] text-gray-500">units</span>
      </div>
    </div>
  );
}