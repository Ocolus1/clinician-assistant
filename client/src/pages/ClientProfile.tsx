import React, { useState, useEffect } from "react";
import { useParams, useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Users, 
  Target, 
  DollarSign, 
  Calendar, 
  FileText,
  ArrowLeft,
  Edit,
  Clock,
  ChevronRight,
  MessageSquare,
  Award
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Client, Ally, Goal, Subgoal, BudgetSettings, BudgetItem } from "@shared/schema";

// Tab components (to be implemented)
import ClientPersonalInfo from "../components/profile/ClientPersonalInfo";
import ClientAllies from "../components/profile/ClientAllies";
import ClientGoals from "../components/profile/ClientGoals";
import ClientBudget from "../components/profile/ClientBudget";
import ClientSessions from "../components/profile/ClientSessions";
import ClientReports from "../components/profile/ClientReports";

// Function to parse URL parameters for active tab
function getActiveTabFromURL(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tab') || 'personal';
}

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());

  // Fetch client data
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['/api/clients', clientId],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch allies
  const { data: allies = [], isLoading: isLoadingAllies } = useQuery({
    queryKey: ['/api/clients', clientId, 'allies'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch goals
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: ['/api/clients', clientId, 'goals'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch budget items
  const { data: budgetItems = [], isLoading: isLoadingBudgetItems } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-items'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch budget settings
  const { data: budgetSettings, isLoading: isLoadingBudgetSettings } = useQuery({
    queryKey: ['/api/clients', clientId, 'budget-settings'],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!clientId,
  });

  // Fetch subgoals for each goal
  const subgoalQueries = goals.map((goal: Goal) => {
    return useQuery({
      queryKey: ['/api/goals', goal.id, 'subgoals'],
      queryFn: getQueryFn({ on401: "throw" }),
      enabled: !!goal.id,
    });
  });

  const isLoadingSubgoals = subgoalQueries.some(query => query.isLoading);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL with tab parameter without navigating
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url.toString());
  };

  // Go back to client list
  const handleBack = () => {
    setLocation("/clients");
  };

  // Calculate total budget
  const totalBudget = React.useMemo(() => {
    return budgetItems.reduce((acc: number, item: BudgetItem) => {
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity;
      return acc + (unitPrice * quantity);
    }, 0);
  }, [budgetItems]);

  // Calculate budget percentage
  const budgetPercentage = React.useMemo(() => {
    if (!budgetSettings) return 0;
    const availableFunds = typeof budgetSettings.availableFunds === 'string' 
      ? parseFloat(budgetSettings.availableFunds) 
      : budgetSettings.availableFunds;
    
    return availableFunds > 0 ? (totalBudget / availableFunds) * 100 : 0;
  }, [totalBudget, budgetSettings]);

  // Loading state
  const isLoading = isLoadingClient || isLoadingAllies || isLoadingGoals || 
    isLoadingBudgetItems || isLoadingBudgetSettings || isLoadingSubgoals;

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-4" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-8" />
            <div className="space-y-8">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-4" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Client Not Found</h1>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-medium mb-2">Client not found</h2>
            <p className="text-gray-500 mb-4">The client you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={handleBack}>Return to Client List</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const clientAge = client.dateOfBirth ? calculateAge(client.dateOfBirth) : null;

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4" 
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Client Profile</h1>
      </div>
      
      {/* Client info card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{client.name}</h2>
                <div className="flex items-center text-gray-500">
                  {clientAge && (
                    <span className="mr-3">{clientAge} years old</span>
                  )}
                  {client.dateOfBirth && (
                    <span>Born: {format(new Date(client.dateOfBirth), 'PP')}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {client.fundsManagement}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-500">Allies</div>
                <div className="font-medium">{allies.length} supporters</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Target className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-500">Progress</div>
                <div className="font-medium">{goals.length} active goals</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-500">Budget</div>
                <div className="flex items-center">
                  <div className="font-medium mr-2">
                    ${totalBudget.toFixed(2)} / ${budgetSettings?.availableFunds.toFixed(2)}
                  </div>
                  <Progress value={budgetPercentage} className="h-2 w-16" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs section */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-6 mb-6">
          <TabsTrigger value="personal" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Personal Info</span>
            <span className="inline md:hidden">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="allies" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            <span>Allies</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            <span>Goals</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>Budget</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            <span>Reports</span>
          </TabsTrigger>
        </TabsList>
        
        <Card>
          <CardContent className="p-6">
            <TabsContent value="personal" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Personal Information</h3>
              <p className="text-gray-500 mb-6">
                View and edit the client's personal details, contact information, and preferences.
              </p>
              
              {/* Personal Info Tab - Will be replaced with component */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Full Name</h4>
                    <p className="font-medium">{client.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Date of Birth</h4>
                    <p className="font-medium">{client.dateOfBirth ? format(new Date(client.dateOfBirth), 'PP') : 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Funds Management</h4>
                    <p className="font-medium">{client.fundsManagement}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Available Funds</h4>
                    <p className="font-medium">${client.availableFunds}</p>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button className="flex items-center">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Personal Information
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="allies" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Support Network</h3>
              <p className="text-gray-500 mb-6">
                Manage the client's support network including family members, caregivers, and therapists.
              </p>
              
              {/* Allies Tab - Will be replaced with component */}
              <div className="space-y-6">
                {allies.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-500 mb-2">No allies added yet</h4>
                    <p className="text-gray-500 mb-4">Add family members, caregivers, or therapists to the client's support network.</p>
                    <Button>Add First Ally</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allies.map((ally: Ally) => (
                      <Card key={ally.id} className="overflow-hidden">
                        <div className="flex items-center p-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{ally.name}</h4>
                            <div className="text-sm text-gray-500">{ally.relationship}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              <span className="hidden md:inline">Contact</span>
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              <span className="hidden md:inline">Edit</span>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    <div className="flex justify-end pt-4">
                      <Button className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Add New Ally
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="goals" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Therapeutic Goals</h3>
              <p className="text-gray-500 mb-6">
                Track and manage the client's therapeutic goals and sub-goals.
              </p>
              
              {/* Goals Tab - Will be replaced with component */}
              <div className="space-y-6">
                {goals.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-500 mb-2">No goals set yet</h4>
                    <p className="text-gray-500 mb-4">Set therapeutic goals and track progress over time.</p>
                    <Button>Add First Goal</Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {goals.map((goal: Goal, index: number) => (
                      <Card key={goal.id} className="overflow-hidden">
                        <CardHeader className="py-4 px-6 bg-gray-50 border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                <Award className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">{goal.title}</h4>
                                <div className="text-sm text-gray-500">Added {format(new Date(), 'PP')}</div>
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-700 border-green-200">In Progress</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="mb-4">
                            <p className="text-gray-600">{goal.description}</p>
                          </div>
                          
                          <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="text-sm font-medium">Overall Progress</h5>
                              <span className="text-sm font-medium">40%</span>
                            </div>
                            <Progress value={40} className="h-2" />
                          </div>
                          
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium">Subgoals</h5>
                            
                            {subgoalQueries[index].data?.map((subgoal: Subgoal) => (
                              <div key={subgoal.id} className="flex items-center py-2 border-b border-gray-100">
                                <div className="h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                                  <Target className="h-3 w-3 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h6 className="font-medium text-sm">{subgoal.title}</h6>
                                  {subgoal.description && (
                                    <p className="text-xs text-gray-500">{subgoal.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="ml-2">
                                  {subgoal.status || 'Pending'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 py-3 px-6 bg-gray-50 border-t">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Goal
                          </Button>
                          <Button size="sm">
                            Add Subgoal
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                    
                    <div className="flex justify-end pt-4">
                      <Button className="flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Add New Goal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="budget" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Budget Management</h3>
              <p className="text-gray-500 mb-6">
                Track and manage the client's budget, funding sources, and expenditures.
              </p>
              
              {/* Budget Tab - Will be replaced with component */}
              <div className="space-y-6">
                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Available Funds</h4>
                        <p className="text-2xl font-bold">${budgetSettings?.availableFunds.toFixed(2)}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Used</h4>
                        <p className="text-2xl font-bold">${totalBudget.toFixed(2)}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Remaining</h4>
                        <p className="text-2xl font-bold">${(parseFloat(budgetSettings?.availableFunds) - totalBudget).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Budget Utilization</span>
                        <span>{budgetPercentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={budgetPercentage} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Budget Items</h4>
                    <Button size="sm">Add Budget Item</Button>
                  </div>
                  
                  {budgetItems.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <h4 className="text-lg font-medium text-gray-500 mb-2">No budget items added</h4>
                      <p className="text-gray-500 mb-4">Add items to track expenses related to therapy services.</p>
                      <Button>Add First Budget Item</Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left p-3 border-b font-medium text-sm text-gray-500">Item</th>
                            <th className="text-left p-3 border-b font-medium text-sm text-gray-500">Category</th>
                            <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Unit Price</th>
                            <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Quantity</th>
                            <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Total</th>
                            <th className="text-right p-3 border-b font-medium text-sm text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetItems.map((item: BudgetItem) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">{item.name}</td>
                              <td className="p-3">{item.category}</td>
                              <td className="p-3 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                              <td className="p-3 text-right">{item.quantity}</td>
                              <td className="p-3 text-right font-medium">
                                ${(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}
                              </td>
                              <td className="p-3 text-right">
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50">
                            <td colSpan={4} className="p-3 text-right font-medium">Total</td>
                            <td className="p-3 text-right font-bold">${totalBudget.toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sessions" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Therapy Sessions</h3>
              <p className="text-gray-500 mb-6">
                Schedule and track therapy sessions, view session history and notes.
              </p>
              
              {/* Sessions Tab - Will be replaced with component */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Upcoming Sessions</h4>
                  <Button>Schedule Session</Button>
                </div>
                
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-500 mb-2">No upcoming sessions</h4>
                  <p className="text-gray-500 mb-4">Schedule therapy sessions to start tracking progress.</p>
                  <Button>Schedule First Session</Button>
                </div>
                
                <div className="mt-8">
                  <h4 className="font-medium mb-4">Session History</h4>
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <h5 className="text-md font-medium text-gray-500 mb-2">No past sessions</h5>
                    <p className="text-gray-500">Session history will appear here once sessions are completed.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="reports" className="mt-0">
              <h3 className="text-lg font-medium mb-4">Progress Reports</h3>
              <p className="text-gray-500 mb-6">
                Generate, view, and share progress reports and assessments.
              </p>
              
              {/* Reports Tab - Will be replaced with component */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Available Reports</h4>
                  <Button>Generate New Report</Button>
                </div>
                
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-500 mb-2">No reports generated</h4>
                  <p className="text-gray-500 mb-4">Generate progress reports to track and share therapeutic progress.</p>
                  <Button>Create First Report</Button>
                </div>
                
                <div className="mt-8">
                  <h4 className="font-medium mb-4">Report Templates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4 text-center">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <h5 className="font-medium mb-1">Monthly Progress</h5>
                        <p className="text-xs text-gray-500">Comprehensive monthly progress summary</p>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4 text-center">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <h5 className="font-medium mb-1">Goal Achievement</h5>
                        <p className="text-xs text-gray-500">Detailed goal-specific progress report</p>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4 text-center">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <h5 className="font-medium mb-1">Treatment Summary</h5>
                        <p className="text-xs text-gray-500">Overview of treatment plan and outcomes</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}