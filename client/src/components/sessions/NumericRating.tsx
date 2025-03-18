import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NumericRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  min?: number;
  max?: number;
}

/**
 * A compact numeric rating component with clickable buttons from 1-10
 * Displays a single row of circular numbers with color coding
 * Red: 1-3, Amber: 4-6, Green: 7-10
 */
export function NumericRating({
  value,
  onChange,
  label,
  description,
  min = 0,
  max = 10
}: NumericRatingProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  
  // Generate numbers array between min and max
  const numbers = React.useMemo(() => {
    return Array.from({ length: max - min + 1 }, (_, i) => i + min);
  }, [min, max]);

  // Determine appropriate color for a rating value
  const getColorClass = (num: number): string => {
    if (num <= 3) return "bg-red-100 hover:bg-red-200 text-red-800 border-red-300";
    if (num <= 6) return "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300";
    return "bg-green-100 hover:bg-green-200 text-green-800 border-green-300";
  };
  
  // Get appearance class for selected/hovered state
  const getAppearanceClass = (num: number): string => {
    const isSelected = num === value;
    const isHovered = num === hoveredValue;
    
    if (isSelected) {
      return cn(
        getColorClass(num),
        "border-2 shadow-sm font-bold"
      );
    }
    
    if (isHovered) {
      return cn(
        getColorClass(num),
        "border shadow-sm"
      );
    }
    
    return "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent";
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground/70 mt-0.5">{description}</span>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {numbers.map(num => (
          <button
            key={num}
            type="button"
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-full text-xs transition-colors",
              getAppearanceClass(num)
            )}
            onClick={() => onChange(num)}
            onMouseEnter={() => setHoveredValue(num)}
            onMouseLeave={() => setHoveredValue(null)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}