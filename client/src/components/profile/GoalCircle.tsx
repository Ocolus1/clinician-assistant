import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GoalCircleProps {
  score: number;
  title: string;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function GoalCircle({ 
  score, 
  title, 
  isSelected = false, 
  onClick,
  size = 'md'
}: GoalCircleProps) {
  // Determine color based on score
  const getColor = (score: number) => {
    if (score < 4) return "#f43f5e"; // red
    if (score < 7) return "#f59e0b"; // amber
    return "#10b981"; // green
  };
  
  const color = getColor(score);
  
  // Size mappings
  const sizeClasses = {
    sm: {
      circle: "w-16 h-16",
      text: "text-xl",
      title: "text-xs max-w-16"
    },
    md: {
      circle: "w-20 h-20",
      text: "text-2xl",
      title: "text-sm max-w-20"
    },
    lg: {
      circle: "w-24 h-24", 
      text: "text-3xl",
      title: "text-sm max-w-24"
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex flex-col items-center space-y-2", 
              onClick ? "cursor-pointer" : "",
              "transition-all duration-200 hover:scale-105",
              isSelected ? "scale-110" : "opacity-80 hover:opacity-100"
            )}
            onClick={onClick}
          >
            {/* Circle with score */}
            <div 
              className={cn(
                sizeClasses[size].circle,
                "rounded-full flex items-center justify-center",
                "border-2 transition-colors",
                isSelected ? "border-4" : "border-2"
              )}
              style={{ 
                borderColor: color,
                backgroundColor: `${color}10` // Very light background based on score color
              }}
            >
              <span 
                className={cn(
                  sizeClasses[size].text,
                  "font-semibold"
                )}
                style={{ color }}
              >
                {score.toFixed(1)}
              </span>
            </div>
            
            {/* Goal title */}
            {title && (
              <div 
                className={cn(
                  sizeClasses[size].title,
                  "text-center font-medium text-gray-700 line-clamp-2"
                )}
              >
                {title}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-white border border-gray-200 shadow-md p-2 max-w-xs">
          <p className="font-semibold text-gray-800">{title}</p>
          <p className="font-medium mt-1">Score: {score.toFixed(1)}/10</p>
          <p className="text-xs text-gray-600 mt-1">
            {score < 4 ? "Needs significant improvement" : 
             score < 7 ? "Progressing adequately" : 
             "Meeting or exceeding targets"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}