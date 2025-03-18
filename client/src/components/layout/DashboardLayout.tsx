import { ReactNode } from "react";
import { FloatingMenu } from "./FloatingMenu";

interface DashboardLayoutProps {
  children: ReactNode;
  onRefreshClick?: () => void;
}

/**
 * Special layout component for the Dashboard page
 * Uses a floating menu instead of sidebar to maximize screen space
 */
export function DashboardLayout({ children, onRefreshClick }: DashboardLayoutProps) {
  return (
    <div className="w-full h-screen overflow-hidden">
      {/* Floating Menu */}
      <FloatingMenu onRefreshClick={onRefreshClick} />
      
      {/* Main Content - Full Screen */}
      <main className="w-full h-full">
        {children}
      </main>
    </div>
  );
}