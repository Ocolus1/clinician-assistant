import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BudgetAnalysis, ProgressAnalysis } from '@/lib/agent/types';
import { Info, AlertTriangle, TrendingDown, TrendingUp, Check, CheckCircle2, AlertCircle } from 'lucide-react';

interface CombinedInsightsProps {
  budgetData?: BudgetAnalysis;
  progressData?: ProgressAnalysis;
  clientName?: string;
}

/**
 * Component for displaying combined insights from budget and progress data
 * This provides a holistic view of client status with actionable insights
 */
export function CombinedInsights({ budgetData, progressData, clientName }: CombinedInsightsProps) {
  // Check if we have data
  if (!budgetData && !progressData) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Data is not available for insights generation.
        </AlertDescription>
      </Alert>
    );
  }
  
  const clientNameDisplay = clientName || 'this client';
  
  // Generate key insights from the data
  const insights = generateCombinedInsights(budgetData, progressData, clientNameDisplay);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Actionable Insights</CardTitle>
        <CardDescription>
          Combined analysis of budget and progress data
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="summary">
        <div className="px-6">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="summary" className="px-1">
          <CardContent className="space-y-4 pt-4">
            {insights.summary.length > 0 ? (
              <div className="space-y-3">
                {insights.summary.map((insight, i) => (
                  <div key={i} className={`flex items-start space-x-2 ${getInsightColorClass(insight.type)}`}>
                    {getInsightIcon(insight.type)}
                    <div className="text-sm">
                      <p>{insight.message}</p>
                      {insight.recommendation && (
                        <p className="text-xs mt-1 opacity-90 font-medium">
                          Recommendation: {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-6">
                <p>Not enough data to generate summary insights.</p>
              </div>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="budget" className="px-1">
          <CardContent className="space-y-4 pt-4">
            {insights.budget.length > 0 ? (
              <div className="space-y-3">
                {insights.budget.map((insight, i) => (
                  <div key={i} className={`flex items-start space-x-2 ${getInsightColorClass(insight.type)}`}>
                    {getInsightIcon(insight.type)}
                    <div className="text-sm">
                      <p>{insight.message}</p>
                      {insight.recommendation && (
                        <p className="text-xs mt-1 opacity-90 font-medium">
                          Recommendation: {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-6">
                <p>Not enough budget data to generate insights.</p>
              </div>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="progress" className="px-1">
          <CardContent className="space-y-4 pt-4">
            {insights.progress.length > 0 ? (
              <div className="space-y-3">
                {insights.progress.map((insight, i) => (
                  <div key={i} className={`flex items-start space-x-2 ${getInsightColorClass(insight.type)}`}>
                    {getInsightIcon(insight.type)}
                    <div className="text-sm">
                      <p>{insight.message}</p>
                      {insight.recommendation && (
                        <p className="text-xs mt-1 opacity-90 font-medium">
                          Recommendation: {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-6">
                <p>Not enough progress data to generate insights.</p>
              </div>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="pt-0 text-xs text-muted-foreground">
        <div>
          Insights generated from combined analysis of budget utilization and progress data.
        </div>
      </CardFooter>
    </Card>
  );
}

// Helper types for insights
type InsightType = 'success' | 'warning' | 'danger' | 'info';

interface Insight {
  message: string;
  type: InsightType;
  recommendation?: string;
}

interface InsightGroups {
  summary: Insight[];
  budget: Insight[];
  progress: Insight[];
}

// Helper function to get appropriate icon for insight type
function getInsightIcon(type: InsightType) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />;
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />;
    case 'danger':
      return <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />;
  }
}

// Get color class for insight
function getInsightColorClass(type: InsightType): string {
  switch (type) {
    case 'success': return 'text-green-700 dark:text-green-500';
    case 'warning': return 'text-amber-700 dark:text-amber-500';
    case 'danger': return 'text-red-700 dark:text-red-500';
    case 'info':
    default: return 'text-blue-700 dark:text-blue-500';
  }
}

// Generate combined insights from both data sources
function generateCombinedInsights(
  budgetData?: BudgetAnalysis,
  progressData?: ProgressAnalysis,
  clientName: string = 'this client'
): InsightGroups {
  const insights: InsightGroups = {
    summary: [],
    budget: [],
    progress: []
  };
  
  // Add budget insights
  if (budgetData) {
    // Budget utilization
    if (budgetData.utilizationRate > 80) {
      insights.budget.push({
        message: `Budget utilization is high at ${budgetData.utilizationRate.toFixed(1)}%, with $${budgetData.remaining.toFixed(2)} remaining.`,
        type: 'warning',
        recommendation: 'Review budget allocation and consider additional funding sources.'
      });
    } else if (budgetData.utilizationRate < 20) {
      insights.budget.push({
        message: `Budget utilization is low at ${budgetData.utilizationRate.toFixed(1)}%, with $${budgetData.remaining.toFixed(2)} remaining.`,
        type: 'info',
        recommendation: 'Consider allocating resources to additional therapy interventions.'
      });
    } else {
      insights.budget.push({
        message: `Budget utilization is ${budgetData.utilizationRate.toFixed(1)}%, with $${budgetData.remaining.toFixed(2)} remaining.`,
        type: 'success'
      });
    }
    
    // Check for spending patterns
    if (budgetData.spendingPatterns?.trend === 'increasing') {
      insights.budget.push({
        message: 'Spending rate is accelerating compared to previous periods.',
        type: 'warning',
        recommendation: 'Monitor budget closely to avoid premature depletion.'
      });
    } else if (budgetData.spendingPatterns?.trend === 'decreasing') {
      insights.budget.push({
        message: 'Spending rate is decelerating compared to previous periods.',
        type: 'success',
        recommendation: 'Consider if current therapy intensity is sufficient.'
      });
    }
    
    // Check for projected overages
    if (budgetData.spendingPatterns?.projectedOverages.length) {
      const categories = budgetData.spendingPatterns.projectedOverages.join(', ');
      insights.budget.push({
        message: `${categories} ${budgetData.spendingPatterns.projectedOverages.length === 1 ? 'is' : 'are'} projected to exceed budget allocation.`,
        type: 'danger',
        recommendation: 'Adjust service delivery or increase allocation for these categories.'
      });
    }
    
    // Forecast depletion insight
    const today = new Date();
    const depletionDate = new Date(budgetData.forecastedDepletion);
    const monthsRemaining = Math.round((depletionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (monthsRemaining < 2) {
      insights.budget.push({
        message: `Budget is projected to be depleted in ${monthsRemaining} month${monthsRemaining === 1 ? '' : 's'}.`,
        type: 'danger',
        recommendation: 'Urgent review of budget and funding sources needed.'
      });
    } else if (monthsRemaining < 6) {
      insights.budget.push({
        message: `Budget is projected to last approximately ${monthsRemaining} more months.`,
        type: 'warning',
        recommendation: 'Begin planning for budget renewal or additional funding.'
      });
    } else {
      insights.budget.push({
        message: `Budget is projected to last approximately ${monthsRemaining} more months.`,
        type: 'success'
      });
    }
  }
  
  // Add progress insights
  if (progressData) {
    // Overall progress
    if (progressData.overallProgress > 75) {
      insights.progress.push({
        message: `${clientName} is making excellent progress (${progressData.overallProgress.toFixed(1)}%) toward therapy goals.`,
        type: 'success',
        recommendation: 'Consider setting more advanced goals based on current progress.'
      });
    } else if (progressData.overallProgress < 30) {
      insights.progress.push({
        message: `${clientName} is making limited progress (${progressData.overallProgress.toFixed(1)}%) toward therapy goals.`,
        type: 'warning',
        recommendation: 'Review therapy approach and goals for appropriate level of challenge.'
      });
    } else {
      insights.progress.push({
        message: `${clientName} is making steady progress (${progressData.overallProgress.toFixed(1)}%) toward therapy goals.`,
        type: 'info'
      });
    }
    
    // Attendance rate
    if (progressData.attendanceRate < 70) {
      insights.progress.push({
        message: `Attendance rate is low at ${progressData.attendanceRate.toFixed(1)}% (${progressData.sessionsCancelled} cancelled sessions).`,
        type: 'danger',
        recommendation: 'Discuss attendance challenges with client/caregivers.'
      });
    } else if (progressData.attendanceRate > 90) {
      insights.progress.push({
        message: `Attendance rate is excellent at ${progressData.attendanceRate.toFixed(1)}%.`,
        type: 'success'
      });
    }
    
    // Goal-specific insights
    if (progressData.goalProgress?.length > 0) {
      // Find highest and lowest performing goals
      const sortedGoals = [...progressData.goalProgress].sort((a, b) => b.progress - a.progress);
      const highestGoal = sortedGoals[0];
      const lowestGoal = sortedGoals[sortedGoals.length - 1];
      
      if (highestGoal.progress > 80) {
        insights.progress.push({
          message: `"${highestGoal.goalTitle}" is advancing well at ${highestGoal.progress.toFixed(1)}% progress.`,
          type: 'success',
          recommendation: 'Consider advancing to more complex skills in this area.'
        });
      }
      
      if (lowestGoal.progress < 40 && progressData.goalProgress.length > 1) {
        insights.progress.push({
          message: `"${lowestGoal.goalTitle}" shows slower progress at ${lowestGoal.progress.toFixed(1)}%.`,
          type: 'warning',
          recommendation: 'Review approach and consider adjusting strategy or objectives.'
        });
      }
    }
  }
  
  // Generate combined summary insights
  if (budgetData && progressData) {
    // Budget-to-progress efficiency
    const costPerProgressPoint = budgetData.totalSpent / Math.max(progressData.overallProgress, 1);
    const averageSessionCost = budgetData.totalSpent / Math.max(progressData.sessionsCompleted, 1);
    
    // Check budget-to-progress efficiency
    if (progressData.overallProgress > 60 && budgetData.utilizationRate < 50) {
      insights.summary.push({
        message: `${clientName} is achieving strong progress with efficient budget utilization.`,
        type: 'success',
        recommendation: 'Current therapy approach appears to be working well.'
      });
    } else if (progressData.overallProgress < 30 && budgetData.utilizationRate > 60) {
      insights.summary.push({
        message: `High budget utilization with limited progress suggests intervention adjustments may be needed.`,
        type: 'warning',
        recommendation: 'Review therapy approach and service mix for effectiveness.'
      });
    }
    
    // Attendance and budget insight
    if (progressData.attendanceRate < 70 && budgetData.utilizationRate > 50) {
      insights.summary.push({
        message: `Low attendance rate is affecting therapy outcomes while still consuming budget.`,
        type: 'danger',
        recommendation: 'Address attendance issues to maximize budget effectiveness.'
      });
    }
    
    // Most critical insight based on combined data
    const hasBudgetConcern = budgetData.utilizationRate > 80 || 
                             (budgetData.spendingPatterns?.projectedOverages.length || 0) > 0;
    const hasProgressConcern = progressData.overallProgress < 30 || 
                               progressData.attendanceRate < 70;
    
    if (hasBudgetConcern && hasProgressConcern) {
      insights.summary.push({
        message: `Critical intervention needed: Budget concerns combined with progress challenges.`,
        type: 'danger',
        recommendation: 'Comprehensive review of therapy plan and budget allocation required.'
      });
    } else if (hasBudgetConcern) {
      insights.summary.push({
        message: `Budget management should be prioritized based on current utilization.`,
        type: 'warning',
        recommendation: 'Review budget allocation and service delivery approach.'
      });
    } else if (hasProgressConcern) {
      insights.summary.push({
        message: `Progress improvement should be the focus of intervention.`,
        type: 'warning',
        recommendation: 'Review current therapy approach and goals for appropriate challenge level.'
      });
    } else {
      insights.summary.push({
        message: `${clientName}'s therapy plan is on track with good progress and budget management.`,
        type: 'success',
        recommendation: 'Continue current approach with regular monitoring.'
      });
    }
  } else {
    // Add basic summary insights based on available data
    if (budgetData) {
      insights.summary.push({
        message: `Budget is ${budgetData.utilizationRate > 70 ? 'highly' : 'moderately'} utilized at ${budgetData.utilizationRate.toFixed(1)}%.`,
        type: budgetData.utilizationRate > 80 ? 'warning' : 'info'
      });
    }
    
    if (progressData) {
      insights.summary.push({
        message: `Overall therapy progress is at ${progressData.overallProgress.toFixed(1)}%.`,
        type: progressData.overallProgress > 70 ? 'success' : 
              progressData.overallProgress < 30 ? 'warning' : 'info'
      });
    }
  }
  
  return insights;
}