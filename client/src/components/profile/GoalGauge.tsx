import React from 'react';
import { cn } from '@/lib/utils';

interface GoalGaugeProps {
  score: number;
  title: string;
  isSelected?: boolean;
}

export function GoalGauge({ score, title, isSelected = false }: GoalGaugeProps) {
  // Determine color based on score
  const getColor = (score: number) => {
    if (score < 4) return '#ef4444'; // red-500
    if (score < 7) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  const color = getColor(score);
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 flex justify-center">
        {/* Semi-circle background */}
        <div 
          className="absolute w-24 h-12 overflow-hidden border-4 border-gray-200 rounded-t-full"
          style={{ 
            borderBottomWidth: 0,
            backgroundColor: '#f9fafb' // gray-50
          }}
        />
        
        {/* Semi-circle fill */}
        <div 
          className="absolute w-24 h-12 overflow-hidden"
          style={{ 
            clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 0)',
          }}
        >
          <div 
            className="absolute w-24 h-24 rounded-full transition-transform duration-500 ease-in-out"
            style={{ 
              top: '0',
              transformOrigin: 'center bottom',
              transform: `rotate(${(score / 10) * 180}deg)`,
              background: `conic-gradient(${color} 0deg, ${color} 180deg, transparent 180deg, transparent 360deg)`,
            }}
          />
        </div>

        {/* Indicator line */}
        <div 
          className="absolute w-[2px] h-[14px] bg-gray-800"
          style={{
            top: '8px',
            left: 'calc(50% - 1px)',
            transformOrigin: 'bottom center',
            transform: `rotate(${(score / 10) * 180}deg)`,
          }}
        />
        
        {/* Score text */}
        <div 
          className={cn(
            "absolute bottom-[-2px] text-xl font-bold transition-colors",
            isSelected ? "text-gray-900" : "text-gray-700"
          )}
          style={{ color: isSelected ? color : undefined }}
        >
          {score.toFixed(1)}
        </div>
      </div>
      
      {/* Title */}
      <p 
        className={cn(
          "text-xs mt-1 max-w-[100px] text-center line-clamp-2 transition-colors",
          isSelected ? "text-gray-900 font-medium" : "text-gray-500"
        )}
      >
        {title}
      </p>
    </div>
  );
}