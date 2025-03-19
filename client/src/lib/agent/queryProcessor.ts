import { AgentResponse, QueryContext, QueryIntent } from './types';
import { parseQueryIntent } from './queryParser';
import { budgetDataService } from '@/lib/services/budgetDataService';
import { progressDataService } from '@/lib/services/progressDataService';
import { strategyDataService } from '@/lib/services/strategyDataService';

/**
 * Process a natural language query and generate a response
 */
export async function processQuery(query: string, context: QueryContext): Promise<AgentResponse> {
  try {
    // Check if query is empty or too short
    if (!query || query.trim().length < 2) {
      return {
        content: "I didn't catch that. Could you please provide more details about what you'd like to know?",
        confidence: 0.5,
        visualizationHint: 'NONE'
      };
    }
    
    // Log conversation context
    console.log('Processing query with context:', {
      activeClientId: context.activeClientId,
      activeGoalId: context.activeGoalId,
      conversationHistoryLength: context.conversationHistory.length
    });
    
    // Parse the query to determine intent
    const intent = parseQueryIntent(query, context);
    console.log('Detected query intent:', intent);
    
    // Check if client context is required but not available
    if (needsClientContext(intent) && !context.activeClientId) {
      return {
        content: "To answer your question about " + getIntentDescription(intent) + ", I need to know which client you're referring to. Please select a client first.",
        confidence: 0.9,
        visualizationHint: 'NONE'
      };
    }
    
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
 * Check if the intent requires client context
 */
function needsClientContext(intent: QueryIntent): boolean {
  return intent.type === 'BUDGET_ANALYSIS' || 
         intent.type === 'PROGRESS_TRACKING' || 
         intent.type === 'STRATEGY_RECOMMENDATION';
}

/**
 * Get a human-readable description of the intent
 */
function getIntentDescription(intent: QueryIntent): string {
  switch (intent.type) {
    case 'BUDGET_ANALYSIS':
      return 'budgets or financial information';
    case 'PROGRESS_TRACKING':
      return 'progress or goals';
    case 'STRATEGY_RECOMMENDATION':
      return 'therapy strategies or recommendations';
    case 'GENERAL_QUESTION':
      return intent.topic ? intent.topic : 'this topic';
    default:
      return 'this topic';
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
  if (intent.type !== 'BUDGET_ANALYSIS') {
    throw new Error('Invalid intent type for budget query');
  }
  
  // Validate client ID
  if (!intent.clientId) {
    return {
      content: 'To analyze budget information, I need to know which client you\'re referring to. Please select a client first.',
      confidence: 0.9,
      visualizationHint: 'NONE'
    };
  }
  
  // Get budget analysis
  const analysis = await budgetDataService.getBudgetAnalysis(intent.clientId);
  
  // Generate response based on specific query type
  let content = '';
  let visualizationHint: 'BUBBLE_CHART' | 'NONE' = 'BUBBLE_CHART';
  
  switch (intent.specificQuery) {
    case 'REMAINING':
      content = `The client has $${analysis.remaining.toFixed(2)} remaining out of a total budget of $${analysis.totalBudget.toFixed(2)}. This represents ${(100 - analysis.utilizationRate).toFixed(1)}% of the total budget still available for use.`;
      break;
    case 'FORECAST':
      content = `Based on current spending patterns, the budget is projected to be depleted by ${formatDate(analysis.forecastedDepletion)}. The client has been using funds at a rate that suggests careful planning for the remaining period.`;
      break;
    case 'UTILIZATION':
      content = `The client has utilized ${analysis.utilizationRate.toFixed(1)}% of their total budget ($${analysis.totalSpent.toFixed(2)} out of $${analysis.totalBudget.toFixed(2)}). `;
      
      if (analysis.spendingByCategory) {
        const topCategory = getMostUtilizedCategory(analysis.spendingByCategory);
        if (topCategory) {
          content += `The most utilized category is "${topCategory}", which represents a significant portion of the spending.`;
        }
      }
      break;
    default:
      // General budget overview
      content = `Budget overview for the client:\n`;
      content += `• Total budget: $${analysis.totalBudget.toFixed(2)}\n`;
      content += `• Spent so far: $${analysis.totalSpent.toFixed(2)} (${analysis.utilizationRate.toFixed(1)}%)\n`;
      content += `• Remaining funds: $${analysis.remaining.toFixed(2)}\n`;
      content += `• Projected depletion date: ${formatDate(analysis.forecastedDepletion)}`;
  }
  
  return {
    content,
    confidence: 0.95,
    data: analysis,
    visualizationHint
  };
}

/**
 * Get the most utilized category from spending data
 */
function getMostUtilizedCategory(spendingByCategory?: Record<string, number>): string {
  if (!spendingByCategory || Object.keys(spendingByCategory).length === 0) {
    return '';
  }
  
  let maxCategory = '';
  let maxAmount = 0;
  
  for (const [category, amount] of Object.entries(spendingByCategory)) {
    if (amount > maxAmount) {
      maxAmount = amount;
      maxCategory = category;
    }
  }
  
  return maxCategory;
}

/**
 * Process progress-related queries
 */
async function processProgressQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  if (intent.type !== 'PROGRESS_TRACKING') {
    throw new Error('Invalid intent type for progress query');
  }
  
  // Validate client ID
  if (!intent.clientId) {
    return {
      content: 'To analyze progress information, I need to know which client you\'re referring to. Please select a client first.',
      confidence: 0.9,
      visualizationHint: 'NONE'
    };
  }
  
  // Get progress analysis
  const analysis = await progressDataService.getProgressAnalysis(intent.clientId);
  
  // Generate response based on specific query type
  let content = '';
  let visualizationHint: 'PROGRESS_CHART' | 'NONE' = 'PROGRESS_CHART';
  
  switch (intent.specificQuery) {
    case 'OVERALL':
      content = `Overall progress for the client is ${analysis.overallProgress.toFixed(1)}%. `;
      content += getProgressQualitativeAssessment(analysis.overallProgress);
      break;
    case 'GOAL_SPECIFIC':
      // If specific goal ID is provided, focus on that goal
      if (intent.goalId) {
        const goalProgress = analysis.goalProgress.find(g => g.goalId === intent.goalId);
        if (goalProgress) {
          content = `Progress for goal "${goalProgress.goalTitle}" is ${goalProgress.progress.toFixed(1)}%. `;
          content += `This goal has ${goalProgress.milestones.filter(m => m.completed).length} completed milestones out of ${goalProgress.milestones.length} total milestones.`;
        } else {
          content = 'I couldn\'t find information about the specific goal you\'re asking about.';
          visualizationHint = 'NONE';
        }
      } else {
        // Summarize all goals
        content = 'Here\'s a summary of progress for each goal:\n';
        analysis.goalProgress.forEach(goal => {
          content += `• ${goal.goalTitle}: ${goal.progress.toFixed(1)}% complete (${goal.milestones.filter(m => m.completed).length}/${goal.milestones.length} milestones)\n`;
        });
      }
      break;
    case 'ATTENDANCE':
      content = `The client's attendance rate is ${analysis.attendanceRate.toFixed(1)}%. `;
      content += `They have completed ${analysis.sessionsCompleted} sessions and cancelled ${analysis.sessionsCancelled} sessions.`;
      visualizationHint = 'NONE';
      break;
    default:
      // General progress overview
      content = getOverallProgressAssessment(analysis.overallProgress, analysis.attendanceRate);
      content += `\n\nProgress details:\n`;
      content += `• Overall progress: ${analysis.overallProgress.toFixed(1)}%\n`;
      content += `• Attendance rate: ${analysis.attendanceRate.toFixed(1)}%\n`;
      content += `• Sessions completed: ${analysis.sessionsCompleted}\n`;
      content += `• Goals in progress: ${analysis.goalProgress.length}`;
  }
  
  return {
    content,
    confidence: 0.9,
    data: analysis,
    visualizationHint
  };
}

/**
 * Get a qualitative assessment of progress
 */
function getProgressQualitativeAssessment(progress: number): string {
  if (progress >= 90) {
    return 'This represents excellent progress, with most goals and milestones achieved.';
  } else if (progress >= 75) {
    return 'This shows very good progress toward achieving therapy goals.';
  } else if (progress >= 50) {
    return 'This indicates moderate progress, with good advancement toward goals.';
  } else if (progress >= 25) {
    return 'This shows initial progress, with opportunities for continued improvement.';
  } else {
    return 'This indicates early-stage progress with plenty of room for improvement.';
  }
}

/**
 * Get an assessment of overall progress and attendance
 */
function getOverallProgressAssessment(progress: number, attendance: number): string {
  let assessment = '';
  
  // Progress assessment
  if (progress >= 75) {
    assessment += 'The client is making excellent progress toward their therapy goals. ';
  } else if (progress >= 50) {
    assessment += 'The client is making good progress toward their therapy goals. ';
  } else if (progress >= 25) {
    assessment += 'The client is making moderate progress toward their therapy goals. ';
  } else {
    assessment += 'The client is in the early stages of progress toward their therapy goals. ';
  }
  
  // Attendance correlation
  if (attendance >= 90) {
    assessment += 'Their excellent attendance is supporting consistent progress.';
  } else if (attendance >= 75) {
    assessment += 'Their good attendance is helping maintain steady progress.';
  } else if (attendance >= 50) {
    assessment += 'Improved attendance could help accelerate their progress.';
  } else {
    assessment += 'Low attendance may be affecting their ability to make progress.';
  }
  
  return assessment;
}

/**
 * Process strategy recommendation queries
 */
async function processStrategyQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  if (intent.type !== 'STRATEGY_RECOMMENDATION') {
    throw new Error('Invalid intent type for strategy query');
  }
  
  // Validate client ID
  if (!intent.clientId) {
    return {
      content: 'To recommend strategies, I need to know which client you\'re referring to. Please select a client first.',
      confidence: 0.85,
      visualizationHint: 'NONE'
    };
  }
  
  let content = '';
  let data = null;
  
  // Handle specific query types
  if (intent.specificQuery === 'GOAL_SPECIFIC' && intent.goalId) {
    // Get strategies for a specific goal
    const strategies = await strategyDataService.getRecommendedStrategiesForGoal(intent.goalId);
    
    if (strategies.length > 0) {
      content = `Here are recommended strategies for this specific goal:\n\n`;
      strategies.slice(0, 3).forEach((strategy, index) => {
        content += `${index + 1}. **${strategy.name}** - ${strategy.description || 'No description available'}\n`;
      });
      
      if (strategies.length > 3) {
        content += `\nThere are ${strategies.length - 3} more strategies available.`;
      }
      
      data = strategies;
    } else {
      content = `I don't have specific strategy recommendations for this goal yet. Consider therapist expertise and clinical judgment for appropriate approaches.`;
    }
  } else {
    // Get strategies for all client goals
    const recommendations = await strategyDataService.getRecommendedStrategiesForClient(intent.clientId);
    
    if (Object.keys(recommendations).length > 0) {
      content = `Here are recommended strategies based on the client's goals:\n\n`;
      
      for (const [goalTitle, strategies] of Object.entries(recommendations)) {
        content += `For "${goalTitle}":\n`;
        strategies.slice(0, 2).forEach((strategy, index) => {
          content += `${index + 1}. **${strategy.name}** - ${strategy.category}\n`;
        });
        content += '\n';
      }
      
      data = recommendations;
    } else {
      content = `I don't have specific strategy recommendations for this client yet. Consider reviewing their goals and progress to develop appropriate therapy approaches.`;
    }
  }
  
  return {
    content,
    confidence: 0.85,
    data,
    visualizationHint: 'NONE'
  };
}

/**
 * Process general questions
 */
function processGeneralQuery(intent: QueryIntent, context: QueryContext, originalQuery: string): AgentResponse {
  if (intent.type !== 'GENERAL_QUESTION') {
    throw new Error('Invalid intent type for general query');
  }
  
  let content = '';
  let confidence = 0.7;
  
  if (intent.topic) {
    switch (intent.topic) {
      case 'billing':
        content = 'I can help you understand billing aspects such as invoices, claims, and payments for therapy services. For specific client billing, please navigate to their profile and check the Budget tab.';
        break;
      case 'scheduling':
        content = 'For scheduling information, you can check the client\'s session history or create new appointments through the Sessions interface.';
        break;
      case 'reporting':
        content = 'You can generate various reports from the client data, including progress reports, session summaries, and budget utilization reports. These can be accessed through the reporting interface.';
        break;
      case 'client':
        content = 'You can view and manage client information through the client list or individual client profiles. Each profile contains personal information, goals, budget details, and session history.';
        break;
      case 'therapy':
        content = 'The system helps you track therapy sessions, goals, and progress. You can record session notes, assessments, and track milestone achievements for each client.';
        break;
      case 'communication':
        content = 'You can manage communication with clients and their families through the system. This includes contact information, preferred communication methods, and session reminders.';
        break;
      default:
        content = `I'll try to help you with that question. Can you provide more details about what specific information you're looking for?`;
        confidence = 0.6;
    }
  } else {
    content = `I'm not sure I understand what you're asking about. I can help with budget analysis, progress tracking, therapy strategies, and general information about clients, billing, or scheduling.`;
    confidence = 0.5;
  }
  
  return {
    content,
    confidence,
    visualizationHint: 'NONE'
  };
}

/**
 * Generate default response
 */
function defaultResponse(): AgentResponse {
  return {
    content: 'I can help you understand client budgets, track progress, or recommend therapy strategies. What would you like to know?',
    confidence: 0.5,
    visualizationHint: 'NONE'
  };
}

/**
 * Generate error response with helpful suggestions
 * Enhanced with detailed error classification and actionable guidance
 */
function errorResponse(error: any): AgentResponse {
  // Get the error message or a default one
  const errorMessage = error.message || 'Something unexpected occurred.';
  
  // Log detailed error for debugging
  console.error('Agent error details:', {
    message: errorMessage,
    stack: error.stack,
    name: error.name,
    code: error.code || 'unknown'
  });
  
  // Enhanced error classification system
  // This helps provide more specific and actionable responses to users
  let content = '';
  let errorType = 'UNKNOWN';
  
  // Network and connectivity errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') || 
      errorMessage.includes('connection') || 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Failed to fetch')) {
    errorType = 'CONNECTIVITY';
    content = "I'm having trouble connecting to the data source. This could be due to a network issue. Please check your connection and try again in a moment.";
  } 
  // Authentication and permission errors
  else if (errorMessage.includes('permission') || 
           errorMessage.includes('access') || 
           errorMessage.includes('authorize') ||
           errorMessage.includes('forbidden') ||
           errorMessage.includes('authentication') ||
           errorMessage.includes('401') ||
           errorMessage.includes('403')) {
    errorType = 'AUTHENTICATION';
    content = "I don't have permission to access the requested information. This might be related to account permissions or data access controls.";
  } 
  // Resource not found errors
  else if (errorMessage.includes('not found') || 
           errorMessage.includes('404') || 
           errorMessage.includes('missing') ||
           errorMessage.includes('undefined') ||
           errorMessage.includes('null')) {
    errorType = 'NOT_FOUND';
    content = "I couldn't find the information you're looking for. It might not exist in the current database or could have been moved.";
  } 
  // Timeout and performance errors
  else if (errorMessage.includes('timeout') || 
           errorMessage.includes('timed out') ||
           errorMessage.includes('too long') ||
           errorMessage.includes('aborted')) {
    errorType = 'TIMEOUT';
    content = "The request took too long to process. This might be due to high system load or complex data processing. Please try a simpler query or try again later.";
  }
  // Data parsing and validation errors
  else if (errorMessage.includes('parse') || 
           errorMessage.includes('invalid JSON') ||
           errorMessage.includes('syntax') ||
           errorMessage.includes('malformed') ||
           errorMessage.includes('validation') ||
           errorMessage.includes('schema')) {
    errorType = 'DATA_FORMAT';
    content = "I had trouble interpreting the data. There might be an issue with data formatting or validation. Try asking about a different aspect of the data.";
  }
  // API limit or quota errors
  else if (errorMessage.includes('limit') || 
           errorMessage.includes('quota') ||
           errorMessage.includes('rate') ||
           errorMessage.includes('too many') ||
           errorMessage.includes('429')) {
    errorType = 'RATE_LIMIT';
    content = "I've reached the limit of requests I can make at the moment. Please wait a few moments and try again.";
  }
  // Default error case
  else {
    content = `I encountered an error while processing your query. Please try rephrasing your question or asking about something else.`;
  }
  
  // Add suggestions for recovery
  let suggestions = "";
  if (errorType === 'CONNECTIVITY' || errorType === 'TIMEOUT') {
    suggestions = "You could try: \n1. Checking if you're connected to the internet\n2. Refreshing the page\n3. Simplifying your question";
  } else if (errorType === 'AUTHENTICATION') {
    suggestions = "You could try: \n1. Making sure you're logged in\n2. Asking about information you have access to";
  } else if (errorType === 'NOT_FOUND') {
    suggestions = "You could try: \n1. Checking if the client exists in the system\n2. Verifying the spelling of names\n3. Looking for similar information";
  } else if (errorType === 'DATA_FORMAT') {
    suggestions = "You could try: \n1. Asking about a specific client by name\n2. Using simpler, more direct questions";
  } else {
    suggestions = "You could try: \n1. Asking a different question\n2. Being more specific\n3. Using simpler language";
  }
  
  // Add suggestions to the content
  content += "\n\n" + suggestions;
  
  return {
    content,
    confidence: 0.3,
    visualizationHint: 'NONE',
    data: { errorType }
  };
}