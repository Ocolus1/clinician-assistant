import { Client, BudgetItem, Goal, Session, Strategy, Subgoal } from '@shared/schema';

/**
 * Message type for conversation history
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  data?: any; // Response data for visualization or further processing
  suggestedFollowUps?: string[]; // Suggested follow-up questions
  entities?: ExtractedEntity[]; // Entities extracted from the message
}

/**
 * Entity extracted from a query
 */
export interface ExtractedEntity {
  text: string;
  type: 'ClientName' | 'ClientID' | 'GoalName' | 'GoalID' | 'Date' | 'Category' | 'Amount' | 'Concept';
  value?: string | number | Date;
  position: {
    start: number;
    end: number;
  };
}

/**
 * Conversation memory for maintaining context across interactions
 */
export interface ConversationMemory {
  lastQuery?: string;
  lastTopic?: string;
  recentEntities?: ExtractedEntity[];
  activeFilters?: Record<string, any>;
  contextCarryover?: {
    subject?: string;
    timeframe?: string;
    category?: string;
  };
}

/**
 * Context for query processing
 */
export interface QueryContext {
  activeClientId?: number;
  activeBudgetId?: number;
  activeGoalId?: number;
  conversationHistory: Message[];
  conversationMemory?: ConversationMemory;
}

/**
 * Query intent types to categorize user queries
 */
export type QueryIntent = 
  | { type: 'BUDGET_ANALYSIS'; clientId?: number; specificQuery?: 'REMAINING' | 'FORECAST' | 'UTILIZATION' }
  | { type: 'PROGRESS_TRACKING'; clientId?: number; goalId?: number; specificQuery?: 'OVERALL' | 'GOAL_SPECIFIC' | 'ATTENDANCE' }
  | { type: 'STRATEGY_RECOMMENDATION'; clientId?: number; goalId?: number; specificQuery?: 'GENERAL' | 'GOAL_SPECIFIC' }
  | { type: 'COMBINED_INSIGHTS'; clientId?: number; specificQuery?: 'OVERALL' | 'BUDGET_FOCUS' | 'PROGRESS_FOCUS' }
  | { type: 'GENERAL_QUESTION'; topic?: string };

/**
 * Response from agent query processing
 */
export interface AgentResponse {
  content: string;
  confidence: number;
  data?: any;
  visualizationHint?: 'BUBBLE_CHART' | 'PROGRESS_CHART' | 'COMBINED_INSIGHTS' | 'NONE';
  suggestedFollowUps?: string[]; // Suggested follow-up questions
  detectedEntities?: ExtractedEntity[]; // Entities detected in the query
  memoryUpdates?: Partial<ConversationMemory>; // Updates to conversation memory
}

/**
 * Enhanced budget item with additional data for visualization
 */
export interface EnhancedBudgetItem extends BudgetItem {
  amount?: number;                 // Total amount allocated (quantity * unitPrice)
  totalSpent?: number;             // Amount spent so far
  percentUsed?: number;            // Percentage of budget utilized
  isHighUsage?: boolean;           // Whether this item has high usage relative to others
  isLowUtilization?: boolean;      // Whether this item has low utilization
  isProjectedOverage?: boolean;    // Whether this item is projected to exceed its budget
}

/**
 * Budget analysis result structure
 */
export interface BudgetAnalysis {
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  utilizationRate: number;
  forecastedDepletion: Date;
  budgetItems?: EnhancedBudgetItem[];
  spendingByCategory?: Record<string, number>;
  spendingPatterns?: {
    trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
    highUsageCategories: string[];
    projectedOverages: string[];
  };
  spendingVelocity?: number; // A measure of rate of change: positive = accelerating, negative = decelerating
}

/**
 * Progress analysis result structure
 */
export interface ProgressAnalysis {
  overallProgress: number;
  attendanceRate: number;
  sessionsCompleted: number;
  sessionsCancelled: number;
  goalProgress: Array<{
    goalId: number;
    goalTitle: string;
    progress: number;
    milestones: Array<{
      milestoneId: number;
      milestoneTitle: string;
      completed: boolean;
      lastRating?: number;
    }>;
  }>;
}

/**
 * Bubble chart data structure for visualization
 */
export interface BubbleChartData {
  id: number;
  value: number;
  label: string;
  category: string;
  color: string;
  percentUsed: number;
}

/**
 * Agent context provider interface
 */
export interface AgentContextType {
  conversationHistory: Message[];
  activeClient: Client | null;
  queryConfidence: number;
  isAgentVisible: boolean;
  isProcessingQuery: boolean;
  latestVisualization: 'BUBBLE_CHART' | 'PROGRESS_CHART' | 'COMBINED_INSIGHTS' | 'NONE';
  
  // Methods
  processQuery: (query: string) => Promise<AgentResponse>;
  setActiveClient: (client: Client | null) => void;
  toggleAgentVisibility: () => void;
  clearConversation: () => void;
}

// Re-export Client from schema for convenience
export type { Client, Goal, Subgoal, Strategy, Session };