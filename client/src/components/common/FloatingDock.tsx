import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  CalendarClock, 
  FileText, 
  Settings,
  PanelLeft, 
  PanelLeftClose
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingDock() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { href: "/", icon: <LayoutDashboard size={24} />, label: "Dashboard" },
    { href: "/clients", icon: <Users size={24} />, label: "Clients" },
    { href: "/sessions", icon: <CalendarClock size={24} />, label: "Sessions" },
    { href: "/reports", icon: <FileText size={24} />, label: "Reports" },
    { href: "/settings", icon: <Settings size={24} />, label: "Settings" },
  ];

  // Determine if the dock should be shown at the top for mobile
  const dockClass = isMobile 
    ? "fixed bottom-0 left-0 right-0 flex justify-center p-2 bg-background border-t z-50"
    : expanded
      ? "fixed left-0 top-0 h-full w-64 p-4 bg-background border-r shadow-md z-50 transition-all duration-300"
      : "fixed left-0 top-0 h-full w-16 p-2 bg-background border-r shadow-md z-50 transition-all duration-300";

  // Only show the toggle button on desktop
  const toggleButton = !isMobile && (
    <button 
      onClick={() => setExpanded(!expanded)}
      className="absolute -right-3 top-8 bg-primary text-primary-foreground rounded-full p-1 shadow-md"
    >
      {expanded ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
    </button>
  );

  return (
    <div className={dockClass}>
      {toggleButton}
      
      <div className={isMobile ? "flex justify-around w-full" : "flex flex-col space-y-6 mt-6"}>
        {navItems.map((item) => {
          const isActive = location === item.href || 
                          (item.href !== '/' && location.startsWith(item.href));
                          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
                expanded && !isMobile
                  ? "p-2 justify-start space-x-2" 
                  : "p-2 justify-center"
              )}
            >
              <div>{item.icon}</div>
              {(expanded && !isMobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}