import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  X,
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
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      {/* Floating menu toggle button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 rounded-full w-10 h-10 bg-white shadow-md border-gray-200"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      
      {/* Refresh button */}
      {onRefreshClick && (
        <Button
          variant="outline"
          size="icon"
          onClick={onRefreshClick}
          className="fixed top-4 right-4 z-50 rounded-full w-10 h-10 bg-white shadow-md border-gray-200"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      )}

      {/* Menu panel */}
      <div
        className={cn(
          "fixed top-0 left-0 w-64 h-screen bg-white shadow-lg z-40 transition-transform duration-300 border-r",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Title */}
        <div className="p-4 pt-16 border-b">
          <h2 className="font-semibold text-lg">Speech Therapy</h2>
          <p className="text-sm text-muted-foreground">Practice Management</p>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = item.href === location;
              const ItemIcon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <a
                      className={cn(
                        "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <ItemIcon className="mr-3 h-4 w-4" />
                      {item.name}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="absolute bottom-0 w-full p-4 border-t text-center text-xs text-muted-foreground">
          © 2025 Speech Therapy Clinic
        </div>
      </div>
      
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}