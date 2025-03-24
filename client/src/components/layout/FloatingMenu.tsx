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
  const [expandedWithDelay, setExpandedWithDelay] = useState(false);

  // This effect helps ensure the dock doesn't start minimized on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinimized(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Add a slight delay to expansion to prevent accidental triggers
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExpanded) {
      timer = setTimeout(() => {
        setExpandedWithDelay(true);
      }, 150);
    } else {
      setExpandedWithDelay(false);
    }
    return () => clearTimeout(timer);
  }, [isExpanded]);

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
        className="fixed bottom-6 left-6 z-50 h-12 w-12 rounded-full bg-gradient-to-b from-gray-800 to-black/90 backdrop-blur-xl shadow-lg border border-white/20 text-white hover:bg-black/90 transition-all duration-300 hover:shadow-xl"
        onClick={toggleMinimized}
      >
        <Menu className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      {/* Enhanced dock with improved spacing and visual hierarchy */}
      <div 
        className={cn(
          "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out",
          isExpanded ? "scale-105" : "scale-100"
        )}
      >
        <div 
          className={cn(
            "flex items-center bg-gradient-to-b from-gray-800 to-black/90 backdrop-blur-xl rounded-full shadow-lg border border-white/20",
            isExpanded ? "px-5 py-3" : "px-3 py-2",
            "transition-all duration-300 ease-in-out"
          )}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {/* Navigation icons with improved spacing */}
          {navigationItems.map((item, index) => {
            const isActive = item.href === location;
            const ItemIcon = item.icon;
            
            return (
              <div 
                key={item.name} 
                className={cn(
                  "relative",
                  isExpanded ? "px-3" : "px-1.5", 
                  "transition-all duration-300"
                )}
              >
                {/* Thinner, more subtle divider */}
                {index !== 0 && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 w-px bg-white/5" />
                )}
                
                <TooltipProvider>
                  <Tooltip delayDuration={700}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "rounded-full transition-all duration-300",
                          isExpanded ? "h-14 w-auto px-3" : "h-11 w-11",
                          isActive 
                            ? "bg-white/10 text-white" 
                            : "text-white/80 hover:bg-white/5 hover:text-white",
                          isExpanded ? (expandedWithDelay ? "mx-1" : "mx-0.5") : "mx-0.5"
                        )}
                        onClick={() => navigate(item.href)}
                      >
                        <div className={cn(
                          "flex items-center transition-all duration-300",
                          expandedWithDelay ? "flex-row space-x-3" : "flex-col"
                        )}>
                          <ItemIcon className={isExpanded ? "h-5 w-5" : "h-4.5 w-4.5"} />
                          {expandedWithDelay && (
                            <span className="text-xs tracking-wide font-normal whitespace-nowrap">{item.name}</span>
                          )}
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className={isExpanded ? "hidden" : ""}>
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}
          
          {/* Notifications button with enhanced styling */}
          <div className={cn(
            "relative",
            isExpanded ? "px-3" : "px-1.5", 
            "transition-all duration-300"
          )}>
            {/* Subtle divider */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 w-px bg-white/5" />
            
            <TooltipProvider>
              <Tooltip delayDuration={700}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-full transition-all duration-300",
                      isExpanded ? "h-14 w-auto px-3" : "h-11 w-11",
                      "text-white/80 hover:bg-white/5 hover:text-white",
                      isExpanded ? (expandedWithDelay ? "mx-1" : "mx-0.5") : "mx-0.5"
                    )}
                    onClick={() => {}}
                  >
                    <div className={cn(
                      "flex items-center transition-all duration-300 relative",
                      expandedWithDelay ? "flex-row space-x-3" : "flex-col"
                    )}>
                      <div className="relative">
                        <Bell className={isExpanded ? "h-5 w-5" : "h-4.5 w-4.5"} />
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full ring-2 ring-black/80"></div>
                      </div>
                      {expandedWithDelay && (
                        <span className="text-xs tracking-wide font-normal whitespace-nowrap">Notifications</span>
                      )}
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className={isExpanded ? "hidden" : ""}>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Minimize button with enhanced styling */}
          <div className={cn(
            "relative",
            isExpanded ? "px-3 pl-3" : "px-1.5", 
            "transition-all duration-300"
          )}>
            {/* Subtle divider */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 w-px bg-white/5" />
            
            <TooltipProvider>
              <Tooltip delayDuration={700}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMinimized}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      isExpanded ? "h-14 w-auto px-3" : "h-11 w-11",
                      "text-white/80 hover:bg-white/5 hover:text-white",
                      isExpanded ? (expandedWithDelay ? "mx-1" : "mx-0.5") : "mx-0.5"
                    )}
                  >
                    <div className={cn(
                      "flex items-center transition-all duration-300",
                      expandedWithDelay ? "flex-row space-x-3" : "flex-col"
                    )}>
                      <Minimize2 className={isExpanded ? "h-5 w-5" : "h-4.5 w-4.5"} />
                      {expandedWithDelay && (
                        <span className="text-xs tracking-wide font-normal whitespace-nowrap">Minimize</span>
                      )}
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className={isExpanded ? "hidden" : ""}>
                  <p>Minimize</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </>
  );
}