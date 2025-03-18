import { AgentResponse, QueryIntent, QueryContext } from './types';
import { parseQueryIntent } from './queryParser';
import { budgetDataService } from '../services/budgetDataService';
import { progressDataService } from '../services/progressDataService';
import { strategyDataService } from '../services/strategyDataService';

/**
 * Process a natural language query and generate a response
 */
export async function processQuery(query: string, context: QueryContext): Promise<AgentResponse> {
  try {
    // Parse query intent
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
      default:
        return processGeneralQuery(intent, context, query);
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
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
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
    switch (intent.specificQuery) {
      case 'REMAINING':
        return {
          content: `The client has $${analysis.remaining.toFixed(2)} remaining out of a total budget of $${analysis.totalBudget.toFixed(2)}. This represents ${(100 - analysis.utilizationRate).toFixed(1)}% of their allocated funds.`,
          confidence: 0.95,
          data: analysis,
          visualizationHint: 'BUBBLE_CHART'
        };
        
      case 'FORECAST':
        return {
          content: `Based on current spending patterns, the client's funds will be depleted by ${formatDate(analysis.forecastedDepletion)}. The client has been using approximately $${(analysis.totalSpent / Math.max(1, analysis.budgetItems?.length || 0)).toFixed(2)} per service.`,
          confidence: 0.85,
          data: analysis,
          visualizationHint: 'BUBBLE_CHART'
        };
        
      case 'UTILIZATION':
        return {
          content: `The client has utilized ${analysis.utilizationRate.toFixed(1)}% of their total budget ($${analysis.totalSpent.toFixed(2)} out of $${analysis.totalBudget.toFixed(2)}). The most utilized category is ${getMostUtilizedCategory(analysis.spendingByCategory)}.`,
          confidence: 0.9,
          data: analysis,
          visualizationHint: 'BUBBLE_CHART'
        };
        
      default:
        // General budget analysis
        return {
          content: `The client has a total budget of $${analysis.totalBudget.toFixed(2)}, with $${analysis.totalSpent.toFixed(2)} spent so far (${analysis.utilizationRate.toFixed(1)}% utilization) and $${analysis.remaining.toFixed(2)} remaining. At the current rate, funds will be depleted by ${formatDate(analysis.forecastedDepletion)}.`,
          confidence: 0.92,
          data: analysis,
          visualizationHint: 'BUBBLE_CHART'
        };
    }
  } catch (error) {
    console.error('Error in budget query processing:', error);
    return errorResponse(error);
  }
}

/**
 * Get the most utilized category from spending data
 */
function getMostUtilizedCategory(spendingByCategory?: Record<string, number>): string {
  if (!spendingByCategory || Object.keys(spendingByCategory).length === 0) {
    return 'N/A';
  }
  
  let maxCategory = '';
  let maxSpending = 0;
  
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
    // Get progress analysis data
    const analysis = await progressDataService.getProgressAnalysis(clientId);
    
    // Generate response based on specific query
    switch (intent.specificQuery) {
      case 'GOAL_SPECIFIC':
        // If we have a specific goal ID, focus on that goal
        if (intent.goalId) {
          const goalData = analysis.goalProgress.find(g => g.goalId === intent.goalId);
          if (!goalData) {
            return {
              content: "I couldn't find progress data for that specific goal. Please check if the goal exists for this client.",
              confidence: 0.7,
              visualizationHint: 'NONE'
            };
          }
          
          // Get completed and in-progress milestones
          const completedMilestones = goalData.milestones.filter(m => m.completed).length;
          const totalMilestones = goalData.milestones.length;
          
          return {
            content: `For the goal "${goalData.goalTitle}", the client has completed ${completedMilestones} out of ${totalMilestones} milestones (${goalData.progress.toFixed(1)}% progress). ${getProgressQualitativeAssessment(goalData.progress)}`,
            confidence: 0.9,
            data: goalData,
            visualizationHint: 'PROGRESS_CHART'
          };
        } 
        // Otherwise, summarize all goals
        else {
          return {
            content: `The client has ${analysis.goalProgress.length} active goals with varying levels of progress. The goal with the most progress is "${getMostProgressedGoal(analysis.goalProgress)}" at ${getHighestProgress(analysis.goalProgress).toFixed(1)}% completion.`,
            confidence: 0.85,
            data: analysis,
            visualizationHint: 'PROGRESS_CHART'
          };
        }
        
      case 'ATTENDANCE':
        return {
          content: `The client has completed ${analysis.sessionsCompleted} sessions with an attendance rate of ${analysis.attendanceRate.toFixed(1)}%. ${analysis.sessionsCancelled} sessions were cancelled or rescheduled.`,
          confidence: 0.9,
          data: {
            attendanceRate: analysis.attendanceRate,
            sessionsCompleted: analysis.sessionsCompleted,
            sessionsCancelled: analysis.sessionsCancelled
          },
          visualizationHint: 'NONE'
        };
        
      case 'OVERALL':
      default:
        return {
          content: `Overall, the client has made ${analysis.overallProgress.toFixed(1)}% progress across all goals. Their attendance rate is ${analysis.attendanceRate.toFixed(1)}%. ${getOverallProgressAssessment(analysis.overallProgress, analysis.attendanceRate)}`,
          confidence: 0.9,
          data: analysis,
          visualizationHint: 'PROGRESS_CHART'
        };
    }
  } catch (error) {
    console.error('Error in progress query processing:', error);
    return errorResponse(error);
  }
}

/**
 * Get a qualitative assessment of progress
 */
function getProgressQualitativeAssessment(progress: number): string {
  if (progress >= 90) return "Excellent progress has been made, and the goal is nearly complete.";
  if (progress >= 70) return "Good progress has been made toward this goal.";
  if (progress >= 50) return "Moderate progress has been made, but there's still work to be done.";
  if (progress >= 25) return "Some initial progress has been made, but significant work remains.";
  return "Limited progress has been made so far on this goal.";
}

/**
 * Get an assessment of overall progress and attendance
 */
function getOverallProgressAssessment(progress: number, attendance: number): string {
  if (progress >= 75 && attendance >= 85) {
    return "The client is making excellent progress with strong attendance.";
  } else if (progress >= 50 && attendance >= 70) {
    return "The client is making good progress with consistent attendance.";
  } else if (progress >= 25 && attendance >= 50) {
    return "The client is making moderate progress, but attendance could be improved.";
  } else if (attendance < 50) {
    return "Progress may be limited due to attendance challenges.";
  } else {
    return "The client is in the early stages of their therapy journey.";
  }
}

/**
 * Get the name of the goal with the most progress
 */
function getMostProgressedGoal(goalProgress: any[]): string {
  if (!goalProgress || goalProgress.length === 0) return "N/A";
  
  let maxProgress = 0;
  let maxGoalTitle = "";
  
  goalProgress.forEach(goal => {
    if (goal.progress > maxProgress) {
      maxProgress = goal.progress;
      maxGoalTitle = goal.goalTitle;
    }
  });
  
  return maxGoalTitle;
}

/**
 * Get the highest progress percentage from all goals
 */
function getHighestProgress(goalProgress: any[]): number {
  if (!goalProgress || goalProgress.length === 0) return 0;
  return Math.max(...goalProgress.map(goal => goal.progress));
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
    switch (intent.specificQuery) {
      case 'GOAL_SPECIFIC':
        // If we have a specific goal ID, provide strategies for that goal
        if (intent.goalId) {
          const strategies = await strategyDataService.getRecommendedStrategiesForGoal(intent.goalId);
          
          if (!strategies || strategies.length === 0) {
            return {
              content: "I don't have specific strategy recommendations for this goal yet. Consider reviewing the goal details and subgoals to identify appropriate therapy approaches.",
              confidence: 0.7,
              visualizationHint: 'NONE'
            };
          }
          
          const formattedStrategies = strategies.map(s => `- ${s.name}: ${s.description}`).join('\n');
          
          return {
            content: `Here are some recommended strategies for this goal:\n\n${formattedStrategies}\n\nThese strategies were selected based on the goal focus and potential effectiveness.`,
            confidence: 0.85,
            data: strategies,
            visualizationHint: 'NONE'
          };
        }
        // Otherwise, provide general strategies
        else {
          return {
            content: "I can provide more specific strategy recommendations if you select a particular goal. Would you like recommendations for a specific goal or general therapy approaches?",
            confidence: 0.8,
            visualizationHint: 'NONE'
          };
        }
        
      case 'GENERAL':
      default:
        // Get recommendations across all goals
        const recommendationsByGoal = await strategyDataService.getRecommendedStrategiesForClient(clientId);
        
        if (Object.keys(recommendationsByGoal).length === 0) {
          return {
            content: "I don't have enough information yet to provide personalized strategy recommendations. As you add more goals and session data, I'll be able to offer more specific suggestions.",
            confidence: 0.7,
            visualizationHint: 'NONE'
          };
        }
        
        // Format recommendations by goal
        let responseContent = "Here are strategy recommendations based on the client's goals:\n\n";
        
        Object.entries(recommendationsByGoal).forEach(([goalTitle, strategies], index) => {
          if (index < 2) { // Limit to top 2 goals to avoid overwhelming response
            responseContent += `For "${goalTitle}":\n`;
            strategies.slice(0, 3).forEach(strategy => { // Limit to top 3 strategies per goal
              responseContent += `- ${strategy.name}: ${strategy.description.substring(0, 100)}${strategy.description.length > 100 ? '...' : ''}\n`;
            });
            responseContent += '\n';
          }
        });
        
        return {
          content: responseContent,
          confidence: 0.85,
          data: recommendationsByGoal,
          visualizationHint: 'NONE'
        };
    }
  } catch (error) {
    console.error('Error in strategy query processing:', error);
    return errorResponse(error);
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
    content: "I'm not sure I understand that question. I can help with client budgets, therapy progress tracking, or strategy recommendations. Would you like information about one of those areas?",
    confidence: 0.6,
    visualizationHint: 'NONE'
  };
}

/**
 * Generate default response
 */
function defaultResponse(): AgentResponse {
  return {
    content: "I'm not sure I understand that question. I can help with client budgets, therapy progress tracking, or strategy recommendations. Would you like information about one of those areas?",
    confidence: 0.5,
    visualizationHint: 'NONE'
  };
}

/**
 * Generate error response
 */
function errorResponse(error: any): AgentResponse {
  return {
    content: "I'm sorry, I encountered an error processing your request. Please try again or rephrase your question.",
    confidence: 0.9,
    visualizationHint: 'NONE'
  };
}