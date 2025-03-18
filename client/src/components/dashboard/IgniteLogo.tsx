import React from 'react';
import { cn } from '@/lib/utils';

interface IgniteLogoProps {
  className?: string;
  size?: number;
}

/**
 * A custom Ignite Logo component that renders the white Ignite logo
 * Used in the AI Assistant dock icon
 */
export function IgniteLogo({ className, size = 24 }: IgniteLogoProps) {
  return (
    <img 
      src="/images/ignite-logo-white.png"
      width={size} 
      height={size} 
      className={cn("object-contain", className)}
      alt="Ignite Logo"
    />
  );
}