import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Printer, Mail, Check } from "lucide-react";
import { LanguageSelector } from "../components/summary/LanguageSelector";
import { AllySelector } from "../components/summary/AllySelector";
import { Client, Ally, Goal, BudgetItem, BudgetSettings } from "@shared/schema";

type SummaryLanguage = "english" | "french" | "spanish" | "other";

export default function PrintSummary() {
  const { clientId } = useParams();
  const [, setLocation] = useLocation();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showAllySelector, setShowAllySelector] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SummaryLanguage | null>(null);

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

  const { data: goals = [] } = useQuery<Goal[]>({
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

  const handlePrint = (selectedLanguage?: SummaryLanguage) => {
    if (selectedLanguage) {
      setSelectedLanguage(selectedLanguage);
    }
    setTimeout(() => {
      window.print();
    }, 100);
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
          <h1 className="text-3xl font-bold">Client Report</h1>
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
            <h1 className="text-3xl font-bold">Speech Therapy Report</h1>
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
                {selectedLanguage === "french" ? "Information du Client" : "Client Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedLanguage === "french" ? "Nom" : "Name"}
                  </p>
                  <p className="font-medium">{client.name || "No name available"}</p>
                  <p className="text-xs text-red-500 mt-1">Debug: {JSON.stringify(client)}</p>
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
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{ally.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedLanguage === "french" ? "Langue préférée: " : "Preferred Language: "}
                          {ally.preferredLanguage}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span className={ally.accessTherapeutics ? "text-primary" : "text-muted-foreground"}>
                        {selectedLanguage === "french" ? "Accès Thérapeutique" : "Therapeutics Access"}
                      </span>
                      <span className={ally.accessFinancials ? "text-primary" : "text-muted-foreground"}>
                        {selectedLanguage === "french" ? "Accès Financier" : "Financial Access"}
                      </span>
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
              <div className="space-y-6">
                {goals.map((goal: Goal) => (
                  <div key={goal.id}>
                    <div className="mb-2">
                      <h4 className="font-medium">{goal.title}</h4>
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                      <p className="text-sm mt-1">
                        {selectedLanguage === "french" ? "Priorité: " : "Priority: "}
                        {goal.priority}
                      </p>
                    </div>
                    <div className="pl-4 border-l-2 border-muted mt-2">
                      {(goal as any).subgoals?.map((subgoal: { id: number, title: string, description: string }) => (
                        <div key={subgoal.id} className="mb-2">
                          <p className="font-medium text-sm">{subgoal.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {subgoal.description}
                          </p>
                        </div>
                      ))}
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
              {budgetSettings && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    {selectedLanguage === "french" ? "Fonds Disponibles" : "Available Funds"}
                  </p>
                  <p className="font-medium">${budgetSettings.availableFunds.toFixed(2)}</p>
                  {budgetSettings.endOfPlan && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedLanguage === "french" ? "Fin du Plan" : "End of Plan"}: {budgetSettings.endOfPlan}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-4">
                {budgetItems.map((item: BudgetItem) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.itemCode}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${item.unitPrice.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center font-bold">
                  <span>{selectedLanguage === "french" ? "Budget Total" : "Total Budget"}</span>
                  <span>${totalBudget.toFixed(2)}</span>
                </div>
                {budgetSettings && (
                  <div className="flex justify-between items-center">
                    <span>{selectedLanguage === "french" ? "Solde Restant" : "Remaining Balance"}</span>
                    <span>${(budgetSettings.availableFunds - totalBudget).toFixed(2)}</span>
                  </div>
                )}
              </div>
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