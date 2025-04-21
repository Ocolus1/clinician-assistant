/**
 * Enhanced Clinician Assistant Component
 * 
 * This component provides an interface for interacting with the enhanced assistant,
 * including template selection, feature toggles, and question submission.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  askEnhancedQuestion,
  getEnhancedFeatures,
  getQueryTemplates
} from '../../lib/enhancedAssistantClient';
import { EnhancedAssistantResponse as ResponseType, QueryTemplate, EnhancedAssistantFeature } from '@shared/enhancedAssistantTypes';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BrainCircuit, Sparkles, FileText } from 'lucide-react';
import EnhancedAssistantResponseComponent from './EnhancedAssistantResponse';
import TemplateSelector from './TemplateSelector';

const EnhancedAssistant: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [featureToggles, setFeatureToggles] = useState({
    useBusinessContext: true,
    useTemplates: true,
    useMultiQuery: true
  });
  const [activeTab, setActiveTab] = useState('ask');
  const [previousResponses, setPreviousResponses] = useState<ResponseType[]>([]);

  // Fetch available features
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
      ...featureToggles,
      specificTemplate: selectedTemplate || undefined
    });
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string | null): void => {
    setSelectedTemplate(templateId);
  };

  // Handle feature toggle changes
  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setFeatureToggles((prev) => ({
      ...prev,
      [feature]: enabled
    }));
  };

  // Clear current question and response
  const handleClear = () => {
    setQuestion('');
    setSelectedTemplate(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            Enhanced Clinician Assistant
          </CardTitle>
          <CardDescription>
            Ask questions about your clinical data using advanced natural language processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ask">Ask a Question</TabsTrigger>
              <TabsTrigger value="templates">Browse Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ask" className="mt-4">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center space-x-2 mb-6">
                  <Input
                    placeholder="Ask a question about your clinical data..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1"
                    disabled={askMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    disabled={!question.trim() || askMutation.isPending}
                  >
                    {askMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing</>
                    ) : (
                      <>Ask</>
                    )}
                  </Button>
                </div>
                
                {selectedTemplate && templatesQuery.data && (
                  <div className="mb-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Using template: {
                      templatesQuery.data.find(t => t.id === selectedTemplate)?.name
                    }</p>
                    <p className="text-sm text-muted-foreground">{
                      templatesQuery.data.find(t => t.id === selectedTemplate)?.description
                    }</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedTemplate(null)}
                      className="mt-2"
                    >
                      Clear Template
                    </Button>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Assistant Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {featuresQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">Loading features...</p>
                    ) : featuresQuery.error ? (
                      <p className="text-sm text-destructive">Error loading features</p>
                    ) : (
                      featuresQuery.data?.map((feature) => (
                        <div 
                          key={feature.id} 
                          className="flex items-center space-x-2 p-2 border rounded-md"
                        >
                          <Switch 
                            id={`feature-${feature.id}`}
                            checked={featureToggles[feature.id as keyof typeof featureToggles] ?? false}
                            onCheckedChange={(checked) => handleFeatureToggle(feature.id, checked)}
                          />
                          <Label htmlFor={`feature-${feature.id}`} className="cursor-pointer flex flex-col">
                            <span>{feature.name}</span>
                            <span className="text-xs text-muted-foreground">{feature.description}</span>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="templates" className="mt-4">
              <TemplateSelector 
                templates={templatesQuery.data || []}
                isLoading={templatesQuery.isLoading}
                error={templatesQuery.error ? String(templatesQuery.error) : undefined}
                onSelect={(templateId: string | null) => {
                  handleTemplateSelect(templateId);
                  setActiveTab('ask'); // Switch back to ask tab
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {askMutation.isPending && (
        <Card className="mb-6">
          <CardContent className="p-6 flex justify-center items-center min-h-[150px]">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Processing your question...</p>
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
            <h3 className="text-xl font-medium mb-2">Enhanced Clinician Assistant</h3>
            <p className="text-muted-foreground max-w-md">
              Ask questions about your clinical data using natural language, or browse 
              templates for common queries. The enhanced assistant provides more detailed
              and accurate responses.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedAssistant;