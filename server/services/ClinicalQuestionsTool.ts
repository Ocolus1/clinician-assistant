/**
 * Clinical Questions Tool
 * 
 * This tool handles specialized clinical questions about client goals and progress,
 * leveraging the ClinicalQuestionsService for optimized query handling.
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { clinicalQuestionsService } from "./clinicalQuestionsService";

/**
 * Clinical Questions Tool for LangChain Agent
 */
export class ClinicalQuestionsTool extends StructuredTool {
  name = "answer_clinical_question";
  description = "Provides answers to clinical questions about client goals, progress, and milestones. Use for questions about specific client's therapy goals, milestone scores, progress tracking, etc.";
  schema = z.object({
    question: z.string().describe("The clinical question to answer, for example 'What goals is John working on?' or 'Has Maria made progress on her communication goal?'"),
    clientIdentifier: z.string().describe("The client's name, ID or other identifier. Provide the most specific identifier possible to ensure accurate results.")
  });
  
  async _call(input: any): Promise<string> {
    try {
      // Check if we've received the expected input format
      if (!input.question) {
        throw new Error("Question is required for the clinical questions tool");
      }
      
      // Extract client identifier from the question if not provided
      let clientIdentifier = input.clientIdentifier;
      if (!clientIdentifier) {
        // Extract client name from the question
        const questionLower = input.question.toLowerCase();
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
          const words = input.question.split(' ');
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
      }
      
      console.log(`Answering clinical question: "${input.question}" for client: "${clientIdentifier}"`);
      
      // Use the clinical questions service to answer the question
      const response = await clinicalQuestionsService.answerQuestion(input.question, clientIdentifier);
      
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