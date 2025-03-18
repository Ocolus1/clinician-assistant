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
    byClient: Array.from({ length: 7 }, (_, i) => ({
      clientId: 1000 + i,
      clientName: getClientName(),
      planId: 2000 + i,
      planName: getPlanName()
    }))
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