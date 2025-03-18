import { useState } from "react";
import { useLocation } from "wouter";
import {
  Home,
  Users,
  Mic,
  FileText,
  Settings,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingMenuProps {
  onRefreshClick?: () => void;
}

export function FloatingMenu({ onRefreshClick }: FloatingMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [location] = useLocation();

  // Define the navigation items
  const navigationItems = [
    {
      name: "Dashboard",
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

  return (
    <>
      {/* MacBook-style dock at the bottom of the screen */}
      <div 
        className={cn(
          "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out",
          isExpanded ? "w-auto" : "w-auto"
        )}
      >
        <div 
          className={cn(
            "flex items-center gap-1 bg-black/80 backdrop-blur-md rounded-full p-1 shadow-lg border border-white/20",
            isExpanded ? "px-4" : "px-3"
          )}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {/* Navigation icons */}
          {navigationItems.map((item) => {
            const isActive = item.href === location;
            const ItemIcon = item.icon;
            
            return (
              <Button
                key={item.name}
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full transition-all duration-300 h-12 w-12",
                  isActive 
                    ? "bg-white/20 text-white scale-110" 
                    : "text-white/70 hover:bg-white/10 hover:text-white hover:scale-110",
                  isExpanded && "mx-1"
                )}
                onClick={() => navigate(item.href)}
              >
                <div className="flex flex-col items-center">
                  <ItemIcon className="h-5 w-5" />
                  {isExpanded && (
                    <span className="text-[10px] mt-1">{item.name}</span>
                  )}
                </div>
              </Button>
            );
          })}
          
          {/* Refresh button */}
          {onRefreshClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefreshClick}
              className={cn(
                "rounded-full transition-all duration-300 text-white/70 hover:bg-white/10 hover:text-white h-12 w-12",
                "border-l border-white/20 pl-2",
                isExpanded && "mx-1"
              )}
            >
              <div className="flex flex-col items-center">
                <RefreshCw className="h-5 w-5" />
                {isExpanded && (
                  <span className="text-[10px] mt-1">Refresh</span>
                )}
              </div>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}