import { 
  QueryContext, 
  QueryIntent, 
  AgentResponse, 
  BudgetAnalysis, 
  ProgressAnalysis 
} from './types';
import { parseQueryIntent } from './queryParser';
import { budgetDataService } from '@/lib/services/budgetDataService';
import { progressDataService } from '@/lib/services/progressDataService';
import { strategyDataService } from '@/lib/services/strategyDataService';

/**
 * Process a natural language query and generate a response
 */
export async function processQuery(query: string, context: QueryContext): Promise<AgentResponse> {
  try {
    // Parse the query intent
    const intent = parseQueryIntent(query, context);
    console.log('Detected intent:', intent);
    
    // Check if query requires client context
    if (needsClientContext(intent) && !context.activeClientId) {
      return {
        content: "I'd need to know which client you're asking about. Please select a client first, or ask a general question.",
        confidence: 0.8,
      };
    }
    
    // Generate a response based on the intent
    switch (intent.type) {
      case 'BUDGET_ANALYSIS':
        return await processBudgetQuery(intent, context);
      
      case 'PROGRESS_TRACKING':
        return await processProgressQuery(intent, context);
      
      case 'STRATEGY_RECOMMENDATION':
        return await processStrategyQuery(intent, context);
      
      case 'GENERAL_QUESTION':
        return processGeneralQuery(intent, context, query);
      
      default:
        return defaultResponse();
    }
  } catch (error) {
    console.error('Error processing query:', error);
    return errorResponse(error);
  }
}

/**
 * Check if the intent requires client context
 */
function needsClientContext(intent: QueryIntent): boolean {
  return (
    intent.type === 'BUDGET_ANALYSIS' ||
    intent.type === 'PROGRESS_TRACKING' ||
    (intent.type === 'STRATEGY_RECOMMENDATION' && intent.specificQuery !== 'GENERAL')
  );
}

/**
 * Get a human-readable description of the intent
 */
function getIntentDescription(intent: QueryIntent): string {
  switch (intent.type) {
    case 'BUDGET_ANALYSIS':
      return 'budget analysis';
    
    case 'PROGRESS_TRACKING':
      return 'progress tracking';
    
    case 'STRATEGY_RECOMMENDATION':
      return 'therapy strategy recommendations';
    
    case 'GENERAL_QUESTION':
      return intent.topic ? `information about ${intent.topic}` : 'general information';
    
    default:
      return 'information';
  }
}

/**
 * Format a date in a human-readable format
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Process budget-related queries
 */
async function processBudgetQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  // Type guard to check if this is a budget analysis intent
  if (intent.type !== 'BUDGET_ANALYSIS') {
    return defaultResponse();
  }
  
  if (!intent.clientId) {
    return {
      content: "I'd need to know which client's budget you're asking about. Please select a client first.",
      confidence: 0.9,
    };
  }
  
  try {
    // Get enhanced budget analysis with forecasting and pattern detection
    const analysis = await budgetDataService.getBudgetAnalysis(intent.clientId);
    
    // Generate response based on the specific query
    let response: string;
    let confidence = 0.95; // Increased confidence with enhanced analysis
    
    // Get trend information for more accurate responses
    const trendInfo = analysis.spendingPatterns?.trend || 'stable';
    const trendDescription = 
      trendInfo === 'increasing' ? 'accelerating' :
      trendInfo === 'decreasing' ? 'decelerating' :
      trendInfo === 'fluctuating' ? 'fluctuating' : 'stable';
      
    // Generate insights from spending patterns
    const patternInsights = generatePatternInsights(analysis);
    
    switch (intent.specificQuery) {
      case 'REMAINING':
        response = `The client has $${analysis.remaining.toFixed(2)} remaining out of a total budget of $${analysis.totalBudget.toFixed(2)}.`;
        if (analysis.utilizationRate > 0) {
          response += ` That's about ${(100 - analysis.utilizationRate).toFixed(1)}% of the budget remaining.`;
        }
        
        // Add pattern insights if available
        if (patternInsights) {
          response += ` ${patternInsights}`;
        }
        break;
      
      case 'FORECAST':
        response = `Based on ${trendDescription} spending patterns, the budget will be depleted by ${formatDate(analysis.forecastedDepletion)}.`;
        response += ` The client has spent $${analysis.totalSpent.toFixed(2)} so far out of a total budget of $${analysis.totalBudget.toFixed(2)}.`;
        
        // Add velocity information
        if (analysis.spendingVelocity !== undefined) {
          if (analysis.spendingVelocity > 0.3) {
            response += ` Note that spending is accelerating, which may shorten the budget lifespan.`;
          } else if (analysis.spendingVelocity < -0.3) {
            response += ` Positively, spending is decelerating, which may extend the budget lifespan.`;
          }
        }
        break;
      
      case 'UTILIZATION':
        response = `The client has utilized ${analysis.utilizationRate.toFixed(1)}% of their budget.`;
        
        // Include high usage categories information
        if (analysis.spendingPatterns?.highUsageCategories.length) {
          const highUsageCategories = analysis.spendingPatterns.highUsageCategories;
          response += ` The highest usage ${highUsageCategories.length > 1 ? 'categories are' : 'category is'} "${highUsageCategories.join(', ')}".`;
        } else if (analysis.spendingByCategory) {
          const topCategory = getMostUtilizedCategory(analysis.spendingByCategory);
          response += ` The highest spending is in the ${topCategory} category.`;
        }
        
        // Add projected overage warnings
        if (analysis.spendingPatterns?.projectedOverages.length) {
          const overages = analysis.spendingPatterns.projectedOverages;
          response += ` Warning: ${overages.join(', ')} ${overages.length > 1 ? 'are' : 'is'} projected to exceed their budget allocations.`;
        }
        break;
      
      default:
        response = `The client has a total budget of $${analysis.totalBudget.toFixed(2)}, with $${analysis.totalSpent.toFixed(2)} spent so far.`;
        response += ` That leaves $${analysis.remaining.toFixed(2)} remaining (${(100 - analysis.utilizationRate).toFixed(1)}%).`;
        
        // Add trend information
        if (trendInfo !== 'stable') {
          response += ` Spending is currently ${trendDescription}.`;
        }
        
        response += ` At the current rate, the budget will be depleted by ${formatDate(analysis.forecastedDepletion)}.`;
        
        // Add pattern insights
        if (patternInsights) {
          response += ` ${patternInsights}`;
        }
    }
    
    return {
      content: response,
      confidence,
      data: analysis,
      visualizationHint: 'BUBBLE_CHART',
    };
  } catch (error) {
    console.error('Error processing budget query:', error);
    return {
      content: "I'm having trouble analyzing the budget information. Please try again later.",
      confidence: 0.5,
    };
  }
}

/**
 * Get the most utilized category from spending data
 */
function getMostUtilizedCategory(spendingByCategory?: Record<string, number>): string {
  if (!spendingByCategory) return 'unknown';
  
  let maxSpending = 0;
  let maxCategory = 'unknown';
  
  Object.entries(spendingByCategory).forEach(([category, amount]) => {
    if (amount > maxSpending) {
      maxSpending = amount;
      maxCategory = category;
    }
  });
  
  return maxCategory;
}

/**
 * Process progress-related queries
 */
async function processProgressQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  // Type guard to check if this is a progress tracking intent
  if (intent.type !== 'PROGRESS_TRACKING') {
    return defaultResponse();
  }
  
  if (!intent.clientId) {
    return {
      content: "I'd need to know which client's progress you're asking about. Please select a client first.",
      confidence: 0.9,
    };
  }
  
  try {
    // Get progress analysis for the client
    const analysis = await progressDataService.getProgressAnalysis(intent.clientId);
    
    // Generate response based on the specific query
    let response: string;
    let confidence = 0.9;
    
    switch (intent.specificQuery) {
      case 'OVERALL':
        response = `The client has achieved ${analysis.overallProgress.toFixed(1)}% overall progress toward their goals.`;
        response += ` ${getOverallProgressAssessment(analysis.overallProgress, analysis.attendanceRate)}`;
        break;
      
      case 'ATTENDANCE':
        response = `The client has an attendance rate of ${analysis.attendanceRate.toFixed(1)}%.`;
        response += ` They have completed ${analysis.sessionsCompleted} sessions`;
        if (analysis.sessionsCancelled > 0) {
          response += ` and cancelled ${analysis.sessionsCancelled} sessions`;
        }
        response += '.';
        break;
      
      case 'GOAL_SPECIFIC':
        if (intent.goalId) {
          const goalProgress = analysis.goalProgress.find(g => g.goalId === intent.goalId);
          
          if (goalProgress) {
            response = `Progress on the goal "${goalProgress.goalTitle}" is at ${goalProgress.progress.toFixed(1)}%.`;
            response += ` ${getProgressQualitativeAssessment(goalProgress.progress)}`;
            
            // Add information about milestones
            const completedMilestones = goalProgress.milestones.filter(m => m.completed).length;
            response += ` ${completedMilestones} out of ${goalProgress.milestones.length} milestones have been achieved.`;
          } else {
            response = "I couldn't find progress information for that specific goal.";
            confidence = 0.7;
          }
        } else {
          response = "I need to know which specific goal you're asking about.";
          confidence = 0.8;
        }
        break;
      
      default:
        response = `The client has achieved ${analysis.overallProgress.toFixed(1)}% overall progress toward their goals.`;
        response += ` They have an attendance rate of ${analysis.attendanceRate.toFixed(1)}%.`;
        
        // Add information about best/worst performing goals
        if (analysis.goalProgress.length > 0) {
          // Sort goals by progress
          const sortedGoals = [...analysis.goalProgress].sort((a, b) => b.progress - a.progress);
          
          response += ` The most progress has been made on "${sortedGoals[0].goalTitle}" (${sortedGoals[0].progress.toFixed(1)}%).`;
          
          if (sortedGoals.length > 1 && sortedGoals[sortedGoals.length - 1].progress < 50) {
            response += ` The goal "${sortedGoals[sortedGoals.length - 1].goalTitle}" might need additional attention (${sortedGoals[sortedGoals.length - 1].progress.toFixed(1)}%).`;
          }
        }
    }
    
    return {
      content: response,
      confidence,
      data: analysis,
      visualizationHint: 'PROGRESS_CHART',
    };
  } catch (error) {
    console.error('Error processing progress query:', error);
    return {
      content: "I'm having trouble analyzing the progress information. Please try again later.",
      confidence: 0.5,
    };
  }
}

/**
 * Get a qualitative assessment of progress
 */
function getProgressQualitativeAssessment(progress: number): string {
  if (progress >= 90) return "Excellent progress has been made!";
  if (progress >= 75) return "Very good progress has been made.";
  if (progress >= 50) return "Good progress is being made.";
  if (progress >= 25) return "Some progress has been made, but there's room for improvement.";
  return "Progress has been limited. Additional interventions may be needed.";
}

/**
 * Get an assessment of overall progress and attendance
 */
function getOverallProgressAssessment(progress: number, attendance: number): string {
  if (progress < 30 && attendance < 70) {
    return "Low attendance may be impacting progress. Consider discussing attendance challenges with the client.";
  }
  
  if (progress < 30 && attendance >= 70) {
    return "Despite good attendance, progress has been limited. Consider reviewing the therapy approach.";
  }
  
  if (progress >= 70 && attendance >= 80) {
    return "Excellent progress and attendance! The current therapy approach is working well.";
  }
  
  if (progress >= 50) {
    return "Good progress is being made on the established goals.";
  }
  
  return "Progress is ongoing. Regular reassessment of goals and strategies may be beneficial.";
}

/**
 * Process strategy recommendation queries
 */
async function processStrategyQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  // Type guard to check if this is a strategy recommendation intent
  if (intent.type !== 'STRATEGY_RECOMMENDATION') {
    return defaultResponse();
  }
  
  try {
    let response: string;
    let confidence = 0.85;
    let data = null;
    
    if (intent.specificQuery === 'GOAL_SPECIFIC' && intent.goalId) {
      // Get strategies for a specific goal
      const strategies = await strategyDataService.getRecommendedStrategiesForGoal(intent.goalId);
      
      if (strategies.length > 0) {
        response = `Here are some recommended strategies that may be helpful:`;
        strategies.slice(0, 3).forEach((strategy, index) => {
          const description = strategy.description || '';
          response += `\n\n${index + 1}. **${strategy.name}**: ${description}`;
        });
        
        if (strategies.length > 3) {
          response += `\n\nThere are ${strategies.length - 3} additional strategies available.`;
        }
        
        data = { strategies };
      } else {
        response = "I don't have any specific strategies to recommend for this goal at the moment.";
        confidence = 0.7;
      }
    } else if (intent.clientId) {
      // Get strategies for a client based on their goals
      const recommendationsByGoal = await strategyDataService.getRecommendedStrategiesForClient(intent.clientId);
      
      if (Object.keys(recommendationsByGoal).length > 0) {
        response = `Here are some therapy strategies recommended based on the client's goals:`;
        
        Object.entries(recommendationsByGoal).forEach(([goalTitle, strategies], index) => {
          if (index < 2 && strategies.length > 0) { // Limit to 2 goals to keep response concise
            response += `\n\nFor goal "${goalTitle}":`;
            strategies.slice(0, 2).forEach((strategy, i) => { // Limit to 2 strategies per goal
              const description = strategy.description || '';
              response += `\n- **${strategy.name}**: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`;
            });
          }
        });
        
        data = { recommendationsByGoal };
      } else {
        response = "I don't have enough information to recommend specific strategies for this client. Please ensure they have defined goals.";
        confidence = 0.7;
      }
    } else {
      // General strategy information
      const strategies = await strategyDataService.getAllStrategies();
      
      if (strategies.length > 0) {
        const categories = new Set<string>();
        strategies.forEach(s => {
          if (s.category) categories.add(s.category);
        });
        
        response = `I can provide therapy strategy recommendations based on client goals. `;
        response += `We have ${strategies.length} strategies across ${categories.size} categories. `;
        response += `Please select a client to get personalized recommendations.`;
      } else {
        response = "I can provide therapy strategy recommendations once you select a client and review their goals.";
      }
    }
    
    return {
      content: response,
      confidence,
      data,
    };
  } catch (error) {
    console.error('Error processing strategy query:', error);
    return {
      content: "I'm having trouble finding appropriate therapy strategies. Please try again later.",
      confidence: 0.5,
    };
  }
}

/**
 * Process general questions
 */
function processGeneralQuery(intent: QueryIntent, context: QueryContext, originalQuery: string): AgentResponse {
  // Type guard to check if this is a general question intent
  if (intent.type !== 'GENERAL_QUESTION') {
    return defaultResponse();
  }
  
  const topic = intent.topic;
  let response = '';
  let confidence = 0.7;
  
  if (topic) {
    switch (topic) {
      case 'session planning':
        response = "Session planning is a critical part of effective therapy. Consider using the calendar to schedule upcoming sessions and reviewing past session notes for continuity.";
        break;
      
      case 'report writing':
        response = "Efficient report writing is important for documentation. You can create comprehensive reports using the session notes feature, which lets you track performance assessments and milestone achievements.";
        break;
      
      case 'billing':
        response = "For billing inquiries, you can review budget utilization in client profiles. Each therapy session can be linked to specific budget items for accurate tracking.";
        break;
      
      case 'autism':
      case 'child development':
      case 'speech therapy':
      case 'occupational therapy':
        response = `Our system supports managing therapy for clients with ${topic} needs. You can track goals, monitor progress, and get strategy recommendations specific to this area.`;
        break;
      
      default:
        response = `I can help you manage client information, track goals and progress, analyze budgets, and provide therapy strategy recommendations. What specific information about ${topic} do you need?`;
        confidence = 0.6;
    }
  } else {
    response = "I can help you manage client information, track goals and progress, analyze budgets, and provide therapy strategy recommendations. How can I assist you today?";
    confidence = 0.6;
  }
  
  return {
    content: response,
    confidence,
  };
}

/**
 * Generate insights based on budget analysis patterns
 */
function generatePatternInsights(analysis: BudgetAnalysis): string {
  // Skip if no pattern data
  if (!analysis.spendingPatterns) return '';
  
  const insights: string[] = [];
  
  // Add trend insight
  if (analysis.spendingPatterns.trend === 'increasing') {
    insights.push("Spending is accelerating compared to previous periods.");
  } else if (analysis.spendingPatterns.trend === 'decreasing') {
    insights.push("Spending is decelerating compared to previous periods, which is positive for budget longevity.");
  } else if (analysis.spendingPatterns.trend === 'fluctuating') {
    insights.push("Spending patterns are fluctuating, which may make forecasting less predictable.");
  }
  
  // Add projected overage warnings
  if (analysis.spendingPatterns.projectedOverages.length > 0) {
    insights.push(`Warning: ${analysis.spendingPatterns.projectedOverages.join(', ')} ${analysis.spendingPatterns.projectedOverages.length > 1 ? 'are' : 'is'} projected to exceed budget allocation.`);
  }
  
  // Format the insights with spacing
  return insights.length > 0 ? insights.join(' ') : '';
}

/**
 * Generate default response
 */
function defaultResponse(): AgentResponse {
  return {
    content: "I can help you manage client information, track therapy goals, analyze budgets, and suggest therapy strategies. How can I assist you today?",
    confidence: 0.5,
  };
}

/**
 * Generate error response with helpful suggestions
 * Enhanced with detailed error classification and actionable guidance
 */
function errorResponse(error: any): AgentResponse {
  console.error('Agent error:', error);
  
  // Classify error type for more helpful responses
  const errorMessage = error?.message || String(error);
  let response = '';
  let confidence = 0.5;
  
  if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('fetch')) {
    response = "I'm having trouble connecting to the server. Please check your internet connection and try again in a moment.";
  } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
    response = "I don't have permission to access that information. Please check your user permissions or log in again.";
  } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    response = "I couldn't find the information you're looking for. It may have been moved or deleted.";
  } else if (errorMessage.includes('timeout')) {
    response = "The server took too long to respond. Please try again when the system is less busy.";
  } else {
    response = "I encountered an unexpected error while processing your question. Please try again with a simpler query or contact support if the issue persists.";
    confidence = 0.4;
  }
  
  return {
    content: response,
    confidence,
  };
}