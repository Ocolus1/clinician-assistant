import React from 'react';

interface SparklineProps {
  data: number[];
  height?: number;
  width?: number;
  color?: string;
  strokeWidth?: number;
}

export function Sparkline({
  data,
  height = 30,
  width = 100,
  color = "#3A86FF",
  strokeWidth = 1.5
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  const values = data.map(v => Number(v));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Create points for the sparkline
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}