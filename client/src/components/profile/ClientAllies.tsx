import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Edit, UserPlus, Archive, Unlock, ShieldCheck, Mail, Phone, Globe, ArchiveRestore, FileText } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Ally } from "@shared/schema";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ClientAlliesProps {
  allies: Ally[];
  clientId: number;
  onAddAlly?: () => void;
  onEditAlly?: (ally: Ally) => void;
  onDeleteAlly?: (ally: Ally) => void;
  onContactAlly?: (ally: Ally) => void;
}

export default function ClientAllies({ 
  allies, 
  clientId,
  onAddAlly, 
  onEditAlly, 
  onDeleteAlly,
  onContactAlly 
}: ClientAlliesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [allyToArchive, setAllyToArchive] = useState<Ally | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showArchivedAllies, setShowArchivedAllies] = useState(false);
  
  // Filter allies based on their archived status
  const activeAllies = allies.filter(ally => !ally.archived);
  const archivedAllies = allies.filter(ally => ally.archived);
  
  // Display allies based on the filter
  const displayedAllies = showArchivedAllies ? archivedAllies : activeAllies;
  
  // Archive/restore mutation
  const archiveMutation = useMutation({
    mutationFn: ({ allyId, archived }: { allyId: number; archived: boolean }) => 
      apiRequest('PUT', `/api/clients/${clientId}/allies/${allyId}/archive`, { archived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/allies`] });
      toast({
        title: allyToArchive?.archived ? 'Ally Restored' : 'Ally Archived',
        description: allyToArchive?.archived 
          ? `${allyToArchive.name} has been restored from archive.`
          : `${allyToArchive?.name} has been archived.`,
      });
      setShowArchiveDialog(false);
      setAllyToArchive(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update ally: ${error}`,
        variant: 'destructive',
      });
    }
  });
  
  const handleArchiveClick = (ally: Ally) => {
    setAllyToArchive(ally);
    setShowArchiveDialog(true);
  };
  
  const handleArchiveConfirm = () => {
    if (allyToArchive) {
      archiveMutation.mutate({ 
        allyId: allyToArchive.id, 
        archived: !allyToArchive.archived 
      });
    }
  };

  // Function to handle contact via email
  const handleContactEmail = (ally: Ally) => {
    if (ally.email && onContactAlly) {
      onContactAlly(ally);
    }
  };
  
  return (
    <div className="space-y-6">
      {allies.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-500 mb-2">No allies added yet</h4>
          <p className="text-gray-500 mb-4">Add family members, caregivers, or therapists to the client's support network.</p>
          <Button onClick={onAddAlly}>Add First Ally</Button>
        </div>
      ) : (
        <>
          {/* Archived/Active toggle */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {showArchivedAllies ? 'Archived Allies' : 'Active Allies'}
              <Badge variant="outline" className="ml-2">
                {displayedAllies.length}
              </Badge>
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowArchivedAllies(!showArchivedAllies)}
              className="flex items-center gap-1"
            >
              {showArchivedAllies ? (
                <>
                  <Users className="h-4 w-4" />
                  Show Active
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Show Archived
                </>
              )}
            </Button>
          </div>
          
          {/* Ally Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedAllies.length > 0 ? (
              displayedAllies.map((ally) => (
                <Card 
                  key={ally.id} 
                  className={`overflow-hidden ${ally.archived ? 'bg-gray-50 border-gray-200' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-lg flex items-center gap-2">
                            {ally.name}
                            {ally.archived && (
                              <Badge variant="outline" className="text-xs bg-gray-100">
                                Archived
                              </Badge>
                            )}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {ally.relationship}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Access permissions badges */}
                      <div className="flex space-x-1">
                        {ally.accessTherapeutics && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
                            <FileText className="h-3 w-3 mr-1" />
                            Therapeutic
                          </Badge>
                        )}
                        {ally.accessFinancials && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Financial
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-2 pb-4">
                    <div className="grid grid-cols-1 gap-y-1 text-sm text-gray-500">
                      {ally.email && (
                        <div className="flex items-center">
                          <Mail className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          <span>{ally.email}</span>
                        </div>
                      )}
                      {ally.phone && (
                        <div className="flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          <span>{ally.phone}</span>
                        </div>
                      )}
                      {ally.preferredLanguage && (
                        <div className="flex items-center">
                          <Globe className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          <span>{ally.preferredLanguage}</span>
                        </div>
                      )}
                      {ally.notes && (
                        <div className="flex items-start mt-2">
                          <FileText className="h-3.5 w-3.5 mr-2 mt-0.5 text-gray-400" />
                          <span className="text-xs">{ally.notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-0 border-t bg-gray-50 flex justify-between">
                    <div className="flex items-center space-x-1">
                      {onContactAlly && !ally.archived && (
                        <Button variant="ghost" size="sm" onClick={() => handleContactEmail(ally)}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Contact
                        </Button>
                      )}
                      {onEditAlly && !ally.archived && (
                        <Button variant="ghost" size="sm" onClick={() => onEditAlly(ally)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={ally.archived 
                        ? "text-green-600 hover:text-green-800 hover:bg-green-50" 
                        : "text-amber-600 hover:text-amber-800 hover:bg-amber-50"}
                      onClick={() => handleArchiveClick(ally)}
                    >
                      {ally.archived ? (
                        <>
                          <ArchiveRestore className="h-4 w-4 mr-1" />
                          Restore
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4 mr-1" />
                          Archive
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-2 text-center py-6 bg-gray-50 rounded-lg">
                <Archive className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">
                  {showArchivedAllies ? 'No archived allies found.' : 'No active allies found.'}
                </p>
              </div>
            )}
          </div>
          
          {!showArchivedAllies && (
            <div className="flex justify-end pt-4">
              <Button className="flex items-center" onClick={onAddAlly}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Ally
              </Button>
            </div>
          )}
        </>
      )}
      
      {/* Archive/Restore Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {allyToArchive?.archived ? 'Restore Ally' : 'Archive Ally'}
            </DialogTitle>
            <DialogDescription>
              {allyToArchive?.archived ? (
                <>
                  Are you sure you want to restore {allyToArchive?.name} to active status?
                  This will make them visible in the main allies list again.
                </>
              ) : (
                <>
                  Are you sure you want to archive {allyToArchive?.name}?
                  Archived allies won't appear in the main allies list but can be restored later.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant={allyToArchive?.archived ? "default" : "secondary"}
              onClick={handleArchiveConfirm}
            >
              {allyToArchive?.archived ? 'Restore' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}