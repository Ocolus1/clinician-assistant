import { ReactNode } from "react";

interface ThreeColumnLayoutProps {
  leftColumn: ReactNode;
  middleColumn: ReactNode;
  rightColumn: ReactNode;
}

export function ThreeColumnLayout({ 
  leftColumn, 
  middleColumn, 
  rightColumn 
}: ThreeColumnLayoutProps) {
  return (
    <div className="three-column-container">
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