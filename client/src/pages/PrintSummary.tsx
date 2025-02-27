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
  const goalsWithSubgoals = useQuery<Goal[]>({
    queryKey: ["/api/clients", parsedClientId, "goals-with-subgoals"],
    queryFn: async () => {
      console.log("Fetching subgoals for all goals");
      const enrichedGoals = await Promise.all(
        goals.map(async (goal) => {
          try {
            const response = await fetch(`/api/goals/${goal.id}/subgoals`);
            if (!response.ok) {
              console.error(`Error fetching subgoals for goal ${goal.id}: ${response.status}`);
              return { ...goal, subgoals: [] };
            }
            
            const subgoals = await response.json();
            console.log(`Retrieved ${subgoals.length} subgoals for goal ${goal.id}:`, subgoals);
            return { ...goal, subgoals };
          } catch (error) {
            console.error(`Error processing subgoals for goal ${goal.id}:`, error);
            return { ...goal, subgoals: [] };
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
      
      // Add client information
      sectionsToTranslate["client_name"] = client.name || "";
      sectionsToTranslate["funds_management"] = client.fundsManagement || "";
      
      // Add goals and descriptions
      if (goalsWithSubgoals.data) {
        goalsWithSubgoals.data.forEach((goal, index) => {
          sectionsToTranslate[`goal_${index}_title`] = goal.title;
          sectionsToTranslate[`goal_${index}_description`] = goal.description;
          
          // Add subgoals
          if (goal.subgoals) {
            goal.subgoals.forEach((subgoal, subIndex) => {
              sectionsToTranslate[`goal_${index}_subgoal_${subIndex}_title`] = subgoal.title;
              sectionsToTranslate[`goal_${index}_subgoal_${subIndex}_description`] = subgoal.description;
            });
          }
        });
      }
      
      // Add budget items
      budgetItems.forEach((item, index) => {
        sectionsToTranslate[`budget_item_${index}_description`] = item.description;
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
        <div className="flex justify-between items-center mb-8 print:mb-4 print:hidden">
          <h1 className="text-3xl font-bold text-center">Onboarding Summary</h1>
          <div className="flex gap-4 items-center">
            <Button onClick={() => setLocation(`/summary/${clientId}`)} variant="outline">
              Back to Summary
            </Button>
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
          </div>
        </div>

        {/* Language dialog */}
        <LanguageSelector 
          open={showLanguageSelector} 
          onOpenChange={setShowLanguageSelector} 
          onSelectLanguage={(language: string) => {
            setShowLanguageSelector(false);
            handlePrint(language as SummaryLanguage);
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
            <h1 className="text-3xl font-bold">Onboarding Summary</h1>
            <p className="text-lg text-muted-foreground mt-2">
              {selectedLanguage === "french" ? "Rapport confidentiel" : "Confidential Report"}
            </p>
            <p className="text-sm mt-1">
              {selectedLanguage === "french" ? "Généré le" : "Generated on"}: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid gap-6 print:gap-4">
          {/* Client Information Section */}
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="print:py-2">
              <CardTitle>
                {selectedLanguage === "french" ? "Information Personnelle" : "Personal Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <Separator className="mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedLanguage === "french" ? "Nom" : "Name"}
                  </p>
                  <p className="font-medium">{client.name || "No name available"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedLanguage === "french" ? "Date de Naissance" : "Date of Birth"}
                  </p>
                  <p className="font-medium">
                    {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : "Invalid Date"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedLanguage === "french" ? "Identifiant du Client" : "Client ID"}
                  </p>
                  <p className="font-medium">{client.id || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedLanguage === "french" ? "Gestion des Fonds" : "Funds Management"}
                  </p>
                  <p className="font-medium">{client.fundsManagement || "Not specified"}</p>
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
                {goalsWithSubgoals.data ? goalsWithSubgoals.data.map((goal: Goal & { subgoals?: any[] }) => (
                  <div key={goal.id} className="mb-6">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-base">{goal.title}</h4>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          {selectedLanguage === "french" ? "Priorité: " : "Priority: "}
                          {goal.priority}
                        </span>
                      </div>
                      <p className="text-sm">{goal.description}</p>
                    </div>
                    <div className="pl-4 border-l-2 border-primary mt-2 space-y-3">
                      {goal.subgoals && goal.subgoals.length > 0 ? (
                        goal.subgoals.map((subgoal: { id: number, title: string, description: string, status?: string }) => (
                          <div key={subgoal.id} className="mb-2">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{subgoal.title}</p>
                              {subgoal.status && (
                                <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                  {subgoal.status}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {subgoal.description}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No subgoals defined.</p>
                      )}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )) : goals.map((goal: Goal) => (
                  <div key={goal.id} className="mb-6">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-base">{goal.title}</h4>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          {selectedLanguage === "french" ? "Priorité: " : "Priority: "}
                          {goal.priority}
                        </span>
                      </div>
                      <p className="text-sm">{goal.description}</p>
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
                      {selectedLanguage === "french" ? "Fonds Disponibles" : "Available Funds"}
                    </p>
                    <p className="font-medium">${budgetSettings.availableFunds.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedLanguage === "french" ? "Fin du Plan" : "End of Plan"}
                    </p>
                    <p className="font-medium">
                      {budgetSettings.endOfPlan ? new Date(budgetSettings.endOfPlan).toLocaleDateString() : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedLanguage === "french" ? "Fonds Planifiés" : "Planned Funds"}
                    </p>
                    <p className="font-medium">${totalBudget.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedLanguage === "french" ? "Durée du Plan" : "Plan Duration"}
                    </p>
                    <p className="font-medium">12 months</p>
                  </div>
                </div>
              )}
              
              {/* Budget Items Table */}
              <div className="mb-4">
                <div className="grid grid-cols-12 gap-2 mb-2 text-sm font-medium bg-muted p-2 rounded-md">
                  <div className="col-span-2">{selectedLanguage === "french" ? "Code" : "Item Code"}</div>
                  <div className="col-span-5">{selectedLanguage === "french" ? "Description" : "Description"}</div>
                  <div className="col-span-2 text-right">{selectedLanguage === "french" ? "Prix Unitaire" : "Unit Price"}</div>
                  <div className="col-span-1 text-center">{selectedLanguage === "french" ? "Qté" : "Qty"}</div>
                  <div className="col-span-2 text-right">{selectedLanguage === "french" ? "Total" : "Total"}</div>
                </div>
                
                {budgetItems.map((item: BudgetItem) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 py-2 border-b">
                    <div className="col-span-2 text-sm font-medium">{item.itemCode}</div>
                    <div className="col-span-5 text-sm">{item.description}</div>
                    <div className="col-span-2 text-right text-sm">${item.unitPrice.toFixed(2)}</div>
                    <div className="col-span-1 text-center text-sm">{item.quantity}</div>
                    <div className="col-span-2 text-right font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                <span className="font-bold">{selectedLanguage === "french" ? "Budget Total" : "Total Budget"}</span>
                <span className="font-bold">${totalBudget.toFixed(2)}</span>
              </div>
              
              {budgetSettings && (
                <div className="flex justify-between items-center p-2 mt-2">
                  <span>{selectedLanguage === "french" ? "Solde Restant" : "Remaining Balance"}</span>
                  <span>${(budgetSettings.availableFunds - totalBudget).toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Print footer */}
        <div className="hidden print:block mt-8 text-center text-sm text-muted-foreground">
          <p>
            {selectedLanguage === "french" 
              ? "Ce document est confidentiel et contient des informations protégées par la loi." 
              : "This document is confidential and contains information protected by law."}
          </p>
          <p className="mt-1">
            {selectedLanguage === "french"
              ? "© Speech Therapy Clinic - Tous droits réservés"
              : "© Speech Therapy Clinic - All rights reserved"}
          </p>
        </div>
      </div>
    </div>
  );
}