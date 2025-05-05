import { OpenAI } from "langchain/llms/openai";
import { DynamicTool } from "langchain/tools";
import { AgentExecutor, ZeroShotAgent } from "langchain/agents";
import { db } from "../db";
import { 
  patients, caregivers, goals, subgoals, 
  sessions, sessionNotes, strategies, 
  goalAssessments, milestoneAssessments,
  budgetSettings, budgetItems
} from "../../shared/schema";
import { memoryService } from "./memoryService";
import { and, asc, desc, eq, gt, gte, inArray, like, lt, lte, ne, not, or, sql } from 'drizzle-orm';
import { PgSelectBuilder } from 'drizzle-orm/pg-core';
import { flexibleQueryBuilder } from './tools/queryBuilderTool';
import { getPatientGoals } from './tools/patientGoalsTool';
import { getPatientSessions } from './tools/patientSessionsTool';
import { getPatientBudget } from './tools/budgetTrackingTool';
import { getPatientStrategies } from './tools/strategyInsightsTool';
import { getExpiringBudgets } from './tools/budgetExpirationTool';
import { getPatientCount, getFilteredPatientCount } from './tools/patientCountTool';
import { findPatientsByName } from './tools/patientFinderTool';

/**
 * ReactAgentService - A service that uses a ReAct agent to process natural language queries
 * about patient data, goals, strategies, and reports.
 */
class ReactAgentService {
  private llm: OpenAI;
  private agent: AgentExecutor | null = null;
  
  constructor() {
    this.llm = new OpenAI({
      modelName: "gpt-4",
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  }
  
  /**
   * Process a query using the ReAct agent
   * @param query The query to process
   * @param sessionId The session ID for memory storage
   * @returns The response from the agent
   */
  async processQuery(query: string, sessionId: number): Promise<string> {
    try {
      if (!this.agent) {
        await this.initializeAgent();
      }
      const result = await this.agent!.call({ input: query });
      await memoryService.addMemory(sessionId, `Query: ${query}\nResponse: ${result.output}`);
      return result.output;
    } catch (error) {
      console.error("Error processing query with ReAct agent:", error);
      return "I encountered an error while processing your query.";
    }
  }
  
  /**
   * Initialize the ReAct agent with tools
   */
  private async initializeAgent() {
    // Create tools for the agent to use
    const tools = [
      // Tool for getting patient information
      new DynamicTool({
        name: "get_patient_info",
        description: "Get information about a patient by name or ID",
        func: async (input: string) => {
          try {
            // Parse the input to extract patient identifier
            const patientIdentifier = input.trim();
            
            // Try to find by ID first if it's a number
            if (!isNaN(Number(patientIdentifier))) {
              const patientId = Number(patientIdentifier);
              const patient = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1).execute();
              
              if (patient.length > 0) {
                return JSON.stringify(patient[0], null, 2);
              }
            }
            
            // Try to find by name
            const patientsByName = await db.select().from(patients)
              .where(like(patients.name, `%${patientIdentifier}%`))
              .limit(5)
              .execute();
            
            if (patientsByName.length > 0) {
              return JSON.stringify(patientsByName, null, 2);
            }
            
            return "No patient found with the given identifier.";
          } catch (error) {
            console.error("Error in get_patient_info tool:", error);
            return "Error retrieving patient information.";
          }
        }
      }),
      
      // Tool for finding patients by name
      new DynamicTool({
        name: "find_patients_by_name",
        description: "Find patients whose names match a search term (e.g., 'Radwan')",
        func: async (input: string) => {
          try {
            return await findPatientsByName(input);
          } catch (error) {
            console.error("Error in find_patients_by_name tool:", error);
            return "Error finding patients by name.";
          }
        }
      }),
      
      // Tool for getting caregiver information
      new DynamicTool({
        name: "get_caregiver_info",
        description: "Get information about a patient's caregivers by patient name or ID",
        func: async (input: string) => {
          try {
            // Parse the input to extract patient identifier
            const patientIdentifier = input.trim();
            
            // Try to find patient by ID first if it's a number
            let patientId: number | null = null;
            
            if (!isNaN(Number(patientIdentifier))) {
              patientId = Number(patientIdentifier);
            } else {
              // Try to find by name
              const patient = await db.select().from(patients)
                .where(like(patients.name, `%${patientIdentifier}%`))
                .limit(1)
                .execute();
              
              if (patient.length > 0) {
                patientId = patient[0].id;
              } else {
                return "No patient found with the given identifier.";
              }
            }
            
            // Get caregivers for the patient
            const patientCaregivers = await db.select().from(caregivers)
              .where(eq(caregivers.patientId, patientId))
              .execute();
            
            if (patientCaregivers.length > 0) {
              return JSON.stringify(patientCaregivers, null, 2);
            }
            
            return "No caregivers found for the specified patient.";
          } catch (error) {
            console.error("Error in get_caregiver_info tool:", error);
            return "Error retrieving caregiver information.";
          }
        }
      }),
      
      // Specialized tool for getting patient goals
      new DynamicTool({
        name: "get_patient_goals",
        description: "Get goals for a specific patient by patient name or ID",
        func: async (input: string) => {
          try {
            return await getPatientGoals(input);
          } catch (error) {
            console.error("Error in get_patient_goals tool:", error);
            return "Error retrieving patient goals.";
          }
        }
      }),
      
      // Specialized tool for getting patient sessions
      new DynamicTool({
        name: "get_patient_sessions",
        description: "Get session information for a specific patient by patient name or ID, with optional timeframe (e.g., 'patientId,last_month')",
        func: async (input: string) => {
          try {
            return await getPatientSessions(input);
          } catch (error) {
            console.error("Error in get_patient_sessions tool:", error);
            return "Error retrieving patient sessions.";
          }
        }
      }),
      
      // Specialized tool for getting patient budget information
      new DynamicTool({
        name: "get_patient_budget",
        description: "Get budget information for a specific patient by patient name or ID, with optional type (e.g., 'patientId,remaining')",
        func: async (input: string) => {
          try {
            return await getPatientBudget(input);
          } catch (error) {
            console.error("Error in get_patient_budget tool:", error);
            return "Error retrieving patient budget information.";
          }
        }
      }),
      
      // Specialized tool for getting patient strategy insights
      new DynamicTool({
        name: "get_patient_strategies",
        description: "Get strategy insights for a specific patient by patient name or ID, with optional goal type (e.g., 'patientId,communication')",
        func: async (input: string) => {
          try {
            return await getPatientStrategies(input);
          } catch (error) {
            console.error("Error in get_patient_strategies tool:", error);
            return "Error retrieving patient strategy insights.";
          }
        }
      }),
      
      // Tool for generating progress summaries
      new DynamicTool({
        name: "generate_progress_summary",
        description: "Generate a progress summary for a patient by name or ID",
        func: async (input: string) => {
          try {
            // Parse the input to extract patient identifier
            const patientIdentifier = input.trim();
            
            // Get patient data
            const { patientId, patientName, patientData } = await getPatientData(patientIdentifier);
            
            if (!patientId || !patientName || !patientData) {
              return `No patient found matching "${patientIdentifier}".`;
            }
            
            // Get patient goals
            const patientGoals = await getPatientGoals(patientId.toString());
            
            // Get patient sessions
            const patientSessions = await getPatientSessions(`${patientId},last_3_months`);
            
            // Combine the data into a progress summary
            let summary = `Progress Summary for ${patientName} (ID: ${patientId}):\n\n`;
            
            // Add patient information
            summary += `Patient Information:\n`;
            summary += `Name: ${patientData.name}\n`;
            summary += `Age: ${patientData.age || 'Unknown'}\n`;
            summary += `Onboarding Status: ${patientData.onboardingStatus || 'Unknown'}\n`;
            summary += `Management Type: ${patientData.managementType || 'Unknown'}\n\n`;
            
            // Add goals information
            summary += `Goals:\n${patientGoals}\n\n`;
            
            // Add sessions information
            summary += `Recent Sessions:\n${patientSessions}\n\n`;
            
            return summary;
          } catch (error) {
            console.error("Error in generate_progress_summary tool:", error);
            return "Error generating progress summary.";
          }
        }
      }),
      
      // Tool for checking report status
      new DynamicTool({
        name: "check_report_status",
        description: "Check if all the data needed for a patient's progress report is available",
        func: async (input: string) => {
          try {
            // Parse the input to extract patient identifier
            const patientIdentifier = input.trim();
            
            // Get patient data
            const { patientId, patientName, patientData } = await getPatientData(patientIdentifier);
            
            if (!patientId || !patientName || !patientData) {
              return `No patient found matching "${patientIdentifier}".`;
            }
            
            // Check for missing patient information
            const missingPatientInfo = [];
            if (!patientData.age) missingPatientInfo.push("age");
            if (!patientData.onboardingStatus) missingPatientInfo.push("onboarding status");
            if (!patientData.managementType) missingPatientInfo.push("management type");
            
            // Check for goals
            let hasGoals = false;
            try {
              const goalsResult = await getPatientGoals(patientId.toString());
              hasGoals = !goalsResult.includes("No goals found");
            } catch (error) {
              console.error("Error checking goals:", error);
            }
            
            // Check for sessions
            let hasSessions = false;
            try {
              const sessionsResult = await getPatientSessions(`${patientId},last_3_months`);
              hasSessions = !sessionsResult.includes("No sessions found");
            } catch (error) {
              console.error("Error checking sessions:", error);
            }
            
            // Compile the report status
            let reportStatus = "";
            
            if (missingPatientInfo.length === 0 && hasGoals && hasSessions) {
              reportStatus = `All necessary data for ${patientName}'s progress report is available.`;
            } else {
              reportStatus = `No, all the necessary data for ${patientName}'s progress report is not available.`;
              
              if (missingPatientInfo.length > 0) {
                reportStatus += ` There are missing fields in the patient's information: ${missingPatientInfo.join(", ")}.`;
              }
              
              if (!hasGoals) {
                reportStatus += ` There were errors in retrieving the patient's goals.`;
              }
              
              if (!hasSessions) {
                reportStatus += ` There were errors in retrieving the patient's sessions.`;
              }
              
              reportStatus += ` Please update the missing information before generating a progress report.`;
            }
            
            return reportStatus;
          } catch (error) {
            console.error("Error in check_report_status tool:", error);
            return "Error checking report status.";
          }
        }
      }),
      
      // Tool for generating goal progress reports
      new DynamicTool({
        name: "generate_goal_progress_report",
        description: "Generate a detailed progress report for a specific goal of a patient",
        func: async (input: string) => {
          try {
            // Parse the input to extract patient and goal identifiers
            const parts = input.split(',').map(part => part.trim());
            if (parts.length < 2) {
              return "Please provide both patient identifier and goal identifier, separated by a comma.";
            }
            
            const patientIdentifier = parts[0];
            const goalIdentifier = parts[1];
            
            // Get patient data
            const { patientId, patientName, patientData } = await getPatientData(patientIdentifier);
            
            if (!patientId || !patientName || !patientData) {
              return `No patient found matching "${patientIdentifier}".`;
            }
            
            // Get the specific goal
            let goalId: number | null = null;
            let goal: any = null;
            
            if (!isNaN(Number(goalIdentifier))) {
              // Try to find goal by ID
              goalId = Number(goalIdentifier);
              const goalResult = await db.select().from(goals)
                .where(and(
                  eq(goals.id, goalId),
                  eq(goals.patientId, patientId)
                ))
                .limit(1)
                .execute();
              
              if (goalResult.length > 0) {
                goal = goalResult[0];
              }
            } else {
              // Try to find goal by description
              const goalResult = await db.select().from(goals)
                .where(and(
                  like(goals.description, `%${goalIdentifier}%`),
                  eq(goals.patientId, patientId)
                ))
                .limit(1)
                .execute();
              
              if (goalResult.length > 0) {
                goal = goalResult[0];
                goalId = goal.id;
              }
            }
            
            if (!goal || !goalId) {
              return `No goal found matching "${goalIdentifier}" for patient ${patientName}.`;
            }
            
            // Get goal assessments
            const assessments = await db.select().from(goalAssessments)
              .where(eq(goalAssessments.goalId, goalId))
              .orderBy(desc(goalAssessments.date), desc(goalAssessments.id)) // Use date first, then id as fallback
              .execute();
            
            // Get strategies for this goal
            const goalStrategies = await db.select().from(strategies)
              .where(eq(strategies.goalId, goalId))
              .execute();
            
            // Generate the report
            let report = `Goal Progress Report for ${patientName} (ID: ${patientId}):\n\n`;
            
            // Add goal information
            report += `Goal: ${goal.description || 'No description'}\n`;
            report += `Type: ${goal.type || 'No type'}\n`;
            report += `Status: ${goal.status || 'No status'}\n`;
            report += `Created: ${goal.createdAt ? new Date(goal.createdAt).toISOString().split('T')[0] : 'Unknown'}\n\n`;
            
            // Add assessment information
            report += `Assessments:\n`;
            if (assessments.length > 0) {
              assessments.forEach(assessment => {
                const assessmentDate = assessment.date 
                  ? new Date(assessment.date).toISOString().split('T')[0] 
                  : (assessment.createdAt 
                    ? new Date(assessment.createdAt).toISOString().split('T')[0] 
                    : 'Unknown');
                report += `- Date: ${assessmentDate}\n`;
                report += `  Score: ${assessment.score !== null ? assessment.score : 'Not assessed'}\n`;
                report += `  Notes: ${assessment.notes || 'No notes'}\n`;
              });
            } else {
              report += `No assessments found for this goal.\n`;
            }
            
            // Add strategies information
            report += `\nStrategies:\n`;
            if (goalStrategies.length > 0) {
              goalStrategies.forEach((strategy: any) => {
                report += `- ${strategy.name || `Strategy #${strategy.id}`}: ${strategy.description || 'No description'}\n`;
              });
            } else {
              report += `No strategies found for this goal.\n`;
            }
            
            // Add progress analysis
            report += `\nProgress Analysis:\n`;
            if (assessments.length >= 2) {
              const firstAssessment = assessments[assessments.length - 1]; // Oldest assessment
              const latestAssessment = assessments[0]; // Most recent assessment
              
              if (firstAssessment.score !== null && latestAssessment.score !== null) {
                const scoreDifference = latestAssessment.score - firstAssessment.score;
                const progressPercentage = (scoreDifference / (firstAssessment.score || 1)) * 100;
                
                const firstAssessmentDate = firstAssessment.date 
                  ? new Date(firstAssessment.date).toISOString().split('T')[0] 
                  : (firstAssessment.createdAt 
                    ? new Date(firstAssessment.createdAt).toISOString().split('T')[0] 
                    : 'Unknown');
                
                const latestAssessmentDate = latestAssessment.date 
                  ? new Date(latestAssessment.date).toISOString().split('T')[0] 
                  : (latestAssessment.createdAt 
                    ? new Date(latestAssessment.createdAt).toISOString().split('T')[0] 
                    : 'Unknown');
                
                report += `Initial Score: ${firstAssessment.score} (${firstAssessmentDate})\n`;
                report += `Current Score: ${latestAssessment.score} (${latestAssessmentDate})\n`;
                report += `Change: ${scoreDifference > 0 ? '+' : ''}${scoreDifference} (${progressPercentage.toFixed(1)}%)\n`;
                
                if (progressPercentage > 20) {
                  report += `Status: Significant progress has been made on this goal.\n`;
                } else if (progressPercentage > 0) {
                  report += `Status: Some progress has been made on this goal.\n`;
                } else if (progressPercentage === 0) {
                  report += `Status: No progress has been made on this goal.\n`;
                } else {
                  report += `Status: There has been a regression in this goal.\n`;
                }
              } else {
                report += `Unable to calculate progress due to missing assessment scores.\n`;
              }
            } else {
              report += `Insufficient assessment data to analyze progress.\n`;
            }
            
            return report;
          } catch (error) {
            console.error("Error in generate_goal_progress_report tool:", error);
            return "Error generating goal progress report.";
          }
        }
      }),
      
      // Tool for getting budget information
      new DynamicTool({
        name: "get_budget_info",
        description: "Get budget information for a specific patient, including total funds, spent amount, and remaining amount. Input format: 'patientId,queryType' where queryType is optional (e.g., 'remaining', 'spent', 'categories', etc.)",
        func: async (input: string) => {
          try {
            return await getPatientBudget(input);
          } catch (error) {
            console.error("Error in get_budget_info tool:", error);
            return "Error retrieving budget information.";
          }
        }
      }),
      
      // Tool for getting expiring budgets
      new DynamicTool({
        name: "get_expiring_budgets",
        description: "Get information about budgets that are expiring within a specified timeframe. Input format: 'timeframe' where timeframe is optional (e.g., 'next_month', 'next_3_months', 'next_year'). If no timeframe is specified, defaults to next month.",
        func: async (input: string) => {
          try {
            return await getExpiringBudgets(input);
          } catch (error) {
            console.error("Error in get_expiring_budgets tool:", error);
            return "Error retrieving expiring budgets information.";
          }
        }
      }),
      
      // Tool for getting patient count
      new DynamicTool({
        name: "get_patient_count",
        description: "Get the total number of patients and basic statistics. No input required.",
        func: async (_input: string) => {
          try {
            return await getPatientCount();
          } catch (error) {
            console.error("Error in get_patient_count tool:", error);
            return "Error retrieving patient count.";
          }
        }
      }),
      
      // Tool for getting filtered patient count
      new DynamicTool({
        name: "get_filtered_patient_count",
        description: "Get patient count filtered by a specific condition. Input format: 'filter' where filter can be 'active', 'inactive', 'new', 'with goals', or 'with budget'.",
        func: async (input: string) => {
          try {
            return await getFilteredPatientCount(input);
          } catch (error) {
            console.error("Error in get_filtered_patient_count tool:", error);
            return "Error retrieving filtered patient count.";
          }
        }
      }),
      
      // Flexible query builder tool for complex database queries
      new DynamicTool({
        name: "flexible_query_builder",
        description: "Build and execute complex database queries based on natural language descriptions",
        func: async (input: string) => {
          try {
            return await flexibleQueryBuilder(input);
          } catch (error) {
            console.error("Error in flexible_query_builder tool:", error);
            return "Error executing database query.";
          }
        }
      })
    ];
    
    // Create the ReAct agent
    const reactAgent = ZeroShotAgent.fromLLMAndTools(
      this.llm,
      tools,
      {
        prefix: `You are an AI assistant helping clinicians query patient data. You have access to these tools:

1. get_patient_info: Get information about a specific patient by ID or name
2. find_patients_by_name: Find patients whose names match a search term (e.g., 'Radwan')
3. get_caregiver_info: Get information about a patient's caregivers
4. get_patient_goals: Get a patient's goals and progress
5. get_patient_sessions: Get a patient's session history and notes
6. get_patient_budget: Get a patient's budget information
7. get_patient_strategies: Get strategies used with a patient and their effectiveness
8. get_expiring_budgets: Get a list of patients with budgets expiring soon
9. get_patient_count: Get the total number of patients or filtered by criteria
10. flexible_query_builder: Build and execute a custom database query (advanced)

IMPORTANT GUIDELINES:
- For questions about finding patients by name, ALWAYS use the find_patients_by_name tool first
- For questions about a specific patient, use get_patient_info
- For questions about patient goals, use get_patient_goals
- For questions about patient sessions, use get_patient_sessions
- For questions about patient budgets, use get_patient_budget
- For questions about patient strategies, use get_patient_strategies
- Only use flexible_query_builder for complex queries that can't be handled by the specialized tools

You can solve tasks step-by-step by using multiple tools in sequence. For example, first get patient information, then get their goals, and finally generate a progress summary.`,
        suffix: `Begin! Remember to use the most appropriate tools to provide accurate information.

Question: {input}
{agent_scratchpad}`,
        inputVariables: ["input", "agent_scratchpad"]
      }
    );
    
    // Create the agent executor with error handling
    this.agent = new AgentExecutor({
      agent: reactAgent,
      tools: tools,
      verbose: true,
      handleParsingErrors: true,
      maxIterations: 15, // Increased from 8 to 15 to allow for more complex queries
      returnIntermediateSteps: true
    });
  }
}

// Export an instance of the service
export const reactAgentService = new ReactAgentService();

// Helper function to get patient data by identifier
async function getPatientData(patientIdentifier: string): Promise<{ patientId: number | null, patientName: string | null, patientData: any | null }> {
  let patientId: number | null = null;
  let patientName: string | null = null;
  let patientData: any | null = null;
  
  // Try to find by ID first if it's a number
  if (!isNaN(Number(patientIdentifier))) {
    patientId = Number(patientIdentifier);
    const result = await db.select().from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)
      .execute();
    
    if (result.length > 0) {
      patientData = result[0];
      patientName = patientData.name;
      return { patientId, patientName, patientData };
    }
  }
  
  // Try to find by full name match
  const patientsByExactName = await db.select().from(patients)
    .where(eq(patients.name, patientIdentifier))
    .limit(1)
    .execute();
  
  if (patientsByExactName.length > 0) {
    patientData = patientsByExactName[0];
    patientId = patientData.id;
    patientName = patientData.name;
    return { patientId, patientName, patientData };
  }
  
  // Try partial name match
  const patientsByPartialName = await db.select().from(patients)
    .where(like(patients.name, `%${patientIdentifier}%`))
    .limit(1)
    .execute();
  
  if (patientsByPartialName.length > 0) {
    patientData = patientsByPartialName[0];
    patientId = patientData.id;
    patientName = patientData.name;
    return { patientId, patientName, patientData };
  }
  
  // Try matching hyphenated identifier (e.g., "Radwan-765193")
  const parts = patientIdentifier.split('-');
  if (parts.length > 1 && !isNaN(Number(parts[parts.length - 1]))) {
    const numericId = Number(parts[parts.length - 1]);
    const namePrefix = parts.slice(0, -1).join('-');
    
    // Try to match both name prefix and ID
    const patientsByIdAndNamePrefix = await db.select().from(patients)
      .where(and(
        like(patients.name, `${namePrefix}%`),
        eq(patients.id, numericId)
      ))
      .limit(1)
      .execute();
    
    if (patientsByIdAndNamePrefix.length > 0) {
      patientData = patientsByIdAndNamePrefix[0];
      patientId = patientData.id;
      patientName = patientData.name;
      return { patientId, patientName, patientData };
    }
    
    // Try just the numeric part as ID
    const patientsByNumericId = await db.select().from(patients)
      .where(eq(patients.id, numericId))
      .limit(1)
      .execute();
    
    if (patientsByNumericId.length > 0) {
      patientData = patientsByNumericId[0];
      patientId = patientData.id;
      patientName = patientData.name;
      return { patientId, patientName, patientData };
    }
    
    // Try to match by uniqueIdentifier field
    const patientsByUniqueId = await db.select().from(patients)
      .where(eq(patients.uniqueIdentifier, parts[parts.length - 1]))
      .limit(1)
      .execute();
    
    if (patientsByUniqueId.length > 0) {
      patientData = patientsByUniqueId[0];
      patientId = patientData.id;
      patientName = patientData.name;
      return { patientId, patientName, patientData };
    }
  }
  
  return { patientId: null, patientName: null, patientData: null };
}
