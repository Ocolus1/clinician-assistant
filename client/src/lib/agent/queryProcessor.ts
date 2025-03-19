import { 
  QueryContext, 
  QueryIntent, 
  AgentResponse, 
  BudgetAnalysis, 
  ProgressAnalysis,
  ExtractedEntity,
  ConversationMemory,
  VisualizationHint
} from './types';
import { parseQueryIntent } from './queryParser';
import { budgetDataService } from '@/lib/services/budgetDataService';
import { progressDataService } from '@/lib/services/progressDataService';
import { strategyDataService } from '@/lib/services/strategyDataService';
import { knowledgeService } from '@/lib/services/knowledgeService';
import { 
  selectTemplate, 
  renderTemplate, 
  budgetTemplates, 
  progressTemplates, 
  strategyTemplates, 
  generalTemplates 
} from './responseTemplates';
import { resolveReferences, updateConversationMemory } from './conversationManager';

/**
 * Extract entities from the user query for better context understanding
 */
function extractEntitiesFromQuery(query: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  
  // Client name pattern (simple capitalized words)
  const clientNameRegex = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
  let match;
  while ((match = clientNameRegex.exec(query)) !== null) {
    entities.push({
      text: match[0],
      type: 'ClientName',
      value: match[0],
      position: {
        start: match.index,
        end: match.index + match[0].length
      }
    });
  }
  
  // Goal name pattern (typically in quotes)
  const goalNameRegex = /"([^"]+)"/g;
  while ((match = goalNameRegex.exec(query)) !== null) {
    entities.push({
      text: match[1],
      type: 'GoalName',
      value: match[1],
      position: {
        start: match.index + 1, // +1 to skip the opening quote
        end: match.index + match[0].length - 1 // -1 to exclude the closing quote
      }
    });
  }
  
  // Date pattern (various formats)
  const dateRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
  while ((match = dateRegex.exec(query)) !== null) {
    entities.push({
      text: match[0],
      type: 'Date',
      value: new Date(match[0]),
      position: {
        start: match.index,
        end: match.index + match[0].length
      }
    });
  }
  
  // Amount pattern (dollar values)
  const amountRegex = /\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})? dollars/g;
  while ((match = amountRegex.exec(query)) !== null) {
    const value = parseFloat(match[0].replace(/[^\d.]/g, ''));
    entities.push({
      text: match[0],
      type: 'Amount',
      value: value,
      position: {
        start: match.index,
        end: match.index + match[0].length
      }
    });
  }
  
  // Category pattern (therapy categories are often specific therapy areas)
  const categoryKeywords = ['speech', 'language', 'motor', 'cognitive', 'sensory', 'behavioral', 'social'];
  categoryKeywords.forEach(category => {
    const regex = new RegExp(`\\b${category}\\b`, 'gi');
    while ((match = regex.exec(query)) !== null) {
      entities.push({
        text: match[0],
        type: 'Category',
        value: match[0].toLowerCase(),
        position: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }
  });
  
  return entities;
}

/**
 * Process a natural language query and generate a response
 */
/**
 * Determine the subtopic from a query and main topic 
 */
function determineSubtopic(query: string, topic?: string): string {
  // Default subtopic is 'overview'
  let subtopic = 'overview';
  
  // Check for statistics/metrics keywords
  if (query.match(/\b(stat(istic)?s|metrics|numbers|figures|data|dashboard)\b/i)) {
    subtopic = 'statistics';
  }
  
  // Check for process/methodology keywords
  else if (query.match(/\b(process|how|methodology|method|approach|procedure|steps)\b/i)) {
    subtopic = 'process';
  }
  
  // Check for utilization/tracking keywords
  else if (query.match(/\b(utiliz(e|ation)|track(ing)?|monitor(ing)?|usage|using|spend(ing)?)\b/i)) {
    subtopic = 'utilization';
  }
  
  // Topic-specific subtopics
  if (topic) {
    // Budget-specific subtopics
    if (['budget', 'budgeting', 'funding', 'finances'].includes(topic)) {
      if (query.match(/\b(allocat(e|ion)|distribut(e|ion)|split|divid(e|ing))\b/i)) {
        subtopic = 'allocation';
      }
      else if (query.match(/\b(forecast|predict|future|trend|projection|deplet(e|ion)|run out)\b/i)) {
        subtopic = 'forecast';
      }
    }
    
    // Progress-specific subtopics
    else if (['progress', 'goals', 'outcomes'].includes(topic)) {
      if (query.match(/\b(milestone|achiev(e|ement)|complete|finish)\b/i)) {
        subtopic = 'milestones';
      }
      else if (query.match(/\b(trend|pattern|rate|speed|velocity|pace)\b/i)) {
        subtopic = 'trends';
      }
    }
    
    // Strategy-specific subtopics
    else if (['strategies', 'therapy', 'interventions', 'techniques'].includes(topic)) {
      if (query.match(/\b(effective(ness)?|success(ful)?|work(ing)?|best)\b/i)) {
        subtopic = 'effectiveness';
      }
      else if (query.match(/\b(recommend(ation)?|suggest(ion)?|advise|advice)\b/i)) {
        subtopic = 'recommendations';
      }
    }
  }
  
  return subtopic;
}

export async function processQuery(query: string, context: QueryContext): Promise<AgentResponse> {
  try {
    // Extract entities for better context understanding
    const detectedEntities = extractEntitiesFromQuery(query);
    console.log('Detected entities:', detectedEntities);
    
    // Update conversation memory with detected entities
    const memoryUpdates: Partial<ConversationMemory> = {
      lastQuery: query
    };
    
    // Combine previous entities with new ones, removing duplicates
    if (context.conversationMemory?.recentEntities) {
      // Keep the last 5 entities and add new ones (avoiding duplicates)
      const existingEntities = context.conversationMemory.recentEntities.slice(-5);
      const newEntities = detectedEntities.filter(newEntity => 
        !existingEntities.some(existing => 
          existing.text === newEntity.text && existing.type === newEntity.type
        )
      );
      
      memoryUpdates.recentEntities = [...existingEntities, ...newEntities];
    } else {
      memoryUpdates.recentEntities = detectedEntities;
    }
    
    // Parse the query intent with enhanced context
    const intent = parseQueryIntent(query, {
      ...context,
      conversationMemory: {
        ...context.conversationMemory,
        ...memoryUpdates
      }
    });
    console.log('Detected intent:', intent);
    
    // Check if query requires client context
    if (needsClientContext(intent) && !context.activeClientId) {
      return {
        content: "I'd need to know which client you're asking about. Please select a client first, or ask a general question.",
        confidence: 0.8,
        detectedEntities,
        memoryUpdates,
        suggestedFollowUps: [
          "Show me all clients",
          "What can you help me with?",
          "Tell me about general budget trends"
        ]
      };
    }
    
    // Store the topic based on intent for future context
    memoryUpdates.lastTopic = intent.type.toLowerCase();
    
    // Generate a response based on the intent
    let response: AgentResponse;
    
    switch (intent.type) {
      case 'BUDGET_ANALYSIS':
        response = await processBudgetQuery(intent, context);
        break;
      
      case 'PROGRESS_TRACKING':
        response = await processProgressQuery(intent, context);
        break;
      
      case 'STRATEGY_RECOMMENDATION':
        response = await processStrategyQuery(intent, context);
        break;
        
      case 'DATABASE_STATISTICS':
        response = await processDatabaseStatisticsQuery(intent, context);
        break;
        
      case 'COMBINED_INSIGHTS':
        response = await processCombinedInsightsQuery(intent, context);
        break;
      
      case 'GENERAL_QUESTION':
        response = await processGeneralQuery(intent, context, query);
        break;
      
      default:
        response = defaultResponse();
    }
    
    // Enhance response with entity and memory information
    return {
      ...response,
      detectedEntities,
      memoryUpdates: {
        ...memoryUpdates,
        ...(response.memoryUpdates || {})
      }
    };
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
    intent.type === 'COMBINED_INSIGHTS' ||
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
      
    case 'COMBINED_INSIGHTS':
      return 'combined budget and progress insights';
    
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
    
    // Generate suggested follow-up questions based on analysis
    const suggestedFollowUps = [];
    
    // Add follow-ups based on the specific query to encourage exploration
    if (intent.specificQuery !== 'FORECAST') {
      suggestedFollowUps.push(`When will the budget be depleted?`);
    }
    
    if (intent.specificQuery !== 'UTILIZATION') {
      suggestedFollowUps.push(`What's the budget utilization rate?`);
    }
    
    if (intent.specificQuery !== 'REMAINING') {
      suggestedFollowUps.push(`How much budget is remaining?`);
    }
    
    // Add specific follow-ups based on the analysis data
    if (analysis.spendingPatterns?.highUsageCategories.length) {
      suggestedFollowUps.push(`Tell me more about the ${analysis.spendingPatterns.highUsageCategories[0]} category spending`);
    }
    
    if (analysis.spendingPatterns?.projectedOverages.length) {
      suggestedFollowUps.push(`Why is ${analysis.spendingPatterns.projectedOverages[0]} projected to exceed the budget?`);
    }
    
    if (analysis.spendingVelocity && analysis.spendingVelocity > 0.3) {
      suggestedFollowUps.push(`Why is spending accelerating?`);
    }
    
    return {
      content: response,
      confidence,
      data: analysis,
      visualizationHint: 'PIE_CHART',
      suggestedFollowUps: suggestedFollowUps.slice(0, 3) // Limit to 3 follow-ups
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
    
    // Generate suggested follow-up questions based on analysis
    const suggestedFollowUps = [];
    
    // Add follow-ups based on the specific query to encourage exploration
    if (intent.specificQuery !== 'OVERALL') {
      suggestedFollowUps.push(`What's the overall progress on all goals?`);
    }
    
    if (intent.specificQuery !== 'ATTENDANCE') {
      suggestedFollowUps.push(`Tell me about the attendance rate`);
    }
    
    // Add specific follow-ups based on the analysis data
    if (analysis.goalProgress.length > 0) {
      const sortedGoals = [...analysis.goalProgress].sort((a, b) => b.progress - a.progress);
      
      // Ask about the most successful goal
      if (sortedGoals[0] && sortedGoals[0].progress > 70) {
        suggestedFollowUps.push(`Why is the goal "${sortedGoals[0].goalTitle}" progressing so well?`);
      }
      
      // Ask about the least successful goal
      if (sortedGoals.length > 1 && sortedGoals[sortedGoals.length - 1].progress < 50) {
        suggestedFollowUps.push(`What strategies could help with "${sortedGoals[sortedGoals.length - 1].goalTitle}"?`);
      }
    }
    
    // Ask about how progress relates to budget if attendance is low
    if (analysis.attendanceRate < 70) {
      suggestedFollowUps.push(`How is the low attendance affecting the budget?`);
    }
    
    return {
      content: response,
      confidence,
      data: analysis,
      visualizationHint: 'PROGRESS_CHART',
      suggestedFollowUps: suggestedFollowUps.slice(0, 3) // Limit to 3 follow-ups
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
    
    // Generate suggested follow-up questions
    const suggestedFollowUps = [];
    
    if (intent.specificQuery === 'GOAL_SPECIFIC' && intent.goalId && data?.strategies && data.strategies.length > 0) {
      suggestedFollowUps.push(`Can you explain more about the first strategy?`);
      suggestedFollowUps.push(`How do I implement these strategies in therapy sessions?`);
      suggestedFollowUps.push(`Are there any resources for these strategies?`);
    } else if (intent.clientId && data?.recommendationsByGoal) {
      suggestedFollowUps.push(`What's the client's progress on these goals?`);
      suggestedFollowUps.push(`How do these strategies align with the budget?`);
      suggestedFollowUps.push(`Can you recommend specific activities for these strategies?`);
    } else {
      suggestedFollowUps.push(`What strategies work best for speech development?`);
      suggestedFollowUps.push(`How do I choose the right strategies for a client?`);
      suggestedFollowUps.push(`Tell me about evidence-based therapy approaches`);
    }
    
    return {
      content: response,
      confidence,
      data,
      suggestedFollowUps: suggestedFollowUps.slice(0, 3)
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
 * Process combined insights queries
 */
/**
 * Process database statistics queries
 */
async function processDatabaseStatisticsQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  // Type guard to check if this is a database statistics intent
  if (intent.type !== 'DATABASE_STATISTICS') {
    return defaultResponse();
  }
  
  try {
    let response: string;
    let confidence = 0.85;
    let data = null;
    let suggestedFollowUps: string[] = [];
    
    // Get client statistics from the knowledge service
    const clientStats = await knowledgeService.getClientStatistics();
    
    switch (intent.specificQuery) {
      case 'CLIENT_COUNT':
        // Total client count information
        response = `There are currently ${clientStats.totalClients} clients in the database`;
        
        if (clientStats.activeClients !== undefined) {
          response += `, with ${clientStats.activeClients} active clients`;
        }
        
        response += '.';
        
        // Add recent trend information if available
        if (clientStats.recentTrends?.clientGrowth) {
          response += ` Client growth is ${clientStats.recentTrends.clientGrowth}.`;
          confidence = 0.9;
        }
        
        // Add suggested follow-ups
        suggestedFollowUps = [
          'What are the client demographics?',
          'Tell me about client retention',
          'What is the age distribution of clients?'
        ];
        break;
        
      case 'CLIENT_DEMOGRAPHICS':
        // Client demographic information
        response = `Based on the database records, `;
        
        if (clientStats.avgAge) {
          response += `the average client age is ${clientStats.avgAge} years. `;
        }
        
        // Include age group distribution if available
        if (clientStats.demographics?.ageGroups) {
          const ageGroups = clientStats.demographics.ageGroups;
          const ageGroupsText = Object.entries(ageGroups)
            .filter(([_, count]) => count > 0)
            .map(([group, count]) => `${count} in ${group}`)
            .join(', ');
            
          if (ageGroupsText) {
            response += `The age distribution is: ${ageGroupsText}. `;
            confidence = 0.92;
          }
        }
        
        // Add retention information if available
        if (clientStats.recentTrends?.clientRetention) {
          response += `The practice has a ${clientStats.recentTrends.clientRetention}.`;
          confidence = 0.9;
        } else {
          response += `Demographics tracking could be enhanced with additional data collection.`;
        }
        
        // Add suggested follow-ups
        suggestedFollowUps = [
          'How many clients do we have in total?',
          'How has client growth changed over time?',
          'What service has the highest utilization?'
        ];
        break;
        
      case 'GENERAL_STATS':
      default:
        // General statistics overview
        response = `Based on the database, we have ${clientStats.totalClients} total clients`;
        
        if (clientStats.activeClients !== undefined) {
          response += ` with ${clientStats.activeClients} currently active`;
        }
        
        response += '.';
        
        // Add age information if available
        if (clientStats.avgAge) {
          response += ` The average client age is ${clientStats.avgAge} years.`;
        }
        
        // Add trending information if available
        if (clientStats.recentTrends) {
          const trends = clientStats.recentTrends;
          response += ` Recent trends show ${trends.clientGrowth || 'stable client growth'}`;
          
          if (trends.serviceUtilization) {
            response += ` and ${trends.serviceUtilization}`;
          }
          
          response += '.';
          confidence = 0.93;
        }
        
        // Add suggested follow-ups
        suggestedFollowUps = [
          'What are the client demographics?',
          'How many active clients do we have?',
          'What is the client retention rate?'
        ];
    }
    
    return {
      content: response,
      confidence,
      data: clientStats,
      visualizationHint: 'PIE_CHART', // Use PIE_CHART for demographic data
      suggestedFollowUps
    };
  } catch (error) {
    console.error('Error processing database statistics query:', error);
    return {
      content: "I'm having trouble retrieving database statistics at the moment. Please try again later.",
      confidence: 0.5,
    };
  }
}

/**
 * Process combined insights queries
 */
async function processCombinedInsightsQuery(intent: QueryIntent, context: QueryContext): Promise<AgentResponse> {
  // Type guard to check if this is a combined insights intent
  if (intent.type !== 'COMBINED_INSIGHTS') {
    return defaultResponse();
  }
  
  if (!intent.clientId) {
    return {
      content: "I'd need to know which client you're asking about. Please select a client first.",
      confidence: 0.9,
    };
  }
  
  try {
    // Get both budget and progress analysis for comprehensive insights
    const budgetData = await budgetDataService.getBudgetAnalysis(intent.clientId);
    const progressData = await progressDataService.getProgressAnalysis(intent.clientId);
    
    // Prepare combined data for visualization
    const combinedData = {
      budgetData,
      progressData
    };
    
    // Generate response based on the specific query
    let response: string;
    let confidence = 0.95; // High confidence with comprehensive data
    
    switch (intent.specificQuery) {
      case 'BUDGET_FOCUS':
        response = `The client has a total budget of $${budgetData.totalBudget.toFixed(2)}, with $${budgetData.totalSpent.toFixed(2)} spent so far (${budgetData.utilizationRate.toFixed(1)}% utilized).`;
        response += ` At the current rate, the budget will last until ${formatDate(budgetData.forecastedDepletion)}.`;
        
        // Add correlation with progress
        response += ` Looking at the client's progress (${progressData.overallProgress.toFixed(1)}% overall), `;
        
        if (progressData.overallProgress > 60 && budgetData.utilizationRate < 50) {
          response += `I notice excellent progress despite moderate budget utilization, suggesting efficient therapy delivery.`;
        } else if (progressData.overallProgress < 40 && budgetData.utilizationRate > 60) {
          response += `I notice the budget utilization is higher than the progress rate, which may indicate a need to review therapy effectiveness.`;
        } else if (progressData.attendanceRate < 75 && budgetData.utilizationRate > 50) {
          response += `I notice the attendance rate (${progressData.attendanceRate.toFixed(1)}%) is affecting optimal budget utilization.`;
        } else {
          response += `the budget utilization and progress appear to be appropriately balanced.`;
        }
        break;
        
      case 'PROGRESS_FOCUS':
        response = `The client has achieved ${progressData.overallProgress.toFixed(1)}% overall progress toward therapy goals with an attendance rate of ${progressData.attendanceRate.toFixed(1)}%.`;
        
        // Add correlation with budget
        response += ` In relation to the budget, $${budgetData.totalSpent.toFixed(2)} has been spent out of $${budgetData.totalBudget.toFixed(2)}.`;
        
        // Cost per progress point analysis
        const costPerProgressPoint = budgetData.totalSpent / Math.max(progressData.overallProgress, 1);
        response += ` The approximate cost per percentage point of progress is $${costPerProgressPoint.toFixed(2)}.`;
        
        if (costPerProgressPoint > 100 && progressData.overallProgress < 50) {
          response += ` This cost-to-progress ratio suggests a review of the therapy approach might be beneficial.`;
        } else if (costPerProgressPoint < 50 && progressData.overallProgress > 50) {
          response += ` This represents a very efficient cost-to-progress ratio.`;
        }
        break;
        
      default: // OVERALL or not specified
        // High-level combined overview
        response = `I've analyzed both budget and progress data for this client.`;
        
        // Budget snapshot
        response += ` Budget: $${budgetData.remaining.toFixed(2)} remaining (${(100 - budgetData.utilizationRate).toFixed(1)}% left) with depletion projected by ${formatDate(budgetData.forecastedDepletion)}.`;
        
        // Progress snapshot
        response += ` Progress: ${progressData.overallProgress.toFixed(1)}% overall goal achievement with ${progressData.attendanceRate.toFixed(1)}% attendance rate.`;
        
        // Correlation insights
        if (progressData.overallProgress < 30 && budgetData.utilizationRate > 70) {
          response += ` Important observation: High budget utilization with limited progress suggests therapy approach review may be needed.`;
        } else if (progressData.overallProgress > 70 && budgetData.utilizationRate < 50) {
          response += ` Positive observation: Strong progress with efficient budget utilization indicates excellent therapy effectiveness.`;
        } else if (progressData.attendanceRate < 70 && budgetData.utilizationRate > 60) {
          response += ` Note: Attendance challenges (${progressData.attendanceRate.toFixed(1)}%) may be affecting the return on therapy investment.`;
        }
        
        // Additional insights on spending patterns and goal performance
        if (budgetData.spendingPatterns?.trend === 'increasing') {
          response += ` The accelerating spending pattern should be monitored closely.`;
        }
        
        if (progressData.goalProgress.length > 0) {
          const sortedGoals = [...progressData.goalProgress].sort((a, b) => b.progress - a.progress);
          const highestGoal = sortedGoals[0];
          const lowestGoal = sortedGoals[sortedGoals.length - 1];
          
          if (highestGoal.progress - lowestGoal.progress > 40) {
            response += ` There's significant variation in goal progress, with "${highestGoal.goalTitle}" at ${highestGoal.progress.toFixed(1)}% and "${lowestGoal.goalTitle}" at ${lowestGoal.progress.toFixed(1)}%.`;
          }
        }
    }
    
    // Generate suggested follow-up questions
    const suggestedFollowUps = [];
    
    switch (intent.specificQuery) {
      case 'BUDGET_FOCUS':
        suggestedFollowUps.push(`How does the progress rate compare to budget utilization?`);
        suggestedFollowUps.push(`What strategies can improve progress while maintaining the budget?`);
        suggestedFollowUps.push(`How will the spending trend affect future therapy?`);
        break;
        
      case 'PROGRESS_FOCUS':
        suggestedFollowUps.push(`Which budget items are contributing most to progress?`);
        suggestedFollowUps.push(`How can we optimize the cost-to-progress ratio?`);
        suggestedFollowUps.push(`What's causing the variation in goal progress?`);
        break;
        
      default: // OVERALL
        if (progressData.overallProgress < 50 && budgetData.utilizationRate > 60) {
          suggestedFollowUps.push(`Why is progress low despite significant budget utilization?`);
        }
        
        if (progressData.attendanceRate < 75) {
          suggestedFollowUps.push(`How can we improve the attendance rate?`);
        }
        
        if (budgetData.spendingPatterns?.trend === 'increasing') {
          suggestedFollowUps.push(`Why is spending accelerating?`);
        }
        
        if (suggestedFollowUps.length < 3) {
          suggestedFollowUps.push(`What's the most efficient allocation of the remaining budget?`);
          suggestedFollowUps.push(`Which goals should we prioritize for maximum progress?`);
        }
    }
    
    return {
      content: response,
      confidence,
      data: combinedData,
      visualizationHint: 'COMBINED_INSIGHTS',
      suggestedFollowUps: suggestedFollowUps.slice(0, 3)
    };
  } catch (error) {
    console.error('Error processing combined insights query:', error);
    return {
      content: "I'm having trouble analyzing the combined budget and progress data. Please try again later.",
      confidence: 0.5,
    };
  }
}

/**
 * Process general questions with enhanced knowledge integration
 */
async function processGeneralQuery(intent: QueryIntent, context: QueryContext, originalQuery: string): Promise<AgentResponse> {
  // Type guard to check if this is a general question intent
  if (intent.type !== 'GENERAL_QUESTION') {
    return defaultResponse();
  }
  
  const topic = intent.topic;
  let confidence = 0.7;
  let responseContent = '';
  let suggestedFollowUps: string[] = [];
  let visualizationHint: VisualizationHint | undefined;
  let data: any = undefined;
  
  try {
    // If we have a specific topic, use the knowledge service to get relevant data
    if (topic) {
      let templateData: Record<string, any> = { isGeneral: true };
      
      // Determine subtopic from the query
      const subtopic = determineSubtopic(originalQuery, topic);
      
      switch (topic) {
        case 'budget':
        case 'budgeting':
        case 'funding':
        case 'finances':
          // Get budget knowledge data
          const budgetInfo = await knowledgeService.getGeneralBudgetInfo(subtopic);
          
          // Prepare template data
          templateData = {
            ...templateData,
            ...budgetInfo,
            subtopic,
            topic,
            categories: budgetInfo.categories?.join(', ') || 'therapy sessions, equipment, and resources',
            avgAllocation: budgetInfo.avgAllocationByCategory ? 
              Object.entries(budgetInfo.avgAllocationByCategory)
                .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
                .join(', ') : 
              'varies by therapy needs',
            topCategory: budgetInfo.highUsageCategories?.[0] || 'therapy sessions',
            formattedAvgBudgetSize: budgetInfo.avgBudgetSize ? 
              `$${budgetInfo.avgBudgetSize.toFixed(2)}` : 
              'dependent on individual needs'
          };
          
          // Select and render a template based on the data
          const template = selectTemplate(budgetTemplates, templateData);
          responseContent = renderTemplate(template.template, templateData);
          suggestedFollowUps = template.followUps || [];
          
          // Set visualization hint if appropriate
          if (subtopic === 'statistics' || subtopic === 'overview') {
            visualizationHint = 'PIE_CHART';
            data = budgetInfo;
          }
          
          confidence = 0.85;
          break;
          
        case 'progress':
        case 'goals':
        case 'outcomes':
          // Get progress knowledge data
          const progressInfo = await knowledgeService.getGeneralProgressInfo(subtopic);
          
          // Prepare template data
          templateData = {
            ...templateData,
            ...progressInfo,
            subtopic,
            topic,
            formattedAvgProgress: progressInfo.avgOverallProgress ? 
              `${progressInfo.avgOverallProgress.toFixed(1)}%` : 
              'varies by client needs'
          };
          
          // Select and render a template based on the data
          const progressTemplate = selectTemplate(progressTemplates, templateData);
          responseContent = renderTemplate(progressTemplate.template, templateData);
          suggestedFollowUps = progressTemplate.followUps || [];
          
          // Set visualization hint if appropriate
          if (subtopic === 'statistics' || subtopic === 'overview') {
            visualizationHint = 'PROGRESS_CHART';
            data = progressInfo;
          }
          
          confidence = 0.85;
          break;
          
        case 'strategies':
        case 'therapy':
        case 'interventions':
        case 'techniques':
          // Get strategy knowledge data
          const strategyInfo = await knowledgeService.getGeneralStrategyInfo(subtopic);
          
          // Prepare template data
          templateData = {
            ...templateData,
            ...strategyInfo,
            subtopic,
            topic,
            strategyCount: strategyInfo.strategyCount ? 
              Object.entries(strategyInfo.strategyCount)
                .map(([cat, count]) => `${cat}: ${count}`)
                .join(', ') : 
              'varies by therapy domain'
          };
          
          // Select and render a template based on the data
          const strategyTemplate = selectTemplate(strategyTemplates, templateData);
          responseContent = renderTemplate(strategyTemplate.template, templateData);
          suggestedFollowUps = strategyTemplate.followUps || [];
          
          confidence = 0.85;
          break;
          
        // Handle other predefined topics with basic responses
        case 'session planning':
          responseContent = "Session planning is a critical part of effective therapy. Consider using the calendar to schedule upcoming sessions and reviewing past session notes for continuity.";
          suggestedFollowUps = [
            "How do I add a new session?",
            "Can you show me upcoming sessions?",
            "What data should I track in a session?"
          ];
          break;
        
        case 'report writing':
          responseContent = "Efficient report writing is important for documentation. You can create comprehensive reports using the session notes feature, which lets you track performance assessments and milestone achievements.";
          suggestedFollowUps = [
            "How do I create a progress report?",
            "Can I export reports for sharing?",
            "What should I include in a therapy report?"
          ];
          break;
        
        case 'billing':
          responseContent = "For billing inquiries, you can review budget utilization in client profiles. Each therapy session can be linked to specific budget items for accurate tracking.";
          suggestedFollowUps = [
            "How do I link a session to a budget item?",
            "Can I generate invoices?",
            "How do I track NDIS funding usage?"
          ];
          break;
        
        case 'autism':
        case 'child development':
        case 'speech therapy':
        case 'occupational therapy':
          responseContent = `Our system supports managing therapy for clients with ${topic} needs. You can track goals, monitor progress, and get strategy recommendations specific to this area.`;
          suggestedFollowUps = [
            `What are common goals for ${topic} clients?`,
            `What strategies work well for ${topic}?`,
            `How do I track progress for ${topic} interventions?`
          ];
          break;
        
        default:
          // For unknown topics, use a general template
          templateData = {
            ...templateData,
            topic
          };
          
          const generalTemplate = selectTemplate(generalTemplates, templateData);
          responseContent = renderTemplate(generalTemplate.template, templateData);
          suggestedFollowUps = generalTemplate.followUps || [
            `What metrics can I track for ${topic}?`,
            `How does ${topic} relate to client progress?`,
            `Can you recommend resources about ${topic}?`
          ];
          confidence = 0.6;
      }
    } else {
      // No specific topic - provide a general response
      responseContent = "I can help you manage client information, track goals and progress, analyze budgets, and provide therapy strategy recommendations. How can I assist you today?";
      suggestedFollowUps = [
        "Show me budget utilization stats",
        "What's the average client progress?",
        "Tell me about therapy strategies"
      ];
      confidence = 0.6;
    }
  } catch (error) {
    console.error('Error processing general query with knowledge service:', error);
    
    // Fallback to basic responses if knowledge service fails
    if (topic) {
      responseContent = `I can help you manage client information, track goals and progress, analyze budgets, and provide therapy strategy recommendations. What specific information about ${topic} do you need?`;
    } else {
      responseContent = "I can help you manage client information, track goals and progress, analyze budgets, and provide therapy strategy recommendations. How can I assist you today?";
    }
    confidence = 0.6;
  }
  
  // Update conversation memory based on this interaction
  const memoryUpdates = {
    lastQuery: originalQuery,
    lastTopic: topic || 'general_information',
    contextCarryover: {
      subject: topic
    }
  };
  
  // Select the top 3 suggested follow-ups (remove duplicates if any)
  const uniqueFollowUps = Array.from(new Set(suggestedFollowUps));
  
  return {
    content: responseContent,
    confidence,
    suggestedFollowUps: uniqueFollowUps.slice(0, 3),
    data,
    visualizationHint,
    memoryUpdates: {
      ...memoryUpdates,
      lastTopic: topic || 'general_information'
    }
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
 * Generate default response with helpful suggestions
 */
function defaultResponse(): AgentResponse {
  const suggestedFollowUps = [
    "How is my client's budget utilization?",
    "What's the progress on current therapy goals?",
    "Can you recommend strategies for speech development?",
    "Show me a summary of upcoming sessions"
  ];
  
  return {
    content: "I can help you manage client information, track therapy goals, analyze budgets, and suggest therapy strategies. How can I assist you today?",
    confidence: 0.5,
    suggestedFollowUps,
    memoryUpdates: {
      lastTopic: 'general_help'
    }
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
  
  // Provide helpful follow-up suggestions based on the error type
  const suggestedFollowUps = [
    "Can you check my budget plans?",
    "How is my client progressing?",
    "Show me a summary of available strategies"
  ];
  
  return {
    content: response,
    confidence,
    suggestedFollowUps,
    // Reset memory updates to help recover from errors
    memoryUpdates: {
      lastQuery: undefined,
      lastTopic: 'error_recovery'
    }
  };
}