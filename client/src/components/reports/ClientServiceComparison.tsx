import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetItem, BudgetSettings, Client } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  PieChart,
  BarChart3,
  ChevronRight,
  AlertCircle,
  InfoIcon,
  Target,
  TrendingUp,
  UserCircle,
  Settings2
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientServiceComparisonProps {
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
  clientId: number;
}

export function ClientServiceComparison({ 
  budgetItems, 
  budgetSettings,
  clientId
}: ClientServiceComparisonProps) {
  const [comparisonType, setComparisonType] = React.useState<string>('similar');
  const [anonymizeData, setAnonymizeData] = React.useState<boolean>(true);
  
  // In a real application, this data would come from an API
  // that compares the current client with similar clients
  const comparisonData = React.useMemo(() => {
    // Generate comparison data based on the comparison type
    return generateComparisonData(budgetItems, comparisonType, clientId);
  }, [budgetItems, comparisonType, clientId]);

  // Format service categories for radar chart
  const radarChartData = React.useMemo(() => {
    // Extract unique categories
    const categories = Array.from(
      new Set(
        comparisonData.flatMap(d => d.services.map(s => s.category))
      )
    );
    
    // Create radar data
    return categories.map(category => {
      const data: Record<string, any> = { category };
      
      comparisonData.forEach(client => {
        // Find service in this category
        const service = client.services.find(s => s.category === category);
        
        // Add client's value for this category
        data[client.clientName] = service ? Math.round(service.utilizationPercentage * 100) : 0;
      });
      
      return data;
    });
  }, [comparisonData]);

  // Don't render if no budget items
  if (budgetItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base flex items-center">
              <Users className="h-4 w-4 mr-2" /> 
              Client Service Comparison
            </CardTitle>
            <CardDescription>
              Compare service utilization with similar clients
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={comparisonType} onValueChange={setComparisonType}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <Target className="h-3.5 w-3.5 mr-2" />
                <SelectValue placeholder="Comparison Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="similar">Similar Age / Goals</SelectItem>
                <SelectItem value="diagnosis">Similar Diagnosis</SelectItem>
                <SelectItem value="budget">Similar Budget Size</SelectItem>
                <SelectItem value="top">Top Performers</SelectItem>
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setAnonymizeData(!anonymizeData)}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle client anonymization</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 py-0">
        <div className="rounded-lg border p-4 mb-4 bg-blue-50 border-blue-200">
          <div className="flex">
            <InfoIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Comparative Analysis Insights</h4>
              <p className="text-xs text-blue-700 mt-1">
                {getInsightText(comparisonData, comparisonType)}
              </p>
            </div>
          </div>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div>
            <div className="mb-2 text-sm font-medium">Service Category Utilization (%)</div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  
                  {comparisonData.map((client, index) => {
                    // Line colors for different clients
                    const colors = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b'];
                    return (
                      <Radar
                        key={client.clientId}
                        name={client.clientName}
                        dataKey={client.clientName}
                        stroke={colors[index % colors.length]}
                        fill={colors[index % colors.length]}
                        fillOpacity={0.2}
                      />
                    );
                  })}
                  
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Client Comparison Table */}
          <div>
            <div className="mb-2 text-sm font-medium">Detailed Service Comparison</div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Services
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilization
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {comparisonData.map((client, index) => (
                    <tr key={client.clientId} className={client.isCurrentClient ? "bg-blue-50" : ""}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center">
                          <UserCircle className={cn(
                            "h-6 w-6 mr-2",
                            client.isCurrentClient ? "text-blue-600" : "text-gray-400"
                          )} />
                          <div>
                            <div className="text-sm font-medium">
                              {client.isCurrentClient ? 
                                "Current Client" : 
                                (anonymizeData ? `Client ${String.fromCharCode(65 + index)}` : client.clientName)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Age: {client.age} • {client.diagnosisCategory}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {client.topCategories.map((category, i) => (
                            <Badge 
                              key={i} 
                              variant="outline" 
                              className="text-xs font-normal"
                            >
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="text-sm font-medium">
                          {Math.round(client.overallUtilization * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {client.utilizationTrend === 'increasing' && 
                            <TrendingUp className="h-3 w-3 inline ml-1 text-green-500" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(client.totalBudget)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(client.usedAmount)} used
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Key Differences</div>
              <div className="space-y-2">
                {generateKeyDifferences(comparisonData).map((diff, index) => (
                  <div key={index} className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-700">{diff}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 bg-gray-50 border-t flex justify-between">
        <div className="flex items-center text-xs">
          <PieChart className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
          <span className="text-gray-500">Category Comparison</span>
          <span className="mx-2 text-gray-300">|</span>
          <BarChart3 className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
          <span className="text-gray-500">Budget Utilization</span>
        </div>
        <div className="flex items-center text-xs text-blue-600 cursor-pointer">
          <span className="mr-1">View detailed comparison report</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </CardFooter>
    </Card>
  );
}

// Generate comparison data with other similar clients
function generateComparisonData(budgetItems: BudgetItem[], comparisonType: string, clientId: number) {
  // In a real application, this would come from an API call
  // Here we're generating realistic sample data for demonstration
  
  // Categories from the client's budget items
  const categories = Array.from(new Set(budgetItems.map(item => item.category || 'Uncategorized')));
  
  // Calculate current client's utilization rate (simplified)
  const clientServices = categories.map(category => {
    const itemsInCategory = budgetItems.filter(item => (item.category || 'Uncategorized') === category);
    const totalCost = itemsInCategory.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0);
    
    // Generate a plausible utilization rate
    const utilizationRate = 0.35 + (Math.random() * 0.5); // Between 35% and 85%
    
    return {
      category,
      totalCost,
      utilizationPercentage: utilizationRate
    };
  });
  
  // Create the current client's data
  const currentClient = {
    clientId,
    clientName: "Current Client",
    age: 7 + Math.floor(Math.random() * 10), // Child between 7-16
    diagnosisCategory: ["Autism Spectrum", "Language Delay", "ADHD", "Developmental Delay"][Math.floor(Math.random() * 4)],
    topCategories: categories.slice(0, 3),
    overallUtilization: clientServices.reduce((sum, s) => sum + s.utilizationPercentage, 0) / clientServices.length,
    utilizationTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
    totalBudget: budgetItems.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0),
    usedAmount: budgetItems.reduce((sum, item) => {
      const utilizationRate = 0.35 + (Math.random() * 0.5);
      return sum + (item.unitPrice || 0) * item.quantity * utilizationRate;
    }, 0),
    services: clientServices,
    isCurrentClient: true
  };
  
  // Generate comparison clients (3-4 similar clients)
  const numComparisons = 3 + Math.floor(Math.random() * 2);
  const comparisonClients = Array.from({ length: numComparisons }, (_, i) => {
    // Vary the characteristics based on comparison type
    let age = currentClient.age;
    let diagnosisCategory = currentClient.diagnosisCategory;
    let topCategories = [...currentClient.topCategories];
    let totalBudget = currentClient.totalBudget;
    
    // Introduce variations based on comparison type
    if (comparisonType === 'similar') {
      // Similar age and goals but with small variations
      age = Math.max(3, currentClient.age + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3));
      
      // Slightly different category focus
      if (Math.random() > 0.7 && categories.length > 3) {
        const otherCategory = categories.find(c => !topCategories.includes(c));
        if (otherCategory) {
          topCategories = [...topCategories.slice(0, 2), otherCategory];
        }
      }
    } else if (comparisonType === 'diagnosis') {
      // Same diagnosis but different age and possibly different budget
      age = Math.max(3, currentClient.age + (Math.random() > 0.5 ? 3 : -3) * Math.floor(Math.random() * 3));
      totalBudget = currentClient.totalBudget * (0.8 + Math.random() * 0.4); // 80% to 120% of current budget
    } else if (comparisonType === 'budget') {
      // Similar budget but possibly different diagnosis and age
      diagnosisCategory = ["Autism Spectrum", "Language Delay", "ADHD", "Developmental Delay", "Learning Disability"][Math.floor(Math.random() * 5)];
      age = 3 + Math.floor(Math.random() * 15); // Any age between 3-18
      
      // Different category focus
      const shuffledCategories = [...categories].sort(() => Math.random() - 0.5);
      topCategories = shuffledCategories.slice(0, 3);
      
      // Very similar budget
      totalBudget = currentClient.totalBudget * (0.95 + Math.random() * 0.1); // 95% to 105% of current budget
    } else if (comparisonType === 'top') {
      // Top performers - higher utilization but similar diagnosis
      // Keep same diagnosis but potentially different age
      age = Math.max(3, currentClient.age + (Math.random() > 0.5 ? 2 : -2) * Math.floor(Math.random() * 4));
    }
    
    // Generate services for this client
    const services = categories.map(category => {
      // Higher utilization for top performers
      const baseUtilization = comparisonType === 'top' ? 0.7 : 0.3;
      const utilizationRate = baseUtilization + (Math.random() * 0.4); // Between base and base+40%
      
      // Higher utilization if this is a top category for this client
      const adjustedUtilization = topCategories.includes(category) ? 
        Math.min(0.95, utilizationRate * 1.2) : utilizationRate;
      
      return {
        category,
        totalCost: totalBudget * (0.1 + Math.random() * 0.3), // Rough distribution
        utilizationPercentage: adjustedUtilization
      };
    });
    
    // Overall metrics
    const overallUtilization = services.reduce((sum, s) => sum + s.utilizationPercentage, 0) / services.length;
    const usedAmount = totalBudget * overallUtilization;
    
    return {
      clientId: 1000 + i,
      clientName: getClientName(i),
      age,
      diagnosisCategory,
      topCategories,
      overallUtilization,
      utilizationTrend: Math.random() > 0.3 ? 'increasing' : 'stable',
      totalBudget,
      usedAmount,
      services,
      isCurrentClient: false
    };
  });
  
  // Return current client and comparison clients
  return [currentClient, ...comparisonClients];
}

// Get a realistic client name
function getClientName(index: number): string {
  const firstNames = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Jackson", "Sophia", "Lucas", "Isabella", "Aiden"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson"];
  
  return `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
}

// Generate key differences between current client and comparison clients
function generateKeyDifferences(comparisonData: any[]): string[] {
  const currentClient = comparisonData.find(c => c.isCurrentClient);
  if (!currentClient) return [];
  
  const differences = [];
  
  // Compare utilization rates
  const avgComparison = comparisonData
    .filter(c => !c.isCurrentClient)
    .reduce((sum, c) => sum + c.overallUtilization, 0) / 
    (comparisonData.length - 1);
  
  const utilizationDiff = (currentClient.overallUtilization - avgComparison) * 100;
  
  if (Math.abs(utilizationDiff) > 10) {
    differences.push(
      `Your client's overall utilization is ${Math.abs(Math.round(utilizationDiff))}% ${utilizationDiff > 0 ? 'higher' : 'lower'} than similar clients.`
    );
  }
  
  // Compare service categories
  const uniqueCurrentCategories = currentClient.topCategories.filter(
    (c: string) => !comparisonData.some(client => 
      !client.isCurrentClient && client.topCategories.includes(c)
    )
  );
  
  if (uniqueCurrentCategories.length > 0) {
    differences.push(
      `Your client uses ${uniqueCurrentCategories.join(' and ')} services that similar clients don't typically utilize.`
    );
  }
  
  const commonCategories = currentClient.services.filter((s: any) => 
    comparisonData.filter(c => !c.isCurrentClient).some(c => 
      c.services.some((cs: any) => cs.category === s.category && cs.utilizationPercentage > s.utilizationPercentage * 1.2)
    )
  );
  
  if (commonCategories.length > 0) {
    differences.push(
      `Similar clients show higher utilization of ${commonCategories[0].category} services.`
    );
  }
  
  // Compare budget distribution
  if (comparisonData.some(c => !c.isCurrentClient && c.totalBudget > currentClient.totalBudget * 1.2)) {
    differences.push(
      `Some similar clients have significantly larger budgets allocated to achieve similar goals.`
    );
  }
  
  // Default difference if none found
  if (differences.length === 0) {
    differences.push(
      `Your client's service utilization pattern is similar to comparable clients.`
    );
  }
  
  return differences;
}

// Get insights based on comparison type
function getInsightText(comparisonData: any[], comparisonType: string): string {
  const currentClient = comparisonData.find(c => c.isCurrentClient);
  if (!currentClient) return '';
  
  switch (comparisonType) {
    case 'similar':
      return `Comparison with clients of similar age (${currentClient.age} years) and therapy goals shows your client's utilization is ${Math.round(currentClient.overallUtilization * 100)}% while peers average ${Math.round(comparisonData.filter(c => !c.isCurrentClient).reduce((sum, c) => sum + c.overallUtilization, 0) / (comparisonData.length - 1) * 100)}%. Focus on high-impact service categories that show improved outcomes for similar clients.`;
      
    case 'diagnosis':
      return `Clients with ${currentClient.diagnosisCategory} diagnosis typically utilize services at ${Math.round(comparisonData.filter(c => !c.isCurrentClient).reduce((sum, c) => sum + c.overallUtilization, 0) / (comparisonData.length - 1) * 100)}% rate. Consider exploring the therapy approaches of clients with similar diagnosis but higher goal achievement rates.`;
      
    case 'budget':
      return `Among clients with similar budget sizes (${formatCurrency(currentClient.totalBudget)}), your client ranks ${getRankText(currentClient, comparisonData)} in overall fund utilization. The most effective clients in this bracket focus on consistent service delivery across fewer service categories.`;
      
    case 'top':
      return `Top-performing clients show ${Math.round(comparisonData.filter(c => !c.isCurrentClient).reduce((sum, c) => sum + c.overallUtilization, 0) / (comparisonData.length - 1) * 100)}% service utilization compared to your client's ${Math.round(currentClient.overallUtilization * 100)}%. These clients typically maintain consistent therapy schedules and distribute budget allocation more heavily toward primary goal categories.`;
      
    default:
      return `Analysis shows your client utilizes ${Math.round(currentClient.overallUtilization * 100)}% of allocated services. The comparison group average is ${Math.round(comparisonData.filter(c => !c.isCurrentClient).reduce((sum, c) => sum + c.overallUtilization, 0) / (comparisonData.length - 1) * 100)}%.`;
  }
}

// Get client rank text
function getRankText(currentClient: any, allClients: any[]): string {
  const sortedClients = [...allClients].sort((a, b) => b.overallUtilization - a.overallUtilization);
  const rank = sortedClients.findIndex(c => c.clientId === currentClient.clientId) + 1;
  
  if (rank === 1) return 'highest';
  if (rank === allClients.length) return 'lowest';
  
  const percentage = Math.round((rank / allClients.length) * 100);
  if (percentage <= 25) return 'in the top 25%';
  if (percentage <= 50) return 'in the top 50%';
  if (percentage <= 75) return 'in the bottom 50%';
  return 'in the bottom 25%';
}