import React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
  min = 1,
  max = 10
}: NumericRatingProps) {
  // Generate a badge color class based on value
  const getBadgeClass = () => {
    if (value <= 3) return 'bg-red-100 border-red-200 text-red-700';
    if (value <= 6) return 'bg-amber-100 border-amber-200 text-amber-700';
    return 'bg-green-100 border-green-200 text-green-700';
  };
  
  // Generate all rating numbers
  const ratingNumbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  
  // Get color for individual number button
  const getNumberColor = (num: number) => {
    if (num === value) {
      // Selected value
      if (num <= 3) return "bg-red-500 text-white border-red-600";
      if (num <= 6) return "bg-amber-500 text-white border-amber-600";
      return "bg-green-500 text-white border-green-600";
    } else {
      // Unselected values with appropriate color intensity
      if (num <= 3) return "bg-red-50 text-red-600 hover:bg-red-100 border-red-200";
      if (num <= 6) return "bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200";
      return "bg-green-50 text-green-600 hover:bg-green-100 border-green-200";
    }
  };
  
  return (
    <div className="w-full">
      {/* Only show label area if there's a label */}
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <Label className="font-medium text-sm">{label}</Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      
      <div className="flex items-center">
        {/* Rating buttons in a single row */}
        <div className="flex gap-0.5">
          {ratingNumbers.map(num => (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium transition-colors border",
                getNumberColor(num)
              )}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}