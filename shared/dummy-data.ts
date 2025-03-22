/**
 * Dummy Data for Dashboard Development
 * 
 * This file contains realistic sample data for UI development and testing.
 * We use varied patterns and edge cases to help visualize how the dashboard
 * components will look with real data.
 * 
 * NOTE: This file should not be imported in production builds.
 */

import { DashboardData, AppointmentStats, BudgetExpirationStats, UpcomingTaskStats } from './schema';

// Import client report interfaces
export interface ClientReportData {
  clientDetails: ClientDetailsData;
  keyMetrics: KeyMetricsData;
  observations: ObservationsData;
  cancellations: CancellationsData;
  strategies: StrategiesData;
  goals: GoalsData;
}

export interface ClientDetailsData {
  id: number;
  name: string;
  age: number;
  fundsManagement: string;
  allies: Array<{
    name: string;
    relationship: string;
    preferredLanguage: string;
  }>;
}

export interface KeyMetricsData {
  spendingDeviation: number;
  planExpiration: number; // Days until expiration
  cancellationRate?: number; // Percentage
}

export interface ObservationsData {
  physicalActivity: number;
  cooperation: number;
  focus: number;
  mood: number;
}

export interface CancellationsData {
  completed: number; // Percentage
  waived: number; // Percentage
  changed: number; // Percentage
  total: number; // Total number of sessions
}

export interface StrategiesData {
  strategies: Array<{
    id: number;
    name: string;
    timesUsed: number;
    averageScore: number;
  }>;
}

export interface GoalsData {
  goals: Array<{
    id: number;
    title: string;
    score: number; // 0-10 scale
  }>;
}

// ------------------------------------------------------
// Appointment Statistics Dummy Data
// ------------------------------------------------------

/**
 * Daily appointment stats with realistic patterns
 * - Shows weekly cycles (weekends lower than weekdays)
 * - Includes some spikes and dips for visual interest
 * - Last 30 days of data with calculated percent changes
 */
export const dummyDailyStats = (() => {
  const result = [];
  const now = new Date();
  let prevValue = 0;
  
  // Generate 30 days of data
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    const period = date.toISOString().split('T')[0];
    
    // Create weekly patterns (weekends lower)
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    
    // Base value with some randomness
    const baseValue = isWeekend ? 2500 : 5500;
    const randomFactor = Math.random() * 0.5 + 0.75; // 0.75 to 1.25
    const count = Math.round(baseValue * randomFactor);
    
    // Add occasional spikes and dips
    const specialDay = Math.random() > 0.85;
    const finalCount = specialDay 
      ? (Math.random() > 0.5 ? count * 1.8 : count * 0.4) 
      : count;
    
    // Calculate percent change
    const percentChange = prevValue ? ((finalCount - prevValue) / prevValue) * 100 : undefined;
    prevValue = finalCount;
    
    result.push({
      period,
      count: finalCount,
      percentChange: percentChange ? Math.round(percentChange * 10) / 10 : undefined
    });
  }
  
  return result;
})();

/**
 * Weekly appointment stats
 * - Shows monthly patterns
 * - Last 12 weeks of data
 */
export const dummyWeeklyStats = (() => {
  const result = [];
  const now = new Date();
  let prevValue = 0;
  
  // Generate 12 weeks of data
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - (i * 7));
    const year = date.getFullYear();
    const weekNum = Math.ceil((date.getDate() + (new Date(year, 0, 1).getDay())) / 7);
    const period = `${year}-W${weekNum}`;
    
    // Create some patterns with randomness
    const baseValue = 30000 + (i % 4) * 5000;
    const randomFactor = Math.random() * 0.4 + 0.8; // 0.8 to 1.2
    const count = Math.round(baseValue * randomFactor);
    
    // Calculate percent change
    const percentChange = prevValue ? ((count - prevValue) / prevValue) * 100 : undefined;
    prevValue = count;
    
    result.push({
      period,
      count,
      percentChange: percentChange ? Math.round(percentChange * 10) / 10 : undefined
    });
  }
  
  return result;
})();

/**
 * Monthly appointment stats
 * - Shows seasonal patterns
 * - Last 12 months of data
 */
export const dummyMonthlyStats = (() => {
  const result = [];
  const now = new Date();
  let prevValue = 0;
  
  // Month names for display
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  // Generate 12 months of data
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(now.getMonth() - i);
    const year = date.getFullYear();
    const month = date.getMonth();
    const period = `${year}-${monthNames[month]}`;
    
    // Create seasonal patterns (higher in Q2-Q3, lower in Q4-Q1)
    // Quarter 1: Jan-Mar, Quarter 2: Apr-Jun, Quarter 3: Jul-Sep, Quarter 4: Oct-Dec
    let seasonalFactor = 1.0;
    if (month >= 3 && month <= 8) {
      // Spring and summer: higher values
      seasonalFactor = 1.2 + (month - 3) * 0.1; // Increases toward summer peak
    } else if (month > 8) {
      // Fall: gradually decreasing
      seasonalFactor = 1.1 - (month - 9) * 0.15;
    } else {
      // Winter: lower values
      seasonalFactor = 0.8 + month * 0.1; // Gradually increases toward spring
    }
    
    const baseValue = 120000;
    const randomFactor = Math.random() * 0.3 + 0.85; // 0.85 to 1.15
    const count = Math.round(baseValue * seasonalFactor * randomFactor);
    
    // Calculate percent change
    const percentChange = prevValue ? ((count - prevValue) / prevValue) * 100 : undefined;
    prevValue = count;
    
    result.push({
      period,
      count,
      percentChange: percentChange ? Math.round(percentChange * 10) / 10 : undefined
    });
  }
  
  return result;
})();

/**
 * Yearly appointment stats
 * - Shows long-term growth trend
 * - Last 5 years of data
 */
export const dummyYearlyStats = (() => {
  const result = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  let prevValue = 0;
  
  // Generate 5 years of data with growth trend
  for (let i = 4; i >= 0; i--) {
    const year = currentYear - i;
    const period = year.toString();
    
    // Create growth trend (15-20% year-over-year growth)
    const baseValue = 1200000;
    const growthFactor = Math.pow(1.18, 4-i); // ~18% annual growth
    const randomFactor = Math.random() * 0.2 + 0.9; // 0.9 to 1.1
    const count = Math.round(baseValue * growthFactor * randomFactor);
    
    // Calculate percent change
    const percentChange = prevValue ? ((count - prevValue) / prevValue) * 100 : undefined;
    prevValue = count;
    
    result.push({
      period,
      count,
      percentChange: percentChange ? Math.round(percentChange * 10) / 10 : undefined
    });
  }
  
  return result;
})();

// ------------------------------------------------------
// Budget Expiration Dummy Data
// ------------------------------------------------------

/**
 * Generate realistic client names
 */
function getClientName() {
  const firstNames = [
    "Emma", "Noah", "Olivia", "Liam", "Ava", "William", "Sophia", "James", 
    "Isabella", "Benjamin", "Mia", "Elijah", "Charlotte", "Lucas", "Amelia", 
    "Mason", "Harper", "Ethan", "Evelyn"
  ];
  
  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", 
    "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", 
    "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson"
  ];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
}

/**
 * Generate realistic plan names
 */
function getPlanName() {
  const planTypes = [
    "NDIS Support", "Speech Therapy", "Comprehensive Care", "Early Intervention",
    "Language Development", "Communication Support", "Articulation Therapy",
    "Autism Support", "Developmental Plan", "Fluency Program"
  ];
  
  const planModifiers = [
    "Standard", "Premium", "Essential", "Advanced", "Fundamental",
    "Core", "Extended", "Enhanced", "Basic", "Complete"
  ];
  
  const planType = planTypes[Math.floor(Math.random() * planTypes.length)];
  const planModifier = planModifiers[Math.floor(Math.random() * planModifiers.length)];
  
  // Sometimes include year in plan name
  const includeYear = Math.random() > 0.7;
  const year = includeYear ? ` ${new Date().getFullYear()}` : "";
  
  return `${planModifier} ${planType}${year}`;
}

/**
 * Budget expiration data with a mix of plan types and expiration dates
 */
export const dummyBudgetExpirationData: BudgetExpirationStats = {
  expiringNextMonth: {
    count: 7,
    byClient: Array.from({ length: 7 }, (_, i) => {
      // Generate realistic budget data with varying degrees of urgency
      const daysLeft = Math.floor(Math.random() * 28) + 1; // 1-28 days left
      const totalBudget = (Math.random() * 15000) + 5000; // $5,000-$20,000 total budget
      const percentUnused = Math.floor(Math.random() * 75) + 15; // 15-90% unutilized
      const unutilizedAmount = Math.round(totalBudget * (percentUnused / 100)); // Calculate amount based on percentage
      
      return {
        clientId: 1000 + i,
        clientName: getClientName(),
        planId: 2000 + i,
        planName: getPlanName(),
        daysLeft: daysLeft,
        unutilizedAmount: unutilizedAmount,
        unutilizedPercentage: percentUnused
      }
    })
  },
  remainingFunds: [
    { month: '2025-04', amount: 48500, planCount: 7 },
    { month: '2025-05', amount: 72300, planCount: 10 },
    { month: '2025-06', amount: 53800, planCount: 8 },
    { month: '2025-07', amount: 91200, planCount: 12 },
    { month: '2025-08', amount: 63400, planCount: 9 },
    { month: '2025-09', amount: 82600, planCount: 11 }
  ]
};

// ------------------------------------------------------
// Upcoming Tasks Dummy Data
// ------------------------------------------------------

/**
 * Upcoming tasks with a realistic distribution
 */
export const dummyUpcomingTasks: UpcomingTaskStats = {
  byMonth: [
    { month: '2025-04', reports: 15, letters: 8, assessments: 12, other: 5 },
    { month: '2025-05', reports: 18, letters: 6, assessments: 14, other: 4 },
    { month: '2025-06', reports: 12, letters: 9, assessments: 10, other: 7 },
    { month: '2025-07', reports: 20, letters: 5, assessments: 15, other: 3 },
    { month: '2025-08', reports: 16, letters: 10, assessments: 11, other: 8 },
    { month: '2025-09', reports: 22, letters: 7, assessments: 18, other: 6 }
  ]
};

// ------------------------------------------------------
// Complete Dashboard Dummy Data
// ------------------------------------------------------

/**
 * Combined dashboard data with all components
 */
export const dummyDashboardData: DashboardData = {
  appointments: {
    daily: dummyDailyStats,
    weekly: dummyWeeklyStats,
    monthly: dummyMonthlyStats,
    yearly: dummyYearlyStats
  },
  budgets: dummyBudgetExpirationData,
  tasks: dummyUpcomingTasks,
  lastUpdated: new Date().toISOString()
};

// ------------------------------------------------------
// Fund Utilization Timeline Dummy Data
// ------------------------------------------------------

/**
 * Generate dummy fund utilization timeline data with four data series:
 * 1. Projected: Initial projection at client onboarding
 * 2. Actual: Actual spending up to today
 * 3. Extension: Projected future spending based on actual pattern
 * 4. Correction: Path needed from today to use all funds
 * 
 * @param clientId Client ID to use for seeding patterns
 * @param underspending Percentage of underspending (0-100)
 * @returns Array of data points for the timeline
 */
export function getDummyFundUtilizationData(clientId: number = 77, underspending: number = 79, planStartDate?: string, planEndDate?: string) {
  const result = [];
  const now = new Date();
  
  // Set up dates - properly using budget plan start and end dates when provided
  // This ensures we show the correct timeframe based on the active budget plan
  const startDate = (() => {
    // If a plan start date is provided, use it
    if (planStartDate) {
      console.log(`Using provided plan start date: ${planStartDate} for client ${clientId}`);
      return new Date(planStartDate);
    }
    
    // Fallback to our previous logic if no plan date is provided
    const baseDate = new Date(now);
    
    // For client ID 77, we want to use March 20, 2025 as the budget start date to match real data
    if (clientId === 77) {
      console.log(`Using hardcoded March 20, 2025 for client 77`);
      return new Date("2025-03-20");
    } else if (clientId === 59) {
      console.log(`Using hardcoded March 16, 2025 for client 59`);
      return new Date("2025-03-16"); // Use March 16, 2025 for Radwan's budget
    } else {
      // For other clients, vary the date based on client ID
      const monthsAgo = 1 + (clientId % 12); // 1-12 months ago
      baseDate.setMonth(now.getMonth() - monthsAgo);
    }
    
    return baseDate;
  })();
  
  // Get end date from plan if provided, otherwise default to 1 year from start date
  const endDate = planEndDate ? new Date(planEndDate) : new Date(startDate);
  if (!planEndDate) {
    endDate.setFullYear(endDate.getFullYear() + 1); // Plan ends 1 year from start date if not specified
  }
  
  // Log the plan date information for debugging
  console.log(`Fund utilization timeline for client ${clientId}:`);
  console.log(`Start date: ${startDate.toISOString()} (${startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })})`);
  console.log(`End date: ${endDate.toISOString()} (${endDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })})`);
  console.log(`Total days in plan: ${Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))}`);
  
  
  // Calculate total days
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const remainingDays = totalDays - elapsedDays;
  
  // Total budget amount (based on client ID, capped at 20,000 per request)
  // This ensures active budget plans never exceed 20k for visualization purposes
  const baseBudget = 15000 + (clientId % 10) * 500;
  const totalBudget = baseBudget;
  
  // Daily spending rates
  const idealDailyRate = totalBudget / totalDays;
  
  // Actual spending rate (underspending by specified percentage)
  const actualFactor = 1 - (underspending / 100);
  const actualDailyRate = idealDailyRate * actualFactor;
  
  // Generate one data point per month from start to end of plan
  // This ensures we show only the relevant months on the x-axis
  
  // Determine start and end months to build x-axis
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();
  
  console.log(`Date range for client ${clientId}: Start: ${startMonth}/${startYear}, End: ${endMonth}/${endYear}`);
  
  // Calculate total months between start and end date (inclusive)
  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  
  // Use months as our data points for a cleaner display
  const numPoints = totalMonths;
  const daysPerPoint = Math.ceil(totalDays / numPoints);
  
  console.log(`Creating ${numPoints} data points for timeline`);
  
  // Current actual spending value
  let actualSpent = 0;
  
  // Store the exact value of today's actual spending (will be used for future points)
  let todayActualSpent = 0;
  
  // Create one point per month with one extra point for the last month
  // to ensure we include the final month completely
  for (let i = 0; i <= numPoints; i++) {  // Changed back to <= to include the end month
    // Create points based on month increments rather than days
    // This ensures one clean point per month
    // For the first point, use the exact startDate to ensure we start exactly at plan creation
    // For the last point, ensure we use the exact end date
    let pointDate;
    if (i === 0) {
      pointDate = new Date(startDate); // First point exactly matches plan start date
    } else if (i === numPoints) {
      pointDate = new Date(endDate); // Last point exactly matches plan end date
      console.log(`Using exact end date for final point: ${pointDate.toISOString()}`);
    } else {
      pointDate = new Date(startYear, startMonth + i, 1); // Other points use the first of each month
    }
    
    // Calculate the actual day number for calculations
    const dayNumber = Math.round((pointDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const isPastToday = dayNumber > elapsedDays;
    const isToday = dayNumber <= elapsedDays && dayNumber >= elapsedDays - daysPerPoint;
    
    // Calculate percent of time elapsed
    const percentOfTimeElapsed = dayNumber / totalDays;
    
    // 1. Projected line - step-like to represent biweekly sessions
    // Use a step function to simulate biweekly therapy sessions rather than continuous spending
    const sessionFrequency = 14; // Days between sessions (biweekly)
    const daysPerSession = Math.floor(dayNumber / sessionFrequency);
    const sessionsCompleted = Math.max(0, daysPerSession);
    const costPerSession = totalBudget / (totalDays / sessionFrequency);
    const projectedSpent = Math.min(costPerSession * sessionsCompleted, totalBudget);
    
    // 2. Actual line - step-like pattern for actual sessions with variability and underspending
    let thisActualSpent = null;
    if (!isPastToday) {
      // Create a step-like pattern for actual sessions too
      const actualSessionFrequency = 14; // Biweekly sessions
      const actualDaysPerSession = Math.floor(dayNumber / actualSessionFrequency);
      const actualSessionsCompleted = Math.max(0, actualDaysPerSession);
      
      // Determine if some sessions were missed (based on underspending percentage)
      const missedSessions = Math.floor(actualSessionsCompleted * (underspending / 100) / 2);
      const effectiveSessionsCompleted = actualSessionsCompleted - missedSessions;
      
      // Add some random variability to make the line interesting
      const variabilityFactor = 1 + (Math.random() * 0.2 - 0.1); // +/- 10%
      const actualCostPerSession = costPerSession * actualFactor * variabilityFactor;
      
      thisActualSpent = Math.max(0, actualCostPerSession * effectiveSessionsCompleted);
      actualSpent = thisActualSpent; // Update running total
    }
    
    // If this is today's point, save the current actual spent for future reference
    if (isToday) {
      todayActualSpent = actualSpent;
    }
    
    // Use the stored value of today's spending for consistency
    const actualSpentToday = isToday ? actualSpent : (isPastToday ? todayActualSpent : null);
    
    // 3. Extension line - future projection based on actual pattern with step-like sessions
    let extensionSpent = null;
    if (isPastToday || isToday) {
      // For today's point exactly, we MUST use the actual spending value to ensure visual continuity
      if (isToday) {
        extensionSpent = actualSpent;
      }
      // For the very next point after today, ensure smooth connection from today's actual
      else if (dayNumber === elapsedDays + daysPerPoint && todayActualSpent !== null) {
        // Project future spending from today, but ensure smooth transition
        const sessionFrequencyForExtension = 14; // Biweekly sessions
        const daysFromToday = daysPerPoint; // Just one interval ahead

        // Calculate rate of sessions attended so far
        const actualSessionRate = todayActualSpent / (costPerSession * ((elapsedDays / sessionFrequencyForExtension) || 1));
        
        // Calculate expected future sessions in this short interval
        const futureSessionsScheduled = Math.floor(daysFromToday / sessionFrequencyForExtension);
        const expectedSessionsToAttend = futureSessionsScheduled * actualSessionRate;
        
        // Extension spent is today's actual + expected future spending
        extensionSpent = todayActualSpent + (expectedSessionsToAttend * costPerSession * actualFactor);
      }
      // For future points beyond the next point, project from today's value with the existing rate
      else if (todayActualSpent !== null) {
        // Project future spending at the same rate, but with step-like sessions
        const sessionFrequencyForExtension = 14; // Biweekly sessions
        
        // Calculate how many additional sessions from today to this point
        const daysFromToday = dayNumber - elapsedDays;
        
        // Calculate rate of sessions attended so far
        const actualSessionRate = todayActualSpent / (costPerSession * ((elapsedDays / sessionFrequencyForExtension) || 1));
        
        // Calculate expected future sessions
        const futureSessionsScheduled = Math.floor(daysFromToday / sessionFrequencyForExtension);
        const expectedSessionsToAttend = futureSessionsScheduled * actualSessionRate;
        
        // Extension spent is today's actual + expected future spending
        extensionSpent = todayActualSpent + (expectedSessionsToAttend * costPerSession * actualFactor);
      }
    }
    
    // 4. Correction line - path needed to use all funds, following session schedule
    let correctionSpent = null;
    if (isPastToday || isToday) {
      // For today's point exactly, we MUST use the actual spending value
      if (isToday) {
        correctionSpent = actualSpent;
      }
      // For the very next point after today, ensure smooth connection from today's actual
      else if (dayNumber === elapsedDays + daysPerPoint && todayActualSpent !== null) {
        // Calculate remaining funds and days
        const remainingFunds = totalBudget - todayActualSpent;
        const remainingDaysInPlan = totalDays - elapsedDays;
        
        if (remainingDaysInPlan > 0) {
          // Calculate how many sessions remain in the plan from today to end
          const sessionFrequencyForCorrection = 14; // Biweekly
          const daysFromToday = daysPerPoint; // Just one interval ahead
          
          // Get the number of remaining sessions from today to plan end
          const remainingSessionsInPlan = Math.floor(remainingDaysInPlan / sessionFrequencyForCorrection);
          
          // Calculate how many sessions in this short interval
          const sessionsFromTodayToPoint = Math.floor(daysFromToday / sessionFrequencyForCorrection);
          
          // Calculate the ideal cost per future session to use all funds
          const idealCostPerFutureSession = remainingFunds / (remainingSessionsInPlan || 1);
          
          // This is the point right after today
          correctionSpent = todayActualSpent + (idealCostPerFutureSession * sessionsFromTodayToPoint);
        } else {
          correctionSpent = totalBudget;
        }
      }
      // For future points, calculate ideal spending to use all funds by plan end
      else if (todayActualSpent !== null) {
        // Calculate remaining funds and days
        const remainingFunds = totalBudget - todayActualSpent;
        const remainingDaysInPlan = totalDays - elapsedDays;
        
        if (remainingDaysInPlan > 0) {
          // Calculate how many sessions remain in the plan from today to end
          const sessionFrequencyForCorrection = 14; // Biweekly
          const daysFromToday = dayNumber - elapsedDays;
          
          // Get the number of remaining sessions from today to plan end
          const remainingSessionsInPlan = Math.floor(remainingDaysInPlan / sessionFrequencyForCorrection);
          
          // Calculate how many sessions from today to this future point
          const sessionsFromTodayToPoint = Math.floor(daysFromToday / sessionFrequencyForCorrection);
          
          // Calculate the ideal cost per future session to use all funds
          const idealCostPerFutureSession = remainingFunds / (remainingSessionsInPlan || 1);
          
          // This is a future point
          correctionSpent = todayActualSpent + (idealCostPerFutureSession * sessionsFromTodayToPoint);
        } else {
          correctionSpent = totalBudget;
        }
      }
    }
    
    // Add the data point
    result.push({
      date: pointDate.toISOString().split('T')[0],
      // Format the date as "MMM YY" for consistent x-axis display (e.g., "Jan 25")
      displayDate: pointDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      dayNumber,
      projectedSpent,
      actualSpent: thisActualSpent,
      extensionSpent,
      correctionSpent,
      isToday,
      isPastToday,
      percentOfTimeElapsed: percentOfTimeElapsed * 100,
      percentOfBudgetSpent: actualSpent / totalBudget * 100
    });
  }
  
  return result;
}

// ------------------------------------------------------
// Client Report Dummy Data
// ------------------------------------------------------

/**
 * Generate strategy names
 */
function getStrategyName() {
  const strategyTypes = [
    "Visual Supports", "Social Stories", "Token Economy", "Behavioral Intervention",
    "Sensory Regulation", "Play Therapy", "Reinforcement System", "Peer Mediation",
    "Task Analysis", "Prompting Strategy", "Time Delay", "Naturalistic Teaching",
    "Video Modeling", "Joint Attention", "Self-Monitoring", "Functional Communication"
  ];
  
  return strategyTypes[Math.floor(Math.random() * strategyTypes.length)];
}

/**
 * Generate goal titles
 */
function getGoalTitle() {
  const areas = [
    "Communication", "Social Skills", "Self-Regulation", "Academic", 
    "Fine Motor", "Gross Motor", "Independence", "Vocational",
    "Self-Help", "Cognitive", "Literacy", "Executive Functioning"
  ];
  
  const actions = [
    "Improve", "Develop", "Enhance", "Strengthen", "Build", 
    "Master", "Acquire", "Increase", "Refine", "Practice"
  ];
  
  const area = areas[Math.floor(Math.random() * areas.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  
  return `${action} ${area} Skills`;
}

/**
 * Generate relationship types
 */
function getRelationshipType() {
  const relationships = [
    "Parent", "Guardian", "Sibling", "Grandparent", 
    "Teacher", "Social Worker", "Support Coordinator", 
    "Therapist", "Family Friend", "Caregiver"
  ];
  
  return relationships[Math.floor(Math.random() * relationships.length)];
}

/**
 * Generate language preferences
 */
function getLanguage() {
  const languages = [
    "English", "Spanish", "Mandarin", "Arabic", 
    "Hindi", "French", "German", "Italian",
    "Japanese", "Korean", "Russian", "Portuguese"
  ];
  
  return languages[Math.floor(Math.random() * languages.length)];
}

/**
 * Generate funds management type
 */
function getFundsManagementType() {
  const types = ["Self-Managed", "Advisor-Managed", "Custodian-Managed"];
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Generate dummy client report data with realistic values
 * This creates a comprehensive report with all required sections
 * 
 * @param clientId The client ID to use in the report
 * @returns Dummy client report data
 */
export function getDummyClientReport(clientId: number = 100): ClientReportData {
  // Generate client details
  const clientDetails: ClientDetailsData = {
    id: clientId,
    name: getClientName(),
    age: Math.floor(Math.random() * 15) + 3, // 3-18 years old
    fundsManagement: getFundsManagementType(),
    allies: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => ({
      name: getClientName(),
      relationship: getRelationshipType(),
      preferredLanguage: getLanguage()
    }))
  };
  
  // Generate key metrics
  const keyMetrics: KeyMetricsData = {
    spendingDeviation: Math.round((Math.random() * 24) - 12), // -12% to +12%
    planExpiration: Math.floor(Math.random() * 180) + 15, // 15-195 days until expiration
    cancellationRate: Math.floor(Math.random() * 20) // 0-20% cancellation rate
  };
  
  // Generate observation scores (0-10 scale)
  const observations: ObservationsData = {
    physicalActivity: Math.round((Math.random() * 7) + 3), // 3-10 score
    cooperation: Math.round((Math.random() * 7) + 3), // 3-10 score
    focus: Math.round((Math.random() * 7) + 3), // 3-10 score
    mood: Math.round((Math.random() * 7) + 3) // 3-10 score
  };
  
  // Generate cancellation statistics
  const totalSessions = Math.floor(Math.random() * 15) + 10; // 10-25 total sessions
  const completedPercent = Math.floor(Math.random() * 30) + 65; // 65-95% completed
  const waivedPercent = Math.floor(Math.random() * 15); // 0-15% waived
  const changedPercent = 100 - completedPercent - waivedPercent; // Remainder changed
  
  const cancellations: CancellationsData = {
    completed: completedPercent,
    waived: waivedPercent,
    changed: changedPercent,
    total: totalSessions
  };
  
  // Generate strategy data
  const strategyCount = Math.floor(Math.random() * 6) + 3; // 3-8 strategies
  const strategies: StrategiesData = {
    strategies: Array.from({ length: strategyCount }, (_, i) => ({
      id: 200 + i,
      name: getStrategyName(),
      timesUsed: Math.floor(Math.random() * 12) + 1, // 1-12 times used
      averageScore: Math.round((Math.random() * 6) + 4) // 4-10 average score
    }))
  };
  
  // Generate goal data
  const goalCount = Math.floor(Math.random() * 4) + 2; // 2-5 goals
  const goals: GoalsData = {
    goals: Array.from({ length: goalCount }, (_, i) => ({
      id: 300 + i,
      title: getGoalTitle(),
      score: Math.round((Math.random() * 10)) // 0-10 score
    }))
  };
  
  return {
    clientDetails,
    keyMetrics,
    observations,
    cancellations,
    strategies,
    goals
  };
}

/**
 * Get detailed strategies data for visualization
 * This is a subset of the full report focused just on strategies
 * 
 * @param clientId The client ID to use
 * @returns Strategies data
 */
export function getDummyClientStrategiesReport(clientId: number = 100): StrategiesData {
  const strategyCount = Math.floor(Math.random() * 10) + 5; // 5-14 strategies
  
  // Generate more detailed strategy data
  return {
    strategies: Array.from({ length: strategyCount }, (_, i) => ({
      id: 200 + i,
      name: getStrategyName(),
      timesUsed: Math.floor(Math.random() * 20) + 1, // 1-20 times used
      averageScore: Math.round((Math.random() * 60) + 40) / 10 // 4.0-10.0 average score with decimal
    }))
  };
}

// ------------------------------------------------------
// Data Enhancement Helper Functions
// ------------------------------------------------------

/**
 * Convert appointment stats count from numerical value to dollar amount
 * This function makes the count data represent revenue instead of appointment count
 */
export function enhanceAppointmentStatsWithRevenue(stats: AppointmentStats): AppointmentStats {
  return {
    daily: stats.daily.map(entry => ({
      ...entry,
      // Convert count to dollar value (average $100-200 per appointment)
      count: Math.round(entry.count * (100 + Math.random() * 100))
    })),
    weekly: stats.weekly.map(entry => ({
      ...entry,
      // Convert count to dollar value (average $100-200 per appointment)
      count: Math.round(entry.count * (100 + Math.random() * 100))
    })),
    monthly: stats.monthly.map(entry => ({
      ...entry,
      // Convert count to dollar value (average $100-200 per appointment)
      count: Math.round(entry.count * (100 + Math.random() * 100))
    })),
    yearly: stats.yearly.map(entry => ({
      ...entry,
      // Convert count to dollar value (average $100-200 per appointment)
      count: Math.round(entry.count * (100 + Math.random() * 100))
    }))
  };
}