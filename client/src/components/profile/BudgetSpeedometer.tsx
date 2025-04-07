import React from 'react';
import { cn } from "@/lib/utils";

interface BudgetSpeedometerProps {
  actualPercentage: number;
  projectedPercentage: number;
  timeElapsedPercentage: number;
  size?: number;
}

/**
 * A dashboard-style gauge visualization for budget utilization
 * Shows actual spending with color-coded zones in a clean, minimal design
 */
export function BudgetSpeedometer({
  actualPercentage,
  projectedPercentage,
  timeElapsedPercentage,
  size = 200
}: BudgetSpeedometerProps) {
  // Normalize percentages to ensure they are between 0-100
  const normalizedActual = Math.min(100, Math.max(0, actualPercentage));
  
  // SVG dimensions and calculations
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.38; // Slightly smaller than half
  
  // Convert percentages to angles
  // 0% = -150°, 100% = 150° (300° range)
  const startAngle = -150;
  const endAngle = 150;
  const angleRange = endAngle - startAngle;
  
  const actualAngle = startAngle + (angleRange * normalizedActual / 100);
  
  // Calculate needle coordinates using trig
  const needleEndX = centerX + radius * Math.cos(actualAngle * Math.PI / 180);
  const needleEndY = centerY + radius * Math.sin(actualAngle * Math.PI / 180);
  
  // Arc path for the gauge background
  const generateArcPath = (radius: number, startAngle: number, endAngle: number) => {
    const startRad = startAngle * Math.PI / 180;
    const endRad = endAngle * Math.PI / 180;
    
    const startX = centerX + radius * Math.cos(startRad);
    const startY = centerY + radius * Math.sin(startRad);
    const endX = centerX + radius * Math.cos(endRad);
    const endY = centerY + radius * Math.sin(endRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };
  
  // Determine needle color based on percentage
  const getNeedleColor = (percentage: number) => {
    if (percentage < 60) return "#22c55e"; // Green
    if (percentage < 85) return "#eab308"; // Yellow
    return "#ef4444"; // Red
  };
  
  const needleColor = getNeedleColor(normalizedActual);
  
  // Generate colored segments for the gauge
  const segments = [
    { start: 0, end: 60, color: "#22c55e" },    // Green (0-60%)
    { start: 60, end: 85, color: "#eab308" },   // Yellow (60-85%)
    { start: 85, end: 100, color: "#ef4444" }   // Red (85-100%)
  ];
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc segments */}
        {segments.map((segment, i) => {
          const segStartAngle = startAngle + (angleRange * segment.start / 100);
          const segEndAngle = startAngle + (angleRange * segment.end / 100);
          
          return (
            <path
              key={i}
              d={generateArcPath(radius, segStartAngle, segEndAngle)}
              stroke={segment.color}
              strokeWidth={12}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
        
        {/* Tick marks for 0, 50, and 100 */}
        {[0, 50, 100].map((percentage) => {
          const angle = startAngle + (angleRange * percentage / 100);
          const innerRadius = radius - 15;
          const outerRadius = radius + 5;
          
          const innerX = centerX + innerRadius * Math.cos(angle * Math.PI / 180);
          const innerY = centerY + innerRadius * Math.sin(angle * Math.PI / 180);
          const outerX = centerX + outerRadius * Math.cos(angle * Math.PI / 180);
          const outerY = centerY + outerRadius * Math.sin(angle * Math.PI / 180);
          
          return (
            <line
              key={percentage}
              x1={innerX}
              y1={innerY}
              x2={outerX}
              y2={outerY}
              stroke="#374151"
              strokeWidth={2}
            />
          );
        })}
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleEndX}
          y2={needleEndY}
          stroke={needleColor}
          strokeWidth={4}
          strokeLinecap="round"
        />
        
        {/* Center of the gauge */}
        <circle
          cx={centerX}
          cy={centerY}
          r={10}
          fill={needleColor}
          stroke="#ffffff"
          strokeWidth={2}
        />
      </svg>
      
      {/* Center percentage display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-3xl font-bold" style={{ color: needleColor }}>
          {normalizedActual.toFixed(0)}%
        </div>
      </div>
      
      {/* Text below the gauge */}
      <div className="text-center mt-2">
        <div className="text-sm text-gray-500">
          {projectedPercentage > 100 ? (
            <span className="font-medium text-red-600">Projected: {Math.min(999, projectedPercentage).toFixed(0)}%</span>
          ) : (
            <span>Projected: {projectedPercentage.toFixed(0)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}