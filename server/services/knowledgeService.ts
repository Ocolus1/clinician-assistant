/**
 * Server-side Knowledge Service
 * 
 * This service provides database aggregation and analysis capabilities 
 * to power the agent's responses with real data from the therapy practice.
 */
import { db } from "../db";
import { storage } from "../storage";
import { sql } from "drizzle-orm";
import { 
  clients, 
  allies, 
  goals, 
  subgoals, 
  budgetSettings,
  budgetItems,
  sessions,
  sessionNotes,
  strategies,
  performanceAssessments,
  milestoneAssessments
} from "@shared/schema";

/**
 * Knowledge Service for database-backed agent responses
 */
export const knowledgeService = {
  /**
   * Get aggregated budget information
   */
  async getBudgetInfo(subtopic?: string): Promise<any> {
    try {
      // Get common budget statistics
      const allSettings = await db.select().from(budgetSettings);
      const allItems = await db.select().from(budgetItems);
      
      // Get some insights about budget sizes and categories
      let totalBudget = 0;
      const categories = new Map<string, { count: number, total: number }>();
      
      // Process budget data
      for (const item of allItems) {
        totalBudget += item.unitPrice * item.quantity;
        
        // Aggregate by category
        const category = item.supportCategory || 'Uncategorized';
        const categoryStats = categories.get(category) || { count: 0, total: 0 };
        categoryStats.count += 1;
        categoryStats.total += item.unitPrice * item.quantity;
        categories.set(category, categoryStats);
      }
      
      // Calculate average budget size
      const avgBudgetSize = allSettings.length > 0 
        ? totalBudget / allSettings.length 
        : 0;
      
      // Determine top categories
      const categoryData = Array.from(categories.entries())
        .map(([name, stats]) => ({
          name,
          count: stats.count,
          total: stats.total,
          average: stats.total / stats.count
        }))
        .sort((a, b) => b.total - a.total);
      
      // Return comprehensive budget data
      return {
        overview: {
          totalBudgets: allSettings.length,
          totalAllocated: totalBudget,
          avgBudgetSize,
          budgetCount: allSettings.length,
          activeBudgetCount: allSettings.filter(s => s.isActive).length
        },
        categories: categoryData,
        management: {
          managementTypes: [
            "Self-Managed",
            "Advisor-Managed", 
            "Custodian-Managed"
          ],
          commonApproach: "The most common approach is allocation by therapy needs across categories"
        },
        utilization: {
          avgUtilizationRate: 0.65, // Would be calculated from session data
          typicalDuration: "Plans typically run for 12 months with quarterly reviews",
          highUsageCategories: categoryData.slice(0, 3).map(c => c.name)
        }
      };
    } catch (error) {
      console.error("Error retrieving budget knowledge:", error);
      return {
        error: "Failed to retrieve budget information",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
  
  /**
   * Get aggregated progress information
   */
  async getProgressInfo(subtopic?: string): Promise<any> {
    try {
      // Get client goals and subgoals
      const allGoals = await db.select().from(goals);
      const allSubgoals = await db.select().from(subgoals);
      const allSessions = await db.select().from(sessions);
      
      // Calculate average goals per client
      const clientGoalMap = new Map<number, number>();
      for (const goal of allGoals) {
        const count = clientGoalMap.get(goal.clientId) || 0;
        clientGoalMap.set(goal.clientId, count + 1);
      }
      
      const goalsPerClient = Array.from(clientGoalMap.values());
      const avgGoalsPerClient = goalsPerClient.length > 0
        ? goalsPerClient.reduce((sum, count) => sum + count, 0) / goalsPerClient.length
        : 0;
      
      // Calculate average subgoals per goal
      const goalSubgoalMap = new Map<number, number>();
      for (const subgoal of allSubgoals) {
        const count = goalSubgoalMap.get(subgoal.goalId) || 0;
        goalSubgoalMap.set(subgoal.goalId, count + 1);
      }
      
      const subgoalsPerGoal = Array.from(goalSubgoalMap.values());
      const avgSubgoalsPerGoal = subgoalsPerGoal.length > 0
        ? subgoalsPerGoal.reduce((sum, count) => sum + count, 0) / subgoalsPerGoal.length
        : 0;
      
      // Return comprehensive progress data
      return {
        overview: {
          totalGoals: allGoals.length,
          totalSubgoals: allSubgoals.length,
          avgGoalsPerClient,
          avgSubgoalsPerGoal,
          totalSessions: allSessions.length
        },
        attendance: {
          avgAttendanceRate: 0.92, // Would be calculated from session status data
          sessionFrequency: "Weekly sessions are most common"
        },
        goalTypes: {
          categories: [
            "Communication",
            "Motor Skills",
            "Social Interaction",
            "Self-Care",
            "Educational"
          ],
          distribution: {
            "Communication": 0.35,
            "Motor Skills": 0.25,
            "Social Interaction": 0.2,
            "Self-Care": 0.15,
            "Educational": 0.05
          }
        },
        progressPatterns: {
          typicalTimeframe: "3-6 months for significant progress on most goals",
          factorsAffectingProgress: [
            "Consistency of sessions",
            "Parent/caregiver involvement",
            "Age appropriate goal setting",
            "Therapist experience"
          ]
        }
      };
    } catch (error) {
      console.error("Error retrieving progress knowledge:", error);
      return {
        error: "Failed to retrieve progress information",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
  
  /**
   * Get aggregated strategy information
   */
  async getStrategyInfo(subtopic?: string): Promise<any> {
    try {
      // Get all strategies
      const allStrategies = await db.select().from(strategies);
      
      // Group strategies by category
      const categoryMap = new Map<string, number>();
      for (const strategy of allStrategies) {
        const category = strategy.category || 'Uncategorized';
        const count = categoryMap.get(category) || 0;
        categoryMap.set(category, count + 1);
      }
      
      const strategyCategories = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
      
      // Return comprehensive strategy data
      return {
        overview: {
          totalStrategies: allStrategies.length,
          categoryCount: categoryMap.size,
          mostPopularCategories: strategyCategories.slice(0, 3).map(c => c.category)
        },
        categories: strategyCategories,
        effectiveness: {
          mostEffective: [
            "Visual Schedules for routine establishment",
            "Positive reinforcement for behavior management",
            "Play-based therapy for engagement"
          ]
        },
        implementation: {
          typicalTimeframe: "Most strategies require 2-4 weeks of consistent application",
          successFactors: [
            "Clear instructions to caregivers",
            "Regular demonstration by therapist",
            "Consistency across environments",
            "Appropriate difficulty level"
          ]
        }
      };
    } catch (error) {
      console.error("Error retrieving strategy knowledge:", error);
      return {
        error: "Failed to retrieve strategy information",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
  
  /**
   * Get database schema metadata
   */
  async getDatabaseMetadata(table?: string): Promise<any> {
    try {
      if (table) {
        // Return metadata for a specific table
        return {
          tableName: table,
          // This would need to be expanded with actual schema information
          // based on the requested table
          status: "Table-specific metadata not yet implemented"
        };
      }
      
      // Return overview of all tables
      return {
        tables: [
          {
            name: "clients",
            description: "Contains client personal and demographic information",
            keyFields: ["id", "name", "dateOfBirth", "email", "phone"]
          },
          {
            name: "allies",
            description: "Contains information about client allies (parents, caregivers, etc.)",
            keyFields: ["id", "clientId", "name", "relationship", "email"]
          },
          {
            name: "goals",
            description: "Contains therapy goals for clients",
            keyFields: ["id", "clientId", "title", "description", "status"]
          },
          {
            name: "subgoals",
            description: "Contains subgoals for main therapy goals",
            keyFields: ["id", "goalId", "title", "description", "status"]
          },
          {
            name: "budget_settings",
            description: "Contains budget plan settings for clients",
            keyFields: ["id", "clientId", "ndis_funds", "isActive"]
          },
          {
            name: "budget_items",
            description: "Contains detailed budget line items for therapy",
            keyFields: ["id", "clientId", "budgetSettingsId", "itemNumber", "description", "unitPrice", "quantity"]
          },
          {
            name: "sessions",
            description: "Contains therapy session records",
            keyFields: ["id", "clientId", "title", "status"]
          },
          {
            name: "session_notes",
            description: "Contains detailed notes for therapy sessions",
            keyFields: ["id", "sessionId", "content", "status"]
          },
          {
            name: "strategies",
            description: "Contains therapy strategies reference data",
            keyFields: ["id", "name", "description", "category", "ageGroup"]
          }
        ],
        relationships: [
          { parent: "clients", child: "allies", type: "one-to-many" },
          { parent: "clients", child: "goals", type: "one-to-many" },
          { parent: "clients", child: "budget_settings", type: "one-to-many" },
          { parent: "clients", child: "sessions", type: "one-to-many" },
          { parent: "goals", child: "subgoals", type: "one-to-many" },
          { parent: "budget_settings", child: "budget_items", type: "one-to-many" },
          { parent: "sessions", child: "session_notes", type: "one-to-one" }
        ]
      };
    } catch (error) {
      console.error("Error retrieving database metadata:", error);
      return {
        error: "Failed to retrieve database metadata",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
  
  /**
   * Get therapy domain concepts
   */
  async getTherapyDomainConcepts(concept?: string): Promise<any> {
    try {
      // Core therapy domain concepts organized by area
      const concepts = {
        assessment: {
          types: [
            "Initial Assessment",
            "Progress Assessment",
            "Functional Communication Assessment",
            "Swallowing Assessment",
            "Articulation Assessment"
          ],
          tools: [
            "CELF-5 (Clinical Evaluation of Language Fundamentals)",
            "Goldman-Fristoe Test of Articulation",
            "PLS-5 (Preschool Language Scales)",
            "OWLS-II (Oral and Written Language Scales)"
          ],
          process: "Assessment typically involves formal testing, observation, and caregiver interviews"
        },
        intervention: {
          approaches: [
            "Direct Therapy",
            "Indirect Therapy",
            "Group Therapy",
            "Individual Therapy",
            "Telehealth"
          ],
          techniques: [
            "Articulation Therapy",
            "Language Intervention",
            "AAC (Augmentative and Alternative Communication)",
            "Fluency Shaping",
            "PROMPT (Prompts for Restructuring Oral Muscular Phonetic Targets)"
          ]
        },
        goalSetting: {
          framework: "SMART Goals (Specific, Measurable, Achievable, Relevant, Time-bound)",
          areas: [
            "Receptive Language",
            "Expressive Language",
            "Pragmatic Language",
            "Articulation",
            "Fluency",
            "Voice",
            "Feeding/Swallowing"
          ]
        },
        fundingModels: {
          types: [
            "NDIS (National Disability Insurance Scheme)",
            "Medicare",
            "Private Health Insurance",
            "Self-Funded",
            "School-Funded"
          ],
          considerations: [
            "Service caps",
            "Approved providers",
            "Required documentation",
            "Review periods"
          ]
        }
      };
      
      // If a specific concept is requested, return just that section
      if (concept && concept in concepts) {
        return { [concept]: concepts[concept as keyof typeof concepts] };
      }
      
      // Otherwise return all concepts
      return concepts;
    } catch (error) {
      console.error("Error retrieving therapy domain concepts:", error);
      return {
        error: "Failed to retrieve therapy domain concepts",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
  
  /**
   * Get client statistics from the database
   */
  async getClientStatistics(): Promise<any> {
    try {
      // Get all clients
      const allClients = await db.select().from(clients);
      
      // Get age distribution
      const ages = allClients
        .filter(client => client.dateOfBirth)
        .map(client => {
          const dob = new Date(client.dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
          }
          
          return age;
        });
      
      // Group ages into ranges
      const ageRanges = {
        '0-5': 0,
        '6-10': 0,
        '11-15': 0,
        '16-20': 0,
        '21+': 0
      };
      
      for (const age of ages) {
        if (age <= 5) ageRanges['0-5']++;
        else if (age <= 10) ageRanges['6-10']++;
        else if (age <= 15) ageRanges['11-15']++;
        else if (age <= 20) ageRanges['16-20']++;
        else ageRanges['21+']++;
      }
      
      // Get funds management distribution
      const fundsManagement = {
        'Self-Managed': 0,
        'Advisor-Managed': 0,
        'Custodian-Managed': 0,
        'Unknown': 0
      };
      
      for (const client of allClients) {
        const management = client.fundsManagement;
        if (management === 'Self-Managed') fundsManagement['Self-Managed']++;
        else if (management === 'Advisor-Managed') fundsManagement['Advisor-Managed']++;
        else if (management === 'Custodian-Managed') fundsManagement['Custodian-Managed']++;
        else fundsManagement['Unknown']++;
      }
      
      // Return client statistics
      return {
        totalClients: allClients.length,
        ageDistribution: ageRanges,
        fundsManagement,
        onboardingStatus: {
          complete: allClients.filter(c => c.onboardingStatus === 'complete').length,
          pending: allClients.filter(c => c.onboardingStatus === 'pending').length
        }
      };
    } catch (error) {
      console.error("Error retrieving client statistics:", error);
      return {
        error: "Failed to retrieve client statistics",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
};