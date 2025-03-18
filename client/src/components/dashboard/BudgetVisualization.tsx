import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BudgetBubbleChart } from './BudgetBubbleChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Client } from '@shared/schema';

interface BudgetVisualizationProps {
  className?: string;
}

export function BudgetVisualization({ className }: BudgetVisualizationProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      return response as unknown as Client[];
    }
  });

  // Set default selected client when data loads
  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Handle client selection change
  const handleClientChange = (value: string) => {
    setSelectedClientId(parseInt(value));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Budget Allocation</CardTitle>
            <CardDescription>
              Visualization of budget items by size and usage
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="client-select" className="text-sm">Client:</Label>
            {isLoading ? (
              <Skeleton className="h-9 w-[180px]" />
            ) : (
              <Select 
                value={selectedClientId?.toString() || ''}
                onValueChange={handleClientChange}
              >
                <SelectTrigger id="client-select" className="w-[180px]">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients && clients.length > 0 ? (
                    clients.map(client => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-clients" disabled>
                      No clients available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedClientId ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-500 gap-2">
            <Info className="h-10 w-10 text-gray-400" />
            <p>Select a client to view budget visualization</p>
          </div>
        ) : (
          <BudgetBubbleChart clientId={selectedClientId} />
        )}
      </CardContent>
    </Card>
  );
}