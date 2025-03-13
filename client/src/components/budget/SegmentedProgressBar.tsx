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
  const gapSize = 2; // Size of the gap between segments in pixels - increased for better visibility
  
  // Calculate the segment width (accounting for gaps)
  // We subtract (total - 1) * gapSize from the total width to account for gaps between segments
  const segmentWidth = `calc((100% - (${total - 1} * ${gapSize}px)) / ${total})`;
  
  // Generate segments
  for (let i = 0; i < total; i++) {
    const isUsed = i < used;
    segments.push(
      <div
        key={i}
        className={`h-full ${i === 0 ? 'rounded-l-sm' : i === total - 1 ? 'rounded-r-sm' : ''}`}
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
        <TooltipContent className="p-3">
          <div className="space-y-2 text-sm">
            <div className="text-center font-medium pb-1 border-b border-gray-100">
              Item Usage Status
            </div>
            <div className="flex justify-between gap-6">
              <span className="font-semibold">Total allocation:</span>
              <span>{total} units</span>
            </div>
            <div className="flex justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.used }}></div>
                <span className="font-semibold">Used in sessions:</span>
              </div>
              <span>{used} units</span>
            </div>
            <div className="flex justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.total }}></div>
                <span className="font-semibold">Remaining balance:</span>
              </div>
              <span>{balance} units</span>
            </div>
            
            {/* Display usage percentage */}
            <div className="mt-1 pt-1 border-t border-gray-100 text-center">
              {used > 0 ? (
                <span className="text-xs font-medium text-blue-600">
                  {Math.round((used / total) * 100)}% of allocation used
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-500">
                  No units used yet
                </span>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}