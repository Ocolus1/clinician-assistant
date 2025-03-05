import React from "react";
import { useForm } from "react-hook-form";
import { Session, SessionNote } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { RatingSlider } from "./RatingSlider";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

interface SessionNoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session & { clientName: string };
  initialData?: any; // Complete session note data if editing
}

export function SessionNoteForm({ open, onOpenChange, session, initialData }: SessionNoteFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Default values based on initial data or empty values
  const defaultValues: any = initialData
    ? { ...initialData }
    : {
        moodRating: 5,
        focusRating: 5,
        cooperationRating: 5,
        physicalActivityRating: 5,
        notes: "",
        presentAllies: [],
        presentAllyIds: [],
        products: []
      };
      
  const form = useForm({
    defaultValues
  });
  
  // Handle the API call
  const updateNote = useMutation({
    mutationFn: async (data: any) => {
      // If we have initial data, it's an update
      if (initialData) {
        return apiRequest("PUT", `/api/session-notes/${initialData.id}`, {
          ...data,
          sessionId: session.id
        });
      }
      
      // Otherwise it's a new note
      return apiRequest("POST", "/api/session-notes", {
        ...data,
        sessionId: session.id,
        status: "draft"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "notes", "complete"] });
      toast({
        title: initialData ? "Note updated" : "Note created",
        description: initialData
          ? "Session note has been updated successfully."
          : "Session note has been created successfully."
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving session note:", error);
      toast({
        title: "Error",
        description: "There was a problem saving the session note.",
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (data: any) => {
    updateNote.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Session Note" : "Create Session Note"}</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update notes and assessments for this session."
              : "Add notes and assessments for this completed session."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="general">General Notes</TabsTrigger>
                <TabsTrigger value="ratings">Ratings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter detailed notes about this session..."
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="ratings" className="space-y-6 pt-4">
                <FormField
                  control={form.control}
                  name="moodRating"
                  render={({ field }) => (
                    <FormItem>
                      <RatingSlider
                        label="Mood"
                        value={field.value}
                        onChange={field.onChange}
                        description="Client's overall mood during the session"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="focusRating"
                  render={({ field }) => (
                    <FormItem>
                      <RatingSlider
                        label="Focus"
                        value={field.value}
                        onChange={field.onChange}
                        description="Client's ability to maintain attention"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cooperationRating"
                  render={({ field }) => (
                    <FormItem>
                      <RatingSlider
                        label="Cooperation"
                        value={field.value}
                        onChange={field.onChange}
                        description="Client's willingness to engage in activities"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="physicalActivityRating"
                  render={({ field }) => (
                    <FormItem>
                      <RatingSlider
                        label="Physical Activity"
                        value={field.value}
                        onChange={field.onChange}
                        description="Client's energy and physical engagement level"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateNote.isPending}>
                {updateNote.isPending ? "Saving..." : "Save Note"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}