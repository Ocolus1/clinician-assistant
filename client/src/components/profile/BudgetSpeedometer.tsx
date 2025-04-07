import React from 'react';
import { cn } from "@/lib/utils";

interface BudgetSpeedometerProps {
  actualPercentage: number;
  projectedPercentage: number;
  timeElapsedPercentage: number;
  size?: number;
}

/**
 * A speedometer-style visualization for budget utilization
 * Shows actual spending vs projected spending with color-coded zones
 */
export function BudgetSpeedometer({
  actualPercentage,
  projectedPercentage,
  timeElapsedPercentage,
  size = 200
}: BudgetSpeedometerProps) {
  // Normalize percentages to ensure they are between 0-100
  const normalizedActual = Math.min(100, Math.max(0, actualPercentage));
  const normalizedProjected = Math.min(100, Math.max(0, projectedPercentage));
  
  // Calculate the variance (gap) between actual and projected
  const variance = projectedPercentage - actualPercentage;
  const varianceText = variance >= 0 
    ? `${Math.abs(variance).toFixed(0)}% below target` 
    : `${Math.abs(variance).toFixed(0)}% over target`;

  // Determine colors for different states
  const needleColor = "#3b82f6"; // Blue for the needle
  const projectedMarkerColor = "#ef4444"; // Red for projected marker
  
  // SVG dimensions and calculations
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4; // Slightly smaller than half to fit markers
  
  // Convert percentages to angles
  // 0% = -135°, 100% = 135° (270° range)
  const startAngle = -135;
  const endAngle = 135;
  const angleRange = endAngle - startAngle;
  
  const actualAngle = startAngle + (angleRange * normalizedActual / 100);
  const projectedAngle = startAngle + (angleRange * normalizedProjected / 100);
  const idealAngle = startAngle + (angleRange * timeElapsedPercentage / 100);
  
  // Calculate needle and marker coordinates using trig
  const needleEndX = centerX + radius * Math.cos(actualAngle * Math.PI / 180);
  const needleEndY = centerY + radius * Math.sin(actualAngle * Math.PI / 180);
  
  const projectedMarkerX = centerX + radius * Math.cos(projectedAngle * Math.PI / 180);
  const projectedMarkerY = centerY + radius * Math.sin(projectedAngle * Math.PI / 180);

  const idealMarkerX = centerX + radius * Math.cos(idealAngle * Math.PI / 180);
  const idealMarkerY = centerY + radius * Math.sin(idealAngle * Math.PI / 180);
  
  // Define gradient stops for the gauge
  const gradientStops = [
    { offset: "0%", color: "#22c55e" },     // Green
    { offset: "50%", color: "#eab308" },    // Yellow
    { offset: "100%", color: "#ef4444" }    // Red
  ];
  
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
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Gradient definition */}
        <defs>
          <linearGradient id="speedometerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, index) => (
              <stop key={index} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        
        {/* Gauge background */}
        <path
          d={generateArcPath(radius, startAngle, endAngle)}
          stroke="url(#speedometerGradient)"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Tic marks */}
        {[0, 25, 50, 75, 100].map((percentage) => {
          const angle = startAngle + (angleRange * percentage / 100);
          const innerRadius = radius - 12;
          const outerRadius = radius + 2;
          
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
        
        {/* Percentage labels */}
        {[0, 25, 50, 75, 100].map((percentage) => {
          const angle = startAngle + (angleRange * percentage / 100);
          const labelRadius = radius + 15;
          
          const labelX = centerX + labelRadius * Math.cos(angle * Math.PI / 180);
          const labelY = centerY + labelRadius * Math.sin(angle * Math.PI / 180);
          
          return (
            <text
              key={percentage}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {percentage}%
            </text>
          );
        })}
        
        {/* Ideal position marker (time elapsed) */}
        <circle
          cx={idealMarkerX}
          cy={idealMarkerY}
          r={4}
          fill="#6b7280"
          stroke="#ffffff"
          strokeWidth={1}
        />
        <line
          x1={idealMarkerX}
          y1={idealMarkerY}
          x2={centerX}
          y2={centerY}
          stroke="#6b7280"
          strokeWidth={1}
          strokeDasharray="2,2"
        />
        
        {/* Projected marker */}
        <circle
          cx={projectedMarkerX}
          cy={projectedMarkerY}
          r={5}
          fill={projectedMarkerColor}
          stroke="#ffffff"
          strokeWidth={1}
        />
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleEndX}
          y2={needleEndY}
          stroke={needleColor}
          strokeWidth={3}
          strokeLinecap="round"
        />
        
        {/* Center of the gauge */}
        <circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill={needleColor}
          stroke="#ffffff"
          strokeWidth={2}
        />
      </svg>
      
      {/* Overlay text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center mt-4">
          <div className="text-3xl font-bold text-blue-600">{normalizedActual.toFixed(0)}%</div>
          <div className="text-sm text-gray-500">Current</div>
          
          <div className="text-lg font-semibold text-red-600 mt-1">{normalizedProjected.toFixed(0)}%</div>
          <div className="text-xs text-gray-500">Projected</div>
          
          <div className="mt-2 text-red-600 font-bold text-sm">{varianceText}</div>
        </div>
      </div>
    </div>
  );
}