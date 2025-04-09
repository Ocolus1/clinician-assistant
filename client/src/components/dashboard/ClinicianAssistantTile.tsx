/**
 * Clinician Assistant Tile Component
 * 
 * This component provides a dashboard tile that contains the Clinician Assistant
 * chat interface. It's designed to be embedded in the dashboard.
 */

import React from 'react';
import { DashboardTile } from '@/components/ui/dashboard-tile';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { ChatInterface } from '@/components/assistant/ChatInterface';

interface ClinicianAssistantTileProps {
  title: string;
  description: string;
}

/**
 * Clinician Assistant Tile Component
 */
export function ClinicianAssistantTile({ title, description }: ClinicianAssistantTileProps) {
  return (
    <DashboardTile
      title={title}
      description={description}
      className="h-full"
      contentClassName="p-0"
    >
      <ChatInterface />
    </DashboardTile>
  );
}