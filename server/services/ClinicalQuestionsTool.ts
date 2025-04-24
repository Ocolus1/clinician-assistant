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
      description: "Provides answers to clinical questions about client goals, progress, and milestones. Use for questions about specific client's therapy goals, milestone scores, progress tracking, etc.",
      func: async (input: string) => {
        return this.processQuestion(input);
      },
    });
  }
  
  /**
   * Process the clinical question and return an answer
   */
  private async processQuestion(input: string): Promise<string> {
    try {
      const question = input;
      let clientIdentifier: string | undefined;
      
      // Extract client identifier from the question, looking for name patterns like "Radwan-585666"
      // Match patterns like "Name-123456" or just "Name" or just capitalized words that might be names
      const nameIdRegex = /\b([A-Z][a-z]+)(?:-(\d+))?\b/g;
      const matches = Array.from(question.matchAll(nameIdRegex));
      
      if (matches.length > 0) {
        // Use the first found name or name-id combo
        const match = matches[0];
        // If we have both name and ID (like "Radwan-585666"), use the full match
        if (match[2]) {
          clientIdentifier = match[0]; // Full match like "Radwan-585666"
        } else {
          clientIdentifier = match[1]; // Just the name part like "Radwan"
        }
      }
      
      // If still not found, look for any word that might be a name or identifier
      if (!clientIdentifier) {
        // Look for words that are likely to be names or identifiers
        const words = question.split(/\s+/);
        for (const word of words) {
          // Remove any punctuation that might be attached to the word
          const cleaned = word.replace(/['",.?!]/g, '');
          
          // Check for hyphenated format (name-number)
          if (/^[A-Za-z]+-\d+$/.test(cleaned)) {
            clientIdentifier = cleaned;
            break;
          }
          
          // If it's capitalized and not at sentence start
          if (cleaned.length > 1 && /^[A-Z]/.test(cleaned) && !/^(What|Where|When|Why|How|Is|Are|Can|Do|Does|Did|Has|Have|Will)$/i.test(cleaned)) {
            clientIdentifier = cleaned;
            break;
          }
        }
      }
      
      // If still no identifier, we can't proceed
      if (!clientIdentifier) {
        return "I couldn't identify which client you're asking about. Please specify the client's name in your question.";
      }
      
      console.log(`Answering clinical question: "${question}" for client: "${clientIdentifier}"`);
      
      // Use the clinical questions service to answer the question
      const response = await clinicalQuestionsService.answerQuestion(question, clientIdentifier);
      
      if (response.confidence < 0.5) {
        // If the clinical questions service has low confidence, suggest using the database query tool
        return `I'm not completely confident in my answer to that specific clinical question. \n\nHere's what I can tell you: ${response.answer}\n\nFor more precise information, you might want to try a database query.`;
      }
      
      return response.answer;
    } catch (error: any) {
      console.error("Error in ClinicalQuestionsTool:", error);
      return `Error answering clinical question: ${error.message}`;
    }
  }
}