import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, User } from 'lucide-react';
import ClientProgressAssistantComponent from '@/components/clinical-assistant/ClientProgressAssistant';
import { useQuery } from '@tanstack/react-query';
import type { Client } from '@shared/schema';

/**
 * Client Progress Assistant Page
 * 
 * This page provides a dedicated interface for asking questions about a client's progress
 * If a client ID is provided in the URL, it will pre-fill the client information.
 */
export default function ClientProgressAssistantPage() {
  const { clientId } = useParams<{ clientId?: string }>();
  const parsedClientId = clientId ? parseInt(clientId, 10) : undefined;
  
  // Query for client data if we have an ID
  const { data: client, isLoading } = useQuery({
    queryKey: ['/api/clients', parsedClientId || 'none'],
    queryFn: async () => {
      if (!parsedClientId) return null;
      
      const response = await fetch(`/api/clients/${parsedClientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch client data');
      }
      return response.json();
    },
    enabled: !!parsedClientId
  });
  
  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={clientId ? `/clients/${clientId}` : '/clients'}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {clientId ? 'Back to Client' : 'Back to Clients'}
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6 mb-8">
        {clientId && (
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                {isLoading ? 'Loading client data...' : client?.name || 'Client'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground">
                You can ask questions specific to this client about their goals, progress, and milestones.
              </p>
            </CardContent>
          </Card>
        )}
        
        <ClientProgressAssistantComponent 
          clientId={parsedClientId} 
          clientName={client?.name}
        />
      </div>
    </div>
  );
}