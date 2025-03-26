/**
 * Test Budget Page
 * 
 * A simple test page to verify budget data service functionality
 */
import { useState } from 'react';
import { simplifiedBudgetService } from '@/lib/services/budgetDataService.simplified';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TestBudget() {
  const [clientId, setClientId] = useState<number>(88); // Default to Radwan test client
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const testResults = await simplifiedBudgetService.runTests(clientId);
      setResults(testResults);
      console.log('Test results:', testResults);
    } catch (err) {
      console.error('Error running tests:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Budget API Test Page</h1>
      
      <div className="flex items-center space-x-4 mb-8">
        <div>
          <label htmlFor="clientId" className="block text-sm font-medium mb-1">
            Client ID
          </label>
          <Input
            id="clientId"
            type="number"
            value={clientId}
            onChange={(e) => setClientId(Number(e.target.value))}
            className="w-32"
          />
        </div>
        <Button 
          onClick={runTests} 
          disabled={isLoading}
          className="mt-6"
        >
          {isLoading ? 'Running Tests...' : 'Run API Tests'}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {results.settings ? (
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-60">
                  {JSON.stringify(results.settings, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No budget settings found</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>All Budget Settings ({results.allSettings?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {results.allSettings?.length > 0 ? (
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-60">
                  {JSON.stringify(results.allSettings, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No budget settings found</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Budget Items ({results.items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {results.items?.length > 0 ? (
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-60">
                  {JSON.stringify(results.items, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No budget items found</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Sessions ({results.sessions?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {results.sessions?.length > 0 ? (
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-60">
                  {JSON.stringify(results.sessions, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No sessions found</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}