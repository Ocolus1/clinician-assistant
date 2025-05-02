import { ReactNode } from "react";
import { FloatingMenu } from "./FloatingMenu";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Special layout component for the Dashboard page
 * Uses a floating menu instead of sidebar to maximize screen space
 * Creates a fully responsive dashboard with proper overflow handling
 * The floating menu can be minimized to a corner icon to maximize screen space
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="w-full h-screen overflow-hidden relative">
      {/* Floating Menu */}
      <FloatingMenu />
      
      {/* Main Content - Responsive Full Screen with overflow handling */}
      <main className="w-full h-full overflow-auto">
        {children}
      </main>
    </div>
  );
}