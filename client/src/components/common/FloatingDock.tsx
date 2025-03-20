import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Users,
  Calendar,
  BarChart,
  Settings,
  Menu,
  X,
  HelpCircle,
  LayoutDashboard,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ href, icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={href}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-primary-100 hover:text-primary-900 cursor-pointer',
              active ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : 'text-muted-foreground'
            )}
            onClick={onClick}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-4">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FloatingDock() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState<boolean>(false);
  
  // Log the current location to help with debugging
  React.useEffect(() => {
    console.log('Current location:', location);
  }, [location]);

  // Navigation items
  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/clients', icon: Users, label: 'Clients' },
    { href: '/sessions', icon: Calendar, label: 'Sessions' },
    { href: '/reports', icon: BarChart, label: 'Reports' },
    { href: '/settings', icon: Settings, label: 'Settings' },
    { href: '/help', icon: HelpCircle, label: 'Help' },
  ];

  return (
    <div 
      className={cn(
        'fixed left-0 top-0 z-40 h-full w-16 flex flex-col items-center justify-between py-4 bg-background border-r border-border transition-all duration-300',
        expanded ? 'w-64' : 'w-16'
      )}
    >
      {/* Top section with logo/toggle */}
      <div className="w-full flex flex-col items-center space-y-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary">
          <User className="h-6 w-6 text-primary-foreground" />
        </div>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Navigation items */}
      <div className="flex-1 w-full flex flex-col items-center space-y-4 mt-8">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={
              item.href === '/' 
                ? location === '/' 
                : location.startsWith(item.href)
            }
          />
        ))}
      </div>
      
      {/* Bottom section (optional) */}
      <div className="mt-auto">
        <NavItem href="/profile" icon={User} label="Profile" />
      </div>
    </div>
  );
}