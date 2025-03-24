import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Edit } from "lucide-react";
import type { Client } from "@shared/schema";

// Extended interface that makes nullable fields explicit
interface ClientPersonalInfoProps {
  client: {
    id: number;
    name: string;
    dateOfBirth: string | null;
    fundsManagement: string | null;
    [key: string]: any; // Allow other properties
  };
  onEdit?: () => void;
}

export default function ClientPersonalInfo({ client, onEdit }: ClientPersonalInfoProps) {
  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (e) {
      console.error("Error calculating age:", e);
      return 0;
    }
  };

  // Safely format date with error handling
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not provided';
    
    try {
      // For debugging
      console.log("Formatting date:", dateStr, "Type:", typeof dateStr);
      
      // Handle both ISO string format and Date objects
      return format(new Date(dateStr), 'MMMM d, yyyy');
    } catch (e) {
      console.error("Error formatting date:", e, dateStr);
      return dateStr;
    }
  };

  const clientAge = client.dateOfBirth ? calculateAge(client.dateOfBirth) : null;
  
  // Only log in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.log("ClientPersonalInfo received:", {
      name: client.name,
      dateOfBirth: client.dateOfBirth,
      fundsManagement: client.fundsManagement
    });
  }

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center">
          <CardTitle>{client.name}</CardTitle>
          <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
            Active
          </Badge>
        </div>
        {onEdit && (
          <Button 
            variant="ghost"
            size="icon" 
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Date of Birth</h4>
            <p className="font-medium">
              {formatDate(client.dateOfBirth)}
              {clientAge && 
                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary">
                  {clientAge} years old
                </Badge>
              }
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Funds Management</h4>
            <p className="font-medium">
              {client.fundsManagement || 'Not specified'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}