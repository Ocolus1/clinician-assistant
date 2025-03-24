import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Home,
  Users,
  Mic,
  FileText,
  Settings,
  Minimize2,
  Bell,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FloatingMenuProps {
  onRefreshClick?: () => void;
}

export function FloatingMenu({ onRefreshClick }: FloatingMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [location] = useLocation();

  // This effect helps ensure the dock doesn't start minimized on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinimized(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Define the navigation items
  const navigationItems = [
    {
      name: "Home",
      href: "/",
      icon: Home,
    },
    {
      name: "Clients",
      href: "/clients",
      icon: Users,
    },
    {
      name: "Sessions",
      href: "/sessions",
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

  // Handle navigation
  const navigate = (path: string) => {
    window.location.href = path;
  };

  // Handle dock minimization
  const toggleMinimized = () => {
    setIsMinimized(prev => !prev);
    setIsExpanded(false);
  };

  if (isMinimized) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-6 left-6 z-50 h-12 w-12 rounded-full bg-black/80 backdrop-blur-xl shadow-lg border border-white/20 text-white hover:bg-black/90 transition-all duration-300"
        onClick={toggleMinimized}
      >
        <Menu className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      {/* MacBook-style dock at the bottom of the screen */}
      <div 
        className={cn(
          "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out",
          isExpanded ? "scale-110" : "scale-100"
        )}
      >
        <div 
          className={cn(
            "flex items-center bg-black/80 backdrop-blur-xl rounded-full shadow-lg border border-white/20",
            isExpanded ? "px-4 py-2" : "px-3 py-1.5",
          )}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {/* Navigation icons */}
          {navigationItems.map((item, index) => {
            const isActive = item.href === location;
            const ItemIcon = item.icon;
            
            return (
              <div key={item.name} className="relative px-1.5">
                {/* Divider for all items except first */}
                {index !== 0 && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 w-px bg-white/10" />
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full transition-all duration-300",
                    isExpanded ? "h-14 w-14" : "h-12 w-12",
                    isActive 
                      ? "bg-white/20 text-white" 
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                    isExpanded ? "mx-2" : "mx-1"
                  )}
                  onClick={() => navigate(item.href)}
                >
                  <div className="flex flex-col items-center">
                    <ItemIcon className={isExpanded ? "h-6 w-6" : "h-5 w-5"} />
                    {isExpanded && (
                      <span className="text-xs mt-1 font-medium">{item.name}</span>
                    )}
                  </div>
                </Button>
              </div>
            );
          })}
          
          {/* Notifications button */}
          <div className="relative pl-1.5">
            {/* Divider */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 w-px bg-white/10" />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-full transition-all duration-300",
                      isExpanded ? "h-14 w-14" : "h-12 w-12",
                      "text-white/70 hover:bg-white/10 hover:text-white",
                      isExpanded ? "mx-2" : "mx-1"
                    )}
                    onClick={() => {}}
                  >
                    <div className="flex flex-col items-center relative">
                      <Bell className={isExpanded ? "h-6 w-6" : "h-5 w-5"} />
                      <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full"></div>
                      {isExpanded && (
                        <span className="text-xs mt-1 font-medium">Notifications</span>
                      )}
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Minimize button */}
          <div className="relative pl-1.5">
            {/* Divider */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 w-px bg-white/20" />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMinimized}
              className={cn(
                "rounded-full transition-all duration-300 text-white/70 hover:bg-white/10 hover:text-white",
                isExpanded ? "h-14 w-14 mx-2" : "h-12 w-12 mx-1"
              )}
            >
              <div className="flex flex-col items-center">
                <Minimize2 className={isExpanded ? "h-6 w-6" : "h-5 w-5"} />
                {isExpanded && (
                  <span className="text-xs mt-1 font-medium">Minimize</span>
                )}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}