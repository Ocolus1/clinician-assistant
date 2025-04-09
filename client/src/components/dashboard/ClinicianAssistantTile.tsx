import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClinicianAssistantTileProps {
  className?: string;
  title?: string;
  description?: string;
}

/**
 * Dashboard tile component for the Clinician Assistant
 * Acts as a gateway to the dedicated Clinician Assistant page
 */
const ClinicianAssistantTile: React.FC<ClinicianAssistantTileProps> = ({ 
  className, 
  title = "Clinician Assistant", 
  description = "Ask questions about your data using natural language" 
}) => {
  return (
    <Link href="/clinician-assistant">
      <Card className={cn("overflow-hidden transition-all hover:shadow-md cursor-pointer group", className)}>
        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
          <div className="bg-indigo-100 p-3 rounded-full mb-4 group-hover:bg-indigo-200 transition-colors">
            <Bot className="h-8 w-8 text-indigo-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-center mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground text-center mb-3">
            {description}
          </p>
          
          <div className="flex items-center text-indigo-600 text-sm font-medium group-hover:underline">
            Open Assistant
            <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ClinicianAssistantTile;