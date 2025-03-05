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
        "grid grid-cols-1 lg:grid-cols-[375px_1fr_300px] h-[calc(100vh-100px)] max-h-[900px] overflow-hidden",
        className
      )}
    >
      <div className="h-full overflow-y-auto">
        {leftColumn}
      </div>
      <div className="h-full overflow-y-auto border-x border-border">
        {middleColumn}
      </div>
      <div className="h-full overflow-y-auto">
        {rightColumn}
      </div>
    </div>
  );
}