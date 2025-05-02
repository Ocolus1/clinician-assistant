/**
 * Query Classification Service
 * 
 * This service determines whether a user query requires database access
 * or can be handled directly without accessing patient data.
 */

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define the schema for query classification
const queryClassificationSchema = z.object({
  queryType: z.enum([
    "CONVERSATIONAL", // General chat, greetings, etc.
    "INFORMATIONAL",  // General medical or clinical questions not requiring patient data
    "PATIENT_SPECIFIC" // Requires access to patient data
  ]).describe("The type of query being asked"),
  requiresDatabase: z.boolean().describe("Whether this query requires database access"),
  patientRelated: z.boolean().describe("Whether this query is related to a specific patient"),
  confidence: z.number().min(0).max(1).describe("Confidence score for this classification")
});

// Type for query classification
type QueryClassification = z.infer<typeof queryClassificationSchema>;

/**
 * Service to classify user queries and determine if they require database access
 */
export class QueryClassificationService {
  private model: ChatOpenAI;
  private classificationChain: RunnableSequence;
  
  // Patterns that indicate conversational queries
  private conversationalPatterns = [
    /^hello\b/i,
    /^hi\b/i,
    /^hey\b/i,
    /^good (morning|afternoon|evening)\b/i,
    /^how are you\b/i,
    /^what's up\b/i,
    /^thanks\b/i,
    /^thank you\b/i,
    /^goodbye\b/i,
    /^bye\b/i
  ];
  
  // Patterns that indicate patient-specific queries
  private patientSpecificPatterns = [
    /patient/i,
    /\b\d{6}\b/, // 6-digit patient identifier
    /find .+/i,
    /search .+/i,
    /look up .+/i,
    /show me .+/i,
    /progress/i,
    /goal/i,
    /session/i,
    /budget/i,
    /caregiver/i,
    /clinician/i
  ];
  
  constructor() {
    // Initialize the OpenAI model
    this.model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    // Create a prompt template for query classification
    const classificationPrompt = PromptTemplate.fromTemplate(`
      You are a query classifier for a clinical chatbot.
      Classify the following query:
      
      Query: {query}
      
      Determine if this query:
      1. Is conversational (general chat, greetings)
      2. Is informational (general medical questions not requiring patient data)
      3. Is patient-specific (requires access to patient data)
      
      Also determine if database access is required.
    `);
    
    // Create a chain for classification using function calling
    this.classificationChain = RunnableSequence.from([
      classificationPrompt,
      this.model.bind({
        functions: [
          {
            name: "classify_query",
            description: "Classify a user query",
            parameters: zodToJsonSchema(queryClassificationSchema),
          },
        ],
        function_call: { name: "classify_query" },
      }),
      // Parse the function output
      (response) => {
        const functionCall = response.additional_kwargs.function_call;
        if (!functionCall) {
          return {
            queryType: "CONVERSATIONAL",
            requiresDatabase: false,
            patientRelated: false,
            confidence: 1.0
          };
        }
        try {
          return JSON.parse(functionCall.arguments);
        } catch (e) {
          console.error("Error parsing function arguments:", e);
          return {
            queryType: "CONVERSATIONAL",
            requiresDatabase: false,
            patientRelated: false,
            confidence: 1.0
          };
        }
      },
    ]);
  }
  
  /**
   * Fast classification using regex patterns
   * This is a quick first pass to avoid unnecessary AI calls for obvious cases
   * 
   * @param query - The user query to classify
   * @returns Classification result or null if can't determine confidently
   */
  private fastClassify(query: string): QueryClassification | null {
    // Check for conversational patterns first (most efficient)
    for (const pattern of this.conversationalPatterns) {
      if (pattern.test(query)) {
        return {
          queryType: "CONVERSATIONAL",
          requiresDatabase: false,
          patientRelated: false,
          confidence: 0.95
        };
      }
    }
    
    // Check for patient-specific patterns
    for (const pattern of this.patientSpecificPatterns) {
      if (pattern.test(query)) {
        return {
          queryType: "PATIENT_SPECIFIC",
          requiresDatabase: true,
          patientRelated: true,
          confidence: 0.9
        };
      }
    }
    
    // If we can't determine confidently, return null to use AI classification
    return null;
  }
  
  /**
   * Classify a user query to determine if it requires database access
   * 
   * @param query - The user query to classify
   * @returns Classification result
   */
  async classifyQuery(query: string): Promise<QueryClassification> {
    try {
      // Try fast classification first
      const fastResult = this.fastClassify(query);
      if (fastResult) {
        return fastResult;
      }
      
      // Fall back to AI classification for more complex queries
      const result = await this.classificationChain.invoke({
        query,
      });
      
      return result as QueryClassification;
    } catch (error) {
      console.error("Error classifying query:", error);
      // Default to conversational if there's an error
      return {
        queryType: "CONVERSATIONAL",
        requiresDatabase: false,
        patientRelated: false,
        confidence: 0.5
      };
    }
  }
}

// Export a singleton instance of the service
export const queryClassificationService = new QueryClassificationService();
