/**
 * Enhanced Clinician Assistant Component
 * 
 * This component provides a simplified interface for therapists to interact with
 * the enhanced assistant, focusing on ease of use and accessibility.
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  askEnhancedQuestion,
  getEnhancedFeatures,
  getQueryTemplates
} from '../../lib/enhancedAssistantClient';
import { EnhancedAssistantResponse as ResponseType, QueryTemplate } from '@shared/enhancedAssistantTypes';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BrainCircuit, Sparkles, LightbulbIcon, SearchIcon } from 'lucide-react';
import EnhancedAssistantResponseComponent from './EnhancedAssistantResponse';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

const EXAMPLE_QUESTIONS = [
  "How many active clients do we have?",
  "Show me clients who need budget renewal this month",
  "List all sessions scheduled for next week",
  "What's the average session duration for clients with autism?",
  "Which therapists have the highest caseload?"
];

const EnhancedAssistant: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previousResponses, setPreviousResponses] = useState<ResponseType[]>([]);

  // Fetch available features - still loaded but hidden by default
  const featuresQuery = useQuery({
    queryKey: ['/api/enhanced-assistant/features'],
    queryFn: getEnhancedFeatures
  });

  // Fetch query templates
  const templatesQuery = useQuery({
    queryKey: ['/api/enhanced-assistant/templates'],
    queryFn: getQueryTemplates
  });

  // Handle asking a question
  const askMutation = useMutation({
    mutationFn: askEnhancedQuestion,
    onSuccess: (data) => {
      // Add the new response to the list of previous responses
      setPreviousResponses((prev) => [data, ...prev]);
    }
  });

  // Handle question submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    askMutation.mutate({
      question,
      useBusinessContext: true,
      useTemplates: true,
      useMultiQuery: true
    });
  };

  // Set an example question
  const setExampleQuestion = (example: string) => {
    setQuestion(example);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            Clinical Data Assistant
          </CardTitle>
          <CardDescription>
            Ask questions about your practice in plain English and get instant insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="flex flex-col space-y-3">
                <label htmlFor="question" className="text-base font-medium">
                  What would you like to know about your practice?
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="question"
                    placeholder="Type your question here..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1 text-base py-6"
                    disabled={askMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={!question.trim() || askMutation.isPending}
                    className="px-6"
                  >
                    {askMutation.isPending ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Thinking...</>
                    ) : (
                      <><SearchIcon className="mr-2 h-5 w-5" /> Ask</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <LightbulbIcon className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-medium">Try asking about:</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_QUESTIONS.map((example, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10 py-1.5"
                      onClick={() => setExampleQuestion(example)}
                    >
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Collapsible 
                open={showAdvanced} 
                onOpenChange={setShowAdvanced}
                className="border rounded-md"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-3">
                    <span>Advanced Settings</span>
                    <span className="text-xs text-muted-foreground">{showAdvanced ? "Hide" : "Show"}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 space-y-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    These settings are automatically optimized. Only change them if you need specialized results.
                  </p>
                  
                  {templatesQuery.data && templatesQuery.data.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Available Question Templates</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {templatesQuery.data.map(template => (
                          <Card key={template.id} className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setExampleQuestion(template.patterns[0])}>
                            <CardContent className="p-3">
                              <h4 className="font-medium text-sm">{template.name}</h4>
                              <p className="text-xs text-muted-foreground">{template.description}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {askMutation.isPending && (
        <Card className="mb-6">
          <CardContent className="p-6 flex justify-center items-center min-h-[150px]">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Finding your answer...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a moment while I analyze the data</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {previousResponses.length > 0 && (
        <div className="space-y-6">
          {previousResponses.map((response, index) => (
            <EnhancedAssistantResponseComponent 
              key={index} 
              response={response} 
            />
          ))}
        </div>
      )}
      
      {!askMutation.isPending && previousResponses.length === 0 && (
        <Card className="bg-muted">
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[250px] text-center">
            <Sparkles className="h-12 w-12 mb-4 text-muted-foreground" />
            <h3 className="text-xl font-medium mb-2">Your Clinical Data Assistant</h3>
            <p className="text-muted-foreground max-w-md">
              I can help you find insights about your practice by answering questions in plain English.
              Just type your question above or select one of the example questions to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedAssistant;