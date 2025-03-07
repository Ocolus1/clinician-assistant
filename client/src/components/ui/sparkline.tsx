
import React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = "#3A86FF",
  className,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className={`w-${width} h-${height} bg-gray-100 rounded ${className}`} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero

  // Calculate points for the polyline
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      // Invert the y coordinate (SVG y-axis is inverted)
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Add a dot for the last value */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="2"
        fill={color}
      />
    </svg>
  );
}
import React from 'react';

interface SparklineProps {
  data: number[];
  height?: number;
  width?: number;
  lineColor?: string;
  fillColor?: string;
  className?: string;
}

export function Sparkline({
  data,
  height = 40,
  width = 100,
  lineColor = "#3A86FF",
  fillColor = "rgba(58, 134, 255, 0.2)",
  className = "",
}: SparklineProps) {
  if (!data || data.length === 0) {
    return <div className={`h-${height} w-${width} bg-gray-100 ${className}`} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  // Calculate points for the polyline
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  // Calculate points for the polygon (fill area)
  const fillPoints = [
    `0,${height}`,
    ...data.map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }),
    `${width},${height}`
  ].join(' ');

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      width={width} 
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
      <polygon 
        points={fillPoints} 
        fill={fillColor} 
      />
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
      />
    </svg>
  );
}
