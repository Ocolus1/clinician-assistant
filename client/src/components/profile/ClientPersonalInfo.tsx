import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Edit } from "lucide-react";
import type { Client } from "@shared/schema";

interface ClientPersonalInfoProps {
  client: Client;
  onEdit?: () => void;
}

export default function ClientPersonalInfo({ client, onEdit }: ClientPersonalInfoProps) {
  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const clientAge = client.dateOfBirth ? calculateAge(client.dateOfBirth) : null;

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle>{client.name}</CardTitle>
        </div>
        {onEdit && (
          <Button 
            size="sm" 
            className="flex items-center" 
            onClick={onEdit}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Information
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Date of Birth</h4>
            <p className="font-medium">
              {client.dateOfBirth ? format(new Date(client.dateOfBirth), 'MMMM d, yyyy') : 'Not provided'}
              {clientAge && 
                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">
                  {clientAge} years old
                </Badge>
              }
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Funds Management</h4>
            <p className="font-medium">{client.fundsManagement || 'Not specified'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Available Funds</h4>
            <p className="font-medium">${typeof client.availableFunds === 'number' ? 
              client.availableFunds.toFixed(2) : 
              parseFloat(client.availableFunds as unknown as string).toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}