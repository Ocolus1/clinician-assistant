import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Full Name</h4>
          <p className="font-medium">{client.name}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Date of Birth</h4>
          <p className="font-medium">
            {client.dateOfBirth ? format(new Date(client.dateOfBirth), 'PP') : 'Not provided'}
            {clientAge && <span className="text-gray-500 ml-2">({clientAge} years old)</span>}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Funds Management</h4>
          <p className="font-medium">{client.fundsManagement}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Available Funds</h4>
          <p className="font-medium">${client.availableFunds}</p>
        </div>
      </div>
      
      <div className="mt-8">
        <h4 className="text-md font-medium mb-3">Additional Information</h4>
        <Card>
          <CardContent className="p-4 text-gray-500 italic">
            Additional details about the client will appear here. This section can be customized to include
            medical history, therapy preferences, communication needs, or other relevant information.
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-end pt-4">
        <Button className="flex items-center" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Personal Information
        </Button>
      </div>
    </div>
  );
}