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
import { flexibleQueryBuilder } from './tools/queryBuilderTool';

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
   * Initialize the ReAct agent with tools for querying patient data
   */
  private async initializeAgent() {
    // Define tools for the agent
    const tools = [
      // Patient information tool
      new DynamicTool({
        name: "get_patient_info",
        description: "Get information about a patient by name or ID",
        func: async (input: string) => {
          try {
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
            
            return `No patient found matching "${patientIdentifier}".`;
          } catch (error) {
            console.error("Error getting patient info:", error);
            return "Error retrieving patient information.";
          }
        }
      }),
      
      // Flexible query builder tool
      new DynamicTool({
        name: "flexible_query_builder",
        description: "Build and execute a flexible database query with optional joins. Use this when you need to query data that doesn't fit into the specialized tools. Format: 'tableName,fields,conditions,limit,joinTable,joinCondition'. Fields should be pipe-separated (e.g., 'id|name|status'). Conditions should use operators (=, >, <, LIKE, IN). Limit is the maximum number of results to return. JoinTable and joinCondition are optional for joining related tables.",
        func: flexibleQueryBuilder
      })
    ];
    
    // Create the agent using ZeroShotAgent
    const reactAgent = ZeroShotAgent.fromLLMAndTools(
      this.llm,
      tools,
      {
        prefix: `You are a helpful assistant for clinicians. You can answer questions about patients, caregivers, goals, strategies, sessions, reports, and budgets.
You have access to several tools to help you answer questions about patient care and practice management.

TOOL SELECTION GUIDE:
1. For BASIC PATIENT INFO questions:
   - Use get_patient_info for basic patient details

2. For DATABASE QUERIES that don't fit other tools:
   - Use flexible_query_builder in these situations:
     a) When specialized tools fail or don't return expected results
     b) When you need to join data from multiple tables
     c) When you need to filter data in ways not supported by specialized tools
     d) When you need raw data to analyze or summarize yourself

FLEXIBLE QUERY BUILDER EXAMPLES:
- Find all patients with pending onboarding: 'patients,id|name|onboardingStatus,onboardingStatus=pending,5'
- Find goals for a specific patient: 'goals,id|title|status,patientId=5,10'
- Join goals with subgoals: 'goals,id|title|status,patientId=5,10,subgoals,goalId=id'
- Find recent sessions: 'sessions,id|sessionDate|duration,sessionDate>2025-04-01,10'
- Find budget items: 'budgetItems,id|amount|description,patientId=5,10'

IMPORTANT: You MUST use the exact format specified below for your responses.
Always follow this format:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [${tools.map(t => t.name).join(',')}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question`,
        suffix: `Begin! Remember to use tools if necessary to provide accurate information.

Question: {input}
{agent_scratchpad}`,
        inputVariables: ["input", "agent_scratchpad"]
      }
    );
    
    // Create the agent executor
    this.agent = new AgentExecutor({
      agent: reactAgent,
      tools: tools,
      verbose: true,
      handleParsingErrors: true,
      maxIterations: 8,
      returnIntermediateSteps: true
    });
  }
}

// Export an instance of the service
export const reactAgentService = new ReactAgentService();
