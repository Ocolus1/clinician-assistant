/**
 * Response Templates System for Agentic Assistant
 * 
 * This module provides a system for generating natural language responses
 * based on templates and data from the database. It includes template selection,
 * variable substitution, and condition-based response generation.
 */

export type TemplateData = Record<string, any>;

export interface ResponseTemplate {
  template: string;
  conditions: (data: TemplateData) => boolean;
  priority: number;
  followUps?: string[];
}

/**
 * Templates for general budget questions
 */
export const budgetTemplates: ResponseTemplate[] = [
  // Budget Overview Templates
  {
    template: "Based on our therapy practice data, budget plans typically include {{categories}} with an average allocation of {{avgAllocation}} per category. The most common funding source is {{topFundingSource}}.",
    conditions: (data) => data.isGeneral && data.subtopic === 'overview',
    priority: 1,
    followUps: [
      "How is budget utilization typically tracked?",
      "What funding sources are available?",
      "How do budgets vary across different therapy needs?"
    ]
  },
  {
    template: "Our therapy practice uses {{budgetingApproach}} for budget planning. This involves {{budgetingDescription}}.",
    conditions: (data) => data.isGeneral && data.subtopic === 'process',
    priority: 1,
    followUps: [
      "What are common budget planning challenges?",
      "How often are budgets typically reviewed?",
      "What tools help with budget planning?"
    ]
  },
  {
    template: "The average budget size across our clients is {{avgBudgetSize}}. Budget allocations tend to focus most heavily on {{topCategory}} services.",
    conditions: (data) => data.isGeneral && data.subtopic === 'statistics',
    priority: 1,
    followUps: [
      "How do budgets compare across different conditions?",
      "What affects budget allocation decisions?",
      "Are there seasonal patterns in budget usage?"
    ]
  },
  
  // Client-specific Budget Templates
  {
    template: "{{clientName}}'s budget has a total of {{totalBudget}}, with {{utilized}} ({{utilizationRate}}%) utilized so far. The remaining balance is {{remaining}}.",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'REMAINING',
    priority: 2,
    followUps: [
      "When will this budget be depleted at the current rate?",
      "Which budget categories have the highest utilization?",
      "How does this compare to similar clients?"
    ]
  },
  {
    template: "At the current spending rate, {{clientName}}'s budget is projected to be depleted by {{depletionDate}}. The current spending trend is {{spendingTrend}}.",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'FORECAST',
    priority: 2,
    followUps: [
      "How accurate are these projections historically?",
      "What would extend this budget's lifespan?",
      "How does this compare to the planned timeline?"
    ]
  },
  {
    template: "{{clientName}}'s budget utilization is at {{utilizationRate}}%. The most utilized category is {{topCategory}} ({{topCategoryRate}}%), while {{leastCategory}} shows the lowest utilization ({{leastCategoryRate}}%).",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'UTILIZATION',
    priority: 2,
    followUps: [
      "What's the overall budget amount remaining?",
      "Are there any budget categories exceeding allocations?",
      "How does this utilization pattern compare to similar clients?"
    ]
  },
];

/**
 * Templates for general progress questions
 */
export const progressTemplates: ResponseTemplate[] = [
  // Progress Overview Templates
  {
    template: "Our clients typically achieve an average progress rate of {{avgProgress}}% across their therapy goals. The average attendance rate is {{avgAttendance}}%.",
    conditions: (data) => data.isGeneral && data.subtopic === 'overview',
    priority: 1,
    followUps: [
      "What factors contribute to better progress rates?",
      "How does attendance affect overall progress?",
      "What are typical therapy milestones?"
    ]
  },
  {
    template: "On average, clients have {{avgGoalsPerClient}} active goals with {{avgSubgoalsPerGoal}} milestones each. The most common goal categories are {{topGoalCategories}}.",
    conditions: (data) => data.isGeneral && data.subtopic === 'goals',
    priority: 1,
    followUps: [
      "What determines goal complexity?",
      "How long does a typical goal take to complete?",
      "How are goal priorities determined?"
    ]
  },
  
  // Client-specific Progress Templates
  {
    template: "{{clientName}}'s overall therapy progress is at {{overallProgress}}%. They're making {{progressAssessment}} progress based on their attendance rate of {{attendanceRate}}%.",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'OVERALL',
    priority: 2,
    followUps: [
      "Which goals are showing the most progress?",
      "How does this compare to similar clients?",
      "What factors are affecting their progress rate?"
    ]
  },
  {
    template: "For the goal \"{{goalTitle}}\", {{clientName}} has achieved {{goalProgress}}% progress. {{milestone.completed}} of {{milestone.total}} milestones have been completed.",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'GOAL_SPECIFIC',
    priority: 2,
    followUps: [
      "What strategies are working well for this goal?",
      "How long has this goal been active?",
      "What's the next milestone for this goal?"
    ]
  },
  {
    template: "{{clientName}}'s attendance rate is {{attendanceRate}}%, with {{completedSessions}} completed sessions and {{cancelledSessions}} cancellations. {{attendanceAssessment}}",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'ATTENDANCE',
    priority: 2,
    followUps: [
      "How does this affect their overall progress?",
      "What times/days have better attendance?",
      "Are there patterns in the cancellations?"
    ]
  },
];

/**
 * Templates for strategy recommendation questions
 */
export const strategyTemplates: ResponseTemplate[] = [
  // General Strategy Templates
  {
    template: "Our practice uses {{totalStrategies}} therapeutic strategies across {{categoryCount}} categories. The most widely used include {{topStrategies}}.",
    conditions: (data) => data.isGeneral && data.subtopic === 'overview',
    priority: 1,
    followUps: [
      "What makes these strategies effective?",
      "How are strategies evaluated?",
      "Which strategies work well together?"
    ]
  },
  {
    template: "For {{category}} goals, our most effective strategies are {{categoryStrategies}}. These are particularly effective for {{effectiveFor}}.",
    conditions: (data) => data.isGeneral && data.subtopic === 'category',
    priority: 1,
    followUps: [
      "What other categories of strategies exist?",
      "How are these strategies implemented?",
      "How do you measure strategy effectiveness?"
    ]
  },
  
  // Client-specific Strategy Templates
  {
    template: "Based on {{clientName}}'s profile and goals, recommended strategies include: {{recommendedStrategies}}. These strategies align with their {{alignment}} needs.",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'GENERAL',
    priority: 2,
    followUps: [
      "Which of these strategies have been tried before?",
      "Are there any strategies to avoid?",
      "What strategies complement these recommendations?"
    ]
  },
  {
    template: "For the goal \"{{goalTitle}}\", effective strategies include: {{goalStrategies}}. These focus on {{focusAreas}} which align with this specific goal.",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'GOAL_SPECIFIC',
    priority: 2,
    followUps: [
      "How should these strategies be implemented?",
      "What measurable outcomes can we expect?",
      "How quickly should we see results with these strategies?"
    ]
  },
];

/**
 * Templates for combined insights questions
 */
export const insightTemplates: ResponseTemplate[] = [
  // Overall Insights Templates
  {
    template: "Overall insights for {{clientName}}: Budget utilization is at {{utilizationRate}}% with {{remaining}} remaining. Progress across goals is at {{overallProgress}}%. {{combinedAssessment}}",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'OVERALL',
    priority: 1,
    followUps: [
      "How do budget usage and progress correlate?",
      "What areas need the most attention?",
      "What's working particularly well?"
    ]
  },
  {
    template: "Budget-focused insights for {{clientName}}: {{budgetInsight}} This relates to their progress in the following way: {{progressRelation}}",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'BUDGET_FOCUS',
    priority: 1,
    followUps: [
      "How might budget adjustments improve outcomes?",
      "Are there better ways to allocate the remaining budget?",
      "What's the cost-effectiveness of current services?"
    ]
  },
  {
    template: "Progress-focused insights for {{clientName}}: {{progressInsight}} This has the following budget implications: {{budgetImplication}}",
    conditions: (data) => !data.isGeneral && data.specificQuery === 'PROGRESS_FOCUS',
    priority: 1,
    followUps: [
      "What strategies would accelerate progress?",
      "How do these insights compare to similar clients?",
      "What measurable goals should we set next?"
    ]
  },
];

/**
 * Templates for general questions
 */
export const generalTemplates: ResponseTemplate[] = [
  {
    template: "I'm an assistant for your therapy practice management system. I can help with budget analysis, progress tracking, strategy recommendations, and generating insights from combined data. What would you like to know?",
    conditions: () => true, // Default fallback template
    priority: 0,
    followUps: [
      "Show me budget analysis for a client",
      "What's the overall progress for my clients?",
      "Recommend strategies for speech development goals",
      "Give me insights on budget utilization patterns"
    ]
  },
];

/**
 * Templates for error responses
 */
export const errorTemplates: ResponseTemplate[] = [
  {
    template: "I'm having trouble accessing that information at the moment. This might be due to {{errorReason}}. Can I help with something else?",
    conditions: (data) => data.errorType === 'access',
    priority: 1,
    followUps: [
      "Show me the dashboard overview",
      "What information can you provide?",
      "Tell me about general budget planning"
    ]
  },
  {
    template: "I don't have enough information to answer that question. To help you better, I would need to know {{missingInfo}}.",
    conditions: (data) => data.errorType === 'insufficient_data',
    priority: 1,
    followUps: [
      "What information do you have access to?",
      "Let me try a different question",
      "Can you explain what data you need?"
    ]
  },
];

/**
 * Select the most appropriate template based on data
 */
export function selectTemplate(
  templates: ResponseTemplate[], 
  data: TemplateData
): ResponseTemplate {
  // Find matching templates
  const matchingTemplates = templates
    .filter(t => t.conditions(data))
    .sort((a, b) => b.priority - a.priority);
  
  if (matchingTemplates.length === 0) {
    // Use general template as fallback
    return generalTemplates[0];
  }
  
  return matchingTemplates[0];
}

/**
 * Render a template by replacing variables with data
 */
export function renderTemplate(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+)(\.(\w+))?\}\}/g, (match, variable, dot, subproperty) => {
    if (dot && subproperty) {
      return data[variable] && data[variable][subproperty] !== undefined 
        ? data[variable][subproperty] 
        : match;
    }
    return data[variable] !== undefined ? data[variable] : match;
  });
}

/**
 * Generate a response using the template system
 */
export function generateResponse(
  queryType: string, 
  data: TemplateData
): { content: string; suggestedFollowUps?: string[] } {
  let selectedTemplate: ResponseTemplate;
  
  // Select template based on query type
  switch (queryType) {
    case 'BUDGET_ANALYSIS':
      selectedTemplate = selectTemplate(budgetTemplates, data);
      break;
    case 'PROGRESS_TRACKING':
      selectedTemplate = selectTemplate(progressTemplates, data);
      break;
    case 'STRATEGY_RECOMMENDATION':
      selectedTemplate = selectTemplate(strategyTemplates, data);
      break;
    case 'COMBINED_INSIGHTS':
      selectedTemplate = selectTemplate(insightTemplates, data);
      break;
    case 'ERROR':
      selectedTemplate = selectTemplate(errorTemplates, data);
      break;
    default:
      selectedTemplate = selectTemplate(generalTemplates, data);
  }
  
  // Render the template with data
  const content = renderTemplate(selectedTemplate.template, data);
  
  return {
    content,
    suggestedFollowUps: selectedTemplate.followUps
  };
}

export default {
  generateResponse,
  renderTemplate,
  selectTemplate,
  budgetTemplates,
  progressTemplates,
  strategyTemplates,
  insightTemplates,
  generalTemplates,
  errorTemplates
};