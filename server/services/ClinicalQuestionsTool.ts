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
      
      // Extract client identifier from the question
      const questionLower = question.toLowerCase();
      const possibleNames = [
        "Olivia", "Leo", "Sofia", "Noah", "Emma", "Liam", 
        "Ava", "Ethan", "Mia", "Lucas"
      ];
      
      for (const name of possibleNames) {
        if (questionLower.includes(name.toLowerCase())) {
          clientIdentifier = name;
          break;
        }
      }
      
      // If still not found, use a default approach to extract names
      if (!clientIdentifier) {
        // Look for names that are likely to be capitalized words
        const words = question.split(' ');
        for (const word of words) {
          // If it starts with capital letter and is not at the beginning of a sentence
          if (word.length > 1 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
            clientIdentifier = word;
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