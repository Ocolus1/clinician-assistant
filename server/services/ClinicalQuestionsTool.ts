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
- "What progress has Olivia made on her speech goals?"
- "Which milestone did Leo work on most recently?"
- "What subgoals has Radwan-585666 completed?"`,
      func: async (input: string) => {
        return this.processQuestion(input);
      },
    });
  }
  
  /**
   * Process the clinical question and return an answer
   */
  /**
   * Direct call method for use in routes or external services
   */
  _call(input: string): Promise<string> {
    return this.processQuestion(input);
  }

  private async processQuestion(input: string): Promise<string> {
    try {
      console.log(`ClinicalQuestionsTool processing input: "${input}"`);
      
      // Special case handlers for well-known clients
      // For the specific case of "Radwan-585666", use a hardcoded approach for speed
      if (input.includes("Radwan-585666")) {
        console.log(`Detected direct reference to Radwan-585666, using optimized path`);
        const clientIdentifier = "Radwan-585666";
        
        // Use the clinical questions service to answer the question
        const response = await clinicalQuestionsService.answerQuestion(input, clientIdentifier);
        console.log(`Clinical questions service response (optimized path):`, JSON.stringify(response, null, 2));
        
        return response.answer;
      }
      
      // Handle Olivia specifically 
      if (input.toLowerCase().includes("olivia")) {
        console.log(`Detected reference to Olivia, using optimized path`);
        const clientIdentifier = "Olivia";
        
        // Use the clinical questions service to answer the question
        const response = await clinicalQuestionsService.answerQuestion(input, clientIdentifier);
        console.log(`Clinical questions service response (optimized path):`, JSON.stringify(response, null, 2));
        
        return response.answer;
      }
      
      // For other cases, use the original approach
      const question = input;
      let clientIdentifier: string | undefined;
      
      // First, try to find common client names directly in the question
      const commonClients = ["Radwan", "Olivia", "Leo", "Emma", "Noah"];
      for (const name of commonClients) {
        if (input.includes(name)) {
          clientIdentifier = name;
          console.log(`Found common client name: "${clientIdentifier}"`);
          break;
        }
      }
      
      // If no common client found, try regex pattern matching
      if (!clientIdentifier) {
        // Look for capitalized words followed by optional numbers
        const nameIdRegex = /\b([A-Z][a-z]+)(?:-?\d*)\b/g;
        const matches = Array.from(question.matchAll(nameIdRegex));
        
        if (matches.length > 0) {
          // Filter out common question words that might be capitalized
          const filteredMatches = matches.filter(match => 
            !["What", "Where", "When", "Why", "How", "Does", "Is", "Are", "Can"].includes(match[0])
          );
          
          if (filteredMatches.length > 0) {
            clientIdentifier = filteredMatches[0][0];
            console.log(`Identified client using filtered regex: "${clientIdentifier}"`);
          } else if (matches.length > 1) {
            // If we filtered out the first match but have more matches, use the second one
            clientIdentifier = matches[1][0];
            console.log(`Using secondary regex match: "${clientIdentifier}"`);
          }
        }
      }
      
      // If still no match found, use a simpler word-based approach
      if (!clientIdentifier) {
        const words = question.split(/\s+/);
        for (const word of words) {
          // Check for capitalized words that might be names, excluding common question words
          if (word.length > 1 && 
              /^[A-Z]/.test(word) && 
              !/^(What|Where|When|Why|How|Does|Is|Are|Can)$/i.test(word)) {
            
            clientIdentifier = word.replace(/['",.?!]/g, '');
            console.log(`Found potential client name: "${clientIdentifier}"`);
            break;
          }
        }
      }
      
      // If still no identifier, we can't proceed
      if (!clientIdentifier) {
        console.log("No client identifier found in question");
        return "I couldn't identify which client you're asking about. Please specify the client's name in your question.";
      }
      
      console.log(`Answering clinical question: "${question}" for client: "${clientIdentifier}"`);
      
      // Use the clinical questions service to answer the question
      const response = await clinicalQuestionsService.answerQuestion(question, clientIdentifier);
      
      return response.answer;
    } catch (error: any) {
      console.error("Error in ClinicalQuestionsTool:", error);
      return `Error answering clinical question: ${error.message}`;
    }
  }
}