import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PlusCircle, Edit, User, Calendar, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Client } from "@shared/schema";
import { format } from "date-fns";

export default function ClientList() {
  const [location, setLocation] = useLocation();
  
  // Fetch all clients
  const { data: clients = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const handleNewClient = () => {
    setLocation("/client/new");
  };

  return (
    <div className="flex flex-col w-full">
      {/* Header section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
        <Button 
          onClick={handleNewClient}
          className="bg-primary hover:bg-primary/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Client
        </Button>
      </div>

      {/* Client list card */}
      <Card className="border-gray-200 shadow-sm w-full">
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
    </div>
  );
}