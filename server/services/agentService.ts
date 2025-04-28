import { ChatOpenAI } from "@langchain/openai";
import { Tool } from "@langchain/core/tools";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { db } from "../db";
import { 
  patients, 
  goals, 
  subgoals, 
  sessions, 
  sessionNotes, 
  goalAssessments, 
  strategies, 
  clinicians,
  patientClinicians,
  caregivers
} from "../../shared/schema";
import { eq, like, and, or } from "drizzle-orm";
import { generateSqlFromQuestion } from "./llmService";

// Create a schema representation for the LLM
const schemaDescription = `
Database Tables:
- patients: Contains patient information (id, name, dateOfBirth, gender, etc.)
- goals: Contains patient goals (id, patientId, title, description, importanceLevel, status)
- subgoals: Contains subgoals for each goal (id, goalId, title, description, status, completionDate)
- sessions: Contains therapy session information (id, patientId, therapistId, title, description, sessionDate, duration, status)
- sessionNotes: Contains notes from therapy sessions (id, sessionId, patientId, presentCaregivers, moodRating, notes)
- goalAssessments: Contains assessments of goals (id, sessionNoteId, goalId, subgoalId, achievementLevel, score, notes)
- strategies: Contains therapy strategies (id, name, category, description, effectiveness)
- clinicians: Contains clinician information (id, name, title, email, specialization)
- patientClinicians: Maps patients to clinicians (id, patientId, clinicianId, role)
- caregivers: Contains information about patient caregivers (id, patientId, name, relationship, email)

Common Relationships:
- patients have many goals
- goals have many subgoals
- patients have many sessions
- sessions have one sessionNote
- sessionNotes have many goalAssessments
- patients have many clinicians through patientClinicians
- patients have many caregivers
`;

// Create tools for the agent
const tools: Tool[] = [
  new Tool({
    name: "search_patients",
    description: "Search for patients by name",
    func: async (query: string) => {
      try {
        const results = await db
          .select()
          .from(patients)
          .where(like(patients.name, `%${query}%`))
          .limit(10);
        return JSON.stringify(results);
      } catch (error) {
        console.error("Error searching patients:", error);
        return "Error searching patients";
      }
    },
  }),
  new Tool({
    name: "get_patient_goals",
    description: "Get goals for a patient by patient ID",
    func: async (patientId: string) => {
      try {
        const results = await db
          .select()
          .from(goals)
          .where(eq(goals.patientId, parseInt(patientId)))
          .orderBy(goals.importanceLevel);
        return JSON.stringify(results);
      } catch (error) {
        console.error("Error getting patient goals:", error);
        return "Error getting patient goals";
      }
    },
  }),
  new Tool({
    name: "get_goal_subgoals",
    description: "Get subgoals for a goal by goal ID",
    func: async (goalId: string) => {
      try {
        const results = await db
          .select()
          .from(subgoals)
          .where(eq(subgoals.goalId, parseInt(goalId)));
        return JSON.stringify(results);
      } catch (error) {
        console.error("Error getting goal subgoals:", error);
        return "Error getting goal subgoals";
      }
    },
  }),
  new Tool({
    name: "get_patient_sessions",
    description: "Get therapy sessions for a patient by patient ID",
    func: async (patientId: string) => {
      try {
        const results = await db
          .select()
          .from(sessions)
          .where(eq(sessions.patientId, parseInt(patientId)))
          .orderBy(sessions.sessionDate);
        return JSON.stringify(results);
      } catch (error) {
        console.error("Error getting patient sessions:", error);
        return "Error getting patient sessions";
      }
    },
  }),
  new Tool({
    name: "get_session_notes",
    description: "Get notes for a therapy session by session ID",
    func: async (sessionId: string) => {
      try {
        const results = await db
          .select()
          .from(sessionNotes)
          .where(eq(sessionNotes.sessionId, parseInt(sessionId)));
        return JSON.stringify(results);
      } catch (error) {
        console.error("Error getting session notes:", error);
        return "Error getting session notes";
      }
    },
  }),
  new Tool({
    name: "get_goal_assessments",
    description: "Get goal assessments for a session note by session note ID",
    func: async (sessionNoteId: string) => {
      try {
        const results = await db
          .select()
          .from(goalAssessments)
          .where(eq(goalAssessments.sessionNoteId, parseInt(sessionNoteId)));
        return JSON.stringify(results);
      } catch (error) {
        console.error("Error getting goal assessments:", error);
        return "Error getting goal assessments";
      }
    },
  }),
  new Tool({
    name: "execute_sql_query",
    description: "Execute a SQL query to retrieve data from the database",
    func: async (query: string) => {
      try {
        // First, generate a safe SQL query using the LLM
        const safeQuery = await generateSqlFromQuestion(schemaDescription, query);
        
        // Execute the query
        const results = await db.execute(safeQuery);
        return JSON.stringify(results);
      } catch (error) {
        console.error("Error executing SQL query:", error);
        return "Error executing SQL query";
      }
    },
  }),
];

export class AgentService {
  private model: ChatOpenAI;
  
  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.2,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  // Process a query using the agent
  async processQuery(query: string): Promise<string> {
    try {
      // Create a prompt for query processing
      const promptTemplate = PromptTemplate.fromTemplate(`
        You are a helpful assistant for clinicians, with access to a patient database.
        You can help answer questions about patients, their goals, therapy sessions, and progress.
        Always respond in a natural, conversational tone that is empathetic and professional.
        
        Question: {query}
        
        Provide a comprehensive and helpful response based on your knowledge.
      `);
      
      // Create a chain for query processing
      const queryChain = RunnableSequence.from([
        promptTemplate,
        this.model,
        new StringOutputParser(),
      ]);
      
      // Process the query
      const result = await queryChain.invoke({
        query,
      });
      
      return result;
    } catch (error) {
      console.error("Error processing query with agent:", error);
      return "I'm sorry, I encountered an error while processing your request. Please try again.";
    }
  }
}

// Export an instance of the agent service
export const agentService = new AgentService();
