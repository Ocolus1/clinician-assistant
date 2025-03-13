import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SegmentedProgressBarProps {
  total: number;
  used: number;
  height?: number;
  colors?: {
    used: string;
    total: string;
    background: string;
  };
  className?: string;
}

/**
 * A segmented progress bar for visualizing budget item usage
 * Shows total allocation and used amount in a horizontal bar format
 * 
 * This visualization uses a segmented approach where:
 * - The bar is divided into equal segments based on the total quantity
 * - Each segment represents one unit
 * - Used segments are colored blue, balance segments are gray
 * - Segments are separated by white space
 * - Hovering shows detailed information about total/used/balance
 */
export function SegmentedProgressBar({
  total,
  used,
  height = 16,
  colors = {
    used: '#2563EB', // Blue for used portion
    total: '#D1D5DB', // Light gray for balance
    background: '#F3F4F6', // Very light gray background
  },
  className = '',
}: SegmentedProgressBarProps) {
  // Calculate derived values
  const balance = Math.max(0, total - used);
  
  // Don't render segments if total is 0
  if (total <= 0) {
    return (
      <div 
        className={`w-full rounded-full bg-gray-100 ${className}`}
        style={{ height: `${height}px` }}
      ></div>
    );
  }
  
  // Create segments for the progress bar
  const segments = [];
  const gapSize = 2; // Size of the gap between segments in pixels
  
  // Calculate the segment width (accounting for gaps)
  // We subtract (total - 1) * gapSize from the total width to account for gaps between segments
  const segmentWidth = `calc((100% - (${total - 1} * ${gapSize}px)) / ${total})`;
  
  // Generate segments
  for (let i = 0; i < total; i++) {
    const isUsed = i < used;
    segments.push(
      <div
        key={i}
        className="h-full rounded-sm"
        style={{
          width: segmentWidth,
          backgroundColor: isUsed ? colors.used : colors.total,
          marginLeft: i > 0 ? `${gapSize}px` : '0',
        }}
      />
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div 
            className={`w-full rounded-md flex items-center ${className}`}
            style={{ height: `${height}px` }}
          >
            {segments}
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-2">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold">Total:</span>
              <span>{total} units</span>
            </div>
            <div className="flex justify-between gap-4">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="font-semibold">Used:</span>
              </div>
              <span>{used} units</span>
            </div>
            <div className="flex justify-between gap-4">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                <span className="font-semibold">Balance:</span>
              </div>
              <span>{balance} units</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}