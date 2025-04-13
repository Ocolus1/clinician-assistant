import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface AssistantSettingsProps {
  onComplete?: () => void;
}

const AssistantSettings: React.FC<AssistantSettingsProps> = ({ onComplete }) => {
  // State for form fields
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [readOnly, setReadOnly] = useState(true);
  
  // For loading and error states
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();
  
  const queryClient = useQueryClient();
  
  // Fetch current status
  const { 
    data: statusData,
    isLoading: isStatusLoading,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['/api/assistant/status'],
  });
  
  // Mutation for saving settings
  const configMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/assistant/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/status'] });
      if (onComplete) onComplete();
      
      toast({
        title: 'Settings Saved',
        description: 'Assistant settings have been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Saving Settings',
        description: error.message || 'Failed to save assistant settings.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation for testing connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      setIsTesting(true);
      const response = await fetch('/api/assistant/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsTesting(false);
      if (data.success && data.connectionValid) {
        toast({
          title: 'Connection Successful',
          description: 'Successfully connected to OpenAI API with the current configuration.',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.message || 'Could not connect to OpenAI API. Please check your settings.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setIsTesting(false);
      toast({
        title: 'Connection Test Failed',
        description: error.message || 'Failed to test connection.',
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission
  const handleSaveSettings = () => {
    configMutation.mutate({
      // No need to include apiKey - it will be handled on the server side from environment variable
      model,
      temperature,
      maxTokens,
      readOnly
    });
  };
  
  // Update state when status data loads
  React.useEffect(() => {
    interface StatusResponse {
      isConfigured?: boolean;
      connectionValid?: boolean;
      settings?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        readOnly?: boolean;
      };
    }
    
    const data = statusData as StatusResponse;
    
    if (data?.settings) {
      setModel(data.settings.model || 'gpt-4o');
      setTemperature(data.settings.temperature || 0.7);
      setMaxTokens(data.settings.maxTokens || 8192);
      setReadOnly(data.settings.readOnly !== false);
    }
  }, [statusData]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistant Configuration</CardTitle>
        <CardDescription>
          Configure settings for the AI assistant that helps clinicians query database information.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Connection Status</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => testConnectionMutation.mutate()}
              disabled={isTesting || !(statusData as any)?.isConfigured}
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </div>
          
          {isStatusLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Alert variant={(statusData as any)?.connectionValid ? "default" : "destructive"}>
              {(statusData as any)?.connectionValid ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              <AlertTitle>
                {(statusData as any)?.isConfigured 
                  ? ((statusData as any)?.connectionValid ? 'Connected' : 'Not Connected') 
                  : 'Not Configured'}
              </AlertTitle>
              <AlertDescription>
                {(statusData as any)?.isConfigured 
                  ? ((statusData as any)?.connectionValid 
                      ? 'Successfully connected to OpenAI API.' 
                      : 'Could not connect to OpenAI API with current settings.')
                  : 'Assistant is not configured yet.'}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* OpenAI Integration */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">OpenAI Integration</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The OpenAI API key is securely stored in Replit secrets and is used to power the AI assistant.
              You don't need to enter it manually - it's automatically configured from environment variables.
            </p>
            
            {(statusData as any)?.isConfigured && (
              <Alert>
                <CheckCircle className="h-4 w-4 mr-2" />
                <AlertTitle>API Key Configured</AlertTitle>
                <AlertDescription>
                  OpenAI API key is configured from environment variables. These settings control how the AI assistant behaves.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select 
                value={model} 
                onValueChange={setModel}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                GPT-4 provides the most accurate responses but may be slower.
              </p>
            </div>
            
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="temperature">Temperature: {temperature.toFixed(1)}</Label>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[temperature]}
                onValueChange={(values) => setTemperature(values[0])}
              />
              <p className="text-xs text-muted-foreground">
                Lower values (0.0-0.3) make responses more deterministic, while higher values (0.7-1.0) make them more creative.
              </p>
            </div>
            
            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min={1024}
                max={16384}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens to generate. Higher values allow longer responses but may increase costs.
              </p>
            </div>
            
            {/* Read-Only Mode */}
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="readOnly"
                checked={readOnly}
                onCheckedChange={setReadOnly}
              />
              <Label htmlFor="readOnly">Read-Only Mode (Only SELECT queries)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, the assistant can only query data and cannot modify the database.
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => refetchStatus()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
        <Button onClick={handleSaveSettings} disabled={configMutation.isPending}>
          {configMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AssistantSettings;