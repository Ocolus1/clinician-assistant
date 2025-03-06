import { useState } from "react";
import { Ally } from "@shared/schema";
import { UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  
  // Filter out allies that are already selected and match search term
  const availableAllies = allies.filter(ally => 
    !selectedAllies.includes(ally.name) && 
    (searchTerm === '' || ally.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
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
          <div className="mb-4">
            <Input 
              placeholder="Search attendees..." 
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
          
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {availableAllies.length === 0 ? (
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