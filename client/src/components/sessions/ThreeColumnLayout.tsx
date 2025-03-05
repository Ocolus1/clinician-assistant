import { ReactNode } from "react";
import "./three-column-layout.css";

interface ThreeColumnLayoutProps {
  headerSection?: ReactNode;
  presentSection: ReactNode;
  productsSection: ReactNode;
  observationsSection: ReactNode;
  className?: string;
}

export function ThreeColumnLayout({ 
  headerSection,
  presentSection, 
  productsSection, 
  observationsSection,
  className = ""
}: ThreeColumnLayoutProps) {
  return (
    <div className={`${className}`}>
      {/* Full-width header section */}
      {headerSection && (
        <div className="w-full mb-6">
          {headerSection}
        </div>
      )}
      
      {/* Three-column layout below */}
      <div className="three-column-container">
        <div className="three-column-left">
          {presentSection}
        </div>
        <div className="three-column-middle">
          {productsSection}
        </div>
        <div className="three-column-right">
          {observationsSection}
        </div>
      </div>
    </div>
  );
}