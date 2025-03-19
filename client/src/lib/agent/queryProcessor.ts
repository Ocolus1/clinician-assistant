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
    // Parse the query to determine intent
    const intent = parseQueryIntent(query, context);
    console.log('Detected query intent:', intent);
    
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
 * Generate error response
 */
function errorResponse(error: any): AgentResponse {
  return {
    content: `I'm sorry, I encountered an error while processing your query. ${error.message || 'Please try again with a different question.'}`,
    confidence: 0.3,
    visualizationHint: 'NONE'
  };
}