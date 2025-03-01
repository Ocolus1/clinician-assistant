import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Edit, UserPlus, Trash2 } from "lucide-react";
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

interface ClientAlliesProps {
  allies: Ally[];
  onAddAlly?: () => void;
  onEditAlly?: (ally: Ally) => void;
  onDeleteAlly?: (ally: Ally) => void;
  onContactAlly?: (ally: Ally) => void;
}

export default function ClientAllies({ 
  allies, 
  onAddAlly, 
  onEditAlly, 
  onDeleteAlly,
  onContactAlly 
}: ClientAlliesProps) {
  const [allyToDelete, setAllyToDelete] = React.useState<Ally | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  
  const handleDeleteClick = (ally: Ally) => {
    setAllyToDelete(ally);
    setShowDeleteDialog(true);
  };
  
  const handleDeleteConfirm = () => {
    if (allyToDelete && onDeleteAlly) {
      onDeleteAlly(allyToDelete);
    }
    setShowDeleteDialog(false);
    setAllyToDelete(null);
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
        <div className="space-y-4">
          {allies.map((ally) => (
            <Card key={ally.id} className="overflow-hidden">
              <div className="flex items-center p-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{ally.name}</h4>
                    <Badge variant="outline" className="text-xs">{ally.relationship}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                    {ally.email && <div>Email: {ally.email}</div>}
                    {ally.phone && <div>Phone: {ally.phone}</div>}
                    {ally.preferredLanguage && <div>Language: {ally.preferredLanguage}</div>}
                    {ally.notes && <div className="col-span-2 mt-1">{ally.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {onContactAlly && (
                    <Button variant="ghost" size="sm" onClick={() => onContactAlly(ally)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      <span className="hidden md:inline">Contact</span>
                    </Button>
                  )}
                  {onEditAlly && (
                    <Button variant="ghost" size="sm" onClick={() => onEditAlly(ally)}>
                      <Edit className="h-4 w-4 mr-2" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                  )}
                  {onDeleteAlly && (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteClick(ally)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span className="hidden md:inline">Remove</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          
          <div className="flex justify-end pt-4">
            <Button className="flex items-center" onClick={onAddAlly}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Ally
            </Button>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Ally</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {allyToDelete?.name} from this client's support network?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}