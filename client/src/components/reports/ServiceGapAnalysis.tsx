import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetItem, BudgetSettings, Goal, Subgoal } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle,
  LightbulbIcon,
  Sparkles,
  ChevronRight,
  ArrowDownUp,
  Filter,
  PlusCircle,
  Zap,
  Check
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ServiceGapAnalysisProps {
  budgetItems: BudgetItem[];
  budgetSettings?: BudgetSettings;
  sessions: any[];
  goals: Goal[];
  subgoals: Subgoal[];
  clientId: number;
}

export function ServiceGapAnalysis({ 
  budgetItems, 
  budgetSettings,
  sessions,
  goals,
  subgoals,
  clientId
}: ServiceGapAnalysisProps) {
  const [sortBy, setSortBy] = React.useState<string>('relevance');
  const [showAll, setShowAll] = React.useState<boolean>(false);

  // Enhanced budget items with usage metrics
  const enhancedBudgetItems = React.useMemo(() => {
    return budgetItems.map(item => {
      // Calculate total cost allocated
      const totalCost = item.quantity * (item.unitPrice || 0);
      
      // Simulate used amount based on session count (in a real app, this would come from actual usage data)
      // This is a simplified calculation - in production, you'd get real usage from sessions
      const used = Math.round(item.quantity * 
                (sessions.length > 0 ? 
                Math.min(0.95, (sessions.length / 20) + ((item.id % 5) * 0.15)) : 
                0.05));
      
      const usedCost = used * (item.unitPrice || 0);
      const utilizationRate = item.quantity > 0 ? used / item.quantity : 0;
      
      return {
        ...item,
        totalCost,
        used,
        usedCost,
        remainingCost: totalCost - usedCost,
        utilizationRate,
        category: item.category || 'Uncategorized',
      };
    });
  }, [budgetItems, sessions]);

  // Find unused or minimally used items (utilization rate < 20%)
  const underutilizedItems = React.useMemo(() => {
    return enhancedBudgetItems.filter(item => item.utilizationRate < 0.2);
  }, [enhancedBudgetItems]);

  // Identify missing service categories by analyzing goals and subgoals
  const missingCategories = React.useMemo(() => {
    // This would typically be a more sophisticated analysis comparing client needs to service usage
    // For this demo, we'll create a simplified version
    
    // Extract goal and subgoal themes
    const goalThemes = new Set<string>();
    goals.forEach(goal => {
      const keywords = goal.title.toLowerCase().split(' ');
      keywords.forEach(word => {
        if (word.length > 4) goalThemes.add(word);
      });
    });
    
    subgoals.forEach(subgoal => {
      const keywords = subgoal.title.toLowerCase().split(' ');
      keywords.forEach(word => {
        if (word.length > 4) goalThemes.add(word);
      });
    });
    
    // Define some potential service categories
    const potentialCategories = [
      { name: 'Communication Therapy', keywords: ['speech', 'language', 'communication', 'express', 'verbal'] },
      { name: 'Cognitive Skills', keywords: ['attention', 'memory', 'cognitive', 'thinking', 'problem'] },
      { name: 'Social Skills', keywords: ['social', 'interaction', 'peer', 'relation', 'conversation'] },
      { name: 'Behavioral Support', keywords: ['behavior', 'emotional', 'regulation', 'routine', 'management'] },
      { name: 'Physical Therapy', keywords: ['motor', 'physical', 'movement', 'coordination', 'balance'] },
      { name: 'Sensory Processing', keywords: ['sensory', 'processing', 'stimulation', 'tactile', 'auditory'] },
      { name: 'Literacy Support', keywords: ['reading', 'writing', 'literacy', 'educational', 'learning'] },
      { name: 'Daily Living Skills', keywords: ['independence', 'daily', 'living', 'self', 'care'] }
    ];
    
    // Check which categories match the goal themes
    const relevantCategories = potentialCategories.filter(category => {
      return Array.from(goalThemes).some(theme => 
        category.keywords.some(keyword => theme.includes(keyword))
      );
    });
    
    // Check which categories are already covered by existing budget items
    const existingCategories = new Set(enhancedBudgetItems.map(item => item.category));
    
    // Find categories that are relevant but not already covered
    return relevantCategories.filter(category => 
      !Array.from(existingCategories).some(existing => 
        existing && existing.toLowerCase().includes(category.name.toLowerCase())
      )
    );
  }, [goals, subgoals, enhancedBudgetItems]);

  // Create service recommendations based on underutilized items and missing categories
  const serviceRecommendations = React.useMemo(() => {
    const recommendations: Array<{
      type: string;
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      relevance: number;
      item?: any;
      category?: any;
    }> = [];
    
    // Add recommendations for underutilized items
    underutilizedItems.forEach(item => {
      recommendations.push({
        type: 'utilization',
        title: `Increase usage of ${item.description}`,
        description: `This service has only been utilized at ${Math.round(item.utilizationRate * 100)}% of allocation`,
        impact: 'medium',
        relevance: calculateRelevanceScore(item, goals, subgoals),
        item
      });
    });
    
    // Add recommendations for missing categories
    missingCategories.forEach(category => {
      recommendations.push({
        type: 'missing',
        title: `Add ${category.name} services`,
        description: `Goals suggest a need for ${category.name}, but no services are allocated`,
        impact: 'high',
        relevance: 0.8 + (Math.random() * 0.2), // High relevance for missing categories
        category
      });
    });
    
    // Add recommendations for service substitutions
    const highCostItems = enhancedBudgetItems
      .filter(item => (item.unitPrice || 0) > 100 && item.utilizationRate < 0.6)
      .slice(0, 2);
    
    highCostItems.forEach(item => {
      recommendations.push({
        type: 'substitution',
        title: `Consider alternatives to ${item.description}`,
        description: `Similar outcomes might be achieved with more cost-effective services`,
        impact: 'medium',
        relevance: 0.6 + (Math.random() * 0.2),
        item
      });
    });
    
    // Sort recommendations by the selected criteria
    if (sortBy === 'relevance') {
      recommendations.sort((a, b) => b.relevance - a.relevance);
    } else if (sortBy === 'impact') {
      const impactValues = { high: 3, medium: 2, low: 1 };
      recommendations.sort((a, b) => 
        impactValues[b.impact as keyof typeof impactValues] - 
        impactValues[a.impact as keyof typeof impactValues]
      );
    }
    
    return recommendations;
  }, [underutilizedItems, missingCategories, enhancedBudgetItems, goals, subgoals, sortBy]);

  // Calculate relevance score between service and goals
  function calculateRelevanceScore(
    item: BudgetItem & { 
      totalCost: number; 
      used: number; 
      usedCost: number; 
      remainingCost: number; 
      utilizationRate: number; 
      category: string;
    }, 
    goals: Goal[], 
    subgoals: Subgoal[]
  ): number {
    // In a production system, this would use natural language processing
    // to measure semantic similarity between service descriptions and goals
    
    // For this demo, we'll use a simple keyword matching approach
    const serviceKeywords = [
      item.description?.toLowerCase() || '',
      item.category?.toLowerCase() || '',
      item.itemCode?.toLowerCase() || ''
    ].join(' ').split(' ');
    
    const goalTexts = goals.map(g => g.title.toLowerCase()).join(' ');
    const subgoalTexts = subgoals.map(sg => sg.title.toLowerCase()).join(' ');
    const clientNeeds = (goalTexts + ' ' + subgoalTexts).split(' ');
    
    // Count matches
    let matchCount = 0;
    serviceKeywords.forEach(keyword => {
      if (keyword.length > 3) { // Only consider meaningful words
        clientNeeds.forEach(need => {
          if (need.includes(keyword) || keyword.includes(need)) {
            matchCount++;
          }
        });
      }
    });
    
    // Calculate score (between 0 and 1)
    const baseScore = Math.min(1, matchCount / 5);
    
    // Add some randomness to avoid all items having identical scores
    return baseScore * (0.8 + (Math.random() * 0.4));
  }

  // Don't render if no budget items or goals
  if (budgetItems.length === 0 || goals.length === 0) {
    return null;
  }

  // Limit recommendations unless showing all
  const displayRecommendations = showAll 
    ? serviceRecommendations 
    : serviceRecommendations.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base flex items-center">
              <Sparkles className="h-4 w-4 mr-2" /> 
              Service Gap Analysis
            </CardTitle>
            <CardDescription>
              Identify opportunities to optimize services based on goals
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={() => setSortBy(sortBy === 'relevance' ? 'impact' : 'relevance')}
            >
              <ArrowDownUp className="h-3.5 w-3.5 mr-1.5" />
              Sort by: {sortBy === 'relevance' ? 'Relevance' : 'Impact'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 py-0">
        <div className="space-y-4">
          {displayRecommendations.map((recommendation, index) => (
            <div 
              key={index} 
              className={cn(
                "rounded-lg border p-4",
                recommendation.impact === 'high' ? "border-l-4 border-l-red-500" : "",
                recommendation.impact === 'medium' ? "border-l-4 border-l-amber-500" : "",
                recommendation.impact === 'low' ? "border-l-4 border-l-blue-500" : ""
              )}
            >
              <div className="flex items-start">
                <div className={cn(
                  "rounded-full p-1.5 mr-3 mt-0.5",
                  recommendation.type === 'utilization' ? "bg-blue-50" : "",
                  recommendation.type === 'missing' ? "bg-red-50" : "",
                  recommendation.type === 'substitution' ? "bg-amber-50" : ""
                )}>
                  {recommendation.type === 'utilization' && 
                    <Zap className="h-4 w-4 text-blue-500" />}
                  {recommendation.type === 'missing' && 
                    <AlertCircle className="h-4 w-4 text-red-500" />}
                  {recommendation.type === 'substitution' && 
                    <LightbulbIcon className="h-4 w-4 text-amber-500" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="font-medium text-sm">{recommendation.title}</h4>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        recommendation.impact === 'high' ? "bg-red-50 text-red-700 border-red-200" : "",
                        recommendation.impact === 'medium' ? "bg-amber-50 text-amber-700 border-amber-200" : "",
                        recommendation.impact === 'low' ? "bg-blue-50 text-blue-700 border-blue-200" : ""
                      )}
                    >
                      {recommendation.impact.charAt(0).toUpperCase() + recommendation.impact.slice(1)} Impact
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {recommendation.description}
                  </p>
                  
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span>Goal Relevance</span>
                      <span>{Math.round(recommendation.relevance * 100)}%</span>
                    </div>
                    <Progress 
                      value={recommendation.relevance * 100} 
                      className="h-1.5"
                      indicatorClassName={
                        recommendation.relevance > 0.8 ? "bg-green-500" : 
                        recommendation.relevance > 0.5 ? "bg-amber-500" : 
                        "bg-gray-400"
                      }
                    />
                  </div>
                  
                  {recommendation.type === 'utilization' && (
                    <div className="flex justify-between mt-3 text-xs text-gray-500">
                      <span>{recommendation.item.category}</span>
                      <span>
                        {formatCurrency(recommendation.item.usedCost)} / {formatCurrency(recommendation.item.totalCost)} used
                      </span>
                    </div>
                  )}
                  
                  {recommendation.type === 'missing' && (
                    <div className="flex justify-between mt-3">
                      <div className="text-xs text-gray-500">
                        Related to: {recommendation.category.keywords.slice(0, 3).join(', ')}
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <PlusCircle className="h-3 w-3 mr-1" /> Add Service
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {serviceRecommendations.length > 3 && (
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Fewer Recommendations' : `Show ${serviceRecommendations.length - 3} More Recommendations`}
            </Button>
          )}
          
          {serviceRecommendations.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Check className="h-10 w-10 text-green-500 mb-3" />
              <p className="text-sm font-medium">No Service Gaps Detected</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Current services align well with client goals and exhibit appropriate utilization rates.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 bg-gray-50 border-t flex justify-between">
        <div className="text-xs text-gray-500">
          Recommendations based on goal alignment and service utilization
        </div>
        <div className="flex items-center text-xs text-blue-600 cursor-pointer">
          <span className="mr-1">View comprehensive analysis</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </CardFooter>
    </Card>
  );
}