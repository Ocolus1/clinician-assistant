import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PlusCircle, Edit, User, Calendar, ArrowRight, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Client } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ClientList() {
  const [location, setLocation] = useLocation();
  const [showIncomplete, setShowIncomplete] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  
  // Fetch clients with server-side filtering
  const { data: clients = [], isLoading, error, refetch } = useQuery<Client[]>({
    queryKey: ["/api/clients", { includeIncomplete: showIncomplete }],
    queryFn: async ({ queryKey }) => {
      // Extract includeIncomplete from queryKey
      const params = queryKey[1] as { includeIncomplete: boolean };
      const response = await fetch(`/api/clients?includeIncomplete=${params.includeIncomplete}`);
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    }
  });
  
  // When showIncomplete changes, refetch with the new parameter
  useEffect(() => {
    refetch();
  }, [showIncomplete, refetch]);
  
  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: (clientId: number) => 
      apiRequest("DELETE", `/api/clients/${clientId}`),
    onSuccess: () => {
      // Show success toast
      toast({
        title: "Client deleted",
        description: "The client has been successfully deleted",
        variant: "default",
      });
      
      // Invalidate both standard clients query and enriched clients query
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/enriched"] });
      
      // Reset client to delete
      setClientToDelete(null);
    },
    onError: (error) => {
      // Show error toast
      toast({
        title: "Error deleting client",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  const handleNewClient = () => {
    setLocation("/clients/new");
  };
  
  const openDeleteDialog = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteClient = () => {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete.id);
      setDeleteDialogOpen(false);
    }
  };
  
  // Add specific styles for this page
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .client-list-container {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
      }
      .client-card {
        width: 100%;
        max-width: 100%;
        flex: 1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="client-list-container w-full flex flex-col" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header section */}
      <div className="flex justify-between items-center mb-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
          <div className="flex items-center mt-2">
            <input 
              type="checkbox" 
              id="show-incomplete" 
              checked={showIncomplete}
              onChange={(e) => setShowIncomplete(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="show-incomplete" className="text-sm text-gray-600">
              Show incomplete clients
            </label>
          </div>
        </div>
        <Button 
          onClick={handleNewClient}
          className="bg-primary hover:bg-primary/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Client
        </Button>
      </div>

      {/* Client list card */}
      <Card className="client-card border-gray-200 shadow-sm w-full">
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Client List</h2>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col space-y-3 p-4 border border-gray-100 rounded-md">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex space-x-4">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <p>Failed to load clients. Please try again.</p>
            </div>
          ) : clients && clients.length > 0 ? (
            <ul className="divide-y divide-gray-200 w-full">
              {clients.map((client: Client) => (
                <li key={client.id} className="hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="flex items-center justify-center bg-gray-100 rounded-full h-10 w-10 text-gray-700 mr-3">
                          <User className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="font-medium text-gray-900">{client.name}</h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1 space-x-3">
                            <div className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                              <span>
                                {client.dateOfBirth ? format(new Date(client.dateOfBirth), 'MMM d, yyyy') : 'Unknown'}
                              </span>
                            </div>
                            {client.fundsManagement && (
                              <Badge variant="outline" className="text-xs font-normal">
                                {client.fundsManagement}
                              </Badge>
                            )}
                            {client.onboardingStatus === 'incomplete' && (
                              <Badge variant="destructive" className="text-xs font-normal ml-2">
                                Incomplete
                              </Badge>
                            )}
                            {client.onboardingStatus === 'complete' && (
                              <Badge variant="outline" className="text-xs font-normal bg-green-100 text-green-800 hover:bg-green-200 border-green-200 ml-2">
                                Complete
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        onClick={() => setLocation(`/client/${client.id}/summary`)} 
                        variant="outline" 
                        size="sm" 
                        className="text-primary hover:text-primary-dark"
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        onClick={() => setLocation(`/client/${client.id}/edit`)} 
                        variant="outline" 
                        size="sm" 
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        onClick={() => openDeleteDialog(client)} 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-800"
                        disabled={deleteClientMutation.isPending}
                      >
                        {deleteClientMutation.isPending && deleteClientMutation.variables === client.id ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-1">⏳</span>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-2">No clients found</p>
              <Button 
                onClick={handleNewClient}
                variant="outline" 
                className="mt-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add your first client
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete {clientToDelete?.name}'s record and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}