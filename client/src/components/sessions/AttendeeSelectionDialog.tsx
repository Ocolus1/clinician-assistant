import { useState, useEffect } from "react";
import { Ally } from "@shared/schema";
import { UserIcon, AlertCircle, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Dialog component for selecting attendees from the client's allies list
 */
interface AttendeeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allies: Ally[];
  selectedAllies: string[];
  onSelectAttendee: (ally: Ally) => void;
}

export function AttendeeSelectionDialog({
  open,
  onOpenChange,
  allies,
  selectedAllies,
  onSelectAttendee
}: AttendeeSelectionDialogProps) {
  // State for search input
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  // Reset search term when dialog opens
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      
      // Show a helpful warning if no allies are available
      if (allies.length === 0) {
        toast({
          title: "No allies available",
          description: "This client doesn't have any allied health professionals or supporters added yet.",
          variant: "destructive",
        });
      }
    }
  }, [open, allies, toast]);
  
  // Filter out allies that are already selected and match search term
  const availableAllies = allies.filter(ally => 
    !selectedAllies.includes(ally.name) && 
    (searchTerm === '' || ally.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Log for debugging
  useEffect(() => {
    if (open) {
      console.log("AttendeeSelectionDialog - Available allies:", availableAllies);
      console.log("AttendeeSelectionDialog - Selected allies:", selectedAllies);
      console.log("AttendeeSelectionDialog - All allies:", allies);
    }
  }, [open, availableAllies, selectedAllies, allies]);
  
  // Safe guard to prevent the dialog from submitting the form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === 'Enter') {
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Attendee</DialogTitle>
          <DialogDescription>
            Choose a person who attended this therapy session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {allies.length === 0 ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No allies found</AlertTitle>
              <AlertDescription>
                This client doesn't have any allied health professionals or supporters added.
                You'll need to add allies to the client profile first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="mb-4">
                <Input 
                  placeholder="Search attendees..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full"
                  autoFocus
                />
              </div>
              
              {/* Count info */}
              <div className="text-xs text-muted-foreground mb-2 flex items-center">
                <Users className="h-3 w-3 mr-1 inline" />
                Available: {availableAllies.length} | Selected: {selectedAllies.length} | Total: {allies.length}
              </div>
            </>
          )}
          
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {allies.length === 0 ? (
                <div className="text-center p-6">
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    className="mr-2"
                  >
                    Close
                  </Button>
                </div>
              ) : availableAllies.length === 0 ? (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No matching attendees found' : 'All attendees have been added'}
                  </p>
                </div>
              ) : (
                availableAllies.map(ally => (
                  <Card 
                    key={ally.id} 
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => onSelectAttendee(ally)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                          <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{ally.name}</p>
                          <p className="text-xs text-muted-foreground">{ally.relationship || "Supporter"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}