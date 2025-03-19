import { AgentResponse, QueryContext, QueryIntent } from './types';
import { parseQueryIntent } from './queryParser';
import { budgetDataService } from '../services/budgetDataService';

/**
 * Process a natural language query and generate a response
 */
export async function processQuery(query: string, context: QueryContext): Promise<AgentResponse> {
  try {
    // Parse the query to determine intent
    const intent = parseQueryIntent(query, context);
    
    // Process based on intent type
    switch (intent.type) {
      case 'BUDGET_ANALYSIS':
        return processBudgetQuery(intent, context);
        
      case 'PROGRESS_TRACKING':
        return processProgressQuery(intent, context);
        
      case 'STRATEGY_RECOMMENDATION':
        return processStrategyQuery(intent, context);
        
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
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Process budget-related queries
 */
async function processBudgetQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  if (intent.type !== 'BUDGET_ANALYSIS') return defaultResponse();
  
  const clientId = intent.clientId || context.activeClientId;
  if (!clientId) {
    return {
      content: "I need to know which client you're referring to. Please select a client first.",
      confidence: 0.9,
      visualizationHint: 'NONE'
    };
  }
  
  try {
    // Get budget analysis data
    const analysis = await budgetDataService.getBudgetAnalysis(clientId);
    
    // Generate response based on specific query
    if (intent.specificQuery === 'REMAINING') {
      return {
        content: `The client has $${analysis.remaining.toFixed(2)} remaining out of a total budget of $${analysis.totalBudget.toFixed(2)}. That's ${(analysis.remaining / analysis.totalBudget * 100).toFixed(1)}% of the total budget remaining.`,
        confidence: 0.95,
        data: analysis,
        visualizationHint: 'BUBBLE_CHART'
      };
    } else if (intent.specificQuery === 'FORECAST') {
      return {
        content: `At the current rate of spending, the client's budget will be depleted by ${formatDate(analysis.forecastedDepletion)}. The current utilization rate is ${analysis.utilizationRate.toFixed(1)}%.`,
        confidence: 0.90,
        data: analysis,
        visualizationHint: 'BUBBLE_CHART'
      };
    } else if (intent.specificQuery === 'UTILIZATION') {
      // Get category with highest spending
      const mostUtilizedCategory = getMostUtilizedCategory(analysis.spendingByCategory);
      
      return {
        content: `The client's budget utilization rate is ${analysis.utilizationRate.toFixed(1)}%. The most utilized category is ${mostUtilizedCategory}, which accounts for a significant portion of the spending.`,
        confidence: 0.95,
        data: analysis,
        visualizationHint: 'BUBBLE_CHART'
      };
    } else {
      // General budget analysis
      return {
        content: `The client has a total budget of $${analysis.totalBudget.toFixed(2)} with $${analysis.totalAllocated.toFixed(2)} allocated across budget items. Currently, $${analysis.totalSpent.toFixed(2)} has been spent, leaving $${analysis.remaining.toFixed(2)} remaining (${(analysis.remaining / analysis.totalBudget * 100).toFixed(1)}%). At the current rate, funds will be depleted by ${formatDate(analysis.forecastedDepletion)}.`,
        confidence: 0.95,
        data: analysis,
        visualizationHint: 'BUBBLE_CHART'
      };
    }
  } catch (error) {
    console.error('Error processing budget query:', error);
    return {
      content: "I couldn't retrieve the budget information. There might be an issue with the data.",
      confidence: 0.5,
      visualizationHint: 'NONE'
    };
  }
}

/**
 * Get the most utilized category from spending data
 */
function getMostUtilizedCategory(spendingByCategory?: Record<string, number>): string {
  if (!spendingByCategory || Object.keys(spendingByCategory).length === 0) {
    return "Not available";
  }
  
  let maxCategory = "";
  let maxAmount = 0;
  
  for (const [category, amount] of Object.entries(spendingByCategory)) {
    if (amount > maxAmount) {
      maxAmount = amount;
      maxCategory = category;
    }
  }
  
  return maxCategory || "Not available";
}

/**
 * Process progress-related queries
 */
async function processProgressQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  if (intent.type !== 'PROGRESS_TRACKING') return defaultResponse();
  
  const clientId = intent.clientId || context.activeClientId;
  if (!clientId) {
    return {
      content: "I need to know which client you're referring to. Please select a client first.",
      confidence: 0.9,
      visualizationHint: 'NONE'
    };
  }
  
  try {
    // For now, return a placeholder response
    // In the full implementation, this would get data from progressDataService
    return {
      content: "I can analyze this client's progress towards their therapy goals, but that functionality is still being implemented. Check back soon!",
      confidence: 0.5,
      visualizationHint: 'NONE'
    };
  } catch (error) {
    console.error('Error processing progress query:', error);
    return {
      content: "I couldn't retrieve the progress information. There might be an issue with the data.",
      confidence: 0.5,
      visualizationHint: 'NONE'
    };
  }
}

/**
 * Get a qualitative assessment of progress
 */
function getProgressQualitativeAssessment(progress: number): string {
  if (progress >= 90) return "excellent";
  if (progress >= 75) return "very good";
  if (progress >= 60) return "good";
  if (progress >= 40) return "fair";
  if (progress >= 20) return "struggling";
  return "limited";
}

/**
 * Get an assessment of overall progress and attendance
 */
function getOverallProgressAssessment(progress: number, attendance: number): string {
  if (progress >= 60 && attendance >= 85) {
    return "consistent and showing strong improvement";
  } else if (progress >= 40 && attendance >= 75) {
    return "making steady progress with good attendance";
  } else if (progress < 40 && attendance >= 75) {
    return "attending sessions consistently but showing limited improvement";
  } else if (progress >= 40 && attendance < 75) {
    return "showing improvement despite inconsistent attendance";
  } else {
    return "facing challenges with both progress and attendance";
  }
}

/**
 * Process strategy recommendation queries
 */
async function processStrategyQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  if (intent.type !== 'STRATEGY_RECOMMENDATION') return defaultResponse();
  
  const clientId = intent.clientId || context.activeClientId;
  if (!clientId) {
    return {
      content: "I need to know which client you're referring to. Please select a client first.",
      confidence: 0.9,
      visualizationHint: 'NONE'
    };
  }
  
  try {
    // For now, return a placeholder response
    // In the full implementation, this would get data from strategyDataService
    return {
      content: "I can recommend evidence-based strategies for this client based on their goals and progress, but that functionality is still being implemented. Check back soon!",
      confidence: 0.5,
      visualizationHint: 'NONE'
    };
  } catch (error) {
    console.error('Error processing strategy query:', error);
    return {
      content: "I couldn't retrieve strategy recommendations. There might be an issue with the data.",
      confidence: 0.5,
      visualizationHint: 'NONE'
    };
  }
}

/**
 * Process general questions
 */
function processGeneralQuery(intent: QueryIntent, context: QueryContext, originalQuery: string): AgentResponse {
  // Handle common general questions
  const lowerQuery = originalQuery.toLowerCase();
  
  if (lowerQuery.includes('help') && (lowerQuery.includes('how') || lowerQuery.includes('what'))) {
    return {
      content: "I can help answer questions about client budgets, progress tracking, and therapy strategies. For example, you can ask me:\n\n- 'How much budget does this client have remaining?'\n- 'How is this client progressing towards their goals?'\n- 'What strategies do you recommend for this client?'\n\nYou can also ask me to visualize budget data or track client progress over time.",
      confidence: 0.95,
      visualizationHint: 'NONE'
    };
  }
  
  if (lowerQuery.includes('who are you') || lowerQuery.includes('what are you') || lowerQuery.includes('what do you do')) {
    return {
      content: "I'm your therapy practice assistant. I can analyze client budgets, track therapy progress, and recommend evidence-based strategies to help you provide the best care for your clients. I can also visualize data to help you make informed decisions about therapy plans and resource allocation.",
      confidence: 0.95,
      visualizationHint: 'NONE'
    };
  }
  
  // Default response for other general questions
  return {
    content: "I'm not sure I understand that question. Would you like information about budgets, client progress, or therapy strategies?",
    confidence: 0.3,
    visualizationHint: 'NONE'
  };
}

/**
 * Generate default response
 */
function defaultResponse(): AgentResponse {
  return {
    content: "I'm not sure I understand that question. Can you try rephrasing it?",
    confidence: 0.3,
    visualizationHint: 'NONE'
  };
}

/**
 * Generate error response
 */
function errorResponse(error: any): AgentResponse {
  console.error('Agent error:', error);
  
  return {
    content: "I'm sorry, I encountered an error while processing your question. Please try again.",
    confidence: 0.1,
    visualizationHint: 'NONE'
  };
}