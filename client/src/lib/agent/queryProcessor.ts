import { QueryContext, QueryIntent, AgentResponse } from './types';
import { parseQueryIntent } from './queryParser';
import { budgetDataService } from '@/lib/services/budgetDataService';
import { progressDataService } from '@/lib/services/progressDataService';
import { strategyDataService } from '@/lib/services/strategyDataService';

/**
 * Process a natural language query and generate a response
 */
export async function processQuery(query: string, context: QueryContext): Promise<AgentResponse> {
  try {
    // Parse the intent from the query
    const intent = parseQueryIntent(query, context);
    console.log('Query intent:', intent);
    
    // Process the query based on the detected intent
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
 * Format a date in a human-readable format
 */
function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Process budget-related queries
 */
async function processBudgetQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  if (intent.type !== 'BUDGET_ANALYSIS' || !intent.clientId) {
    return {
      content: "I need client information to analyze the budget. Please select a client first.",
      confidence: 0.7,
      visualizationHint: 'NONE',
    };
  }
  
  try {
    // Get budget analysis data
    const analysis = await budgetDataService.getBudgetAnalysis(intent.clientId);
    
    // Build response based on specific query type
    let response: string;
    let confidence = 0.9;
    
    if (intent.specificQuery === 'REMAINING') {
      response = `The client has $${analysis.remaining.toLocaleString()} remaining out of a total budget of $${analysis.totalBudget.toLocaleString()}. This represents about ${Math.round(100 - analysis.utilizationRate)}% of their total budget.`;
    } else if (intent.specificQuery === 'FORECAST') {
      response = `Based on current spending patterns, the budget is projected to be depleted by ${formatDate(analysis.forecastedDepletion)}. This is based on an average utilization rate of ${Math.round(analysis.utilizationRate)}%.`;
    } else if (intent.specificQuery === 'UTILIZATION') {
      // Get most utilized category
      const mostUtilizedCategory = getMostUtilizedCategory(analysis.spendingByCategory);
      
      response = `The current utilization rate is ${Math.round(analysis.utilizationRate)}% of the total budget. The most utilized category is ${mostUtilizedCategory}, accounting for a significant portion of the spending.`;
    } else {
      // General budget query
      response = `The client has a total budget of $${analysis.totalBudget.toLocaleString()}, with $${analysis.totalSpent.toLocaleString()} spent so far (${Math.round(analysis.utilizationRate)}% utilization). $${analysis.remaining.toLocaleString()} remains, and at the current rate, funds are projected to last until ${formatDate(analysis.forecastedDepletion)}.`;
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
      content: `I encountered an error analyzing the budget information: ${error}`,
      confidence: 0.4,
      visualizationHint: 'NONE',
    };
  }
}

/**
 * Get the most utilized category from spending data
 */
function getMostUtilizedCategory(spendingByCategory?: Record<string, number>): string {
  if (!spendingByCategory || Object.keys(spendingByCategory).length === 0) {
    return 'Unknown';
  }
  
  let maxCategory = '';
  let maxSpending = 0;
  
  for (const [category, amount] of Object.entries(spendingByCategory)) {
    if (amount > maxSpending) {
      maxSpending = amount;
      maxCategory = category;
    }
  }
  
  return maxCategory || 'Unknown';
}

/**
 * Process progress-related queries
 */
async function processProgressQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  if (intent.type !== 'PROGRESS_TRACKING' || !intent.clientId) {
    return {
      content: "I need client information to analyze progress. Please select a client first.",
      confidence: 0.7,
      visualizationHint: 'NONE',
    };
  }
  
  try {
    // Get progress analysis data
    const analysis = await progressDataService.getProgressAnalysis(intent.clientId);
    
    // Build response based on specific query type
    let response: string;
    let confidence = 0.85;
    
    if (intent.specificQuery === 'OVERALL') {
      const progressAssessment = getProgressQualitativeAssessment(analysis.overallProgress);
      
      response = `The client is showing ${progressAssessment} with an overall progress rate of ${Math.round(analysis.overallProgress)}% across all goals. They have completed ${analysis.sessionsCompleted} sessions so far.`;
    } else if (intent.specificQuery === 'ATTENDANCE') {
      response = `The client has an attendance rate of ${Math.round(analysis.attendanceRate)}%, having completed ${analysis.sessionsCompleted} sessions and cancelled ${analysis.sessionsCancelled} sessions.`;
    } else if (intent.specificQuery === 'GOAL_SPECIFIC' && intent.goalId) {
      // Find specific goal progress
      const goalProgress = analysis.goalProgress.find(g => g.goalId === intent.goalId);
      
      if (goalProgress) {
        const progressAssessment = getProgressQualitativeAssessment(goalProgress.progress);
        
        response = `For the goal "${goalProgress.goalTitle}", the client is showing ${progressAssessment} with a progress rate of ${Math.round(goalProgress.progress)}%. They have completed ${goalProgress.milestones.filter(m => m.completed).length} out of ${goalProgress.milestones.length} milestones.`;
      } else {
        response = `I couldn't find specific progress information for the requested goal.`;
        confidence = 0.6;
      }
    } else {
      // General progress overview
      const overallAssessment = getOverallProgressAssessment(
        analysis.overallProgress,
        analysis.attendanceRate
      );
      
      response = `${overallAssessment} The overall progress rate is ${Math.round(analysis.overallProgress)}% across ${analysis.goalProgress.length} goals, with an attendance rate of ${Math.round(analysis.attendanceRate)}%.`;
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
      content: `I encountered an error analyzing the progress information: ${error}`,
      confidence: 0.4,
      visualizationHint: 'NONE',
    };
  }
}

/**
 * Get a qualitative assessment of progress
 */
function getProgressQualitativeAssessment(progress: number): string {
  if (progress >= 80) return 'excellent progress';
  if (progress >= 60) return 'good progress';
  if (progress >= 40) return 'moderate progress';
  if (progress >= 20) return 'some progress';
  return 'limited progress';
}

/**
 * Get an assessment of overall progress and attendance
 */
function getOverallProgressAssessment(progress: number, attendance: number): string {
  if (progress >= 70 && attendance >= 80) {
    return 'The client is making excellent progress and has a very consistent attendance record.';
  } else if (progress >= 50 && attendance >= 70) {
    return 'The client is making good progress with a generally consistent attendance.';
  } else if (progress >= 30 && attendance >= 50) {
    return 'The client is making moderate progress with somewhat inconsistent attendance.';
  } else if (attendance < 50) {
    return "The client's progress is affected by inconsistent attendance, which may be worth discussing.";
  } else {
    return 'The client is showing some progress, though there may be opportunities for improvement.';
  }
}

/**
 * Process strategy recommendation queries
 */
async function processStrategyQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  if (intent.type !== 'STRATEGY_RECOMMENDATION' || !intent.clientId) {
    return {
      content: "I need client information to recommend strategies. Please select a client first.",
      confidence: 0.7,
      visualizationHint: 'NONE',
    };
  }
  
  try {
    let response: string;
    let confidence = 0.8;
    
    if (intent.specificQuery === 'GOAL_SPECIFIC' && intent.goalId) {
      // Get strategies for specific goal
      const strategies = await strategyDataService.getRecommendedStrategiesForGoal(intent.goalId);
      
      if (strategies.length > 0) {
        const topStrategies = strategies.slice(0, 3);
        
        response = `For this specific goal, I recommend the following strategies:\n\n${
          topStrategies.map((s, i) => `${i+1}. **${s.name}**: ${s.description}`).join('\n\n')
        }`;
      } else {
        response = `I don't have specific strategy recommendations for this goal. Consider reviewing the general therapy approaches for this client.`;
        confidence = 0.6;
      }
    } else {
      // Get general strategies for client
      const strategiesByCategory = await strategyDataService.getRecommendedStrategiesForClient(intent.clientId);
      
      if (Object.keys(strategiesByCategory).length > 0) {
        const categories = Object.keys(strategiesByCategory);
        const primaryCategory = categories[0];
        const topStrategies = strategiesByCategory[primaryCategory].slice(0, 2);
        
        response = `Based on the client's goals, I recommend focusing on ${primaryCategory} strategies such as:\n\n${
          topStrategies.map((s, i) => `${i+1}. **${s.name}**: ${s.description}`).join('\n\n')
        }`;
      } else {
        response = `I don't have enough information to make specific strategy recommendations for this client. Consider setting more detailed goals to receive better recommendations.`;
        confidence = 0.5;
      }
    }
    
    return {
      content: response,
      confidence,
      visualizationHint: 'NONE',
    };
  } catch (error) {
    console.error('Error processing strategy query:', error);
    return {
      content: `I encountered an error finding strategy recommendations: ${error}`,
      confidence: 0.4,
      visualizationHint: 'NONE',
    };
  }
}

/**
 * Process general questions
 */
function processGeneralQuery(intent: QueryIntent, context: QueryContext, originalQuery: string): AgentResponse {
  if (intent.type !== 'GENERAL_QUESTION') {
    return defaultResponse();
  }
  
  let response = '';
  let confidence = 0.7;
  
  if (intent.topic === 'HELP') {
    response = `I can help you with several aspects of client management:
    
1. **Budget Analysis** - Ask about remaining funds, spending forecasts, or budget utilization
2. **Progress Tracking** - Inquire about overall progress, attendance, or specific goal achievements
3. **Strategy Recommendations** - Get suggested therapy approaches based on client goals

Try asking questions like "What's the remaining budget?", "How is the client progressing?", or "What strategies do you recommend?"`;
    confidence = 0.95;
  } else if (intent.topic === 'GREETING') {
    response = `Hello! I'm your speech therapy practice assistant. I can help with budget analysis, progress tracking, and strategy recommendations for your clients. What would you like to know about the current client?`;
    confidence = 0.95;
  } else {
    // Unknown general question
    response = `I'm not sure I understand your question. I can help with budget analysis, progress tracking, and therapy strategy recommendations. Try asking about one of these areas, or type "help" for more information.`;
    confidence = 0.6;
  }
  
  return {
    content: response,
    confidence,
    visualizationHint: 'NONE',
  };
}

/**
 * Generate default response
 */
function defaultResponse(): AgentResponse {
  return {
    content: "I'm sorry, I'm not sure how to help with that. I can provide information about client budgets, progress tracking, and therapy strategies. Try asking a question about one of these topics.",
    confidence: 0.5,
    visualizationHint: 'NONE',
  };
}

/**
 * Generate error response
 */
function errorResponse(error: any): AgentResponse {
  return {
    content: `I encountered an error and couldn't process your request. Please try again or ask a different question. (Error: ${error})`,
    confidence: 0.3,
    visualizationHint: 'NONE',
  };
}