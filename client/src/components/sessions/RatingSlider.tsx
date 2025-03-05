import React from "react";
import { Slider } from "@/components/ui/slider";

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

/**
 * A slider component that visualizes ratings from 0-10 with appropriate color indicators
 */
export function RatingSlider({ value, onChange, label, description }: RatingSliderProps) {
  // Get appropriate color based on the rating value
  const getColorClass = (value: number) => {
    if (value >= 8) return "bg-green-500";
    if (value >= 5) return "bg-blue-500";
    if (value >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <div>
          <div className="font-medium">{label}</div>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
        <div className="font-medium flex items-center">
          <span className={`inline-block h-3 w-3 rounded-full mr-2 ${getColorClass(value)}`}></span>
          <span>{value}/10</span>
        </div>
      </div>
      
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={0}
        max={10}
        step={1}
        className="cursor-pointer"
      />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}