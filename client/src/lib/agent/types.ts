import { Client, Goal, Subgoal, BudgetSettings, BudgetItem, Session } from '@shared/schema';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
}

export interface QueryContext {
  activeClientId?: number;
  activeBudgetId?: number;
  activeGoalId?: number;
  conversationHistory: Message[];
}

export type QueryIntent = 
  | { type: 'BUDGET_ANALYSIS'; clientId?: number; specificQuery?: 'REMAINING' | 'FORECAST' | 'UTILIZATION' }
  | { type: 'PROGRESS_TRACKING'; clientId?: number; goalId?: number; specificQuery?: 'OVERALL' | 'GOAL_SPECIFIC' | 'ATTENDANCE' }
  | { type: 'STRATEGY_RECOMMENDATION'; clientId?: number; goalId?: number; specificQuery?: 'GENERAL' | 'GOAL_SPECIFIC' }
  | { type: 'GENERAL_QUESTION'; topic?: string };

export interface AgentResponse {
  content: string;
  confidence: number;
  data?: any;
  visualizationHint?: 'BUBBLE_CHART' | 'PROGRESS_CHART' | 'NONE';
}

export interface BudgetAnalysis {
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  utilizationRate: number;
  forecastedDepletion: Date;
  budgetItems?: BudgetItem[];
  spendingByCategory?: Record<string, number>;
}

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

export interface BubbleChartData {
  id: number;
  value: number;
  label: string;
  category: string;
  color: string;
  percentUsed: number;
}

export interface AgentContextType {
  conversationHistory: Message[];
  activeClient: Client | null;
  queryConfidence: number;
  isAgentVisible: boolean;
  isProcessingQuery: boolean;
  latestVisualization: 'BUBBLE_CHART' | 'PROGRESS_CHART' | 'NONE';
  
  // Methods
  processQuery: (query: string) => Promise<AgentResponse>;
  setActiveClient: (client: Client | null) => void;
  toggleAgentVisibility: () => void;
  clearConversation: () => void;
}