/**
 * Assistant Settings Component
 * 
 * This component allows users to configure the OpenAI API key and model
 * for the Clinician Assistant.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, ArrowLeft, Bot, Check, KeyRound, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { assistantService } from '@/lib/services/assistantService';
import { ConfigureAssistantRequest } from '@shared/assistantTypes';
import { ask_secrets } from '@/lib/utils'; // Import the ask_secrets utility

interface AssistantSettingsProps {
  onClose?: () => void;
}

/**
 * Assistant Settings Component
 */
export function AssistantSettings({ onClose }: AssistantSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4-turbo-preview');
  const [temperature, setTemperature] = useState(0.2);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnectionValid, setIsConnectionValid] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  // Check if the assistant is already configured on mount
  useEffect(() => {
    checkStatus();
  }, []);
  
  // Check the current status of the assistant
  const checkStatus = async () => {
    try {
      setInitializing(true);
      const status = await assistantService.checkStatus();
      
      setIsConfigured(status.isConfigured);
      setIsConnectionValid(status.connectionValid);
      
      if (status.isConfigured) {
        // If configured, show appropriate message
        if (status.connectionValid) {
          setStatus('success');
          setMessage('The assistant is correctly configured and ready to use.');
        } else {
          setStatus('error');
          setMessage('The assistant is configured but the connection test failed. Please check your API key.');
        }
      }
      
      setInitializing(false);
    } catch (error) {
      console.error('Error checking assistant status:', error);
      setInitializing(false);
    }
  };
  
  // Save the settings
  const saveSettings = async () => {
    if (!apiKey.trim()) {
      setStatus('error');
      setMessage('API key is required to configure the assistant.');
      return;
    }
    
    setLoading(true);
    setStatus('idle');
    setMessage('');
    
    try {
      // Configure the assistant
      const config: ConfigureAssistantRequest = {
        config: {
          apiKey: apiKey.trim(),
          model,
          temperature,
        }
      };
      
      const result = await assistantService.configureAssistant(config);
      
      if (result.success) {
        setStatus('success');
        setIsConfigured(true);
        setIsConnectionValid(result.connectionValid || false);
        
        if (result.connectionValid) {
          setMessage('Settings saved successfully! The assistant is ready to use.');
        } else {
          setMessage('Settings saved, but the connection test failed. Please check your API key.');
        }
      } else {
        setStatus('error');
        setMessage(result.message || 'Failed to save settings.');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error saving assistant settings:', error);
      setStatus('error');
      setMessage('An unexpected error occurred while saving settings.');
      setLoading(false);
    }
  };
  
  // Request API key from user
  const requestApiKey = async () => {
    try {
      const result = await ask_secrets(['OPENAI_API_KEY']);
      if (result && result.OPENAI_API_KEY) {
        setApiKey(result.OPENAI_API_KEY);
      }
    } catch (error) {
      console.error('Error requesting API key:', error);
    }
  };
  
  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Checking assistant configuration...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 max-w-2xl mx-auto">
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chat
        </Button>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>Clinician Assistant Settings</CardTitle>
          </div>
          <CardDescription>
            Configure your OpenAI API key and model settings for the Clinician Assistant.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Status alerts */}
          {status === 'success' && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                {message}
              </AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Configuration status */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium">Assistant Status</h3>
              <p className="text-sm text-muted-foreground">
                {isConfigured 
                  ? isConnectionValid
                    ? "Configured and connected"
                    : "Configured but connection failed"
                  : "Not configured"
                }
              </p>
            </div>
            <div className={`h-2 w-2 rounded-full ${
              isConfigured 
                ? isConnectionValid
                  ? "bg-green-500"
                  : "bg-yellow-500"
                : "bg-red-500"
            }`} />
          </div>
          
          {/* API Key input */}
          <div className="space-y-2">
            <Label htmlFor="openai-api-key" className="flex items-center gap-1">
              <KeyRound className="h-3.5 w-3.5" />
              <span>OpenAI API Key</span>
            </Label>
            <div className="flex gap-2">
              <Input 
                id="openai-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={requestApiKey}
              >
                Get Key
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is stored securely and only used for this assistant.
            </p>
          </div>
          
          {/* Model selection */}
          <div className="space-y-2">
            <Label htmlFor="model-select">Model</Label>
            <Select 
              value={model} 
              onValueChange={setModel}
            >
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo (Recommended)</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              GPT-4 models provide better SQL generation and reasoning capabilities.
            </p>
          </div>
          
          {/* Temperature slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="temperature-slider">Temperature: {temperature.toFixed(1)}</Label>
            </div>
            <Slider
              id="temperature-slider"
              min={0}
              max={1}
              step={0.1}
              value={[temperature]}
              onValueChange={(value) => setTemperature(value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More precise</span>
              <span>More creative</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="default"
            onClick={saveSettings}
            disabled={loading || !apiKey.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}