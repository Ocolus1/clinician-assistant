import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ThreeColumnLayoutProps {
  leftColumn: ReactNode;
  middleColumn: ReactNode;
  rightColumn: ReactNode;
  className?: string;
}

/**
 * A three column layout component for complex forms and detail views
 * Provides a consistent layout with left column for forms/navigation,
 * middle column for previews/visualizations, and right column for meta information
 */
export function ThreeColumnLayout({ 
  leftColumn, 
  middleColumn, 
  rightColumn, 
  className 
}: ThreeColumnLayoutProps) {
  return (
    <div 
      className={cn(
        "grid grid-cols-1 lg:grid-cols-[25%_50%_25%] h-full min-h-[90vh] overflow-hidden",
        className
      )}
    >
      <div className="h-full overflow-y-auto order-1">
        {leftColumn}
      </div>
      <div className="h-full overflow-y-auto border-x border-border hidden lg:block order-2">
        {middleColumn}
      </div>
      <div className="h-full overflow-y-auto hidden lg:block order-3">
        {rightColumn}
      </div>
      <div className="block lg:hidden row-start-2 col-span-1 border-t overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div>{middleColumn}</div>
          <div>{rightColumn}</div>
        </div>
      </div>
    </div>
  );
}