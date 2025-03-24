import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Edit, User, Calendar, CreditCard, Mail, Phone, Home, History, MessageSquare, Settings, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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

  // Extract client name and unique identifier (if present)
  const clientNameParts = client.name.split('-');
  const displayName = clientNameParts[0];
  const identifier = clientNameParts.length > 1 ? clientNameParts[1] : null;

  // Determine fund management badge styles
  const getFundManagementStyles = () => {
    switch(client.fundsManagement) {
      case 'Self-Managed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Advisor-Managed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Custodian-Managed':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center">
            <div className="mr-3 bg-gradient-to-br from-primary/10 to-primary/30 rounded-full p-2.5">
              <User className="h-6 w-6 text-primary/80" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{displayName}</CardTitle>
              {identifier && (
                <CardDescription className="text-xs mt-0.5">
                  ID: {identifier}
                </CardDescription>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Active
          </Badge>

          {onEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={onEdit}
                    className="rounded-full hover:bg-primary/5 focus:ring-2 focus:ring-offset-2 focus:ring-primary/20"
                    aria-label="Edit personal information"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Information
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit client personal information</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-3 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
          <div className="space-y-4">
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Date of Birth</h4>
                <p className="font-medium flex items-center">
                  {formatDate(client.dateOfBirth)}
                  {clientAge && 
                    <Badge variant="outline" className="ml-2.5 bg-primary/10 text-primary border-primary/25">
                      {clientAge} years old
                    </Badge>
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <CreditCard className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Funds Management</h4>
                <p className="font-medium flex items-center">
                  <Badge variant="outline" className={cn("mr-1.5", getFundManagementStyles())}>
                    {client.fundsManagement || 'Not specified'}
                  </Badge>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {client.contactEmail && (
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Contact Email</h4>
                  <p className="font-medium">{client.contactEmail}</p>
                </div>
              </div>
            )}
            
            {client.contactPhone && (
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Contact Phone</h4>
                  <p className="font-medium">{client.contactPhone}</p>
                </div>
              </div>
            )}

            {!client.contactEmail && !client.contactPhone && (
              <div className="flex items-start">
                <MessageSquare className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Contact Information</h4>
                  <p className="text-muted-foreground italic">No contact information provided</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional fields that can be shown when expanded */}
        {(client.address || client.medicalHistory || client.communicationNeeds || client.therapyPreferences) && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              {client.address && (
                <div className="flex items-start">
                  <Home className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Address</h4>
                    <p className="font-medium">{client.address}</p>
                  </div>
                </div>
              )}
              
              {client.medicalHistory && (
                <div className="flex items-start">
                  <History className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Medical History</h4>
                    <p className="font-medium">{client.medicalHistory}</p>
                  </div>
                </div>
              )}

              {client.communicationNeeds && (
                <div className="flex items-start">
                  <MessageSquare className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Communication Needs</h4>
                    <p className="font-medium">{client.communicationNeeds}</p>
                  </div>
                </div>
              )}

              {client.therapyPreferences && (
                <div className="flex items-start">
                  <Settings className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Therapy Preferences</h4>
                    <p className="font-medium">{client.therapyPreferences}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}