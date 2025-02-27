import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Printer, Mail, Check, RefreshCw, AlertCircle } from "lucide-react";
import { LanguageSelector, Language } from "../components/summary/LanguageSelector";
import { AllySelector } from "../components/summary/AllySelector";
import { Client, Ally, Goal, BudgetItem, BudgetSettings } from "@shared/schema";
import {
  translateSections,
  TranslationStatus,
  getTranslatedText
} from "@/lib/translationService";

// Import toast for notifications
import { useToast } from "@/hooks/use-toast";

// Define the subgoal type to make TypeScript happy
interface Subgoal {
  id: number;
  title: string;
  description: string;
  status?: string;
  goalId: number;
}

// Define the enriched goal type with subgoals
interface EnrichedGoal extends Goal {
  subgoals?: Subgoal[];
}

export default function PrintSummary() {
  const { clientId } = useParams();
  const [, setLocation] = useLocation();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showAllySelector, setShowAllySelector] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  
  // Translation state
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>(TranslationStatus.IDLE);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  
  // For preview mode
  const [previewMode, setPreviewMode] = useState(false);
  
  // Toast for notifications
  const { toast } = useToast();

  console.log("PrintSummary component - clientId param:", clientId);
  const parsedClientId = clientId ? parseInt(clientId) : 0;
  console.log("PrintSummary component - parsedClientId:", parsedClientId);
  
  // Fetch client data with improved error handling
  const { 
    data: client, 
    isLoading: isClientLoading,
    isError: isClientError,
    error: clientError,
    refetch: refetchClient
  } = useQuery<Client>({
    queryKey: ["/api/clients", parsedClientId],
    queryFn: async () => {
      console.log(`Manually fetching client with ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}`);
      
      if (!response.ok) {
        console.error(`Error fetching client: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch client: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Client data retrieved:", data);
      return data;
    },
    enabled: parsedClientId > 0,
    retry: 3, // Increase retries to handle intermittent issues
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 30000 // Cache for 30 seconds
  });

  console.log("Client query result:", { isLoading: isClientLoading, isError: isClientError, data: client });

  // Only fetch related data if client data was successful
  const fetchRelatedData = Boolean(client?.id);

  const { data: allies = [] } = useQuery<Ally[]>({
    queryKey: ["/api/clients", parsedClientId, "allies"],
    queryFn: async () => {
      console.log(`Fetching allies for client ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}/allies`);
      
      if (!response.ok) {
        console.error(`Error fetching allies: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`Retrieved ${data.length} allies:`, data);
      return data;
    },
    enabled: parsedClientId > 0 && fetchRelatedData,
    retry: 1,
  });

  const { data: goals = [], isSuccess: goalsSuccess } = useQuery<Goal[]>({
    queryKey: ["/api/clients", parsedClientId, "goals"],
    queryFn: async () => {
      console.log(`Fetching goals for client ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}/goals`);
      
      if (!response.ok) {
        console.error(`Error fetching goals: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`Retrieved ${data.length} goals:`, data);
      return data;
    },
    enabled: parsedClientId > 0 && fetchRelatedData,
    retry: 1,
  });
  
  // Fetch subgoals for each goal
  const goalsWithSubgoals = useQuery<EnrichedGoal[]>({
    queryKey: ["/api/clients", parsedClientId, "goals-with-subgoals"],
    queryFn: async () => {
      console.log("Fetching subgoals for all goals");
      const enrichedGoals = await Promise.all(
        goals.map(async (goal) => {
          try {
            const response = await fetch(`/api/goals/${goal.id}/subgoals`);
            if (!response.ok) {
              console.error(`Error fetching subgoals for goal ${goal.id}: ${response.status}`);
              return { ...goal, subgoals: [] } as EnrichedGoal;
            }
            
            const subgoals = await response.json();
            console.log(`Retrieved ${subgoals.length} subgoals for goal ${goal.id}:`, subgoals);
            return { ...goal, subgoals } as EnrichedGoal;
          } catch (error) {
            console.error(`Error processing subgoals for goal ${goal.id}:`, error);
            return { ...goal, subgoals: [] } as EnrichedGoal;
          }
        })
      );
      
      return enrichedGoals;
    },
    enabled: parsedClientId > 0 && goalsSuccess && goals.length > 0,
    retry: 1,
  });

  const { data: budgetItems = [] } = useQuery<BudgetItem[]>({
    queryKey: ["/api/clients", parsedClientId, "budget-items"],
    queryFn: async () => {
      console.log(`Fetching budget items for client ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}/budget-items`);
      
      if (!response.ok) {
        console.error(`Error fetching budget items: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`Retrieved ${data.length} budget items:`, data);
      return data;
    },
    enabled: parsedClientId > 0 && fetchRelatedData,
    retry: 1,
  });

  const { data: budgetSettings } = useQuery<BudgetSettings>({
    queryKey: ["/api/clients", parsedClientId, "budget-settings"],
    queryFn: async () => {
      console.log(`Fetching budget settings for client ID: ${parsedClientId}`);
      const response = await fetch(`/api/clients/${parsedClientId}/budget-settings`);
      
      if (!response.ok) {
        console.error(`Error fetching budget settings: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.log("Retrieved budget settings:", data);
      return data;
    },
    enabled: parsedClientId > 0 && fetchRelatedData,
    retry: 1,
  });

  const totalBudget = budgetItems.reduce((acc: number, item: BudgetItem) => {
    return acc + (item.unitPrice * item.quantity);
  }, 0);
  
  // Show loading state
  if (isClientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading client data...</h1>
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show error state if there was an error loading the client
  if (isClientError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Error loading client</h1>
          <p className="text-muted-foreground mb-4">There was a problem loading client data.</p>
          
          {/* Display the error details */}
          <div className="text-sm text-red-500 mb-4 p-2 bg-red-50 rounded-md overflow-auto text-left">
            {clientError instanceof Error 
              ? clientError.message 
              : "Unknown error occurred"}
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button onClick={() => refetchClient()} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => setLocation("/")} variant="default">
              Return Home
            </Button>
            <Button onClick={() => setLocation(`/summary/${clientId}`)} variant="ghost">
              Return to Summary
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if client not found after loading
  if (!client && parsedClientId > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Client not found</h1>
          <p className="mb-4 text-muted-foreground">The client with ID {parsedClientId} could not be found.</p>
          <Button onClick={() => setLocation("/")}>Return Home</Button>
        </div>
      </div>
    );
  }
  
  // If client is null but we're not loading, that's an error (shouldn't happen with the enabled flag)
  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Client not found</h1>
          <Button onClick={() => setLocation("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  // Handle translation of content
  const translateContent = async (targetLanguage: Language) => {
    if (targetLanguage === "english") {
      // No need to translate if English is selected
      setPreviewMode(true);
      return;
    }

    try {
      setTranslationStatus(TranslationStatus.TRANSLATING);
      
      // Prepare sections to translate
      const sectionsToTranslate: Record<string, string> = {};
      
      // Add labels for all sections
      sectionsToTranslate["label_name"] = "Name";
      sectionsToTranslate["label_date_of_birth"] = "Date of Birth";
      sectionsToTranslate["label_client_id"] = "Client ID";
      sectionsToTranslate["label_funds_management"] = "Funds Management";
      sectionsToTranslate["label_allies"] = "Allies";
      sectionsToTranslate["label_relationship"] = "Relationship";
      sectionsToTranslate["label_preferred_language"] = "Preferred Language";
      sectionsToTranslate["label_email"] = "Email";
      sectionsToTranslate["label_therapeutics_access"] = "Therapeutics Access";
      sectionsToTranslate["label_financial_access"] = "Financial Access";
      sectionsToTranslate["label_priority"] = "Priority";
      sectionsToTranslate["label_available_funds"] = "Available Funds";
      sectionsToTranslate["label_end_of_plan"] = "End of Plan";
      sectionsToTranslate["label_planned_funds"] = "Planned Funds";
      sectionsToTranslate["label_plan_duration"] = "Plan Duration";
      sectionsToTranslate["label_item_code"] = "Item Code";
      sectionsToTranslate["label_description"] = "Description";
      sectionsToTranslate["label_unit_price"] = "Unit Price";
      sectionsToTranslate["label_quantity"] = "Qty";
      sectionsToTranslate["label_total"] = "Total";
      sectionsToTranslate["label_total_budget"] = "Total Budget";
      sectionsToTranslate["label_remaining_balance"] = "Remaining Balance";
      sectionsToTranslate["title"] = "Onboarding Summary";
      sectionsToTranslate["subtitle"] = "Confidential Report";
      sectionsToTranslate["personal_info"] = "Personal Information";
      sectionsToTranslate["goals_subgoals"] = "Goals and Subgoals";
      sectionsToTranslate["budget_summary"] = "Budget Summary";
      sectionsToTranslate["document_footer"] = "This document is confidential and contains information protected by law.";
      sectionsToTranslate["copyright"] = "© Speech Therapy Clinic - All rights reserved";
      
      // Status labels
      sectionsToTranslate["status_completed"] = "Completed";
      sectionsToTranslate["status_in_progress"] = "In Progress";
      sectionsToTranslate["status_not_started"] = "Not Started";
      sectionsToTranslate["status_canceled"] = "Canceled";
      
      // Add client information
      sectionsToTranslate["client_name"] = client.name || "No name available";
      sectionsToTranslate["funds_management"] = client.fundsManagement || "Not specified";
      
      // Add goals and descriptions by ID (not index)
      if (goalsWithSubgoals.data) {
        goalsWithSubgoals.data.forEach((goal) => {
          sectionsToTranslate[`goal_${goal.id}_title`] = goal.title;
          sectionsToTranslate[`goal_${goal.id}_description`] = goal.description;
          
          // Add subgoals
          if (goal.subgoals) {
            goal.subgoals.forEach((subgoal) => {
              sectionsToTranslate[`subgoal_${subgoal.id}_title`] = subgoal.title;
              sectionsToTranslate[`subgoal_${subgoal.id}_description`] = subgoal.description;
              if (subgoal.status) {
                sectionsToTranslate[`status_${subgoal.status.toLowerCase()}`] = subgoal.status;
              }
            });
          }
        });
      } else {
        // If we don't have the enriched goals, use the regular goals
        goals.forEach((goal) => {
          sectionsToTranslate[`goal_${goal.id}_title`] = goal.title;
          sectionsToTranslate[`goal_${goal.id}_description`] = goal.description;
        });
      }
      
      // Add budget items
      budgetItems.forEach((item) => {
        sectionsToTranslate[`budget_item_${item.id}_description`] = item.description;
      });
      
      // Translate all sections
      const translatedSections = await translateSections(sectionsToTranslate, targetLanguage);
      
      // Update translations state
      setTranslations(translatedSections);
      setTranslationStatus(TranslationStatus.COMPLETE);
      
      // Enter preview mode
      setPreviewMode(true);
      
      toast({
        title: "Translation complete",
        description: `Content has been translated to ${targetLanguage}. You can now print or review.`,
      });
      
    } catch (error) {
      console.error("Translation error:", error);
      setTranslationStatus(TranslationStatus.ERROR);
      
      toast({
        title: "Translation failed",
        description: "There was an error translating the content. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle print after preview
  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };
  
  // Handle language selection and translation
  const handleLanguageSelect = (language: Language) => {
    setShowLanguageSelector(false);
    setSelectedLanguage(language);
    
    // Start translation process if needed
    if (language !== "english") {
      translateContent(language);
    } else {
      // Just go to preview for English
      setPreviewMode(true);
    }
  };

  const handlePrintClick = () => {
    setShowLanguageSelector(true);
  };

  const handleEmailClick = () => {
    setShowAllySelector(true);
  };

  const handleApproveClick = () => {
    // This will be implemented later
    alert("This feature will be implemented in the future");
  };

  return (
    <div className="min-h-screen bg-background print:bg-white print:p-0">
      <div className="container mx-auto py-8 print:p-0">
        {/* Translation preview UI */}
        {previewMode && selectedLanguage !== "english" && (
          <div className="mb-8 print:hidden border rounded-lg p-4 bg-muted/20">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  Bilingual Print Preview
                </h2>
                <p className="text-sm text-muted-foreground">
                  This summary will be printed in English and {selectedLanguage}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {translationStatus === TranslationStatus.TRANSLATING && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Translating...</span>
                  </div>
                )}
                
                {translationStatus === TranslationStatus.ERROR && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>Translation error</span>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => setPreviewMode(false)}
                >
                  Cancel
                </Button>
                
                <Button 
                  onClick={handlePrint}
                  disabled={translationStatus === TranslationStatus.TRANSLATING}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="p-2 border border-dashed rounded">
                <p className="text-xs text-muted-foreground mb-1">English</p>
                <p className="text-sm">Example text in English</p>
              </div>
              <div className="p-2 border border-dashed rounded">
                <p className="text-xs text-muted-foreground mb-1">{selectedLanguage}</p>
                <p className="text-sm">
                  {translationStatus === TranslationStatus.TRANSLATING 
                    ? "Translating..." 
                    : translationStatus === TranslationStatus.ERROR
                    ? "Translation error occurred" 
                    : "Example translated text"}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-8 print:mb-4 print:hidden">
          <h1 className="text-3xl font-bold text-center">Onboarding Summary</h1>
          <div className="flex gap-4 items-center">
            <Button onClick={() => setLocation(`/summary/${clientId}`)} variant="outline">
              Back to Summary
            </Button>
            {!previewMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handlePrintClick}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEmailClick}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleApproveClick}>
                    <Check className="mr-2 h-4 w-4" />
                    Approve and Create
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Language dialog */}
        <LanguageSelector 
          open={showLanguageSelector} 
          onOpenChange={setShowLanguageSelector}
          allies={allies}
          onSelectLanguage={(language: Language) => {
            handleLanguageSelect(language);
          }}
        />

        {/* Ally selector dialog */}
        <AllySelector
          open={showAllySelector}
          onOpenChange={setShowAllySelector}
          allies={allies}
          onSelectAllies={(selectedAllies: Ally[]) => {
            setShowAllySelector(false);
            // In a real app, we'd send emails to these allies
            alert(`Email would be sent to: ${selectedAllies.map((a: Ally) => a.email).join(', ')}`);
          }}
        />

        {/* Print report header */}
        <div className="hidden print:block mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">
              Onboarding Summary
              {selectedLanguage !== "english" && translations["title"] && (
                <span className="block text-2xl mt-1 font-semibold text-muted-foreground">
                  {translations["title"]}
                </span>
              )}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Confidential Report
              {selectedLanguage !== "english" && translations["subtitle"] && (
                <span className="block text-base">
                  {translations["subtitle"]}
                </span>
              )}
            </p>
            <p className="text-sm mt-1">
              Generated on: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid gap-6 print:gap-4">
          {/* Client Information Section */}
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="print:py-2">
              <CardTitle>
                Personal Information
                {selectedLanguage !== "english" && translations["personal_info"] && (
                  <span className="block text-sm font-normal mt-1">{translations["personal_info"]}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <Separator className="mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Name
                    {selectedLanguage !== "english" && translations["label_name"] && (
                      <span className="block text-xs italic">{translations["label_name"]}</span>
                    )}
                  </p>
                  <p className="font-medium">
                    {client.name || "No name available"}
                    {selectedLanguage !== "english" && translations["client_name"] && (
                      <span className="block text-sm mt-1 border-t pt-1 text-muted-foreground">
                        {translations["client_name"]}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Date of Birth
                    {selectedLanguage !== "english" && translations["label_date_of_birth"] && (
                      <span className="block text-xs italic">{translations["label_date_of_birth"]}</span>
                    )}
                  </p>
                  <p className="font-medium">
                    {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "Invalid Date"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Client ID
                    {selectedLanguage !== "english" && translations["label_client_id"] && (
                      <span className="block text-xs italic">{translations["label_client_id"]}</span>
                    )}
                  </p>
                  <p className="font-medium">{client.id || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Funds Management
                    {selectedLanguage !== "english" && translations["label_funds_management"] && (
                      <span className="block text-xs italic">{translations["label_funds_management"]}</span>
                    )}
                  </p>
                  <p className="font-medium">
                    {client.fundsManagement || "Not specified"}
                    {selectedLanguage !== "english" && translations["funds_management"] && (
                      <span className="block text-sm mt-1 border-t pt-1 text-muted-foreground">
                        {translations["funds_management"]}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Allies Section */}
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="print:py-2">
              <CardTitle>
                {selectedLanguage === "french" ? "Alliés" : "Allies"} ({allies.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <Separator className="mb-4" />
              <div className="space-y-4">
                {allies.map((ally: Ally) => (
                  <div key={ally.id}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">{ally.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedLanguage === "french" ? "Relation: " : "Relationship: "}
                          {ally.relationship}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedLanguage === "french" ? "Langue préférée: " : "Preferred Language: "}
                          {ally.preferredLanguage}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Email: {ally.email}</p>
                        <div className="flex justify-end mt-2 gap-2">
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-muted">
                            <span className={`mr-1 ${ally.accessTherapeutics ? "text-green-500" : "text-muted-foreground"}`}>
                              {ally.accessTherapeutics ? "✓" : "✗"}
                            </span>
                            <span>
                              {selectedLanguage === "french" ? "Accès Thérapeutique" : "Therapeutics Access"}
                            </span>
                          </span>
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-muted">
                            <span className={`mr-1 ${ally.accessFinancials ? "text-green-500" : "text-muted-foreground"}`}>
                              {ally.accessFinancials ? "✓" : "✗"}
                            </span>
                            <span>
                              {selectedLanguage === "french" ? "Accès Financier" : "Financial Access"}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Goals Section */}
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="print:py-2">
              <CardTitle>
                {selectedLanguage === "french" ? "Objectifs et Sous-objectifs" : "Goals and Subgoals"}
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <Separator className="mb-4" />
              <div className="space-y-6">
                {goalsWithSubgoals.data ? goalsWithSubgoals.data.map((goal: EnrichedGoal, index: number) => (
                  <div key={goal.id} className="mb-6">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-base">
                          {goal.title}
                          {selectedLanguage !== "english" && translations[`goal_${goal.id}_title`] && (
                            <span className="block text-sm font-normal mt-1 italic text-muted-foreground">
                              {translations[`goal_${goal.id}_title`]}
                            </span>
                          )}
                        </h4>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          Priority: {goal.priority}
                          {selectedLanguage !== "english" && translations["label_priority"] && (
                            <span className="block text-center">
                              {translations["label_priority"]}: {goal.priority}
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-sm">
                        {goal.description}
                        {selectedLanguage !== "english" && translations[`goal_${goal.id}_description`] && (
                          <span className="block mt-1 pt-1 border-t text-muted-foreground">
                            {translations[`goal_${goal.id}_description`]}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="pl-4 border-l-2 border-primary mt-2 space-y-3">
                      {goal.subgoals && goal.subgoals.length > 0 ? (
                        goal.subgoals.map((subgoal: { id: number, title: string, description: string, status?: string }) => (
                          <div key={subgoal.id} className="mb-2">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {subgoal.title}
                                {selectedLanguage !== "english" && translations[`subgoal_${subgoal.id}_title`] && (
                                  <span className="block text-xs font-normal mt-1 italic text-muted-foreground">
                                    {translations[`subgoal_${subgoal.id}_title`]}
                                  </span>
                                )}
                              </p>
                              {subgoal.status && (
                                <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                  {subgoal.status}
                                  {selectedLanguage !== "english" && translations[`status_${subgoal.status?.toLowerCase()}`] && (
                                    <span className="block text-center">
                                      {translations[`status_${subgoal.status?.toLowerCase()}`]}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {subgoal.description}
                              {selectedLanguage !== "english" && translations[`subgoal_${subgoal.id}_description`] && (
                                <span className="block mt-1 pt-1 border-t">
                                  {translations[`subgoal_${subgoal.id}_description`]}
                                </span>
                              )}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No subgoals defined.</p>
                      )}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )) : goals.map((goal: Goal, index: number) => (
                  <div key={goal.id} className="mb-6">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-base">
                          {goal.title}
                          {selectedLanguage !== "english" && translations[`goal_${goal.id}_title`] && (
                            <span className="block text-sm font-normal mt-1 italic text-muted-foreground">
                              {translations[`goal_${goal.id}_title`]}
                            </span>
                          )}
                        </h4>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          Priority: {goal.priority}
                          {selectedLanguage !== "english" && translations["label_priority"] && (
                            <span className="block text-center">
                              {translations["label_priority"]}: {goal.priority}
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-sm">
                        {goal.description}
                        {selectedLanguage !== "english" && translations[`goal_${goal.id}_description`] && (
                          <span className="block mt-1 pt-1 border-t text-muted-foreground">
                            {translations[`goal_${goal.id}_description`]}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="pl-4 border-l-2 border-primary mt-2">
                      <p className="text-sm text-muted-foreground italic">Loading subgoals...</p>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Budget Section */}
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="print:py-2">
              <CardTitle>
                {selectedLanguage === "french" ? "Résumé du Budget" : "Budget Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <Separator className="mb-4" />
              {budgetSettings && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Available Funds
                      {selectedLanguage !== "english" && translations["label_available_funds"] && (
                        <span className="block text-xs italic">{translations["label_available_funds"]}</span>
                      )}
                    </p>
                    <p className="font-medium">${budgetSettings.availableFunds.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      End of Plan
                      {selectedLanguage !== "english" && translations["label_end_of_plan"] && (
                        <span className="block text-xs italic">{translations["label_end_of_plan"]}</span>
                      )}
                    </p>
                    <p className="font-medium">
                      {budgetSettings.endOfPlan ? new Date(budgetSettings.endOfPlan).toLocaleDateString() : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Planned Funds
                      {selectedLanguage !== "english" && translations["label_planned_funds"] && (
                        <span className="block text-xs italic">{translations["label_planned_funds"]}</span>
                      )}
                    </p>
                    <p className="font-medium">${totalBudget.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Plan Duration
                      {selectedLanguage !== "english" && translations["label_plan_duration"] && (
                        <span className="block text-xs italic">{translations["label_plan_duration"]}</span>
                      )}
                    </p>
                    <p className="font-medium">12 months</p>
                  </div>
                </div>
              )}
              
              {/* Budget Items Table */}
              <div className="mb-4">
                <div className="grid grid-cols-12 gap-2 mb-2 text-sm font-medium bg-muted p-2 rounded-md">
                  <div className="col-span-2">
                    Item Code
                    {selectedLanguage !== "english" && translations["label_item_code"] && (
                      <span className="block text-xs">{translations["label_item_code"]}</span>
                    )}
                  </div>
                  <div className="col-span-5">
                    Description
                    {selectedLanguage !== "english" && translations["label_description"] && (
                      <span className="block text-xs">{translations["label_description"]}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    Unit Price
                    {selectedLanguage !== "english" && translations["label_unit_price"] && (
                      <span className="block text-xs">{translations["label_unit_price"]}</span>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    Qty
                    {selectedLanguage !== "english" && translations["label_quantity"] && (
                      <span className="block text-xs">{translations["label_quantity"]}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    Total
                    {selectedLanguage !== "english" && translations["label_total"] && (
                      <span className="block text-xs">{translations["label_total"]}</span>
                    )}
                  </div>
                </div>
                
                {budgetItems.map((item: BudgetItem) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 py-2 border-b">
                    <div className="col-span-2 text-sm font-medium">{item.itemCode}</div>
                    <div className="col-span-5 text-sm">
                      {item.description}
                      {selectedLanguage !== "english" && translations[`budget_item_${item.id}_description`] && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          {translations[`budget_item_${item.id}_description`]}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 text-right text-sm">${item.unitPrice.toFixed(2)}</div>
                    <div className="col-span-1 text-center text-sm">{item.quantity}</div>
                    <div className="col-span-2 text-right font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                <span className="font-bold">
                  Total Budget
                  {selectedLanguage !== "english" && translations["label_total_budget"] && (
                    <span className="block text-xs">{translations["label_total_budget"]}</span>
                  )}
                </span>
                <span className="font-bold">${totalBudget.toFixed(2)}</span>
              </div>
              
              {budgetSettings && (
                <div className="flex justify-between items-center p-2 mt-2">
                  <span>
                    Remaining Balance
                    {selectedLanguage !== "english" && translations["label_remaining_balance"] && (
                      <span className="block text-xs">{translations["label_remaining_balance"]}</span>
                    )}
                  </span>
                  <span>${(budgetSettings.availableFunds - totalBudget).toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Print footer */}
        <div className="hidden print:block mt-8 text-center text-sm text-muted-foreground">
          <p>
            This document is confidential and contains information protected by law.
            {selectedLanguage !== "english" && translations["document_footer"] && (
              <span className="block mt-1">{translations["document_footer"]}</span>
            )}
          </p>
          <p className="mt-1">
            © Speech Therapy Clinic - All rights reserved
            {selectedLanguage !== "english" && translations["copyright"] && (
              <span className="block">{translations["copyright"]}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}