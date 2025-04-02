import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { X, Calendar as CalendarIcon, Clock, MapPin, ClipboardList, ShoppingCart, ListChecks, ClipboardPen, User, Plus, Trash, Badge } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { Session, Client, Clinician } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Import form components
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface FullScreenSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClient?: Client | null;
  initialData?: Session;
  isEdit?: boolean;
}

export function FullScreenSessionForm({ 
  open, 
  onOpenChange, 
  initialClient, 
  initialData,
  isEdit = false 
}: FullScreenSessionFormProps) {
  // Only render the form when open is true
  if (!open) return null;
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("session");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClient || null);
  
  // State for attendee selection dialog
  const [attendeeDialogOpen, setAttendeeDialogOpen] = useState(false);
  
  // State for product selection dialog
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  
  // State for goal selection dialog
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  
  // Form state for session notes - for now using placeholder fields
  const [sessionNoteValues, setSessionNoteValues] = useState({
    presentAllies: [],
    products: [],
    goals: []
  });
  
  // Create the form with TypeScript validation
  const form = useForm<any>({
    defaultValues: {
      session: {
        sessionDate: new Date(),
        timeFrom: '09:00',
        timeTo: '10:00',
        location: '',
        therapistId: null,
        title: 'Therapy Session',
        status: 'completed',
        notes: '',
        description: ''
      }
    }
  });
  
  // Mock submit handler
  const onSubmit = (data: any) => {
    console.log("Form submitted with data:", data);
    toast({
      title: "Session created",
      description: "The session has been successfully created.",
    });
    onOpenChange(false);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="h-screen w-full flex flex-col">
        {/* Form Header */}
        <div className="flex justify-between items-center py-4 px-6 border-b shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {isEdit ? "Edit Session" : "New Session"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {selectedClient ? 
                `Client: ${selectedClient.originalName || selectedClient.name}` : 
                "Please select a client"}
            </p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => setConfirmDialogOpen(true)}
            className="hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden h-full">
          <div className="h-full flex flex-col md:flex-row">
            {/* Left Side - Form */}
            <div className="md:w-2/3 h-full overflow-y-auto p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Session Details</h2>
                    
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full grid grid-cols-5 p-1 bg-slate-100 rounded-lg">
                        <TabsTrigger value="session" className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Session
                        </TabsTrigger>
                        <TabsTrigger value="details" className="flex items-center">
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Observations
                        </TabsTrigger>
                        <TabsTrigger value="products" className="flex items-center">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Products
                        </TabsTrigger>
                        <TabsTrigger value="assessment" className="flex items-center">
                          <ListChecks className="h-4 w-4 mr-2" />
                          Assessment
                        </TabsTrigger>
                        <TabsTrigger value="session-notes" className="flex items-center">
                          <ClipboardPen className="h-4 w-4 mr-2" />
                          Session Notes
                        </TabsTrigger>
                      </TabsList>
                      
                      {/* Session Tab */}
                      <TabsContent value="session" className="py-4">
                        <div className="space-y-6">
                          <div className="flex flex-col space-y-4">
                            {/* Date */}
                            <div className="flex items-start">
                              <span className="font-medium text-slate-700 min-w-[100px]">Date:</span>
                              <FormField
                                control={form.control}
                                name="session.sessionDate"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant={"outline"}
                                            className={cn(
                                              "w-full justify-start text-left font-normal",
                                              !field.value && "text-muted-foreground"
                                            )}
                                          >
                                            {field.value ? (
                                              format(field.value, "dd MMM yyyy")
                                            ) : (
                                              <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Time */}
                            <div className="flex items-start">
                              <span className="font-medium text-slate-700 min-w-[100px]">Time:</span>
                              <div className="flex-1 space-x-2 flex items-center">
                                <FormField
                                  control={form.control}
                                  name="session.timeFrom"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Start" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="09:00">09:00</SelectItem>
                                          <SelectItem value="09:30">09:30</SelectItem>
                                          <SelectItem value="10:00">10:00</SelectItem>
                                          <SelectItem value="10:30">10:30</SelectItem>
                                          <SelectItem value="11:00">11:00</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <span className="text-slate-500">-</span>
                                <FormField
                                  control={form.control}
                                  name="session.timeTo"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="End" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="10:00">10:00</SelectItem>
                                          <SelectItem value="10:30">10:30</SelectItem>
                                          <SelectItem value="11:00">11:00</SelectItem>
                                          <SelectItem value="11:30">11:30</SelectItem>
                                          <SelectItem value="12:00">12:00</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                            
                            {/* Location */}
                            <div className="flex items-start">
                              <span className="font-medium text-slate-700 min-w-[100px]">Location:</span>
                              <FormField
                                control={form.control}
                                name="session.location"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <div className="relative">
                                        <Input
                                          placeholder="Enter session location"
                                          {...field}
                                        />
                                        <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      {/* Other tabs would be defined here */}
                      <TabsContent value="details">
                        <div className="py-4">
                          <FormField
                            control={form.control}
                            name="session.description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Session Observations</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter key observations from the session" 
                                    className="min-h-[200px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="session-notes">
                        <div className="py-4">
                          <FormField
                            control={form.control}
                            name="session.notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Session Notes</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter detailed session notes here" 
                                    className="min-h-[200px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  {/* Form Footer / Submit */}
                  <div className="pt-4 border-t">
                    <Button type="submit" className="mr-2" disabled={false}>
                      {isEdit ? "Update" : "Create"} Session
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDialogOpen(true)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
            
            {/* Right Side - Preview */}
            <div className="md:w-1/3 border-l border-gray-200 p-4 h-full overflow-y-auto bg-slate-50 hidden md:block">
              <div className="sticky top-4">
                <h3 className="text-lg font-medium mb-4">Session Preview</h3>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h4 className="font-medium">{form.watch('session.title')}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {form.watch('session.sessionDate') && format(form.watch('session.sessionDate'), 'MMMM d, yyyy')}
                  </p>
                  
                  <div className="mt-4 text-sm">
                    <div className="flex items-start mb-2">
                      <Clock className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                      <div>
                        <span className="font-medium">Time:</span>{' '}
                        {form.watch('session.timeFrom')} - {form.watch('session.timeTo')}
                      </div>
                    </div>
                    
                    {form.watch('session.location') && (
                      <div className="flex items-start mb-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                        <div>
                          <span className="font-medium">Location:</span>{' '}
                          {form.watch('session.location')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit? Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setConfirmDialogOpen(false);
                onOpenChange(false);
              }}
            >
              Exit without saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}