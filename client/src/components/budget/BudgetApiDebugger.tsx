import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface BudgetApiDebuggerProps {
  clientId: number;
}

/**
 * A debugging component to help diagnose API issues with budget plans
 */
export function BudgetApiDebugger({ clientId }: BudgetApiDebuggerProps) {
  const [isPrimaryEndpointWorking, setPrimaryEndpointWorking] = useState<boolean | null>(null);
  const [isSecondaryEndpointWorking, setSecondaryEndpointWorking] = useState<boolean | null>(null);
  const [primaryData, setPrimaryData] = useState<any[] | null>(null);
  const [secondaryData, setSecondaryData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEndpoints = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check primary endpoint (budget/plans)
      console.log("Checking primary endpoint...");
      const primaryResponse = await fetch(`/api/clients/${clientId}/budget/plans`);
      setPrimaryEndpointWorking(primaryResponse.ok);
      
      if (primaryResponse.ok) {
        const data = await primaryResponse.json();
        setPrimaryData(data);
        console.log("Primary endpoint data:", data);
      } else {
        console.error("Primary endpoint failed:", primaryResponse.status, primaryResponse.statusText);
      }
      
      // Check secondary endpoint (budget-settings)
      console.log("Checking secondary endpoint...");
      const secondaryResponse = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
      setSecondaryEndpointWorking(secondaryResponse.ok);
      
      if (secondaryResponse.ok) {
        const data = await secondaryResponse.json();
        setSecondaryData(data);
        console.log("Secondary endpoint data:", data);
      } else {
        console.error("Secondary endpoint failed:", secondaryResponse.status, secondaryResponse.statusText);
      }
    } catch (err) {
      console.error("Error checking endpoints:", err);
      setError("Network error occurred while checking endpoints");
    } finally {
      setLoading(false);
    }
  };
  
  // Run endpoint check on mount
  useEffect(() => {
    checkEndpoints();
  }, [clientId]);
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Budget API Debugger
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="font-medium">Primary Endpoint: /budget/plans</div>
            <div className="flex items-center gap-2">
              Status: 
              {isPrimaryEndpointWorking === null ? (
                <span>Checking...</span>
              ) : isPrimaryEndpointWorking ? (
                <div className="flex items-center text-green-600 gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Working
                </div>
              ) : (
                <div className="flex items-center text-red-600 gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Failed
                </div>
              )}
            </div>
            {primaryData && (
              <div className="text-sm text-gray-500">
                Found {primaryData.length} plan(s)
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="font-medium">Secondary Endpoint: /budget-settings</div>
            <div className="flex items-center gap-2">
              Status: 
              {isSecondaryEndpointWorking === null ? (
                <span>Checking...</span>
              ) : isSecondaryEndpointWorking ? (
                <div className="flex items-center text-green-600 gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Working
                </div>
              ) : (
                <div className="flex items-center text-red-600 gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Failed
                </div>
              )}
            </div>
            {secondaryData && (
              <div className="text-sm text-gray-500">
                Found {secondaryData.length} plan(s)
              </div>
            )}
          </div>
        </div>
        
        {(isPrimaryEndpointWorking === false && isSecondaryEndpointWorking === false) && (
          <Alert className="bg-amber-50 border-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle>No Working Endpoints</AlertTitle>
            <AlertDescription>
              Both API endpoints are failing. Please check the server logs for more information.
            </AlertDescription>
          </Alert>
        )}
        
        {(secondaryData && secondaryData.length === 0) && (
          <Alert className="bg-blue-50 border-blue-300">
            <AlertTitle>No Budget Plans</AlertTitle>
            <AlertDescription>
              The API is working correctly, but no budget plans were found for this client.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          variant="outline" 
          onClick={checkEndpoints}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Check Endpoints
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}