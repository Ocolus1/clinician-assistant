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
      
      // Direct match for client names with identifiers (format: Name-123456)
      const clientWithId = input.match(/([A-Za-z]+)-([0-9]+)/);
      if (clientWithId && clientWithId[0]) {
        clientIdentifier = clientWithId[0];
        console.log(`Detected client with ID pattern: "${clientIdentifier}"`);
      }
      
      // If no direct identifier match, look for capitalized client names
      if (!clientIdentifier) {
        // First try multi-word names (like "Leo Smith")
        const fullNameMatch = input.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/);
        if (fullNameMatch && fullNameMatch[1]) {
          clientIdentifier = fullNameMatch[1];
          console.log(`Detected potential full name: "${clientIdentifier}"`);
        } else {
          // Then try single capitalized words that might be names
          const nameMatch = input.match(/\b([A-Z][a-z]+)\b/);
          if (nameMatch && !["What", "Which", "Where", "When", "Does", "Is", "Has", "Can", "Will", "How"].includes(nameMatch[1])) {
            clientIdentifier = nameMatch[1];
            console.log(`Detected potential client name: "${clientIdentifier}" (capitalized word)`);
          }
        }
      }
      
      // If still no match, try known client names from our database
      if (!clientIdentifier) {
        // Include all known common client base names
        const commonClients = ["Radwan", "Test", "MAriam", "Mariam", "Gabriel", "Mohamad", "Muhammad", "Leo", "Olivia"];
        
        // Special handling for known client names with priority for exact matches
        for (const name of commonClients) {
          const regex = new RegExp(`\\b${name}\\b`, 'i');
          if (regex.test(input)) {
            clientIdentifier = name;
            console.log(`Found exact match for known client name: "${clientIdentifier}"`);
            break;
          }
        }
        
        // If no exact match found, try substring matches
        if (!clientIdentifier) {
          for (const name of commonClients) {
            if (input.toLowerCase().includes(name.toLowerCase())) {
              clientIdentifier = name;
              console.log(`Found known client name as substring: "${clientIdentifier}"`);
              break;
            }
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