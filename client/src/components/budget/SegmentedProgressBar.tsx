import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProgressSegment {
  value: number;  // Percentage value (0-100)
  color: string;  // CSS color string (can be a Tailwind class)
  label: string;  // Label for this segment
}

interface SegmentedProgressBarProps {
  // Original support for simple unit-based segments
  total?: number;
  used?: number;
  height?: number;
  colors?: {
    used: string;
    total: string;
    background: string;
  };
  className?: string;

  // New support for percentage-based segments
  segments?: ProgressSegment[];
}

/**
 * A versatile progress bar component that can display either:
 * 1. A segmented item quantity bar (with total/used units)
 * 2. A continuous percentage-based progress bar with multiple segments
 * 
 * This component supports two usage patterns:
 * - Unit-based: <SegmentedProgressBar total={5} used={2} />
 * - Percentage-based: <SegmentedProgressBar segments={[{value: 30, color: 'bg-blue-600', label: 'Used'}, ...]} />
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
  segments
}: SegmentedProgressBarProps) {
  // Determine if we're using the segments API
  const useSegmentsApi = segments && segments.length > 0;
  
  // PERCENTAGE-BASED RENDERING
  if (useSegmentsApi) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <div 
              className={`w-full rounded-md overflow-hidden flex ${className}`}
              style={{ height: `${height}px` }}
            >
              {segments.map((segment, index) => (
                <div
                  key={index}
                  className={`h-full ${segment.color}`}
                  style={{
                    width: `${segment.value}%`,
                  }}
                />
              ))}
            </div>
          </TooltipTrigger>
          <TooltipContent className="p-3">
            <div className="space-y-2 text-sm">
              <div className="text-center font-medium pb-1 border-b border-gray-100">
                Budget Distribution
              </div>
              {segments.map((segment, index) => (
                <div key={index} className="flex justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${segment.color}`}></div>
                    <span className="font-semibold">{segment.label}:</span>
                  </div>
                  <span>{segment.value}%</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // UNIT-BASED RENDERING (ORIGINAL FUNCTIONALITY)
  if (!total || total <= 0) {
    return (
      <div 
        className={`w-full rounded-full bg-gray-100 ${className}`}
        style={{ height: `${height}px` }}
      ></div>
    );
  }
  
  // Calculate derived values for unit-based display
  const usedValue = used || 0;
  const balance = Math.max(0, total - usedValue);
  
  // Create segments for the progress bar
  const unitSegments = [];
  const gapSize = 2; // Size of the gap between segments in pixels
  
  // Calculate the segment width (accounting for gaps)
  const segmentWidth = `calc((100% - (${total - 1} * ${gapSize}px)) / ${total})`;
  
  // Generate segments
  for (let i = 0; i < total; i++) {
    const isUsed = i < usedValue;
    unitSegments.push(
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
            {unitSegments}
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
              <span>{usedValue} units</span>
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
              {usedValue > 0 ? (
                <span className="text-xs font-medium text-blue-600">
                  {Math.round((usedValue / total) * 100)}% of allocation used
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