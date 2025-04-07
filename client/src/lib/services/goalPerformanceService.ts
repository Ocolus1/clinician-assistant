import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Goal, Milestone } from "@/components/profile/GoalPerformanceModal";
import { apiRequest } from "@/lib/queryClient";

// Interface for milestone data point
export interface MilestoneDataPoint {
  date: Date;
  value: number;
}

// Interface for performance data point
export interface PerformanceDataPoint {
  date: Date;
  value: number;
  isCurrentMonth?: boolean;
}

// Interface for client goals from the API
interface ClientGoal {
  id: number;
  clientId: number;
  title: string;
  description: string;
  status?: string;
}

// Interface for subgoals from the API
interface Subgoal {
  id: number;
  goalId: number;
  title: string;
  description: string;
  status?: string;
}

/**
 * Fetch and prepare goal performance data for a specific client
 * Uses real client goals from the API and generates realistic performance data
 */
export async function fetchGoalPerformanceData(
  clientId: string | number,
  budgetStartDate: Date,
  budgetEndDate: Date
): Promise<Goal[]> {
  try {
    console.log(`Fetching goal data for client ${clientId} from ${format(budgetStartDate, 'yyyy-MM-dd')} to ${format(budgetEndDate, 'yyyy-MM-dd')}`);
    
    // Generate date range for the performance data from budget start date to now
    const now = new Date();
    const dateRange = eachMonthOfInterval({
      start: budgetStartDate,
      end: budgetEndDate
    });
    
    // Fetch real client goals from the API
    const clientGoalsResponse = await apiRequest('GET', `/api/clients/${clientId}/goals`);
    console.log('Client goals from API:', clientGoalsResponse);
    
    const clientGoals: ClientGoal[] = Array.isArray(clientGoalsResponse) ? clientGoalsResponse : [];
    
    if (clientGoals.length === 0) {
      console.log('No goals found for this client, using sample data');
      return generateSampleGoals(dateRange, now);
    }
    
    // Transform client goals into Goal format with performance data
    const goals: Goal[] = await Promise.all(clientGoals.map(async (clientGoal, index) => {
      try {
        // Fetch subgoals for each goal
        const subgoalsResponse = await apiRequest('GET', `/api/goals/${clientGoal.id}/subgoals`);
        console.log(`Subgoals for goal ${clientGoal.id}:`, subgoalsResponse);
        
        const subgoals: Subgoal[] = Array.isArray(subgoalsResponse) ? subgoalsResponse : [];
        
        // Generate a score based on index to create varied goal scores (between 3-9)
        // In a real app this would come from assessment data
        const baseScore = 3 + (index % 7);
        const lastMonthScore = Math.max(0, baseScore - 0.7 + Math.random() * 1.4);
        
        return {
          id: clientGoal.id.toString(),
          title: clientGoal.title,
          description: clientGoal.description || `Therapeutic goal for ${clientGoal.title}`,
          score: baseScore,
          lastMonthScore: lastMonthScore,
          performanceData: generatePerformanceData(dateRange, Math.max(1, lastMonthScore - 1), baseScore, now),
          milestones: subgoals.map((subgoal, i) => ({
            id: subgoal.id.toString(),
            title: subgoal.title,
            description: subgoal.description || '',
            data: generateMilestoneData(dateRange, Math.max(1, baseScore - 2), baseScore + 0.5, now)
          }))
        };
      } catch (err) {
        console.error(`Error fetching subgoals for goal ${clientGoal.id}:`, err);
        
        // Return a goal without subgoals if there was an error
        return {
          id: clientGoal.id.toString(),
          title: clientGoal.title,
          description: clientGoal.description || `Therapeutic goal for ${clientGoal.title}`,
          score: 5 + Math.random() * 3,
          lastMonthScore: 4 + Math.random() * 3,
          performanceData: generatePerformanceData(dateRange, 3, 7, now),
          milestones: []
        };
      }
    }));
    
    console.log('Processed goals with performance data:', goals);
    return goals;
    
  } catch (error) {
    console.error("Error fetching goal performance data:", error);
    // If there's an error, return an empty array
    return [];
  }
}

// Generate sample goals if no real goals exist
function generateSampleGoals(dateRange: Date[], currentDate: Date): Goal[] {
  const sampleGoals: Goal[] = [
    {
      id: "sample-1",
      title: "Speech Clarity",
      description: "Improve articulation and clarity of speech in conversational settings",
      score: 7.5,
      lastMonthScore: 6.8,
      performanceData: generatePerformanceData(dateRange, 5.5, 7.5, currentDate),
      milestones: [
        {
          id: "sample-1-1",
          title: "Consonant Production",
          description: "Correctly produce target consonant sounds in structured settings",
          data: generateMilestoneData(dateRange, 6.0, 8.0, currentDate)
        },
        {
          id: "sample-1-2",
          title: "Sentence Complexity",
          description: "Use complete sentences with appropriate syntax in conversation",
          data: generateMilestoneData(dateRange, 5.0, 7.0, currentDate)
        }
      ]
    },
    {
      id: "sample-2",
      title: "Vocabulary Expansion",
      description: "Increase functional vocabulary across home and school environments",
      score: 8.2,
      lastMonthScore: 7.5,
      performanceData: generatePerformanceData(dateRange, 6.0, 8.2, currentDate),
      milestones: [
        {
          id: "sample-2-1",
          title: "Category Naming",
          description: "Name items within functional categories (e.g., foods, animals)",
          data: generateMilestoneData(dateRange, 7.0, 8.5, currentDate)
        }
      ]
    },
    {
      id: "sample-3",
      title: "Social Communication",
      description: "Develop appropriate conversation skills and pragmatic language use",
      score: 5.3,
      lastMonthScore: 4.8,
      performanceData: generatePerformanceData(dateRange, 3.5, 5.3, currentDate),
      milestones: []
    }
  ];
  
  return sampleGoals;
}

// Helper function to generate realistic performance data over time
function generatePerformanceData(
  dateRange: Date[], 
  startValue: number, 
  endValue: number,
  currentDate: Date
): PerformanceDataPoint[] {
  return dateRange.map((date, index) => {
    // Calculate progress that increases over time with some random variation
    const progress = index / (dateRange.length - 1);
    const baseValue = startValue + (endValue - startValue) * progress;
    
    // Add some random variation (±0.5) for more realistic data
    const randomVariation = (Math.random() - 0.5) * 1.0;
    const value = Math.max(0, Math.min(10, baseValue + randomVariation));
    
    // Determine if this is the current month
    const isCurrentMonth = 
      startOfMonth(date).getTime() <= currentDate.getTime() && 
      endOfMonth(date).getTime() >= currentDate.getTime();
    
    return {
      date,
      value,
      isCurrentMonth
    };
  });
}

// Helper function to generate realistic milestone data
function generateMilestoneData(
  dateRange: Date[], 
  startValue: number, 
  endValue: number,
  currentDate: Date
): MilestoneDataPoint[] {
  return dateRange.map((date, index) => {
    // Calculate progress that increases over time with some random variation
    const progress = index / (dateRange.length - 1);
    const baseValue = startValue + (endValue - startValue) * progress;
    
    // Add some random variation for more realistic data
    const randomVariation = (Math.random() - 0.5) * 1.2;
    const value = Math.max(0, Math.min(10, baseValue + randomVariation));
    
    return {
      date,
      value
    };
  });
}