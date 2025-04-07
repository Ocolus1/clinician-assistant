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
      <DialogContent className="w-[75vw] max-w-[1200px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        {/* Main content area with scroll for overview/charts */}
        <ScrollArea className="flex-grow overflow-auto my-4">
          <div className="py-2">
            {children}
          </div>
          
          {/* Optional details section */}
          {detailsContent && (
            <>
              <Separator className="my-4" />
              <div className="mt-2">
                <h4 className="text-sm font-semibold mb-2">Details</h4>
                <div className="rounded-md border p-4">
                  {detailsContent}
                </div>
              </div>
            </>
          )}
        </ScrollArea>
        
        <DialogFooter className="shrink-0 mt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}