/**
 * Assistant Settings Component
 * 
 * Provides interface for configuring the assistant with OpenAI API key
 * and testing the connection.
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { 
  Form,
  FormControl,
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { assistantService } from '@/lib/services/assistantService';

// Form schema for API key validation
const settingsFormSchema = z.object({
  openaiApiKey: z.string().min(1, 'API key is required'),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

/**
 * Assistant Settings Component
 */
export function AssistantSettings() {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  
  // Query for retrieving current settings
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
  
  // Form definition
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      openaiApiKey: '',
    },
  });
  
  // Update form fields when settings data is loaded
  useEffect(() => {
    if (settingsData) {
      form.reset({
        openaiApiKey: settingsData.openaiApiKey || '',
      });
    }
  }, [settingsData, form]);
  
  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      return await assistantService.saveSettings(values);
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your assistant settings have been saved successfully.",
      });
      refetchSettings();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = (values: SettingsFormValues) => {
    saveSettingsMutation.mutate(values);
  };
  
  // Test OpenAI connection
  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      const result = await assistantService.testConnection();
      setTestResult({
        success: result.success,
        message: result.success 
          ? "Connection successful! Your API key is working correctly."
          : `Connection failed: ${result.error || 'Unknown error'}`
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: "Connection test failed. Please check your API key and try again."
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  const handleRequestAPIKey = async () => {
    // Instead of using ask_secrets, we'll use the assistant service
    try {
      await assistantService.requestAPIKeyViaSecrets();
      // Refetch settings to get the new API key
      refetchSettings();
      toast({
        title: "API Key Requested",
        description: "API key request has been submitted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request API key. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Determine if a key is already saved
  const hasApiKey = Boolean(settingsData?.openaiApiKey);
  
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Clinician Assistant Settings</CardTitle>
          <CardDescription>
            Configure your OpenAI integration for the Clinician Assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="openaiApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OpenAI API Key</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="Enter your OpenAI API key" 
                          type="password" 
                          {...field} 
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRequestAPIKey}
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Request Key
                      </Button>
                    </div>
                    <FormDescription>
                      Your OpenAI API key is needed to power the assistant's functionality.
                      The key is stored securely and only used for assistant-related requests.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-model-4"
                    checked={settingsData?.useGpt4 || false}
                    onCheckedChange={async (checked) => {
                      try {
                        await assistantService.saveSettings({
                          ...form.getValues(),
                          useGpt4: checked
                        });
                        refetchSettings();
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to update model settings.",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                  <Label htmlFor="use-model-4">Use GPT-4 (if available)</Label>
                </div>
                
                <div className="space-x-2">
                  <Button type="submit" disabled={saveSettingsMutation.isPending || isLoadingSettings}>
                    {saveSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Settings
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={testConnection}
                    disabled={isTestingConnection || !hasApiKey}
                  >
                    {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Test Connection
                  </Button>
                </div>
              </div>
            </form>
          </Form>
          
          {testResult && (
            <Alert className={cn(
              "mt-4",
              testResult.success ? "border-green-500 text-green-800" : "border-destructive text-destructive"
            )}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {testResult.success ? "Connection Successful" : "Connection Failed"}
              </AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {settingsData?.isConfigured ? (
              <span className="flex items-center text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Assistant is configured
              </span>
            ) : (
              <span className="flex items-center text-amber-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                Assistant is not yet configured
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}