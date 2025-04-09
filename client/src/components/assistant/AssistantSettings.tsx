/**
 * Assistant Settings Component
 * 
 * This component provides a settings interface for the Clinician Assistant,
 * allowing configuration of API keys and options.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { assistantService } from '@/lib/services/assistantService';

export function AssistantSettings() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);
  
  // Query to get current settings
  const { 
    data: settingsData,
    isLoading: isLoadingSettings,
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['/api/assistant/settings'],
    queryFn: async () => {
      return await assistantService.getSettings();
    }
  });
  
  // Query to check status
  const {
    data: statusData,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['/api/assistant/status'],
    queryFn: async () => {
      return await assistantService.checkStatus();
    }
  });
  
  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: {
      openaiApiKey?: string;
      readOnly?: boolean;
    }) => {
      return await assistantService.updateSettings(settings);
    },
    onSuccess: () => {
      setIsConfiguring(false);
      refetchSettings();
      refetchStatus();
      toast({
        title: "Settings updated",
        description: "The assistant settings have been updated successfully.",
      });
    },
    onError: (error) => {
      setIsConfiguring(false);
      toast({
        title: "Error",
        description: "Failed to update assistant settings.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation to test connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await assistantService.testConnection();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Connection successful",
          description: "The assistant is connected and ready to use.",
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.error || "Failed to connect to the assistant.",
          variant: "destructive"
        });
      }
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Connection test failed",
        description: "Failed to test the assistant connection.",
        variant: "destructive"
      });
      refetchStatus();
    }
  });
  
  // Effect to update form with current settings
  useEffect(() => {
    if (settingsData) {
      // Only show masked API key if it exists
      if (settingsData.openaiApiKey && settingsData.openaiApiKey.includes('*')) {
        setApiKey(settingsData.openaiApiKey);
      }
      setIsReadOnly(settingsData.readOnly || false);
    }
  }, [settingsData]);
  
  // Handle form submission
  const handleSaveSettings = () => {
    setIsConfiguring(true);
    const settings: { openaiApiKey?: string; readOnly?: boolean } = {
      readOnly: isReadOnly
    };
    
    // Only include API key if it doesn't contain asterisks (meaning it's a new key, not masked)
    if (apiKey && !apiKey.includes('*')) {
      settings.openaiApiKey = apiKey;
    }
    
    updateSettingsMutation.mutate(settings);
  };
  
  // Handle connection test
  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };
  
  // Status indicators
  const isConfigured = statusData?.isConfigured || false;
  const connectionValid = statusData?.connectionValid || false;
  const isPending = updateSettingsMutation.isPending || testConnectionMutation.isPending;
  
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Clinician Assistant Settings</CardTitle>
          <CardDescription>
            Configure the settings for the AI-powered assistant that helps you analyze client data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key Section */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isPending}
            />
            <p className="text-sm text-muted-foreground">
              {apiKey && apiKey.includes('*')
                ? "API key is stored securely. Enter a new key to update."
                : "Enter your OpenAI API key to enable the assistant."}
            </p>
          </div>
          
          <Separator />
          
          {/* Options Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Options</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="read-only">Read-only mode</Label>
                <p className="text-sm text-muted-foreground">
                  Restrict the assistant to only read data without making any modifications.
                </p>
              </div>
              <Switch
                id="read-only"
                checked={isReadOnly}
                onCheckedChange={setIsReadOnly}
                disabled={isPending}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Status Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Assistant Status</h3>
            
            <div className="flex items-center space-x-2">
              <div className={`flex items-center ${isConfigured ? 'text-green-600' : 'text-amber-600'}`}>
                {isConfigured ? (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-1" />
                )}
                <span className="text-sm font-medium">
                  {isConfigured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              
              {isConfigured && (
                <>
                  <div className="text-muted-foreground">•</div>
                  <div className={`flex items-center ${connectionValid ? 'text-green-600' : 'text-red-600'}`}>
                    {connectionValid ? (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-sm font-medium">
                      {connectionValid ? 'Connected' : 'Connection Failed'}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {!isConfigured
                ? "The assistant needs to be configured with an API key."
                : connectionValid
                ? "The assistant is properly configured and connected."
                : "The assistant is configured but cannot connect. Check your API key."}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!isConfigured || isPending}
          >
            {testConnectionMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Test Connection
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isPending}
          >
            {updateSettingsMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}