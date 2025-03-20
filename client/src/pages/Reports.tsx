import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { Client } from "../../../shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Users } from "lucide-react";
import { ClientReports } from "@/components/profile/ClientReports";
import { useState } from "react";

/**
 * Reports page component
 * 
 * This page allows users to access various reports for clients or the practice
 */
export default function Reports() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  // Fetch all clients for the dropdown
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: getQueryFn({
      on401: "throw",
      getFn: () => ({ url: '/api/clients' })
    })
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Access performance reports, progress tracking, and budget analysis
        </p>
      </div>
      
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Client Reports
            </CardTitle>
            <CardDescription>
              View performance metrics and progress reports for individual clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex flex-col space-y-2">
                {isLoading ? (
                  <p className="text-muted-foreground">Loading clients...</p>
                ) : clients && clients.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select a client:</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={selectedClientId || ""}
                      onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">-- Select a client --</option>
                      {clients.map((client: Client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No clients found</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              {selectedClientId ? (
                <Button 
                  variant="default" 
                  onClick={() => window.location.href = `/client/${selectedClientId}/profile?tab=reports`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Reports
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <FileText className="mr-2 h-4 w-4" />
                  Select a client
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Practice Reports
            </CardTitle>
            <CardDescription>
              View aggregated performance metrics and statistics for your practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Practice-wide reporting provides insights across all clients and therapists.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Client Overview
                </Button>
                <Button variant="outline" className="justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Budget Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Preview panel for selected client */}
      {selectedClientId && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>
                Client Performance Preview
              </CardTitle>
              <CardDescription>
                {clients?.find((c: Client) => c.id === selectedClientId)?.name || 'Selected client'} - Performance Report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientReports clientId={selectedClientId} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}