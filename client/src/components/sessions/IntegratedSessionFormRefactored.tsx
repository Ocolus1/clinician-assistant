import React, { useState } from "react";
import "./session-form.css";
import { cn } from "@/lib/utils";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThreeColumnLayout } from "./ThreeColumnLayout";
import { Button } from "@/components/ui/button";

interface IntegratedSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClient?: any;
  isFullScreen?: boolean;
}

/**
 * Integrated session form component that combines session creation with notes and assessments
 */
export function IntegratedSessionFormRefactored({ 
  open, 
  onOpenChange,
  initialClient,
  isFullScreen = false
}: IntegratedSessionFormProps) {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <div className={isFullScreen ? "fullscreen-form" : ""}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className={cn(
            "p-0 overflow-hidden w-[95vw] h-[90vh] max-w-none scrollable-content",
            isFullScreen && "fullscreen-dialog"
          )}
        >
          <ThreeColumnLayout
            leftColumn={
              <div className="p-4 h-full flex flex-col">
                <DialogHeader className="px-1 mb-6">
                  <DialogTitle>New Session</DialogTitle>
                  <DialogDescription>
                    Create a new therapy session with notes and assessments
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs 
                  value={activeTab} 
                  onValueChange={setActiveTab}
                  className="flex-1 flex flex-col session-form-tabs"
                >
                  <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4 overflow-x-auto flex-wrap">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="present">Present</TabsTrigger>
                    <TabsTrigger value="goals">Goals</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                  </TabsList>
                  
                  <div className="overflow-auto flex-1 scrollable-content session-form-content">
                    <TabsContent value="details" className="mt-0 h-full">
                      <p>Session details form will go here</p>
                    </TabsContent>
                    
                    <TabsContent value="present" className="mt-0 h-full">
                      <p>Present form will go here</p>
                    </TabsContent>
                    
                    <TabsContent value="goals" className="mt-0 h-full">
                      <p>Goals form will go here</p>
                    </TabsContent>
                    
                    <TabsContent value="products" className="mt-0 h-full">
                      <p>Products form will go here</p>
                    </TabsContent>
                    
                    <TabsContent value="notes" className="mt-0 h-full">
                      <p>Notes form will go here</p>
                    </TabsContent>
                  </div>
                </Tabs>
                
                <div className="px-1 mt-4 session-form-footer flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="button">
                    Create Session
                  </Button>
                </div>
              </div>
            }
            middleColumn={
              <div className="bg-muted/20 p-6 flex flex-col items-center justify-center">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">Session Preview</h2>
                  <p className="text-muted-foreground">
                    {initialClient ? initialClient.name : "Select a client to continue"}
                  </p>
                </div>
              </div>
            }
            rightColumn={
              <div className="bg-muted/10 p-6 flex flex-col">
                <h2 className="text-xl font-semibold mb-4">Session Progress</h2>
                <p>Progress tracking will go here</p>
              </div>
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}