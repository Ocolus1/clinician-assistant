import { ReactNode } from "react";
import { FloatingDock } from "../common/FloatingDock";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Special layout component for the Dashboard page
 * Uses the floating dock instead of sidebar to maximize screen space
 * Creates a fully responsive, non-scrollable dashboard
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="w-full h-screen overflow-hidden relative">
      {/* Floating Dock */}
      <FloatingDock />
      
      {/* Main Content - Responsive Full Screen with space for dock */}
      <main className="w-full h-full overflow-hidden pl-16">
        {children}
      </main>
    </div>
  );
}