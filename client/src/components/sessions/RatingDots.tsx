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
          <div className="flex items-center space-x-1">
            <div className="flex space-x-0.5">
              {/* First 5 dots with a slight gap after */}
              <div className="flex space-x-0.5 mr-1">
                {dots.slice(0, 5).map((dotIndex) => (
                  <div
                    key={`dot-${dotIndex}`}
                    className={`h-2 w-2 rounded-full border ${
                      isFilled(dotIndex)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-transparent border-slate-300'
                    }`}
                  />
                ))}
              </div>
              
              {/* Last 5 dots */}
              <div className="flex space-x-0.5">
                {dots.slice(5, 10).map((dotIndex) => (
                  <div
                    key={`dot-${dotIndex}`}
                    className={`h-2 w-2 rounded-full border ${
                      isFilled(dotIndex)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-transparent border-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Simple sparkline-like element (static for now) */}
            <div className="h-5 w-10 ml-3 relative flex items-center">
              <div className="absolute inset-0 flex items-center">
                <div className="h-px w-full bg-slate-200"></div>
              </div>
              <div className="w-full flex justify-between relative">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                <div className="w-1 h-1 rounded-full bg-blue-500" style={{ transform: 'translateY(-3px)' }}></div>
                <div className="w-1 h-1 rounded-full bg-blue-500" style={{ transform: 'translateY(-1px)' }}></div>
                <div className="w-1 h-1 rounded-full bg-blue-500" style={{ transform: 'translateY(2px)' }}></div>
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
              </div>
              {/* Connect dots with line for sparkline effect */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 20" preserveAspectRatio="none">
                <polyline
                  points="0,10 10,7 20,9 30,2 40,10"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1"
                />
              </svg>
            </div>
            
            {/* Numeric value display */}
            <span className="text-xs font-medium text-slate-500 ml-1">{rating}/10</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{label || `Rating: ${rating}/10`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};