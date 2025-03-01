import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Edit } from "lucide-react";
import type { Client } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold">{client.name}</h3>
        <Button className="flex items-center" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Information
        </Button>
      </div>
      
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Date of Birth</h4>
              <p className="font-medium">
                {client.dateOfBirth ? format(new Date(client.dateOfBirth), 'PP') : 'Not provided'}
                {clientAge && <span className="text-gray-500 ml-2">({clientAge} years old)</span>}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Gender</h4>
              <p className="font-medium">{client.gender || 'Not specified'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Preferred Language</h4>
              <p className="font-medium">{client.preferredLanguage || 'Not specified'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Funds Management</h4>
              <p className="font-medium">{client.fundsManagement || 'Not specified'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Available Funds</h4>
              <p className="font-medium">${client.availableFunds.toFixed(2)}</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="contact" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
              <p className="font-medium">{client.contactEmail || 'Not provided'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Phone Number</h4>
              <p className="font-medium">{client.contactPhone || 'Not provided'}</p>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Address</h4>
              <p className="font-medium whitespace-pre-line">{client.address || 'Not provided'}</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Medical History</h4>
              <p className="mb-4 whitespace-pre-line">{client.medicalHistory || 'No medical history provided'}</p>
              
              <h4 className="text-sm font-medium text-gray-500 mb-2">Communication Needs</h4>
              <p className="mb-4 whitespace-pre-line">{client.communicationNeeds || 'No specific communication needs provided'}</p>
              
              <h4 className="text-sm font-medium text-gray-500 mb-2">Therapy Preferences</h4>
              <p className="whitespace-pre-line">{client.therapyPreferences || 'No therapy preferences provided'}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}