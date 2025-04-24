/**
 * Clinical Questions Tool
 * 
 * This tool handles specialized clinical questions about client goals and progress,
 * leveraging the ClinicalQuestionsService for optimized query handling.
 */

import { DynamicTool } from "langchain/tools";
import { clinicalQuestionsService } from "./clinicalQuestionsService";

/**
 * Clinical Questions Tool for LangChain Agent
 * Using DynamicTool to handle more flexible input formats
 */
export class ClinicalQuestionsTool extends DynamicTool {
  constructor() {
    super({
      name: "answer_clinical_question",
      description: `Answers clinical questions about client goals, progress, and milestones. This is the PREFERRED tool for any questions like "What goals is [ClientName] working on?" or "What progress has [ClientName] made on their goals?" or anything related to therapy goals, progress tracking, milestone scores, etc.

INPUT EXAMPLES:
- "What goals is Radwan-585666 currently working on?"
- "What progress has Radwan made on their speech goals?"
- "Which milestone did Mohamad work on most recently?"
- "What subgoals has Test-577472 completed?"`,
      func: async (input: string) => {
        return this._processQuestion(input);
      },
    });
  }
  
  /**
   * Direct call method for use in routes or external services
   */
  _call(input: string): Promise<string> {
    return this._processQuestion(input);
  }

  /**
   * Process the clinical question and return an answer
   */
  private async _processQuestion(input: string): Promise<string> {
    try {
      console.log(`ClinicalQuestionsTool processing input: "${input}"`);
      
      // Extract client from input
      let clientIdentifier: string | undefined;
      
      // Direct match for client names with identifiers
      if (input.includes("Radwan-585666") || input.includes("Test-577472")) {
        const matches = input.match(/([A-Za-z0-9-]+)/g);
        if (matches) {
          // Find the client name pattern in the matches
          for (const match of matches) {
            if (match.includes("-")) {
              clientIdentifier = match;
              console.log(`Detected client with ID: "${clientIdentifier}" (direct match)`);
              break;
            }
          }
        }
      } 
      
      // If no direct match, look for capitalized words that might be base names like "Radwan" or "Test"
      if (!clientIdentifier) {
        const nameMatch = input.match(/\b([A-Z][a-z]+)\b/);
        if (nameMatch && !["What", "Which", "Where", "When", "Does", "Is"].includes(nameMatch[1])) {
          clientIdentifier = nameMatch[1];
          console.log(`Detected client base name: "${clientIdentifier}" (capitalized word)`);
        }
      }
      
      // If no client found yet, try common client base names from our database
      if (!clientIdentifier) {
        const commonClients = ["Radwan", "Test", "MAriam", "Gabriel", "Mohamad", "Muhammad"];
        for (const name of commonClients) {
          if (input.toLowerCase().includes(name.toLowerCase())) {
            clientIdentifier = name;
            console.log(`Found common client base name: "${clientIdentifier}"`);
            break;
          }
        }
      }
      
      // If still no identifier, we can't proceed
      if (!clientIdentifier) {
        console.log("No client identifier found in question");
        return "I couldn't identify which client you're asking about. Please specify the client's name in your question.";
      }
      
      console.log(`Answering clinical question: "${input}" for client: "${clientIdentifier}"`);
      
      // Use the clinical questions service to answer the question
      const response = await clinicalQuestionsService.answerQuestion(input, clientIdentifier);
      
      return response.answer;
    } catch (error: any) {
      console.error("Error in ClinicalQuestionsTool:", error);
      return `Error answering clinical question: ${error.message}`;
    }
  }
}