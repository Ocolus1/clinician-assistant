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
    <div className={`space-y-6 ${className}`}>
      {/* Full-width header section */}
      <div className="w-full">
        {headerSection}
      </div>
      
      {/* Three-column layout below */}
      <div className="flex flex-col md:flex-row w-full gap-4">
        {/* Present section (25%) */}
        <div className="w-full md:w-1/4">
          {presentSection}
        </div>
        
        {/* Products section (50%) */}
        <div className="w-full md:w-1/2">
          {productsSection}
        </div>
        
        {/* Observations section (25%) */}
        <div className="w-full md:w-1/4">
          {observationsSection}
        </div>
      </div>
    </div>
  );
}