import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Goal, Milestone } from "@/components/profile/GoalPerformanceModal";

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

/**
 * Fetch and prepare goal performance data for a specific client
 * This would typically make an API call to get the data
 */
export async function fetchGoalPerformanceData(
  clientId: string | number,
  budgetStartDate: Date,
  budgetEndDate: Date
): Promise<Goal[]> {
  try {
    // This would be an API call in production
    console.log(`Fetching goal data for client ${clientId} from ${format(budgetStartDate, 'yyyy-MM-dd')} to ${format(budgetEndDate, 'yyyy-MM-dd')}`);
    
    // For demonstration, we'll generate mock data based on the date range
    const now = new Date();
    const dateRange = eachMonthOfInterval({
      start: budgetStartDate,
      end: budgetEndDate
    });

    // Define some sample goals with realistic treatment objectives
    const goals: Goal[] = [
      {
        id: "goal-1",
        title: "Speech Clarity",
        description: "Improve articulation and clarity of speech in conversational settings",
        score: 7.5,
        lastMonthScore: 6.8,
        performanceData: generatePerformanceData(dateRange, 5.5, 7.5, now),
        milestones: [
          {
            id: "milestone-1-1",
            title: "Consonant Production",
            description: "Correctly produce target consonant sounds in structured settings",
            data: generateMilestoneData(dateRange, 6.0, 8.0, now)
          },
          {
            id: "milestone-1-2",
            title: "Sentence Complexity",
            description: "Use complete sentences with appropriate syntax in conversation",
            data: generateMilestoneData(dateRange, 5.0, 7.0, now)
          }
        ]
      },
      {
        id: "goal-2",
        title: "Vocabulary Expansion",
        description: "Increase functional vocabulary across home and school environments",
        score: 8.2,
        lastMonthScore: 7.5,
        performanceData: generatePerformanceData(dateRange, 6.0, 8.2, now),
        milestones: [
          {
            id: "milestone-2-1",
            title: "Category Naming",
            description: "Name items within functional categories (e.g., foods, animals)",
            data: generateMilestoneData(dateRange, 7.0, 8.5, now)
          },
          {
            id: "milestone-2-2",
            title: "Descriptive Language",
            description: "Use descriptive words to elaborate on basic concepts",
            data: generateMilestoneData(dateRange, 5.5, 8.0, now)
          }
        ]
      },
      {
        id: "goal-3",
        title: "Social Communication",
        description: "Develop appropriate conversation skills and pragmatic language use",
        score: 5.3,
        lastMonthScore: 4.8,
        performanceData: generatePerformanceData(dateRange, 3.5, 5.3, now),
        milestones: [
          {
            id: "milestone-3-1",
            title: "Turn Taking",
            description: "Engage in reciprocal conversation with appropriate turn-taking",
            data: generateMilestoneData(dateRange, 4.0, 6.0, now)
          },
          {
            id: "milestone-3-2",
            title: "Topic Maintenance",
            description: "Maintain a conversation topic for at least 3 exchanges",
            data: generateMilestoneData(dateRange, 3.0, 5.0, now)
          }
        ]
      },
      {
        id: "goal-4",
        title: "Fluency",
        description: "Reduce stuttering and improve overall speech fluency in spontaneous speech",
        score: 3.8,
        lastMonthScore: 2.5,
        performanceData: generatePerformanceData(dateRange, 2.0, 3.8, now),
        milestones: [
          {
            id: "milestone-4-1",
            title: "Reduced Blocks",
            description: "Decrease frequency of speech blocks in structured activities",
            data: generateMilestoneData(dateRange, 2.0, 4.0, now)
          },
          {
            id: "milestone-4-2",
            title: "Self-Monitoring",
            description: "Apply fluency techniques when stuttering is anticipated",
            data: generateMilestoneData(dateRange, 2.5, 3.5, now)
          }
        ]
      },
      {
        id: "goal-5",
        title: "Comprehension",
        description: "Improve understanding and following of multi-step directions",
        score: 6.7,
        lastMonthScore: 6.5,
        performanceData: generatePerformanceData(dateRange, 5.0, 6.7, now),
        milestones: [
          {
            id: "milestone-5-1",
            title: "2-Step Directions",
            description: "Follow two-step directions in sequence without repetition",
            data: generateMilestoneData(dateRange, 6.0, 7.5, now)
          },
          {
            id: "milestone-5-2",
            title: "Wh-Questions",
            description: "Correctly respond to who, what, where, when questions",
            data: generateMilestoneData(dateRange, 5.5, 6.0, now)
          }
        ]
      }
    ];
    
    return goals;
  } catch (error) {
    console.error("Error fetching goal performance data:", error);
    throw error;
  }
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