import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  detailsContent?: React.ReactNode;
}

/**
 * A standardized modal component for reports with a two-section layout:
 * - Top section for overview/charts
 * - Bottom section for detailed data
 */
export function ReportModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  detailsContent,
}: ReportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        {/* Main content area for overview/charts */}
        <div className="py-4">
          {children}
        </div>
        
        {/* Optional details section with scroll area */}
        {detailsContent && (
          <>
            <Separator />
            <div className="mt-2">
              <h4 className="text-sm font-semibold mb-2">Details</h4>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                {detailsContent}
              </ScrollArea>
            </div>
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}