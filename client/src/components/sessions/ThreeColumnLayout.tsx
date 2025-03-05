import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ThreeColumnLayoutProps {
  leftColumn: ReactNode;
  middleColumn: ReactNode;
  rightColumn: ReactNode;
  className?: string;
}

export function ThreeColumnLayout({ 
  leftColumn, 
  middleColumn, 
  rightColumn, 
  className 
}: ThreeColumnLayoutProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6", className)}>
      <div className="col-span-1">{leftColumn}</div>
      <div className="col-span-1">{middleColumn}</div>
      <div className="col-span-1">{rightColumn}</div>
    </div>
  );
}