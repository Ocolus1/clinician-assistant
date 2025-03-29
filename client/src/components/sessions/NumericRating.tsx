import React from "react";

interface NumericRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
}

/**
 * A refined component that visualizes ratings from 0-10 with numbered circles
 * Designed to be less visually dominant while still providing clear selection
 */
export function NumericRating({ value, onChange, label, description }: NumericRatingProps) {
  // Get appropriate color based on the rating value
  const getColorClass = (circleValue: number) => {
    const isSelected = circleValue === value;
    
    // Only apply color to the selected number
    if (isSelected) {
      if (value >= 8) return "bg-success-500 text-white";
      if (value >= 5) return "bg-primary-blue-500 text-white";
      if (value >= 3) return "bg-warning-500 text-white";
      return "bg-error-500 text-white";
    }
    
    // Subtle styling for unselected numbers
    return "bg-gray-50 text-gray-500 hover:bg-gray-100";
  };
  
  // Get text label for the rating to give meaning to the numbers
  const getRatingLabel = () => {
    if (value >= 9) return "Excellent";
    if (value >= 7) return "Good";
    if (value >= 5) return "Average";
    if (value >= 3) return "Fair";
    if (value >= 1) return "Poor";
    return "Not observed";
  };
  
  return (
    <div className="space-y-2 mb-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-label font-medium text-text-secondary">{label}</div>
          {description && <div className="text-caption text-text-tertiary">{description}</div>}
        </div>
        <div className="flex items-center">
          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full mr-2 text-xs font-medium ${getColorClass(value)}`}>
            {value}
          </span>
          <span className="text-text-secondary text-sm">{getRatingLabel()}</span>
        </div>
      </div>
      
      <div className="rating-scale mt-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`rating-number ${value === i ? 'selected' : ''}`}
            aria-label={`Rate ${i} out of 10`}
          >
            {i}
          </button>
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-text-tertiary mt-1 px-1">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}