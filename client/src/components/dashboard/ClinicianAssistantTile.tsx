/**
 * Clinician Assistant Tile
 * 
 * Dashboard tile for the Clinician Assistant feature.
 */

import React, { useState } from 'react';
import { DashboardTile } from '../ui/dashboard-tile';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '../assistant/ChatInterface';

/**
 * Clinician Assistant Tile Component
 */
export function ClinicianAssistantTile() {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(true);
  };

  const handleCloseClick = () => {
    setExpanded(false);
  };

  return (
    <DashboardTile
      className="flex flex-col col-span-1 lg:col-span-2 row-span-2"
      title="Clinician Assistant"
      icon={<Bot className="h-5 w-5" />}
      expanded={expanded}
      onExpandClick={handleExpandClick}
      onCloseClick={handleCloseClick}
    >
      {expanded ? (
        <div className="flex-1 overflow-hidden">
          <ChatInterface onClose={() => setExpanded(false)} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-4 h-full space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-center">
            Clinician Assistant
          </h3>
          <p className="text-center text-muted-foreground">
            Ask questions about your clients, progress reports, or budget information using natural language.
          </p>
          <Button 
            variant="default" 
            onClick={handleExpandClick}
          >
            Open Assistant
          </Button>
        </div>
      )}
    </DashboardTile>
  );
}