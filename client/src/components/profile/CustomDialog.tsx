import * as React from "react";
import { DialogContent as ShadcnDialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

// Custom Dialog Content that hides the built-in X button
export const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof ShadcnDialogContent>,
  React.ComponentPropsWithoutRef<typeof ShadcnDialogContent>
>(({ className, children, ...props }, ref) => {
  // Custom styles that hide the default X button
  const customStyles = `
    [data-radix-dialog-content] > button[data-radix-dialog-close] {
      display: none !important;
    }
  `;

  return (
    <>
      <style>{customStyles}</style>
      <ShadcnDialogContent 
        ref={ref} 
        className={className} 
        {...props}
      >
        {children}
      </ShadcnDialogContent>
    </>
  );
});

CustomDialogContent.displayName = "CustomDialogContent";