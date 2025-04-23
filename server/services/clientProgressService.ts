/**
 * Client Progress Service
 * 
 * This service specializes in answering clinical questions about client progress,
 * goals, milestones, and treatment outcomes by leveraging the SQL query generation
 * capabilities and providing structured, clinically relevant responses.
 */

import { sql } from "../db";
import { openaiService } from "./openaiService";
import { sqlQueryGenerationService } from "./sqlQueryGenerationService";
import { ChatMessage } from "./openaiService";

/**
 * Types of clinical questions this service can handle
 */
export enum ClinicalQuestionType {
  CURRENT_GOALS = "current_goals",
  GOAL_PROGRESS = "goal_progress",
  RECENT_SUBGOALS = "recent_subgoals",
  RECENT_MILESTONE = "recent_milestone",
  MILESTONE_SCORE = "milestone_score",
  MILESTONE_IMPROVEMENT = "milestone_improvement",
  COMPLETED_SUBGOALS = "completed_subgoals",
  AVERAGE_MILESTONE_SCORE = "average_milestone_score",
  MOST_PROGRESS_GOAL = "most_progress_goal",
  OUTDATED_GOALS = "outdated_goals"
}

/**
 * Result of processing a clinical question
 */
export interface ClinicalQuestionResult {
  success: boolean;
  answer?: string;
  data?: any;
  error?: string;
  questionType?: ClinicalQuestionType;
  clientName?: string;
  confidence?: number;
}

/**
 * Client Progress Service class
 */
export class ClientProgressService {
  private initialized = false;
  
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    // This service relies on the SQL query generation service and OpenAI service
    // which should already be initialized
    if (!sqlQueryGenerationService.isInitialized()) {
      throw new Error('SQL Query Generation Service must be initialized before Client Progress Service');
    }
    
    if (!openaiService.isConfigured()) {
      throw new Error('OpenAI Service must be initialized before Client Progress Service');
    }
    
    this.initialized = true;
    console.log('Client Progress Service initialized');
  }
  
  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Process a clinical question about a client's progress
   */
  async processClientQuestion(question: string): Promise<ClinicalQuestionResult> {
    if (!this.initialized) {
      throw new Error('Client Progress Service not initialized');
    }
    
    try {
      // First, categorize the question and extract the client name
      const analysis = await this.analyzeQuestion(question);
      
      if (!analysis.success || !analysis.questionType || !analysis.clientName) {
        return {
          success: false,
          error: 'Failed to analyze the question. Please provide a specific question about a client.'
        };
      }
      
      // Based on the question type, generate the appropriate SQL query
      const sqlQuery = await this.generateQueryForQuestionType(
        analysis.questionType,
        analysis.clientName,
        analysis.goalName,
        analysis.timeframe
      );
      
      if (!sqlQuery) {
        return {
          success: false,
          error: 'Failed to generate a query for this question type.'
        };
      }
      
      // Execute the SQL query
      const queryResult = await this.executeQuery(sqlQuery);
      
      if (!queryResult.success) {
        return {
          success: false,
          error: queryResult.error || 'Failed to execute query'
        };
      }
      
      // Format the result into a human-readable answer
      const formattedAnswer = await this.formatAnswer(
        analysis.questionType,
        analysis.clientName,
        queryResult.data,
        analysis.goalName,
        analysis.timeframe
      );
      
      return {
        success: true,
        answer: formattedAnswer,
        data: queryResult.data,
        questionType: analysis.questionType,
        clientName: analysis.clientName,
        confidence: analysis.confidence
      };
    } catch (error: any) {
      console.error('Error processing client question:', error);
      return {
        success: false,
        error: `Error processing question: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Analyze a question to determine its type, the client name, and other relevant parameters
   */
  private async analyzeQuestion(question: string): Promise<{
    success: boolean;
    questionType?: ClinicalQuestionType;
    clientName?: string;
    goalName?: string;
    timeframe?: string;
    confidence?: number;
  }> {
    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a specialized AI trained to analyze clinical questions about client progress.
Your task is to identify:
1. The TYPE of clinical question being asked
2. The CLIENT NAME being referenced
3. Any specific GOAL NAME mentioned
4. Any TIMEFRAME mentioned (e.g., "last month", "last session", etc.)

Question types:
- CURRENT_GOALS: Asking what goals a client is currently working on
- GOAL_PROGRESS: Asking about progress on a specific goal
- RECENT_SUBGOALS: Asking about subgoals scored in recent sessions
- RECENT_MILESTONE: Asking about most recent milestone work
- MILESTONE_SCORE: Asking about last milestone score
- MILESTONE_IMPROVEMENT: Asking which milestone shows most improvement
- COMPLETED_SUBGOALS: Asking if any subgoals have been completed
- AVERAGE_MILESTONE_SCORE: Asking about average milestone score over time
- MOST_PROGRESS_GOAL: Asking which goal has most progress
- OUTDATED_GOALS: Asking about goals not updated in a long time

Output your analysis in JSON format with the following fields:
{
  "questionType": "ONE_OF_THE_ABOVE_TYPES",
  "clientName": "EXTRACTED_CLIENT_NAME",
  "goalName": "EXTRACTED_GOAL_NAME_OR_NULL",
  "timeframe": "EXTRACTED_TIMEFRAME_OR_NULL",
  "confidence": CONFIDENCE_SCORE_BETWEEN_0_AND_1
}`
        },
        {
          role: 'user',
          content: question
        }
      ];
      
      const analysisResponse = await openaiService.createChatCompletion(messages);
      
      try {
        const analysis = JSON.parse(analysisResponse);
        
        // Validate the response
        if (!analysis.questionType || !analysis.clientName) {
          console.error('Invalid analysis response:', analysis);
          return { success: false };
        }
        
        return {
          success: true,
          questionType: analysis.questionType as ClinicalQuestionType,
          clientName: analysis.clientName,
          goalName: analysis.goalName,
          timeframe: analysis.timeframe,
          confidence: analysis.confidence
        };
      } catch (parseError) {
        console.error('Failed to parse analysis response:', parseError);
        return { success: false };
      }
    } catch (error) {
      console.error('Error analyzing question:', error);
      return { success: false };
    }
  }
  
  /**
   * Generate a SQL query for a specific question type
   */
  private async generateQueryForQuestionType(
    questionType: ClinicalQuestionType,
    clientName: string,
    goalName?: string,
    timeframe?: string
  ): Promise<string | null> {
    try {
      // For each question type, we'll define a natural language query
      // that the SQL query generation service can understand
      let nlQuery = '';
      
      switch (questionType) {
        case ClinicalQuestionType.CURRENT_GOALS:
          nlQuery = `What goals is client ${clientName} currently working on? Include the goal title, description, and priority.`;
          break;
          
        case ClinicalQuestionType.GOAL_PROGRESS:
          if (goalName) {
            nlQuery = `Has client ${clientName} made progress on their "${goalName}" goal? Show all performance assessments for this goal.`;
          } else {
            nlQuery = `What progress has client ${clientName} made on their goals? Show all performance assessments.`;
          }
          break;
          
        case ClinicalQuestionType.RECENT_SUBGOALS:
          nlQuery = `Which subgoals were scored for client ${clientName} in their last session? Join with session_notes, performance_assessments, and milestone_assessments tables.`;
          break;
          
        case ClinicalQuestionType.RECENT_MILESTONE:
          nlQuery = `What milestone did client ${clientName} work on most recently? Get the most recent session with milestone assessments.`;
          break;
          
        case ClinicalQuestionType.MILESTONE_SCORE:
          nlQuery = `What was client ${clientName}'s last milestone score? Get the most recent milestone assessment ratings.`;
          break;
          
        case ClinicalQuestionType.MILESTONE_IMPROVEMENT:
          nlQuery = `Which milestone is showing the most improvement for client ${clientName}? Compare milestone assessment ratings over time.`;
          break;
          
        case ClinicalQuestionType.COMPLETED_SUBGOALS:
          nlQuery = `Has client ${clientName} completed any subgoals yet? Look for subgoals with status 'completed'.`;
          break;
          
        case ClinicalQuestionType.AVERAGE_MILESTONE_SCORE:
          nlQuery = `What is client ${clientName}'s average milestone score over time? Calculate the average of milestone ratings.`;
          break;
          
        case ClinicalQuestionType.MOST_PROGRESS_GOAL:
          nlQuery = `Which goal is client ${clientName} making the most progress on? Compare performance assessments across goals.`;
          break;
          
        case ClinicalQuestionType.OUTDATED_GOALS:
          nlQuery = `Are there any goals for client ${clientName} that haven't been updated in over a month? Check the last updated date for each goal.`;
          break;
          
        default:
          console.error('Unknown question type:', questionType);
          return null;
      }
      
      // Now that we have a structured natural language query,
      // use the SQL query generation service to generate the SQL
      const result = await sqlQueryGenerationService.generateQuery({ question: nlQuery });
      
      if (!result.success || !result.query) {
        console.error('Failed to generate SQL query:', result.errorMessage);
        return null;
      }
      
      return result.query;
    } catch (error) {
      console.error('Error generating query for question type:', error);
      return null;
    }
  }
  
  /**
   * Execute a SQL query
   */
  private async executeQuery(query: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      // Execute the SQL query using the database connection
      const result = await sql.unsafe(query);
      
      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error executing query:', error);
      return {
        success: false,
        error: `Error executing query: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Format the query result into a human-readable answer
   */
  private async formatAnswer(
    questionType: ClinicalQuestionType,
    clientName: string,
    data: any[],
    goalName?: string,
    timeframe?: string
  ): Promise<string> {
    try {
      // If there's no data, return a standard message
      if (!data || data.length === 0) {
        return this.getNoDataMessage(questionType, clientName, goalName);
      }
      
      // Use OpenAI to generate a natural language summary of the data
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a clinical assistant that summarizes data about client progress in therapy.
Format your response in a professional, clear, and concise manner suitable for clinical staff.
Focus on key facts and numbers. Always maintain a supportive and positive tone, but be factual.
Do not make up any information that is not in the data provided.`
        },
        {
          role: 'user',
          content: `I need a summary of the following data about client ${clientName}'s progress.
Question type: ${questionType}
${goalName ? `Specific goal: ${goalName}` : ''}
${timeframe ? `Timeframe: ${timeframe}` : ''}

Data (in JSON format):
${JSON.stringify(data, null, 2)}

Please provide a concise, well-formatted summary that directly answers the question.`
        }
      ];
      
      const formattedAnswer = await openaiService.createChatCompletion(messages);
      return formattedAnswer;
    } catch (error) {
      console.error('Error formatting answer:', error);
      return `I found some information about ${clientName}'s progress, but I'm having trouble formatting it into a readable response. Please check the raw data or try again later.`;
    }
  }
  
  /**
   * Get a standard message for when no data is available
   */
  private getNoDataMessage(
    questionType: ClinicalQuestionType,
    clientName: string,
    goalName?: string
  ): string {
    switch (questionType) {
      case ClinicalQuestionType.CURRENT_GOALS:
        return `${clientName} does not have any active goals in the system. You may want to set up some goals during your next session.`;
        
      case ClinicalQuestionType.GOAL_PROGRESS:
        if (goalName) {
          return `I don't see any recorded progress for ${clientName} on the "${goalName}" goal. This goal might not have any assessments recorded yet.`;
        } else {
          return `${clientName} doesn't have any recorded progress on their goals. Try conducting assessments in your next session.`;
        }
        
      case ClinicalQuestionType.RECENT_SUBGOALS:
        return `${clientName} doesn't have any subgoals scored in their most recent session. You may want to assess some subgoals next time.`;
        
      case ClinicalQuestionType.RECENT_MILESTONE:
        return `${clientName} doesn't have any recent milestone work recorded. Consider assessing milestone progress in your next session.`;
        
      case ClinicalQuestionType.MILESTONE_SCORE:
        return `There are no milestone scores recorded for ${clientName}. Try recording milestone assessments in your next session.`;
        
      case ClinicalQuestionType.MILESTONE_IMPROVEMENT:
        return `${clientName} doesn't have enough milestone assessments to show improvement trends. Try consistent scoring across multiple sessions.`;
        
      case ClinicalQuestionType.COMPLETED_SUBGOALS:
        return `${clientName} hasn't completed any subgoals yet. Keep working on current subgoals or consider adjusting them if they seem too challenging.`;
        
      case ClinicalQuestionType.AVERAGE_MILESTONE_SCORE:
        return `${clientName} doesn't have enough milestone scores to calculate an average. More assessments are needed.`;
        
      case ClinicalQuestionType.MOST_PROGRESS_GOAL:
        return `${clientName} doesn't have enough progress data to determine which goal is showing the most improvement. Try more consistent assessments.`;
        
      case ClinicalQuestionType.OUTDATED_GOALS:
        return `${clientName} doesn't have any goals that appear to be outdated. It seems all goals are being actively worked on.`;
        
      default:
        return `I don't have enough data about ${clientName} to answer this question at the moment.`;
    }
  }
}

// Create and export singleton instance
export const clientProgressService = new ClientProgressService();