import * as React from "react";
import { useLocation, Link } from "wouter";
import {
  Users,
  Home,
  Settings,
  FileText,
  ChevronRight,
  ChevronLeft,
  Mic,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function Sidebar() {
  const { state, toggleSidebar, isMobile, openMobile, setOpenMobile } = useSidebar();
  const [location] = useLocation();
  
  // Update CSS variable based on sidebar state
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width', 
      state === 'expanded' ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)'
    );
    
    // Ensure the body has full width
    document.body.style.width = '100%';
    document.body.style.overflowX = 'hidden';
  }, [state]);

  // Define the navigation items
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
    },
    {
      name: "Client Management",
      href: "/clients",
      icon: Users,
    },
    {
      name: "Speech Therapy",
      href: "/therapy",
      icon: Mic,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && openMobile && (
        <div 
          className="fixed inset-0 z-40 bg-black/50" 
          onClick={() => setOpenMobile(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-gray-900 text-white transition-all duration-300 ease-in-out",
          state === "expanded" ? "w-64" : "w-20",
          isMobile && (openMobile ? "translate-x-0" : "-translate-x-full"),
          "flex flex-col"
        )}
      >
        {/* Logo and toggle */}
        <div className={cn(
          "h-16 border-b border-gray-800 flex items-center px-4",
          state === "expanded" ? "justify-between" : "justify-center"
        )}>
          {state === "expanded" && (
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-white font-bold mr-2">
                ST
              </div>
              <span className="font-semibold text-lg">Speech Therapy</span>
            </div>
          )}
          
          {state === "collapsed" && !isMobile && (
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center text-white font-bold">
              ST
            </div>
          )}

          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                "h-8 w-8 rounded-md text-gray-400 hover:text-white hover:bg-gray-800",
                state === "collapsed" && "absolute right-0 top-16 -mr-4 bg-gray-900 border border-gray-800"
              )}
            >
              {state === "expanded" ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navigationItems.map((item) => (
              <li key={item.name}>
                <Link href={item.href}>
                  <div className={cn(
                    "flex items-center rounded-md py-2 text-sm transition-colors w-full cursor-pointer",
                    location === item.href
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800",
                    state === "expanded" ? "px-3" : "px-2 justify-center"
                  )}>
                    <item.icon
                      className={cn(
                        "h-5 w-5",
                        state === "expanded" && "mr-3"
                      )}
                    />
                    {state === "expanded" && <span>{item.name}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4">
          {state === "expanded" ? (
            <div className="text-xs text-gray-500">
              <p>Speech Therapy Clinic</p>
              <p>© 2025 All rights reserved</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="text-xs text-gray-500">2025</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}