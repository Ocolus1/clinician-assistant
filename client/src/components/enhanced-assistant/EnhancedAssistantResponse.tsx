/**
 * Enhanced Assistant Response Component
 * 
 * This component displays the response from the enhanced assistant,
 * including explanation, data tables, SQL queries, and more.
 */

import React, { useState } from 'react';
import { EnhancedAssistantResponse as ResponseType, QueryStep } from '@shared/enhancedAssistantTypes';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Code, Database, AlertTriangle, Check, ChevronRight, Clock, FileText } from 'lucide-react';

interface EnhancedAssistantResponseProps {
  response: ResponseType;
}

const EnhancedAssistantResponse: React.FC<EnhancedAssistantResponseProps> = ({ response }) => {
  const [showFullData, setShowFullData] = useState(false);
  const [showQueryDetails, setShowQueryDetails] = useState(false);
  
  // Helper function for formatting time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // Determine if there's data available to show
  const hasData = response.data && response.data.length > 0;
  
  // Calculate if the data is truncated (for display purposes)
  const isTruncated = hasData && response.data!.length > 10 && !showFullData;
  
  // Helper function to render data tables
  const renderDataTable = (data: any[]) => {
    if (!data || data.length === 0) return null;
    
    // Extract column headers from the first data item
    const columns = Object.keys(data[0]);
    
    // Determine how many rows to show
    const rowsToShow = isTruncated ? data.slice(0, 10) : data;
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {columns.map((column, index) => (
                <th key={index} className="p-2 text-left text-xs font-medium text-muted-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsToShow.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="p-2 text-sm">
                    {formatCellValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {isTruncated && (
          <div className="mt-2 text-center">
            <Button 
              variant="link" 
              onClick={() => setShowFullData(true)}
              className="text-xs"
            >
              Show all {response.data!.length} rows
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  // Helper function to format cell values
  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">NULL</span>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toLocaleString();
      return JSON.stringify(value);
    }
    return String(value);
  };
  
  // Helper function to render multi-query steps
  const renderQuerySteps = (steps: QueryStep[]) => {
    return (
      <div className="space-y-4 mt-4">
        {steps.map((step, index) => (
          <Collapsible key={index} className="border rounded-md">
            <CollapsibleTrigger asChild>
              <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">Step {index + 1}</Badge>
                  <span className="font-medium">{step.purpose}</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-2">
                <Separator />
                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-1">SQL Query:</h4>
                  <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                    {step.query}
                  </pre>
                </div>
                
                {step.results && step.results.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Results ({step.results.length} rows):</h4>
                    <ScrollArea className="h-40">
                      {renderDataTable(step.results.slice(0, 5))}
                      {step.results.length > 5 && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          Showing 5 of {step.results.length} rows
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                )}
                
                {step.executionTime && (
                  <p className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Execution time: {formatTime(step.executionTime)}
                  </p>
                )}
                
                {step.error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error in step {index + 1}</AlertTitle>
                    <AlertDescription>{step.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Assistant Response</CardTitle>
            <CardDescription className="mt-1">
              <span className="italic">"{response.originalQuestion}"</span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {response.usedTemplate && (
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Template: {response.usedTemplate}
              </Badge>
            )}
            {response.usedMultiQuery && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Multi-query
              </Badge>
            )}
            {response.executionTime && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(response.executionTime)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {response.errorMessage ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{response.errorMessage}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {response.explanation && (
              <div className="p-4 bg-muted rounded-md">
                <p>{response.explanation}</p>
              </div>
            )}
            
            {hasData && (
              <Tabs defaultValue="table">
                <TabsList>
                  <TabsTrigger value="table">Data Table</TabsTrigger>
                  {response.sqlQuery && (
                    <TabsTrigger value="query">SQL Query</TabsTrigger>
                  )}
                  {response.querySteps && (
                    <TabsTrigger value="steps">Query Steps</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="table" className="mt-2">
                  {renderDataTable(response.data!)}
                </TabsContent>
                
                {response.sqlQuery && (
                  <TabsContent value="query" className="mt-2">
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium flex items-center">
                          <Code className="h-4 w-4 mr-1" /> SQL Query
                        </h3>
                      </div>
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                        {response.sqlQuery}
                      </pre>
                    </div>
                  </TabsContent>
                )}
                
                {response.querySteps && (
                  <TabsContent value="steps" className="mt-2">
                    <div className="bg-muted p-3 rounded-md">
                      <h3 className="text-sm font-medium mb-2">
                        Multi-query Execution Plan
                      </h3>
                      {renderQuerySteps(response.querySteps)}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
        )}
      </CardContent>
      
      {hasData && response.data!.length > 10 && (
        <CardFooter className="pt-0 flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFullData(!showFullData)}
          >
            {showFullData ? 'Show Less' : `Show All ${response.data!.length} Rows`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default EnhancedAssistantResponse;