/**
 * Budget Debugging Page
 * Provides tools to trace and fix budget usage tracking issues
 */

import React, { useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Bug, CheckCircle, AlertTriangle, Info, ChevronRight, ChevronDown, Filter, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Type definitions
interface BudgetPlan {
  id: number;
  title: string;
  status: string;
  totalBudget: number;
  clientId: number;
}

interface BudgetItem {
  id: number;
  budgetPlanId: number;
  description: string;
  itemCode: string;
  quantity: number;
  usedQuantity: number;
  unitPrice: number;
}

interface Client {
  id: number;
  name: string;
}

interface Session {
  id: number;
  title: string;
  status: string;
  sessionDate: string;
  products: SessionProduct[];
}

interface SessionProduct {
  description: string;
  productCode: string;
  itemCode: string;
  code: string;
  effectiveCode: string;
  quantity: number;
  unitPrice: number;
  budgetItemId: number;
  matchingItemId: number | null;
  matchingItemName: string | null;
  hasValidCode: boolean;
  codesMismatched: boolean;
}

interface Statistics {
  totalSessions: number;
  sessionsWithProducts: number;
  totalProducts: number;
  productsWithValidCodes: number;
  productsWithoutCodes: number;
  productCodeMismatches: number;
  productsByCodeField: {
    productCode: number;
    itemCode: number;
    code: number;
  };
  completedSessions: number;
  completedSessionsWithCompleteNotes: number;
}

interface Recommendation {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  action: string;
}

interface DebugData {
  client: Client;
  budgetPlan: BudgetPlan;
  budgetItems: BudgetItem[];
  statistics: Statistics;
  sessions: Session[];
  recommendations: Recommendation[];
}

interface FixResult {
  success: boolean;
  sessionsProcessed: number;
  productsFixed: number;
  productsAlreadyCorrect: number;
  errors: string[];
}

export default function BudgetDebugPage() {
  const { clientId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});
  const [filterInvalidOnly, setFilterInvalidOnly] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch budget debug data
  const { data, isLoading, isError, error, refetch } = useQuery<DebugData>({
    queryKey: ['/api/debug/budget-flow', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/debug/budget-flow/${clientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch debug data');
      }
      return response.json();
    },
    enabled: !!clientId
  });
  
  // Fix product codes mutation
  const fixMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/debug/fix-product-codes/${clientId}`, {});
    },
    onSuccess: (data: FixResult) => {
      toast({
        title: 'Product codes fixed',
        description: `Fixed ${data.productsFixed} products across ${data.sessionsProcessed} sessions.`,
        variant: 'default'
      });
      
      // Refetch data to show updated state
      queryClient.invalidateQueries({ queryKey: ['/api/debug/budget-flow', clientId] });
      
      // Also invalidate related queries to ensure budget displays are updated
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'budget-plans'] });
    },
    onError: (error) => {
      toast({
        title: 'Error fixing product codes',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive'
      });
    }
  });
  
  // Toggle session expanded state
  const toggleSession = (sessionId: number) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };
  
  // Get alert variant based on recommendation type
  const getAlertVariant = (type: Recommendation['type']) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'warning';
      case 'success': return 'default';
      case 'info': 
      default: return 'info';
    }
  };
  
  // Get icon based on recommendation type
  const getAlertIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'info':
      default: return <Info className="h-4 w-4" />;
    }
  };
  
  // Filter sessions based on current filter
  const filteredSessions = data?.sessions.filter(session => {
    if (!filterInvalidOnly) return true;
    return session.products.some(product => !product.hasValidCode || product.codesMismatched);
  }) || [];
  
  return (
    <div className="container py-8">
      {/* Navigation */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={clientId ? `/clients/${clientId}` : '/clients'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Client
          </Link>
        </Button>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Bug className="mr-2 h-6 w-6 text-primary" />
            Budget Debug Console
          </h1>
          {data?.client && (
            <p className="text-muted-foreground">
              Client: {data.client.name}
              {data.budgetPlan && (
                <> | Plan: {data.budgetPlan.title}</>
              )}
            </p>
          )}
        </div>
        
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>
      
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}
      
      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Error loading debug data</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </AlertDescription>
        </Alert>
      )}
      
      {data && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions ({filteredSessions.length})</TabsTrigger>
            <TabsTrigger value="budget-items">Budget Items ({data.budgetItems.length})</TabsTrigger>
            <TabsTrigger value="recommendations">
              Recommendations ({data.recommendations.length})
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Tracking Health</CardTitle>
                <CardDescription>
                  Summary of budget tracking status for this client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Health Score */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p>Overall Health Score</p>
                    <p className="font-semibold">
                      {data.statistics.totalProducts > 0 
                        ? Math.round((data.statistics.productsWithValidCodes / data.statistics.totalProducts) * 100) 
                        : 0}%
                    </p>
                  </div>
                  <Progress 
                    value={data.statistics.totalProducts > 0 
                      ? (data.statistics.productsWithValidCodes / data.statistics.totalProducts) * 100 
                      : 0} 
                  />
                </div>
                
                {/* Key Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard 
                    title="Sessions with Products" 
                    value={data.statistics.sessionsWithProducts} 
                    total={data.statistics.totalSessions}
                  />
                  <StatCard 
                    title="Products with Valid Codes" 
                    value={data.statistics.productsWithValidCodes} 
                    total={data.statistics.totalProducts}
                  />
                  <StatCard 
                    title="Products Missing Codes" 
                    value={data.statistics.productsWithoutCodes} 
                    total={data.statistics.totalProducts}
                    isNegative={true}
                  />
                  <StatCard 
                    title="Code Field Mismatches" 
                    value={data.statistics.productCodeMismatches} 
                    total={data.statistics.totalProducts}
                    isNegative={true}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => fixMutation.mutate()} 
                  disabled={fixMutation.isPending || data.statistics.productsWithValidCodes === data.statistics.totalProducts}
                >
                  {fixMutation.isPending 
                    ? 'Fixing Product Codes...' 
                    : 'Fix Product Codes'}
                </Button>
                
                {fixMutation.isSuccess && (
                  <p className="ml-4 text-sm text-green-600">
                    Fixed {fixMutation.data.productsFixed} products!
                  </p>
                )}
              </CardFooter>
            </Card>
            
            {/* Budget Plan Details */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Plan Details</CardTitle>
                <CardDescription>
                  Active budget plan information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-medium">{data.budgetPlan.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge>{data.budgetPlan.status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                    <p className="font-medium">${data.budgetPlan.totalBudget.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="font-medium">{data.budgetItems.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Code Field Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Code Field Usage</CardTitle>
                <CardDescription>
                  Analysis of which code fields are most commonly used
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p>productCode</p>
                    <p className="font-semibold">
                      {data.statistics.totalProducts > 0 
                        ? Math.round((data.statistics.productsByCodeField.productCode / data.statistics.totalProducts) * 100) 
                        : 0}%
                    </p>
                  </div>
                  <Progress 
                    value={data.statistics.totalProducts > 0 
                      ? (data.statistics.productsByCodeField.productCode / data.statistics.totalProducts) * 100 
                      : 0} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p>itemCode</p>
                    <p className="font-semibold">
                      {data.statistics.totalProducts > 0 
                        ? Math.round((data.statistics.productsByCodeField.itemCode / data.statistics.totalProducts) * 100) 
                        : 0}%
                    </p>
                  </div>
                  <Progress 
                    value={data.statistics.totalProducts > 0 
                      ? (data.statistics.productsByCodeField.itemCode / data.statistics.totalProducts) * 100 
                      : 0} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p>code</p>
                    <p className="font-semibold">
                      {data.statistics.totalProducts > 0 
                        ? Math.round((data.statistics.productsByCodeField.code / data.statistics.totalProducts) * 100) 
                        : 0}%
                    </p>
                  </div>
                  <Progress 
                    value={data.statistics.totalProducts > 0 
                      ? (data.statistics.productsByCodeField.code / data.statistics.totalProducts) * 100 
                      : 0} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Session Analysis</CardTitle>
                  <CardDescription>
                    Detailed session product analysis
                  </CardDescription>
                </div>
                
                <Button 
                  variant={filterInvalidOnly ? "secondary" : "outline"} 
                  size="sm"
                  onClick={() => setFilterInvalidOnly(!filterInvalidOnly)}
                >
                  {filterInvalidOnly ? (
                    <><X className="mr-1 h-4 w-4" /> Clear Filter</>
                  ) : (
                    <><Filter className="mr-1 h-4 w-4" /> Show Issues Only</>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredSessions.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      {filterInvalidOnly 
                        ? 'No sessions with issues found'
                        : 'No sessions with products found'}
                    </p>
                  ) : (
                    filteredSessions.map(session => (
                      <Collapsible 
                        key={session.id}
                        open={expandedSessions[session.id]}
                        onOpenChange={() => toggleSession(session.id)}
                        className="border rounded-md overflow-hidden"
                      >
                        <CollapsibleTrigger className="flex justify-between items-center w-full p-4">
                          <div className="flex items-center">
                            <Badge 
                              variant={session.status === 'completed' ? 'default' : 'outline'}
                              className="mr-3"
                            >
                              {session.status}
                            </Badge>
                            <div className="text-left">
                              <p className="font-medium">{session.title || `Session ${session.id}`}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(session.sessionDate).toLocaleDateString()} - 
                                {' '}{session.products.length} product(s)
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {session.products.some(p => !p.hasValidCode) && (
                              <Badge variant="destructive">Invalid Codes</Badge>
                            )}
                            {session.products.some(p => p.codesMismatched) && (
                              <Badge variant="warning">Code Mismatch</Badge>
                            )}
                            {expandedSessions[session.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <ScrollArea className="h-[300px]">
                            <div className="p-4 space-y-4">
                              {session.products.map((product, index) => (
                                <div 
                                  key={index}
                                  className={`p-3 rounded-md border ${
                                    !product.hasValidCode 
                                      ? 'border-red-200 bg-red-50' 
                                      : product.codesMismatched 
                                        ? 'border-amber-200 bg-amber-50'
                                        : 'border-slate-200 bg-slate-50'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">{product.description}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Quantity: {product.quantity} × ${product.unitPrice?.toFixed(2) || '0.00'}
                                      </p>
                                    </div>
                                    {product.hasValidCode ? (
                                      <Badge variant="outline" className="bg-green-50">
                                        Valid Code
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">
                                        Invalid Code
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Product Code</p>
                                      <p>{product.productCode || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Item Code</p>
                                      <p>{product.itemCode || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Code</p>
                                      <p>{product.code || '-'}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 text-sm">
                                    <p className="text-muted-foreground">Effective Code (Used for Matching)</p>
                                    <p>{product.effectiveCode || '-'}</p>
                                  </div>
                                  
                                  <div className="mt-3 text-sm">
                                    <p className="text-muted-foreground">Matched Budget Item</p>
                                    <p>
                                      {product.matchingItemId 
                                        ? `${product.matchingItemName} (ID: ${product.matchingItemId})` 
                                        : 'No matching budget item found'}
                                    </p>
                                  </div>
                                  
                                  {product.codesMismatched && (
                                    <Alert variant="warning" className="mt-3">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertTitle>Code Field Mismatch</AlertTitle>
                                      <AlertDescription>
                                        This product has inconsistent code fields.
                                        Use the "Fix Product Codes" button to standardize them.
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                          <Separator />
                          <div className="p-4 bg-muted/10">
                            <p className="text-sm text-muted-foreground">
                              Session ID: {session.id} - 
                              {' '}Status: {session.status}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Budget Items Tab */}
          <TabsContent value="budget-items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Items</CardTitle>
                <CardDescription>
                  Detailed budget item analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.budgetItems.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No budget items found
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 px-3 text-left font-medium">Description</th>
                            <th className="py-2 px-3 text-left font-medium">Item Code</th>
                            <th className="py-2 px-3 text-right font-medium">Quantity</th>
                            <th className="py-2 px-3 text-right font-medium">Used</th>
                            <th className="py-2 px-3 text-right font-medium">Unit Price</th>
                            <th className="py-2 px-3 text-right font-medium">Usage %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.budgetItems.map(item => {
                            const usagePercent = item.quantity > 0 
                              ? (item.usedQuantity / item.quantity) * 100 
                              : 0;
                              
                            return (
                              <tr key={item.id} className="border-b">
                                <td className="py-3 px-3">{item.description}</td>
                                <td className="py-3 px-3">
                                  {item.itemCode || (
                                    <Badge variant="destructive">Missing</Badge>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">{item.quantity}</td>
                                <td className="py-3 px-3 text-right">{item.usedQuantity || 0}</td>
                                <td className="py-3 px-3 text-right">${item.unitPrice.toFixed(2)}</td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end">
                                    <Progress 
                                      value={usagePercent} 
                                      className="w-20 mr-2" 
                                    />
                                    {usagePercent.toFixed(0)}%
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
                <CardDescription>
                  Suggestions to improve budget tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.recommendations.length === 0 ? (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>All Good!</AlertTitle>
                    <AlertDescription>
                      No recommendations needed. Budget tracking appears to be working correctly.
                    </AlertDescription>
                  </Alert>
                ) : (
                  data.recommendations.map((rec, index) => (
                    <Alert key={index} variant={getAlertVariant(rec.type)}>
                      {getAlertIcon(rec.type)}
                      <AlertTitle>{rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}</AlertTitle>
                      <AlertDescription>
                        <p>{rec.message}</p>
                        <p className="font-medium mt-1">{rec.action}</p>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </CardContent>
              <CardFooter>
                {data.recommendations.length > 0 && (
                  <Button 
                    onClick={() => fixMutation.mutate()} 
                    disabled={fixMutation.isPending || data.statistics.productsWithValidCodes === data.statistics.totalProducts}
                  >
                    {fixMutation.isPending 
                      ? 'Fixing Product Codes...' 
                      : 'Fix Product Codes'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Statistic card component
interface StatCardProps {
  title: string;
  value: number;
  total: number;
  isNegative?: boolean;
}

function StatCard({ title, value, total, isNegative = false }: StatCardProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="bg-slate-50 p-4 rounded-md border">
      <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      <p className="text-2xl font-bold">
        {value} <span className="text-sm font-normal text-slate-500">/ {total}</span>
      </p>
      <div className="mt-2 flex items-center">
        <Progress 
          value={percentage}
          className={`flex-grow ${isNegative ? 'bg-slate-200' : ''}`}
          // Use red for negative metrics where higher is worse
          indicatorClassName={isNegative ? 'bg-red-500' : undefined}
        />
        <span className={`ml-2 text-sm font-medium ${
          isNegative 
            ? value > 0 ? 'text-red-600' : 'text-green-600' 
            : percentage > 80 ? 'text-green-600' : 'text-slate-600'
        }`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}