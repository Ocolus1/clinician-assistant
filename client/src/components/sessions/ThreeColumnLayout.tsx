import { ReactNode } from "react";
import "./three-column-layout.css";

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
  className = ""
}: ThreeColumnLayoutProps) {
  return (
    <div className={`three-column-container ${className}`}>
      <div className="three-column-left">
        {leftColumn}
      </div>
      <div className="three-column-middle">
        {middleColumn}
      </div>
      <div className="three-column-right">
        {rightColumn}
      </div>
    </div>
  );
}