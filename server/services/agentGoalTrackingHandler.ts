/**
 * Agent Goal Tracking Handler
 * 
 * This module handles goal and milestone tracking related queries for the clinical agent
 */
import { agentQueryService } from './agentQueryService';
import { formatDistance, format } from 'date-fns';

// Question pattern constants
const CLIENT_NAME_PATTERN = /(?:what|which|has|when|show)\s+\w+\s+(?:for|by|about)\s+([A-Za-z']+)/i;
const CLIENT_POSSESSIVE_PATTERN = /([A-Za-z']+)'s\s+(?:goals|goal|milestone|milestones|progress|session)/i;
const GOAL_PATTERN = /(?:goals?|working on|milestone)/i;
const MILESTONE_PATTERN = /milestone|subgoal/i;
const PROGRESS_PATTERN = /progress|improvement|advancement|score/i;
const BUDGET_PATTERN = /budget|funding|money|left|remaining|expire/i;
const SESSION_PATTERN = /session|appointment|attended|visit/i;
const STRATEGY_PATTERN = /strateg(?:y|ies)|technique|approach|method/i;

/**
 * Core handler for goal tracking related questions
 */
export async function handleGoalTrackingQuestion(question: string): Promise<string> {
  try {
    // Try to extract client name from the question
    const clientName = extractClientName(question);
    
    if (!clientName) {
      return "I couldn't determine which client you're asking about. Please specify the client name in your question.";
    }
    
    // Find client ID from name
    const clientId = await agentQueryService.findClientByName(clientName);
    
    if (!clientId) {
      return `I couldn't find a client named "${clientName}" in the system. Please check the spelling or try another client name.`;
    }
    
    // Determine question type and call appropriate handler
    if (GOAL_PATTERN.test(question)) {
      if (question.toLowerCase().includes('working on')) {
        return await handleCurrentGoalsQuestion(clientId, clientName);
      }
      if (PROGRESS_PATTERN.test(question)) {
        return await handleGoalProgressQuestion(clientId, clientName);
      }
      if (question.toLowerCase().includes('updated') || question.toLowerCase().includes('month')) {
        return await handleStaleGoalsQuestion(clientId, clientName);
      }
      // Default to current goals if not specific
      return await handleCurrentGoalsQuestion(clientId, clientName);
    }
    
    if (MILESTONE_PATTERN.test(question)) {
      if (question.toLowerCase().includes('recent') || question.toLowerCase().includes('last')) {
        return await handleRecentMilestoneQuestion(clientId, clientName);
      }
      if (question.toLowerCase().includes('score')) {
        return await handleMilestoneScoreQuestion(clientId, clientName);
      }
      if (question.toLowerCase().includes('completed') || question.toLowerCase().includes('finished')) {
        return await handleCompletedMilestonesQuestion(clientId, clientName);
      }
      // Default to all milestones
      return await handleAllMilestonesQuestion(clientId, clientName);
    }
    
    if (BUDGET_PATTERN.test(question)) {
      return await handleBudgetQuestion(clientId, clientName);
    }
    
    if (SESSION_PATTERN.test(question)) {
      if (question.toLowerCase().includes('month') || question.toLowerCase().includes('recent')) {
        return await handleSessionsThisMonthQuestion(clientId, clientName);
      }
      if (question.toLowerCase().includes('last')) {
        return await handleLastSessionQuestion(clientId, clientName);
      }
      // Default to general session info
      return await handleSessionsThisMonthQuestion(clientId, clientName);
    }
    
    if (STRATEGY_PATTERN.test(question)) {
      return await handleStrategyQuestion(clientId, clientName);
    }
    
    // If no specific pattern is matched, provide goals summary
    return await handleCurrentGoalsQuestion(clientId, clientName);
  } catch (error) {
    console.error('Error handling goal tracking question:', error);
    return "I'm sorry, I encountered an error while processing your question. Please try again or rephrase your question.";
  }
}

/**
 * Extract client name from question
 */
function extractClientName(question: string): string | null {
  // Check for possessive pattern first (e.g., "Olivia's goals")
  const possessiveMatch = question.match(CLIENT_POSSESSIVE_PATTERN);
  if (possessiveMatch && possessiveMatch[1]) {
    return possessiveMatch[1];
  }
  
  // Check for "for/by/about [name]" pattern
  const nameMatch = question.match(CLIENT_NAME_PATTERN);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1];
  }
  
  // Direct extraction of capitalized names
  const capitalizedWords = question.match(/\b[A-Z][a-z]+\b/g);
  if (capitalizedWords && capitalizedWords.length > 0) {
    // Skip common words that might be capitalized
    const commonWords = ['what', 'which', 'where', 'when', 'how', 'goal', 'milestone', 'session', 'progress'];
    const filteredNames = capitalizedWords.filter(word => 
      !commonWords.includes(word.toLowerCase())
    );
    
    if (filteredNames.length > 0) {
      return filteredNames[0];
    }
  }
  
  return null;
}

/**
 * Handle questions about current goals
 */
async function handleCurrentGoalsQuestion(clientId: number, clientName: string): Promise<string> {
  const goals = await agentQueryService.getClientGoals(clientId);
  
  if (goals.length === 0) {
    return `${clientName} doesn't have any goals set up in the system yet.`;
  }
  
  let response = `${clientName} is currently working on the following ${goals.length} goals:\n\n`;
  
  goals.forEach((goal, index) => {
    response += `${index + 1}. ${goal.title} (Priority: ${goal.priority})\n`;
    response += `   ${goal.description}\n`;
    
    if (goal.latestScore !== null) {
      response += `   Latest score: ${goal.latestScore}/10\n`;
    }
    
    if (goal.milestones.length > 0) {
      response += `   Has ${goal.milestones.length} milestones being tracked\n`;
    }
    
    response += '\n';
  });
  
  return response;
}

/**
 * Handle questions about goal progress
 */
async function handleGoalProgressQuestion(clientId: number, clientName: string): Promise<string> {
  const goals = await agentQueryService.getClientGoals(clientId);
  
  if (goals.length === 0) {
    return `${clientName} doesn't have any goals set up in the system yet.`;
  }
  
  let response = `Progress summary for ${clientName}'s goals:\n\n`;
  
  goals.forEach((goal, index) => {
    response += `${index + 1}. ${goal.title}\n`;
    
    if (goal.averageScore !== null) {
      response += `   Average performance: ${goal.averageScore.toFixed(1)}/10\n`;
    } else {
      response += `   No performance data recorded yet\n`;
    }
    
    if (goal.milestones.length > 0) {
      // Count milestones with good scores (>= 4 out of 5)
      const goodMilestones = goal.milestones.filter(m => m.rating !== null && m.rating >= 4).length;
      response += `   ${goodMilestones} of ${goal.milestones.length} milestones showing good progress\n`;
      
      // Show most recent milestone if available
      if (goal.milestones.length > 0) {
        const recentMilestone = goal.milestones[0]; // Already sorted by date
        response += `   Most recent milestone: "${recentMilestone.milestoneTitle}" `;
        if (recentMilestone.rating !== null) {
          response += `(rated ${recentMilestone.rating}/5)\n`;
        } else {
          response += `(not yet rated)\n`;
        }
      }
    } else {
      response += `   No milestones have been tracked yet\n`;
    }
    
    response += '\n';
  });
  
  return response;
}

/**
 * Handle questions about stale/outdated goals
 */
async function handleStaleGoalsQuestion(clientId: number, clientName: string): Promise<string> {
  const staleGoals = await agentQueryService.getStaleGoals(clientId, 1); // 1 month threshold
  
  if (staleGoals.length === 0) {
    return `All of ${clientName}'s goals have been updated within the last month.`;
  }
  
  let response = `${clientName} has ${staleGoals.length} goals that haven't been updated in over a month:\n\n`;
  
  staleGoals.forEach((goal, index) => {
    response += `${index + 1}. ${goal.title}\n`;
    
    if (goal.lastUpdate) {
      response += `   Last updated: ${format(goal.lastUpdate, 'PPP')} (${formatDistance(goal.lastUpdate, new Date(), { addSuffix: true })})\n`;
    } else {
      response += `   Never been assessed\n`;
    }
    
    response += '\n';
  });
  
  return response;
}

/**
 * Handle questions about recent milestone work
 */
async function handleRecentMilestoneQuestion(clientId: number, clientName: string): Promise<string> {
  const goals = await agentQueryService.getClientGoals(clientId);
  
  if (goals.length === 0) {
    return `${clientName} doesn't have any goals or milestones set up in the system yet.`;
  }
  
  // Find the most recent milestone across all goals
  let mostRecentMilestone = null;
  let mostRecentGoal = null;
  let mostRecentDate = new Date(0); // Start with oldest possible date
  
  for (const goal of goals) {
    if (goal.milestones.length > 0) {
      // Milestones are already sorted by date
      const milestone = goal.milestones[0];
      if (milestone.date > mostRecentDate) {
        mostRecentMilestone = milestone;
        mostRecentGoal = goal;
        mostRecentDate = milestone.date;
      }
    }
  }
  
  if (!mostRecentMilestone || !mostRecentGoal) {
    return `${clientName} doesn't have any milestone assessments recorded yet.`;
  }
  
  let response = `The most recent milestone ${clientName} worked on was "${mostRecentMilestone.milestoneTitle}" `;
  response += `under the "${mostRecentGoal.title}" goal.\n\n`;
  
  response += `This was assessed on ${format(mostRecentMilestone.date, 'PPP')} `;
  response += `(${formatDistance(mostRecentMilestone.date, new Date(), { addSuffix: true })}).\n\n`;
  
  if (mostRecentMilestone.rating !== null) {
    response += `It received a score of ${mostRecentMilestone.rating}/5.\n\n`;
  }
  
  if (mostRecentMilestone.strategies && mostRecentMilestone.strategies.length > 0) {
    response += `Strategies used: ${mostRecentMilestone.strategies.join(', ')}`;
  }
  
  return response;
}

/**
 * Handle questions about milestone scores
 */
async function handleMilestoneScoreQuestion(clientId: number, clientName: string): Promise<string> {
  const goals = await agentQueryService.getClientGoals(clientId);
  
  if (goals.length === 0) {
    return `${clientName} doesn't have any goals or milestones set up in the system yet.`;
  }
  
  // Find the last milestone with a score
  let lastScoredMilestone = null;
  let lastScoredGoal = null;
  let lastScoredDate = new Date(0);
  
  for (const goal of goals) {
    for (const milestone of goal.milestones) {
      if (milestone.rating !== null && milestone.date > lastScoredDate) {
        lastScoredMilestone = milestone;
        lastScoredGoal = goal;
        lastScoredDate = milestone.date;
      }
    }
  }
  
  if (!lastScoredMilestone || !lastScoredGoal) {
    return `${clientName} doesn't have any scored milestones yet.`;
  }
  
  let response = `${clientName}'s most recently scored milestone was "${lastScoredMilestone.milestoneTitle}" `;
  response += `under the "${lastScoredGoal.title}" goal.\n\n`;
  response += `It received a score of ${lastScoredMilestone.rating}/5 on ${format(lastScoredDate, 'PPP')}.\n\n`;
  
  // Find milestone with highest improvement if we have multiple scores for the same milestone
  let highestImprovement = 0;
  let mostImprovedMilestone = null;
  let mostImprovedGoal = null;
  
  // Group milestones by ID to check for improvement
  const milestoneMap = new Map();
  
  for (const goal of goals) {
    for (const milestone of goal.milestones) {
      if (milestone.rating !== null) {
        if (!milestoneMap.has(milestone.milestoneId)) {
          milestoneMap.set(milestone.milestoneId, {
            milestone,
            goal,
            ratings: [milestone.rating],
            dates: [milestone.date]
          });
        } else {
          const entry = milestoneMap.get(milestone.milestoneId);
          entry.ratings.push(milestone.rating);
          entry.dates.push(milestone.date);
        }
      }
    }
  }
  
  // Check for improvements
  for (const [, entry] of milestoneMap.entries()) {
    if (entry.ratings.length >= 2) {
      // Sort by date (ascending)
      const pairs = entry.ratings.map((rating, i) => ({ rating, date: entry.dates[i] }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      const firstRating = pairs[0].rating;
      const lastRating = pairs[pairs.length - 1].rating;
      const improvement = lastRating - firstRating;
      
      if (improvement > highestImprovement) {
        highestImprovement = improvement;
        mostImprovedMilestone = entry.milestone;
        mostImprovedGoal = entry.goal;
      }
    }
  }
  
  if (mostImprovedMilestone && highestImprovement > 0) {
    response += `The milestone showing the most improvement is "${mostImprovedMilestone.milestoneTitle}" `;
    response += `under the "${mostImprovedGoal.title}" goal, with an improvement of ${highestImprovement} points.`;
  }
  
  return response;
}

/**
 * Handle questions about completed milestones
 */
async function handleCompletedMilestonesQuestion(clientId: number, clientName: string): Promise<string> {
  const goals = await agentQueryService.getClientGoals(clientId);
  
  if (goals.length === 0) {
    return `${clientName} doesn't have any goals or milestones set up in the system yet.`;
  }
  
  // Consider milestones with rating of 5 as completed
  const completedMilestones = [];
  
  for (const goal of goals) {
    for (const milestone of goal.milestones) {
      if (milestone.rating === 5) {
        completedMilestones.push({
          title: milestone.milestoneTitle,
          goalTitle: goal.title,
          date: milestone.date
        });
      }
    }
  }
  
  if (completedMilestones.length === 0) {
    return `${clientName} hasn't completed any milestones yet (no milestones with a perfect score of 5).`;
  }
  
  // Sort by date, most recent first
  completedMilestones.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  let response = `${clientName} has completed ${completedMilestones.length} milestones (scored 5/5):\n\n`;
  
  completedMilestones.forEach((milestone, index) => {
    response += `${index + 1}. "${milestone.title}" (under ${milestone.goalTitle})\n`;
    response += `   Completed on: ${format(milestone.date, 'PPP')}\n\n`;
  });
  
  return response;
}

/**
 * Handle questions about all milestones
 */
async function handleAllMilestonesQuestion(clientId: number, clientName: string): Promise<string> {
  const goals = await agentQueryService.getClientGoals(clientId);
  
  if (goals.length === 0) {
    return `${clientName} doesn't have any goals or milestones set up in the system yet.`;
  }
  
  let totalMilestones = 0;
  goals.forEach(goal => {
    totalMilestones += goal.milestones.length;
  });
  
  if (totalMilestones === 0) {
    return `${clientName} has ${goals.length} goals, but no milestones have been tracked yet.`;
  }
  
  let response = `${clientName} has ${totalMilestones} milestones across ${goals.length} goals:\n\n`;
  
  goals.forEach((goal, goalIndex) => {
    if (goal.milestones.length > 0) {
      response += `Goal ${goalIndex + 1}: ${goal.title}\n`;
      
      // Group milestones by ID to avoid duplicates
      const uniqueMilestones = new Map();
      goal.milestones.forEach(milestone => {
        if (!uniqueMilestones.has(milestone.milestoneId)) {
          uniqueMilestones.set(milestone.milestoneId, milestone);
        }
      });
      
      Array.from(uniqueMilestones.values()).forEach((milestone, milestoneIndex) => {
        response += `   ${goalIndex + 1}.${milestoneIndex + 1} ${milestone.milestoneTitle}\n`;
        if (milestone.rating !== null) {
          response += `      Current rating: ${milestone.rating}/5\n`;
        }
      });
      
      response += '\n';
    }
  });
  
  return response;
}

/**
 * Handle questions about budget
 */
async function handleBudgetQuestion(clientId: number, clientName: string): Promise<string> {
  const budgetInfo = await agentQueryService.getClientBudgetInfo(clientId);
  
  if (!budgetInfo) {
    return `${clientName} doesn't have an active budget plan set up in the system.`;
  }
  
  const usedPercentage = (budgetInfo.usedFunds / budgetInfo.totalFunds) * 100;
  const remainingPercentage = 100 - usedPercentage;
  
  let response = `Budget information for ${clientName}:\n\n`;
  
  response += `Total allocated funds: $${budgetInfo.totalFunds.toFixed(2)}\n`;
  response += `Used funds: $${budgetInfo.usedFunds.toFixed(2)} (${usedPercentage.toFixed(1)}%)\n`;
  response += `Remaining funds: $${budgetInfo.remainingFunds.toFixed(2)} (${remainingPercentage.toFixed(1)}%)\n\n`;
  
  if (budgetInfo.expiryDate) {
    try {
      const expiryDate = parseExpiryDate(budgetInfo.expiryDate);
      response += `Budget plan expires: ${format(expiryDate, 'PPP')} (${formatDistance(expiryDate, new Date(), { addSuffix: true })})\n\n`;
    } catch (error) {
      response += `Budget plan expiry: ${budgetInfo.expiryDate}\n\n`;
    }
  }
  
  response += `Budget items: ${budgetInfo.itemsUsed} of ${budgetInfo.itemsCount} items used`;
  
  return response;
}

/**
 * Parse expiry date string which may be in various formats
 */
function parseExpiryDate(dateString: string): Date {
  // Try standard format first
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try DD/MM/YYYY format
  const parts = dateString.split(/[\/.-]/);
  if (parts.length === 3) {
    // Assume DD/MM/YYYY
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Months are 0-based
    const year = parseInt(parts[2]);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // If all else fails, just return today's date
  return new Date();
}

/**
 * Handle questions about sessions this month
 */
async function handleSessionsThisMonthQuestion(clientId: number, clientName: string): Promise<string> {
  const sessionCount = await agentQueryService.getClientSessionCount(clientId, 'month');
  const recentSession = await agentQueryService.getClientMostRecentSession(clientId);
  
  let response = `${clientName} has attended ${sessionCount} sessions in the past month.\n\n`;
  
  if (recentSession) {
    response += `The most recent session was "${recentSession.title}" on ${format(recentSession.date, 'PPP')} `;
    response += `(${formatDistance(recentSession.date, new Date(), { addSuffix: true })}).\n`;
    response += `Duration: ${recentSession.duration} minutes\n`;
    response += `Status: ${recentSession.status}`;
  } else {
    response += `There are no recorded sessions for ${clientName}.`;
  }
  
  return response;
}

/**
 * Handle questions about the last session
 */
async function handleLastSessionQuestion(clientId: number, clientName: string): Promise<string> {
  const recentSession = await agentQueryService.getClientMostRecentSession(clientId);
  
  if (!recentSession) {
    return `${clientName} doesn't have any recorded sessions in the system.`;
  }
  
  let response = `${clientName}'s last session details:\n\n`;
  
  response += `Title: ${recentSession.title}\n`;
  response += `Date: ${format(recentSession.date, 'PPP')} (${formatDistance(recentSession.date, new Date(), { addSuffix: true })})\n`;
  response += `Duration: ${recentSession.duration} minutes\n`;
  response += `Status: ${recentSession.status}\n\n`;
  
  // We could enhance this with session note details if needed
  
  return response;
}

/**
 * Handle questions about strategies
 */
async function handleStrategyQuestion(clientId: number, clientName: string): Promise<string> {
  const topStrategies = await agentQueryService.getClientTopStrategies(clientId);
  
  if (topStrategies.length === 0) {
    return `No strategies have been recorded for ${clientName} yet.`;
  }
  
  let response = `Top strategies used with ${clientName}:\n\n`;
  
  topStrategies.forEach((strategy, index) => {
    response += `${index + 1}. ${strategy.name} (used ${strategy.count} times)\n`;
  });
  
  return response;
}