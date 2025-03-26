import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThreeColumnLayoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  rightColumn: ReactNode;
  className?: string;
  title?: string;
}

/**
 * A three column layout component for complex forms and detail views
 * Provides a consistent layout with center column for main content,
 * and right column for meta information
 */
export function ThreeColumnLayout({ 
  open,
  onOpenChange,
  children, 
  rightColumn, 
  className,
  title = "Details"
}: ThreeColumnLayoutProps) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div 
        className={cn(
          "fixed inset-4 bg-background rounded-lg shadow-lg grid grid-cols-1 lg:grid-cols-[75%_25%] h-[calc(100vh-2rem)] overflow-hidden",
          className
        )}
      >
        {/* Header with close button */}
        <div className="absolute top-0 right-0 p-4 z-10">
          <Button
            variant="ghost" 
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        
        {/* Title */}
        <div className="absolute top-0 left-0 p-4 z-10">
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        
        {/* Main content area */}
        <div className="h-full overflow-y-auto p-4 pt-14">
          {children}
        </div>
        
        {/* Right sidebar */}
        <div className="h-full overflow-y-auto border-l border-border lg:block hidden">
          {rightColumn}
        </div>
        
        {/* Mobile view for right sidebar */}
        <div className="block lg:hidden mt-4 border-t pt-4">
          {rightColumn}
        </div>
      </div>
    </div>
  );
}