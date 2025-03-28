import React from "react";

interface NumericRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

/**
 * A component that visualizes ratings from 0-10 with numbered circles
 */
export function NumericRating({ value, onChange, label, description }: NumericRatingProps) {
  // Get appropriate color based on the rating value
  const getColorClass = (circleValue: number) => {
    const isSelected = circleValue === value;
    
    // Only apply color to the selected number
    if (isSelected) {
      if (value >= 8) return "bg-green-500 text-white";
      if (value >= 5) return "bg-blue-500 text-white";
      if (value >= 3) return "bg-yellow-500 text-white";
      return "bg-red-500 text-white";
    }
    
    return "bg-slate-100 text-slate-600 hover:bg-slate-200";
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <div>
          <div className="font-medium">{label}</div>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
        <div className="font-medium">
          <span className={`inline-block h-6 w-6 rounded-full mr-2 text-center ${getColorClass(value)}`}>
            {value}
          </span>
          <span>/10</span>
        </div>
      </div>
      
      <div className="flex justify-between gap-1 mt-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors ${getColorClass(i)}`}
          >
            {i}
          </button>
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}