import { ReactNode } from "react";
import { FloatingMenu } from "./FloatingMenu";

interface DashboardLayoutProps {
  children: ReactNode;
  onRefreshClick?: () => void;
}

/**
 * Special layout component for the Dashboard page
 * Uses a floating menu instead of sidebar to maximize screen space
 * Creates a fully responsive, non-scrollable dashboard
 */
export function DashboardLayout({ children, onRefreshClick }: DashboardLayoutProps) {
  return (
    <div className="w-full h-screen overflow-hidden relative">
      {/* Floating Menu */}
      <FloatingMenu onRefreshClick={onRefreshClick} />
      
      {/* Main Content - Responsive Full Screen */}
      <main className="w-full h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}