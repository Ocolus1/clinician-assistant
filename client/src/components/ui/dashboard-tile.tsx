/**
 * Dashboard Tile Component
 * 
 * This component provides a consistent layout for dashboard tiles.
 */

import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardTileProps {
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  children: ReactNode;
  action?: ReactNode;
  variant?: 'default' | 'compact';
}

/**
 * Dashboard Tile Component
 */
export function DashboardTile({
  title,
  description,
  className,
  contentClassName,
  headerClassName,
  children,
  action,
  variant = 'default'
}: DashboardTileProps) {
  const isCompact = variant === 'compact';
  
  return (
    <Card className={cn(
      "h-full flex flex-col shadow-sm overflow-hidden",
      className
    )}>
      <CardHeader className={cn(
        "flex-shrink-0",
        isCompact ? "py-3" : "py-5",
        headerClassName
      )}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn(
              "tracking-tight",
              isCompact ? "text-lg" : "text-xl"
            )}>
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">
                {description}
              </CardDescription>
            )}
          </div>
          
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn(
        "flex-1 p-0 flex flex-col",
        contentClassName
      )}>
        {children}
      </CardContent>
    </Card>
  );
}