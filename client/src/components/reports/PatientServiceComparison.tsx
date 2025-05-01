import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetItem, BudgetSettings, Patient } from '@shared/schema';
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

interface PatientServiceComparisonProps {
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
  patientId: number;
}

export function PatientServiceComparison({ 
  budgetItems, 
  budgetSettings,
  patientId
}: PatientServiceComparisonProps) {
  const [comparisonType, setComparisonType] = React.useState<string>('similar');
  const [anonymizeData, setAnonymizeData] = React.useState<boolean>(true);
  
  // In a real application, this data would come from an API
  // that compares the current patient with similar patients
  const comparisonData = React.useMemo(() => {
    // Generate comparison data based on the comparison type
    return generateComparisonData(budgetItems, comparisonType, patientId);
  }, [budgetItems, comparisonType, patientId]);

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
      
      comparisonData.forEach(patient => {
        // Find service in this category
        const service = patient.services.find(s => s.category === category);
        
        // Add patient's value for this category
        data[patient.patientName] = service ? Math.round(service.utilizationPercentage * 100) : 0;
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
              Patient Service Comparison
            </CardTitle>
            <CardDescription>
              Compare service utilization with similar patients
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
                  <p>Toggle patient anonymization</p>
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
                  
                  {comparisonData.map((patient, index) => {
                    // Line colors for different patients
                    const colors = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b'];
                    return (
                      <Radar
                        key={patient.patientId}
                        name={patient.patientName}
                        dataKey={patient.patientName}
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
          
          {/* Patient Comparison Table */}
          <div>
            <div className="mb-2 text-sm font-medium">Detailed Service Comparison</div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
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
                  {comparisonData.map((patient, index) => (
                    <tr key={patient.patientId} className={patient.isCurrentPatient ? "bg-blue-50" : ""}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center">
                          <UserCircle className={cn(
                            "h-6 w-6 mr-2",
                            patient.isCurrentPatient ? "text-blue-600" : "text-gray-400"
                          )} />
                          <div>
                            <div className="text-sm font-medium">
                              {patient.isCurrentPatient ? 
                                "Current Patient" : 
                                (anonymizeData ? `Patient ${String.fromCharCode(65 + index)}` : patient.patientName)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Age: {patient.age} • {patient.diagnosisCategory}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {patient.topCategories.map((category, i) => (
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
                          {Math.round(patient.overallUtilization * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {patient.utilizationTrend === 'increasing' && 
                            <TrendingUp className="h-3 w-3 inline ml-1 text-green-500" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(patient.totalBudget)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(patient.usedAmount)} used
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

// Generate comparison data with other similar patients
function generateComparisonData(budgetItems: BudgetItem[], comparisonType: string, patientId: number) {
  // In a real application, this would come from an API call
  // Here we're generating realistic sample data for demonstration
  
  // Categories from the patient's budget items
  const categories = Array.from(new Set(budgetItems.map(item => item.category || 'Uncategorized')));
  
  // Calculate current patient's utilization rate (simplified)
  const patientServices = categories.map(category => {
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
  
  // Current patient's data
  const currentPatient = {
    patientId,
    patientName: "Current Patient",
    age: 8 + Math.floor(Math.random() * 10), // Random age between 8-17
    diagnosisCategory: ["Autism", "ADHD", "Anxiety", "Depression"][Math.floor(Math.random() * 4)],
    services: patientServices,
    topCategories: patientServices
      .sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
      .slice(0, 3)
      .map(s => s.category),
    overallUtilization: patientServices.reduce((sum, s) => sum + s.utilizationPercentage, 0) / patientServices.length,
    utilizationTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
    totalBudget: budgetItems.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0),
    usedAmount: budgetItems.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.usedQuantity || 0), 0),
    isCurrentPatient: true
  };
  
  // Generate comparison patients (3-4 other patients)
  const numComparisons = 3 + Math.floor(Math.random() * 2);
  const comparisonPatients = Array.from({ length: numComparisons }).map((_, index) => {
    // Generate similar but different services
    const patientServices = categories.map(category => {
      // Variation factor based on comparison type
      let variationFactor = 0.2; // Default
      
      if (comparisonType === 'similar') variationFactor = 0.15;
      if (comparisonType === 'diagnosis') variationFactor = 0.25;
      if (comparisonType === 'budget') variationFactor = 0.3;
      if (comparisonType === 'top') variationFactor = 0.1;
      
      // Find the current patient's service in this category
      const currentService = currentPatient.services.find(s => s.category === category);
      const baseUtilization = currentService ? currentService.utilizationPercentage : 0.5;
      
      // Generate a utilization rate that's somewhat similar but different
      // For 'top' performers, make utilization generally higher
      let utilizationRate = baseUtilization * (1 + (Math.random() * 2 - 1) * variationFactor);
      if (comparisonType === 'top') {
        utilizationRate = Math.min(0.95, baseUtilization * (1 + Math.random() * 0.3));
      }
      
      return {
        category,
        utilizationPercentage: utilizationRate
      };
    });
    
    // Generate a plausible budget based on comparison type
    let budgetFactor = 1 + (Math.random() * 0.6 - 0.3); // ±30%
    if (comparisonType === 'budget') {
      budgetFactor = 1 + (Math.random() * 0.2 - 0.1); // ±10% for budget comparison
    }
    
    const totalBudget = currentPatient.totalBudget * budgetFactor;
    
    // Generate used amount based on overall utilization
    const overallUtilization = patientServices.reduce((sum, s) => sum + s.utilizationPercentage, 0) / patientServices.length;
    const usedAmount = totalBudget * overallUtilization;
    
    // Generate age based on comparison type
    let age = 8 + Math.floor(Math.random() * 10); // Random age between 8-17
    if (comparisonType === 'similar') {
      // For similar comparison, keep age close to current patient
      const currentAge = currentPatient.age;
      age = currentAge + Math.floor(Math.random() * 3) - 1; // ±1 year
    }
    
    // Generate diagnosis based on comparison type
    let diagnosisCategory = ["Autism", "ADHD", "Anxiety", "Depression"][Math.floor(Math.random() * 4)];
    if (comparisonType === 'diagnosis') {
      // For diagnosis comparison, use the same diagnosis
      diagnosisCategory = currentPatient.diagnosisCategory;
    }
    
    return {
      patientId: 1000 + index,
      patientName: `Patient ${index + 1}`,
      age,
      diagnosisCategory,
      services: patientServices,
      topCategories: patientServices
        .sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
        .slice(0, 2 + Math.floor(Math.random() * 2))
        .map(s => s.category),
      overallUtilization,
      utilizationTrend: Math.random() > 0.7 ? 'increasing' : 'stable',
      totalBudget,
      usedAmount,
      isCurrentPatient: false
    };
  });
  
  // Return current patient and comparison patients
  return [currentPatient, ...comparisonPatients];
}

// Generate insight text based on comparison data
function getInsightText(comparisonData: any[], comparisonType: string): string {
  const currentPatient = comparisonData.find(c => c.isCurrentPatient);
  if (!currentPatient) return "No comparison data available.";
  
  const otherPatients = comparisonData.filter(c => !c.isCurrentPatient);
  if (otherPatients.length === 0) return "No comparison data available.";
  
  // Calculate average utilization of other patients
  const avgUtilization = otherPatients.reduce((sum, p) => sum + p.overallUtilization, 0) / otherPatients.length;
  
  // Compare current patient to average
  const utilizationDiff = currentPatient.overallUtilization - avgUtilization;
  const percentDiff = Math.abs(Math.round(utilizationDiff * 100));
  
  // Generate insight based on comparison type
  switch (comparisonType) {
    case 'similar':
      if (utilizationDiff > 0.1) {
        return `Your patient is utilizing ${percentDiff}% more services than similar patients of the same age group and goals. This may indicate higher engagement or more intensive needs.`;
      } else if (utilizationDiff < -0.1) {
        return `Your patient is utilizing ${percentDiff}% fewer services than similar patients of the same age group and goals. Consider reviewing their service plan to ensure all needs are being met.`;
      } else {
        return `Your patient's service utilization is similar to other patients in the same age group with similar goals, which suggests the treatment plan is appropriately aligned.`;
      }
    
    case 'diagnosis':
      if (utilizationDiff > 0.1) {
        return `Compared to other patients with ${currentPatient.diagnosisCategory}, your patient is utilizing ${percentDiff}% more services. This may indicate more complex presentation or comorbidities.`;
      } else if (utilizationDiff < -0.1) {
        return `Compared to other patients with ${currentPatient.diagnosisCategory}, your patient is utilizing ${percentDiff}% fewer services. Consider whether additional supports might be beneficial.`;
      } else {
        return `Your patient's service utilization is typical for patients with ${currentPatient.diagnosisCategory}, suggesting the treatment approach is consistent with clinical guidelines.`;
      }
      
    case 'budget':
      if (utilizationDiff > 0.1) {
        return `For patients with similar budget sizes (±10%), your patient is utilizing ${percentDiff}% more services. Consider reviewing budget allocation to ensure sustainability.`;
      } else if (utilizationDiff < -0.1) {
        return `For patients with similar budget sizes (±10%), your patient is utilizing ${percentDiff}% fewer services. There may be opportunity to expand services within the current budget.`;
      } else {
        return `Your patient's service utilization is well-aligned with other patients who have similar budget allocations, suggesting efficient resource management.`;
      }
      
    case 'top':
      const topPerformerAvg = otherPatients.reduce((sum, p) => sum + p.overallUtilization, 0) / otherPatients.length;
      const topDiff = Math.abs(Math.round((currentPatient.overallUtilization - topPerformerAvg) * 100));
      
      if (currentPatient.overallUtilization < topPerformerAvg - 0.1) {
        return `Top performing patients are achieving ${topDiff}% higher service utilization rates. Consider reviewing their service mix for potential improvements to your patient's plan.`;
      } else {
        return `Your patient's service utilization is comparable to top performing patients, indicating excellent engagement and effective service delivery.`;
      }
      
    default:
      return "Compare your patient's service utilization with others to identify opportunities for optimization.";
  }
}

// Generate key differences between current patient and comparison group
function generateKeyDifferences(comparisonData: any[]): string[] {
  const currentPatient = comparisonData.find(c => c.isCurrentPatient);
  if (!currentPatient) return ["No comparison data available."];
  
  const otherPatients = comparisonData.filter(c => !c.isCurrentPatient);
  if (otherPatients.length === 0) return ["No comparison data available."];
  
  const differences: string[] = [];
  
  // Compare service categories
  const currentTopCategories = new Set(currentPatient.topCategories);
  const otherTopCategories = new Set(
    otherPatients.flatMap(p => p.topCategories)
      .filter(category => !currentTopCategories.has(category))
  );
  
  if (otherTopCategories.size > 0) {
    differences.push(
      `Other patients commonly utilize ${Array.from(otherTopCategories).slice(0, 2).join(", ")} services that aren't in your patient's top categories.`
    );
  }
  
  // Compare utilization trend
  const increasingOthers = otherPatients.filter(p => p.utilizationTrend === 'increasing').length;
  const percentIncreasing = Math.round((increasingOthers / otherPatients.length) * 100);
  
  if (currentPatient.utilizationTrend !== 'increasing' && percentIncreasing > 50) {
    differences.push(
      `${percentIncreasing}% of comparison patients show increasing service utilization, while your patient's utilization is stable.`
    );
  }
  
  // Compare budget utilization
  const avgBudgetUtilization = otherPatients.reduce((sum, p) => sum + (p.usedAmount / p.totalBudget), 0) / otherPatients.length;
  const currentBudgetUtilization = currentPatient.usedAmount / currentPatient.totalBudget;
  const budgetDiff = Math.abs(Math.round((currentBudgetUtilization - avgBudgetUtilization) * 100));
  
  if (Math.abs(currentBudgetUtilization - avgBudgetUtilization) > 0.15) {
    if (currentBudgetUtilization > avgBudgetUtilization) {
      differences.push(
        `Your patient is utilizing ${budgetDiff}% more of their available budget compared to similar patients.`
      );
    } else {
      differences.push(
        `Your patient is utilizing ${budgetDiff}% less of their available budget compared to similar patients.`
      );
    }
  }
  
  // If no significant differences found
  if (differences.length === 0) {
    differences.push("Your patient's service profile is very similar to the comparison group.");
  }
  
  return differences;
}
