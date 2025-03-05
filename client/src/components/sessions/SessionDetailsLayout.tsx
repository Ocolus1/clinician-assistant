import { ReactNode } from "react";

interface SessionDetailsLayoutProps {
  headerSection: ReactNode;
  presentSection: ReactNode;
  productsSection: ReactNode;
  observationsSection: ReactNode;
  className?: string;
}

export function SessionDetailsLayout({ 
  headerSection, 
  presentSection, 
  productsSection, 
  observationsSection,
  className = ""
}: SessionDetailsLayoutProps) {
  return (
    <div className={`session-details-layout ${className}`}>
      {/* Full-width header section */}
      <div className="header-section w-full mb-4">
        {headerSection}
      </div>
      
      {/* Three-column layout for the main content */}
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