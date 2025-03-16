import React, { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Check, 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsUpDown, 
  Clock, 
  MapPin as MapPinIcon, 
  Minus, 
  Plus, 
  User as UserIcon,
  Users as UsersIcon,
  Activity as ActivityIcon,
  ListChecks,
  FileText,
  X,
  Edit,
  Trash
} from "lucide-react";
import { integratedSessionFormSchema } from "@/hooks/sessions/useSessionForm";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  useForm,
  SubmitHandler,
  Controller
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RatingSlider } from "@/components/sessions/RatingSlider";
import { GoalSelectionDialog } from "@/components/sessions/dialogs/GoalSelectionDialog";
import { MilestoneSelectionDialog } from "@/components/sessions/dialogs/MilestoneSelectionDialog";
import { ProductSelectionDialog } from "@/components/sessions/dialogs/ProductSelectionDialog";
import { StrategySelectionDialog } from "@/components/sessions/StrategySelectionDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// Helper function to hide unwanted calendar elements
function hideUnwantedCalendars() {
  const unwantedCalendars = document.querySelectorAll('.rdp-caption + .rdp-months:not(:first-of-type)');
  unwantedCalendars.forEach(calendar => {
    if (calendar.parentElement) {
      calendar.parentElement.removeChild(calendar);
    }
  });
}

type IntegratedSessionFormValues = z.infer<typeof integratedSessionFormSchema>;

interface IntegratedSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClient?: Client;
  isFullScreen?: boolean;
}

export function IntegratedSessionForm({ 
  open, 
  onOpenChange,
  initialClient,
  isFullScreen = false
}: IntegratedSessionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ... rest of your component state variables...
  
  const [goalSelectionOpen, setGoalSelectionOpen] = useState(false);
  const [milestoneSelectionOpen, setMilestoneSelectionOpen] = useState(false);
  const [productSelectionOpen, setProductSelectionOpen] = useState(false);
  const [strategySelectionOpen, setStrategySelectionOpen] = useState(false);
  
  // ... other state variables as needed ...
  
  // Rest of your component logic

  const createSessionMutation = useMutation({
    mutationFn: async (data: IntegratedSessionFormValues) => {
      // Your existing mutation logic
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session and notes created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      form.reset(defaultValues);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create session and notes",
        variant: "destructive",
      });
      console.error("Error creating session:", error);
    },
  });

  function onSubmit(data: IntegratedSessionFormValues) {
    // Only submit the form if the user explicitly clicked the Create Session button
    if (isSubmitting) {
      console.log("Form data:", data);
      console.log("Form errors:", form.formState.errors);
      createSessionMutation.mutate(data);
    } else {
      console.log("Form submission prevented - user did not explicitly submit");
    }
  }
  
  // Handle cancel button click - prevents form submission
  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    onOpenChange(false); // Close the dialog
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Record a therapy session with assessment and notes
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details">Session Details</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-grow">
              {/* Your form tabs and fields go here */}
              
              <div className="flex justify-between mt-4 pt-4 border-t">
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="flex gap-2">
                  {activeTab !== "details" && (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                  )}
                  {activeTab !== "performance" ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                    </Button>
                  ) : (
                    <Button 
                      type="submit"
                      disabled={createSessionMutation.isPending}
                      onClick={() => setIsSubmitting(true)}
                    >
                      {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}