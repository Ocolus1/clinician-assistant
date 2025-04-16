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
    <Link href="/clinician-assistant" className="">
      <Card className={cn("overflow-hidden w-64 transition-all hover:shadow-md py-6 cursor-pointer group hover:shadow-md cursor-pointer hover:translate-y-[-2px]", className)}
        style={{ borderTop: `4px solid #10B981`, backgroundColor: "#ffffff" }}
        >
        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
          <div className="bg-indigo-100 p-3 rounded-full mb-4 group-hover:bg-indigo-200 transition-colors">
            <Bot className="h-8 w-8 text-indigo-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-center mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground text-center mb-3">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ClinicianAssistantTile;