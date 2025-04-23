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
  
  async _call(input: { question: string, clientIdentifier: string }): Promise<string> {
    try {
      console.log(`Answering clinical question: "${input.question}" for client: "${input.clientIdentifier}"`);
      
      // Use the clinical questions service to answer the question
      const response = await clinicalQuestionsService.answerQuestion(input.question, input.clientIdentifier);
      
      if (response.confidence < 0.5) {
        // If the clinical questions service has low confidence, suggest using the database query tool
        return `I'm not completely confident in my answer to that specific clinical question. \n\nHere's what I can tell you: ${response.answer}\n\nFor more precise information, you might want to try a database query.`;
      }
      
      return response.answer;
    } catch (error: any) {
      return `Error answering clinical question: ${error.message}`;
    }
  }
}