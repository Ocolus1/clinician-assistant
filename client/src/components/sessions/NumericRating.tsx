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
 * A numeric rating component with clickable buttons from 1-10
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
      if (num <= 3) return "bg-red-500 text-white";
      if (num <= 6) return "bg-amber-500 text-white";
      return "bg-green-500 text-white";
    } else {
      // Unselected values with appropriate color intensity
      if (num <= 3) return "bg-red-50 text-red-600 hover:bg-red-100";
      if (num <= 6) return "bg-amber-50 text-amber-600 hover:bg-amber-100";
      return "bg-green-50 text-green-600 hover:bg-green-100";
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="font-medium text-sm">{label}</Label>
        <Badge variant="outline" className={`font-medium ${getBadgeClass()}`}>
          {value}/{max}
        </Badge>
      </div>
      
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      
      <div className="flex flex-wrap gap-1.5 justify-center">
        {ratingNumbers.map(num => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              getNumberColor(num)
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}