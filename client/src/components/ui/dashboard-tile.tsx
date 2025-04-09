/**
 * Dashboard Tile Component
 * 
 * A expandable tile for the dashboard that can display content.
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, Maximize2 } from 'lucide-react';

export interface DashboardTileProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  expanded?: boolean;
  onExpandClick?: () => void;
  onCloseClick?: () => void;
}

/**
 * Dashboard Tile Component
 */
export function DashboardTile({
  title,
  icon,
  children,
  className,
  expanded = false,
  onExpandClick,
  onCloseClick,
}: DashboardTileProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {icon && <div className="text-primary">{icon}</div>}
          <h3 className="font-medium">{title}</h3>
        </div>
        
        <div className="flex items-center gap-1">
          {onExpandClick && !expanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onExpandClick}
              title="Expand"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          
          {onCloseClick && expanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCloseClick}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        expanded ? "h-[calc(100vh-12rem)] overflow-auto" : "h-auto"
      )}>
        {children}
      </div>
    </Card>
  );
}