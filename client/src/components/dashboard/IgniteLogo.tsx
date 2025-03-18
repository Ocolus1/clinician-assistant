import React from 'react';
import { cn } from '@/lib/utils';

interface IgniteLogoProps {
  className?: string;
  size?: number;
}

/**
 * A custom Ignite Logo component that renders the Ignite logo in SVG format
 * Used in the AI Assistant dock icon
 */
export function IgniteLogo({ className, size = 24 }: IgniteLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("fill-current", className)}
      aria-hidden="true"
    >
      {/* Simplified Ignite play button logo */}
      <path d="M5 4.6v14.8c0 .8.9 1.3 1.6.8l13-7.4c.7-.4.7-1.3 0-1.7l-13-7.4c-.7-.4-1.6.1-1.6.9z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7.6v8.8c0 .8.9 1.3 1.6.8l5-2.9-5-5.8c-.7-.8-1.6-.7-1.6.1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}