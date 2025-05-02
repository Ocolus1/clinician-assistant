import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { patientQueriesService } from "./patientQueriesService";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define the schema for extracted entities
const patientEntitySchema = z.object({
  patientName: z.string().optional().describe("The full name of the patient mentioned in the query"),
  patientId: z.number().optional().describe("The ID of the patient if directly referenced"),
  patientIdentifier: z.string().optional().describe("A unique identifier for the patient (e.g., 6-digit code)"),
  date: z.string().optional().describe("Any date mentioned in the query (ISO format if possible)"),
  dateRange: z.object({
    start: z.string().optional().describe("Start date of a range (ISO format if possible)"),
    end: z.string().optional().describe("End date of a range (ISO format if possible)"),
  }).optional().describe("Date range if mentioned"),
  goalKeyword: z.string().optional().describe("Keywords related to patient goals"),
  metricType: z.string().optional().describe("Type of metric mentioned (e.g., 'anxiety level', 'mood score')"),
  metricValue: z.string().optional().describe("Value of the metric if mentioned"),
  queryType: z.enum([
    "PATIENT_INFO",
    "PATIENT_GOALS",
    "GOAL_PROGRESS",
    "SESSION_INFO",
    "BUDGET_INFO",
    "CAREGIVER_INFO",
    "CLINICIAN_INFO",
    "PATIENT_COUNT",
    "GENERAL_QUESTION",
    "UNKNOWN"
  ]).describe("The type of query being asked"),
  timeframe: z.enum([
    "PAST",
    "PRESENT",
    "FUTURE",
    "ALL_TIME",
    "UNKNOWN"
  ]).optional().describe("The timeframe of the query"),
  specificRequest: z.string().optional().describe("Any specific request or action mentioned in the query"),
});

// Type for extracted entities
type PatientEntity = z.infer<typeof patientEntitySchema>;

/**
 * EntityExtractionService
 * 
 * Extracts entities from natural language queries about patients.
 * Uses LangChain and OpenAI to identify patient names, dates, metrics, and query types.
 */
export class EntityExtractionService {
  private model: ChatOpenAI;
  private extractionChain: RunnableSequence;
  
  constructor() {
    // Initialize the OpenAI model
    this.model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    // Create a prompt template for entity extraction
    const extractionPrompt = PromptTemplate.fromTemplate(`
      You are an entity extraction system for a clinical chatbot.
      Extract entities from the following query about patients:
      
      Query: {query}
      
      Extract the following entities if present:
      - Patient name
      - Patient ID (if directly referenced)
      - Patient identifier (any unique code like a 6-digit number)
      - Dates or date ranges
      - Goal-related keywords
      - Metrics (type and value)
      - Query type (what kind of information is being requested)
      - Timeframe (past, present, future)
      - Specific requests
      
      Only extract entities that are explicitly mentioned or clearly implied.
      For patient identifiers, look for patterns like "#123456" or "patient 123456" or just a 6-digit number.
    `);
    
    // Create a chain for entity extraction using function calling
    this.extractionChain = RunnableSequence.from([
      extractionPrompt,
      this.model.bind({
        functions: [
          {
            name: "extract_entities",
            description: "Extract entities from a patient query",
            parameters: zodToJsonSchema(patientEntitySchema),
          },
        ],
        function_call: { name: "extract_entities" },
      }),
      // Parse the function output directly
      (response) => {
        const functionCall = response.additional_kwargs.function_call;
        if (!functionCall) {
          return { queryType: "UNKNOWN" };
        }
        try {
          return JSON.parse(functionCall.arguments);
        } catch (e) {
          console.error("Error parsing function arguments:", e);
          return { queryType: "UNKNOWN" };
        }
      },
    ]);
  }
  
  /**
   * Extract entities from a natural language query
   * 
   * @param query - The natural language query to extract entities from
   * @returns Extracted entities including patient name, dates, metrics, etc.
   */
  async extractEntities(query: string): Promise<PatientEntity> {
    try {
      // Check for common identifier patterns before sending to AI
      const identifierPatterns = [
        /(?:patient|#)\s*(\d{6})\b/i,         // patient 123456 or #123456
        /\b(\d{6})\b/,                        // standalone 123456
        /patient[-\s](\d{6})\b/i,             // patient-123456
        /(\w+\s+\w+)[-\s](\d{6})\b/i          // Radwan Smith-404924
      ];
      
      // Try to find an identifier match
      let identifierMatch = null;
      let nameMatch = null;
      
      for (const pattern of identifierPatterns) {
        const match = query.match(pattern);
        if (match) {
          if (pattern.toString().includes('\\w+\\s+\\w+') && match[2]) {
            // This is a name-identifier pattern like "Radwan Smith-404924"
            nameMatch = match[1];
            identifierMatch = match[2];
            break;
          } else if (match[1]) {
            // This is a regular identifier pattern
            identifierMatch = match[1];
            break;
          }
        }
      }
      
      const result = await this.extractionChain.invoke({
        query,
      });
      
      // If we found an identifier pattern but the AI didn't extract it, add it manually
      if (identifierMatch && !result.patientIdentifier) {
        result.patientIdentifier = identifierMatch;
      }
      
      // If we found a name pattern but the AI didn't extract it, add it manually
      if (nameMatch && !result.patientName) {
        result.patientName = nameMatch;
      }
      
      return result as PatientEntity;
    } catch (error) {
      console.error("Error extracting entities:", error);
      // Return a default entity with UNKNOWN query type
      return {
        queryType: "UNKNOWN",
      };
    }
  }
  
  /**
   * Resolve a patient name or identifier to a patient ID
   * 
   * @param entity - The entity containing patient name or identifier
   * @returns The patient ID if found, null otherwise
   */
  async resolvePatient(entity: PatientEntity): Promise<number | null> {
    try {
      // Try to resolve by identifier first if available
      if (entity.patientIdentifier) {
        const patientsByIdentifier = await patientQueriesService.findPatientsByName(entity.patientIdentifier, 1);
        if (patientsByIdentifier.length > 0) {
          return patientsByIdentifier[0].id;
        }
      }
      
      // Then try by name if available
      if (entity.patientName) {
        const patientsByName = await patientQueriesService.findPatientsByName(entity.patientName, 1);
        if (patientsByName.length > 0) {
          return patientsByName[0].id;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error resolving patient:", error);
      return null;
    }
  }
  
  /**
   * Process a query to extract entities and resolve patient IDs
   * 
   * @param query - The natural language query to process
   * @returns Processed entities with resolved patient ID
   */
  async processQuery(query: string): Promise<PatientEntity> {
    try {
      // Extract entities from the query
      const entities = await this.extractEntities(query);
      
      // If a patient name or identifier was extracted, resolve it to a patient ID
      if ((entities.patientName || entities.patientIdentifier) && !entities.patientId) {
        const patientId = await this.resolvePatient(entities);
        if (patientId) {
          entities.patientId = patientId;
        }
      }
      
      return entities;
    } catch (error) {
      console.error("Error processing query:", error);
      return {
        queryType: "UNKNOWN",
      };
    }
  }
}

// Export a singleton instance of the service
export const entityExtractionService = new EntityExtractionService();
