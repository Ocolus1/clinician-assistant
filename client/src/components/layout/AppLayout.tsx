import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { Menu, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const [location] = useLocation();

  // Extract page title from location
  const getPageTitle = () => {
    const path = location.split("/")[1];
    if (!path) return "Dashboard";
    return path.charAt(0).toUpperCase() + path.slice(1);
  };
  
  // Set up appropriate styles when the component mounts
  useEffect(() => {
    // Remove any max-width restrictions on the content area
    document.documentElement.style.setProperty('--content-max-width', 'none');
    document.body.style.overflowX = 'hidden';
    document.body.style.width = '100%';
    
    // These styles should apply to the main application container
    const style = document.createElement('style');
    style.innerHTML = `
      .app-container {
        width: 100%;
        max-width: 100vw;
        display: flex;
      }
      .content-area {
        flex: 1;
        width: 100%;
        max-width: 100%;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="app-container flex w-full min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content container */}
      <div
        className={cn(
          "content-area flex flex-col flex-1 min-h-screen transition-all duration-300 w-full",
          state === "expanded" ? "lg:ml-64" : "lg:ml-20"
        )}
        style={{ width: '100%' }}
      >
        {/* Top navigation bar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 w-full">
          <div className="flex items-center">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenMobile(true)}
                className="mr-2 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 py-6 px-6 md:px-8 lg:px-10 w-full">
          <div className="w-full">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 p-4 text-center text-gray-500 text-sm">
          <p>© 2025 Speech Therapy Clinic. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}