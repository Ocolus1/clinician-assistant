import React from 'react';
import { cn } from "@/lib/utils";

interface BudgetSpeedometerProps {
  actualPercentage: number;
  projectedPercentage: number;
  timeElapsedPercentage: number;
  size?: number;
}

/**
 * A clean circular progress ring for budget utilization
 * Shows actual spending percentage with a blue ring and projected spending with a red marker
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
  
  // SVG dimensions and calculations
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4; // Slightly smaller than half to leave room for the marker
  const strokeWidth = size * 0.05; // Width of the progress ring
  
  // Calculate the circumference of the circle
  const circumference = 2 * Math.PI * radius;
  
  // Calculate the progress arc length (how much of the circle to fill)
  const progressOffset = circumference - (normalizedActual / 100) * circumference;
  
  // Calculate the position of the projected marker
  const projectedAngle = (normalizedProjected / 100) * 360 - 90; // -90 to start from the top
  const projectedRad = projectedAngle * (Math.PI / 180);
  const projectedX = centerX + (radius * Math.cos(projectedRad));
  const projectedY = centerY + (radius * Math.sin(projectedRad));
  
  // Color settings
  const progressColor = "#3b82f6"; // Blue for actual spending
  const projectedColor = "#ef4444"; // Red for projected marker
  const backgroundCircleColor = "#e5e7eb"; // Light gray for background
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={backgroundCircleColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          transform={`rotate(-90 ${centerX} ${centerY})`} // Start from the top
        />
        
        {/* Projected marker */}
        <circle
          cx={projectedX}
          cy={projectedY}
          r={strokeWidth * 0.9}
          fill={projectedColor}
          stroke="#ffffff"
          strokeWidth={1}
        />
        
        {/* Projected marker line */}
        <line
          x1={centerX}
          y1={centerY}
          x2={projectedX}
          y2={projectedY}
          stroke={projectedColor}
          strokeWidth={1}
          strokeDasharray="2,2"
          opacity={0.5}
        />
      </svg>
      
      {/* Center percentage display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-gray-800">
          {normalizedActual.toFixed(0)}%
        </div>
        <div className="text-sm text-gray-500">Budget Used</div>
      </div>
      
      {/* Projected marker label - positioned directly on the line */}
      <div className="absolute" style={{ 
        left: projectedX,
        top: projectedY,
        transform: 'translate(3px, 3px)',
        backgroundColor: "white", 
        padding: "1px 3px", 
        borderRadius: "2px",
        border: `1px solid ${projectedColor}`,
        fontSize: "10px",
        color: projectedColor,
        fontWeight: "bold",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        zIndex: 10,
        whiteSpace: 'nowrap'
      }}>
        Projected {normalizedProjected.toFixed(0)}%
      </div>
    </div>
  );
}