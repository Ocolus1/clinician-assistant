import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RatingDotsProps {
  rating: number;
  maxRating?: number;
  label?: string;
}

export const RatingDots: React.FC<RatingDotsProps> = ({ 
  rating, 
  maxRating = 10,
  label
}) => {
  // Create an array of dots based on the maxRating
  const dots = Array.from({ length: maxRating }, (_, i) => i + 1);
  
  // Function to determine if a dot should be filled
  const isFilled = (dotIndex: number) => dotIndex <= rating;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            <div className="flex">
              {/* First 5 dots with a gap after */}
              <div className="flex space-x-2.5 mr-4">
                {dots.slice(0, 5).map((dotIndex) => (
                  <div
                    key={`dot-${dotIndex}`}
                    className={`h-4 w-4 rounded-full border-[1.5px] ${
                      isFilled(dotIndex)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-transparent border-slate-300'
                    }`}
                  />
                ))}
              </div>
              
              {/* Last 5 dots */}
              <div className="flex space-x-2.5">
                {dots.slice(5, 10).map((dotIndex) => (
                  <div
                    key={`dot-${dotIndex}`}
                    className={`h-4 w-4 rounded-full border-[1.5px] ${
                      isFilled(dotIndex)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-transparent border-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-sm font-medium text-slate-700">{label || `Rating: ${rating}/10`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};