/**
 * Clinical Questions Service
 * 
 * This service provides specialized functionality to answer common clinical questions
 * about client goals, progress, milestone scores, and other therapy-related queries.
 * 
 * It implements optimized query handlers for specific question patterns about client
 * goals and progress to enhance the clinician assistant's capabilities.
 */

import { sql } from "../db";
import { openaiService } from "./openaiService";

/**
 * Interface for a clinical question response
 */
export interface ClinicalQuestionResponse {
  answer: string;
  data?: any;
  query?: string;
  confidence: number; // 0-1 scale
}

/**
 * Clinical Questions Service class
 */
class ClinicalQuestionsService {
  /**
   * Answers a specific clinical question about a client
   * 
   * @param question The natural language question
   * @param clientIdentifier The client identifier (name, id, or other identifier)
   */
  async answerQuestion(question: string, clientIdentifier: string): Promise<ClinicalQuestionResponse> {
    try {
      // First, identify the client by the identifier provided
      const client = await this.findClientByIdentifier(clientIdentifier);
      
      if (!client) {
        return {
          answer: `I couldn't find a client matching "${clientIdentifier}". Please check the name or ID and try again.`,
          confidence: 1.0
        };
      }
      
      // Determine the question type by analyzing the question text
      const questionType = this.identifyQuestionType(question);
      
      // Based on the question type, call the appropriate specialized handler
      switch (questionType) {
        case 'CURRENT_GOALS':
          return await this.getCurrentGoals(client.id);
          
        case 'GOAL_PROGRESS':
          return await this.getGoalProgress(client.id, this.extractGoalFromQuestion(question));
          
        case 'RECENT_SUBGOALS':
          return await this.getRecentSubgoals(client.id);
          
        case 'RECENT_MILESTONE':
          return await this.getRecentMilestone(client.id);
          
        case 'LAST_MILESTONE_SCORE':
          return await this.getLastMilestoneScore(client.id);
          
        case 'MILESTONE_IMPROVEMENT':
          return await this.getMilestoneImprovement(client.id);
          
        case 'COMPLETED_SUBGOALS':
          return await this.getCompletedSubgoals(client.id);
          
        case 'AVERAGE_MILESTONE_SCORE':
          return await this.getAverageMilestoneScore(client.id);
          
        case 'MOST_PROGRESS_GOAL':
          return await this.getMostProgressGoal(client.id);
          
        case 'OUTDATED_GOALS':
          return await this.getOutdatedGoals(client.id);
          
        default:
          // For unrecognized questions, we'll return a low confidence response
          return {
            answer: `I don't have a specific answer pattern for that question. Please try rephrasing or ask a more specific question about ${client.name}'s goals or progress.`,
            confidence: 0.5
          };
      }
    } catch (error: any) {
      console.error("Error answering clinical question:", error);
      return {
        answer: `I ran into an issue while trying to answer your question: ${error.message}. Please try asking in a different way.`,
        confidence: 0.1
      };
    }
  }
  
  /**
   * Identify the type of clinical question being asked
   */
  private identifyQuestionType(question: string): string {
    // Normalize the question for easier pattern matching
    const normalizedQuestion = question.toLowerCase().trim();
    
    // Match against common question patterns
    if (normalizedQuestion.includes('current') && normalizedQuestion.includes('goals')) {
      return 'CURRENT_GOALS';
    }
    
    if (normalizedQuestion.includes('progress') && (normalizedQuestion.includes('goal') || normalizedQuestion.includes('communication'))) {
      return 'GOAL_PROGRESS';
    }
    
    if (normalizedQuestion.includes('subgoals') && (normalizedQuestion.includes('last session') || normalizedQuestion.includes('recent'))) {
      return 'RECENT_SUBGOALS';
    }
    
    if (normalizedQuestion.includes('milestone') && normalizedQuestion.includes('recent')) {
      return 'RECENT_MILESTONE';
    }
    
    if (normalizedQuestion.includes('last') && normalizedQuestion.includes('milestone') && normalizedQuestion.includes('score')) {
      return 'LAST_MILESTONE_SCORE';
    }
    
    if (normalizedQuestion.includes('milestone') && (normalizedQuestion.includes('improvement') || normalizedQuestion.includes('improving'))) {
      return 'MILESTONE_IMPROVEMENT';
    }
    
    if (normalizedQuestion.includes('completed') && normalizedQuestion.includes('subgoals')) {
      return 'COMPLETED_SUBGOALS';
    }
    
    if (normalizedQuestion.includes('average') && normalizedQuestion.includes('milestone')) {
      return 'AVERAGE_MILESTONE_SCORE';
    }
    
    if ((normalizedQuestion.includes('most') || normalizedQuestion.includes('best')) && normalizedQuestion.includes('progress')) {
      return 'MOST_PROGRESS_GOAL';
    }
    
    if (normalizedQuestion.includes('outdated') || 
        (normalizedQuestion.includes('not') && normalizedQuestion.includes('updated') && normalizedQuestion.includes('month'))) {
      return 'OUTDATED_GOALS';
    }
    
    // Default if no pattern matches
    return 'UNKNOWN';
  }
  
  /**
   * Extract a goal name or description from the question
   */
  private extractGoalFromQuestion(question: string): string | null {
    // Look for quoted text which might be a goal name
    const quotedMatch = question.match(/"([^"]+)"|'([^']+)'/);
    if (quotedMatch) {
      return (quotedMatch[1] || quotedMatch[2]);
    }
    
    // Look for goal keywords
    if (question.toLowerCase().includes('communication')) {
      return 'communication';
    }
    
    if (question.toLowerCase().includes('language')) {
      return 'language';
    }
    
    if (question.toLowerCase().includes('social')) {
      return 'social';
    }
    
    if (question.toLowerCase().includes('motor')) {
      return 'motor';
    }
    
    if (question.toLowerCase().includes('cognitive')) {
      return 'cognitive';
    }
    
    return null;
  }
  
  /**
   * Find a client by their identifier (name, id, or other identifier)
   */
  private async findClientByIdentifier(identifier: string): Promise<any> {
    try {
      // Try to find by exact name, unique identifier, or partial match
      const result = await sql`
        SELECT * FROM clients
        WHERE name = ${identifier}
        OR unique_identifier = ${identifier}
        OR original_name = ${identifier}
        OR LOWER(name) LIKE ${`%${identifier.toLowerCase()}%`}
        LIMIT 1
      `;
      
      if (result.length > 0) {
        return result[0];
      }
      
      return null;
    } catch (error) {
      console.error("Error finding client:", error);
      throw new Error("Failed to find client");
    }
  }
  
  /**
   * Get current goals for a client
   */
  private async getCurrentGoals(clientId: number): Promise<ClinicalQuestionResponse> {
    try {
      console.log(`Fetching goals for client ID: ${clientId}`);
      
      const query = `
        SELECT g.id, g.title, g.description, g.priority
        FROM goals g
        WHERE g.client_id = ${clientId}
        ORDER BY 
          CASE 
            WHEN g.priority = 'High Priority' THEN 1
            WHEN g.priority = 'Medium Priority' THEN 2
            WHEN g.priority = 'Low Priority' THEN 3
            ELSE 4
          END
      `;
      
      const result = await sql.unsafe(query);
      console.log(`Found ${result.length} goals for client ID: ${clientId}`);
      
      if (result.length === 0) {
        return {
          answer: "This client doesn't have any goals set up yet.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      // Format the response with OpenAI to make it more natural
      const goalsData = JSON.stringify(result);
      const formattedResponse = await openaiService.createChatCompletion([
        {
          role: 'system',
          content: `You are a clinical assistant helping summarize therapy goals. Format the response in a natural, conversational way. The client has ${result.length} goals. Only mention actual data from the provided goals JSON.`
        },
        {
          role: 'user',
          content: `Summarize these therapy goals for a client: ${goalsData}`
        }
      ]);
      
      return {
        answer: formattedResponse,
        data: result,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting current goals:", error);
      throw new Error("Failed to retrieve current goals");
    }
  }
  
  /**
   * Get progress on a specific goal for a client
   */
  private async getGoalProgress(clientId: number, goalKeyword: string | null): Promise<ClinicalQuestionResponse> {
    try {
      // Build the SQL query based on whether we have a goal keyword
      let whereClause = `g.client_id = ${clientId}`;
      if (goalKeyword) {
        whereClause += ` AND (LOWER(g.title) LIKE '%${goalKeyword.toLowerCase()}%' OR LOWER(g.description) LIKE '%${goalKeyword.toLowerCase()}%')`;
      }
      
      const query = `
        WITH recent_assessments AS (
          SELECT 
            pa.goal_id,
            pa.rating,
            ROW_NUMBER() OVER (PARTITION BY pa.goal_id ORDER BY sn.created_at DESC) as rn
          FROM performance_assessments pa
          JOIN session_notes sn ON pa.session_note_id = sn.id
          JOIN sessions s ON sn.session_id = s.id
          WHERE s.client_id = ${clientId}
        ),
        first_assessments AS (
          SELECT 
            pa.goal_id,
            pa.rating,
            ROW_NUMBER() OVER (PARTITION BY pa.goal_id ORDER BY sn.created_at ASC) as rn
          FROM performance_assessments pa
          JOIN session_notes sn ON pa.session_note_id = sn.id
          JOIN sessions s ON sn.session_id = s.id
          WHERE s.client_id = ${clientId}
        )
        SELECT 
          g.id,
          g.title,
          g.description,
          ra.rating as recent_rating,
          fa.rating as first_rating,
          CASE
            WHEN fa.rating IS NULL OR ra.rating IS NULL THEN NULL
            ELSE ra.rating - fa.rating
          END as progress
        FROM goals g
        LEFT JOIN recent_assessments ra ON g.id = ra.goal_id AND ra.rn = 1
        LEFT JOIN first_assessments fa ON g.id = fa.goal_id AND fa.rn = 1
        WHERE ${whereClause}
        ORDER BY g.id
      `;
      
      const result = await sql.unsafe(query);
      
      if (result.length === 0) {
        return {
          answer: goalKeyword 
            ? `I couldn't find any goals related to "${goalKeyword}" for this client.`
            : "This client doesn't have any goals with progress data yet.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      // Format the response with OpenAI to make it more natural
      const progressData = JSON.stringify(result);
      const promptContent = goalKeyword
        ? `Summarize the progress on goals related to "${goalKeyword}" for this client based on the following data: ${progressData}`
        : `Summarize the overall goal progress for this client based on the following data: ${progressData}`;
      
      const formattedResponse = await openaiService.createChatCompletion([
        {
          role: 'system',
          content: `You are a clinical assistant helping summarize therapy progress. Format the response in a natural, conversational way. Explain what the ratings mean (higher is better, scale of 1-10) and highlight improvements or setbacks.`
        },
        {
          role: 'user',
          content: promptContent
        }
      ]);
      
      return {
        answer: formattedResponse,
        data: result,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting goal progress:", error);
      throw new Error("Failed to retrieve goal progress");
    }
  }
  
  /**
   * Get recent subgoals (milestones) scored for a client
   */
  private async getRecentSubgoals(clientId: number): Promise<ClinicalQuestionResponse> {
    try {
      const query = `
        SELECT 
          ma.id,
          g.title as goal_title,
          sb.title as subgoal_title,
          sb.description as subgoal_description,
          ma.rating,
          s.session_date
        FROM milestone_assessments ma
        JOIN performance_assessments pa ON ma.performance_assessment_id = pa.id
        JOIN session_notes sn ON pa.session_note_id = sn.id
        JOIN sessions s ON sn.session_id = s.id
        JOIN goals g ON pa.goal_id = g.id
        JOIN subgoals sb ON ma.milestone_id = sb.id
        WHERE s.client_id = ${clientId}
        ORDER BY s.session_date DESC
        LIMIT 10
      `;
      
      const result = await sql.unsafe(query);
      
      if (result.length === 0) {
        return {
          answer: "This client doesn't have any recent subgoals scored in therapy sessions.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      // Find the most recent session date from the results
      const latestSession = result[0].session_date;
      const latestSubgoals = result.filter(r => 
        new Date(r.session_date).toISOString().split('T')[0] === 
        new Date(latestSession).toISOString().split('T')[0]
      );
      
      // Format the response with OpenAI to make it more natural
      const subgoalData = JSON.stringify(latestSubgoals);
      const formattedResponse = await openaiService.createChatCompletion([
        {
          role: 'system',
          content: `You are a clinical assistant helping summarize therapy subgoals. Format the response in a natural, conversational way. Focus on the subgoals from the most recent session. Explain what the ratings mean (higher is better, typically on a scale of 1-5).`
        },
        {
          role: 'user',
          content: `Summarize the subgoals scored in the client's latest session on ${new Date(latestSession).toLocaleDateString()}: ${subgoalData}`
        }
      ]);
      
      return {
        answer: formattedResponse,
        data: latestSubgoals,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting recent subgoals:", error);
      throw new Error("Failed to retrieve recent subgoals");
    }
  }
  
  /**
   * Get the most recent milestone a client worked on
   */
  private async getRecentMilestone(clientId: number): Promise<ClinicalQuestionResponse> {
    try {
      const query = `
        SELECT 
          ma.id,
          g.title as goal_title,
          sb.title as subgoal_title,
          sb.description as subgoal_description,
          ma.rating,
          s.session_date
        FROM milestone_assessments ma
        JOIN performance_assessments pa ON ma.performance_assessment_id = pa.id
        JOIN session_notes sn ON pa.session_note_id = sn.id
        JOIN sessions s ON sn.session_id = s.id
        JOIN goals g ON pa.goal_id = g.id
        JOIN subgoals sb ON ma.milestone_id = sb.id
        WHERE s.client_id = ${clientId}
        ORDER BY s.session_date DESC, ma.id DESC
        LIMIT 1
      `;
      
      const result = await sql.unsafe(query);
      
      if (result.length === 0) {
        return {
          answer: "This client hasn't worked on any milestones in their therapy sessions yet.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      const milestone = result[0];
      const formattedDate = new Date(milestone.session_date).toLocaleDateString();
      
      return {
        answer: `The most recent milestone this client worked on was "${milestone.subgoal_title}" under the goal "${milestone.goal_title}" on ${formattedDate}. ${milestone.rating ? `They received a rating of ${milestone.rating}/5.` : ''}`,
        data: milestone,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting recent milestone:", error);
      throw new Error("Failed to retrieve recent milestone");
    }
  }
  
  /**
   * Get the last milestone score for a client
   */
  private async getLastMilestoneScore(clientId: number): Promise<ClinicalQuestionResponse> {
    try {
      const query = `
        SELECT 
          ma.id,
          g.title as goal_title,
          sb.title as subgoal_title,
          ma.rating,
          s.session_date
        FROM milestone_assessments ma
        JOIN performance_assessments pa ON ma.performance_assessment_id = pa.id
        JOIN session_notes sn ON pa.session_note_id = sn.id
        JOIN sessions s ON sn.session_id = s.id
        JOIN goals g ON pa.goal_id = g.id
        JOIN subgoals sb ON ma.milestone_id = sb.id
        WHERE s.client_id = ${clientId} AND ma.rating IS NOT NULL
        ORDER BY s.session_date DESC, ma.id DESC
        LIMIT 1
      `;
      
      const result = await sql.unsafe(query);
      
      if (result.length === 0) {
        return {
          answer: "This client doesn't have any milestone scores recorded yet.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      const milestone = result[0];
      const formattedDate = new Date(milestone.session_date).toLocaleDateString();
      
      return {
        answer: `The client's last milestone score was ${milestone.rating}/5 for "${milestone.subgoal_title}" under the goal "${milestone.goal_title}" on ${formattedDate}.`,
        data: milestone,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting last milestone score:", error);
      throw new Error("Failed to retrieve last milestone score");
    }
  }
  
  /**
   * Get the milestone showing the most improvement for a client
   */
  private async getMilestoneImprovement(clientId: number): Promise<ClinicalQuestionResponse> {
    try {
      const query = `
        WITH milestone_progress AS (
          SELECT 
            sb.id as subgoal_id,
            sb.title as subgoal_title,
            g.id as goal_id,
            g.title as goal_title,
            MIN(ma.rating) as min_rating,
            MAX(ma.rating) as max_rating,
            MAX(ma.rating) - MIN(ma.rating) as improvement,
            COUNT(ma.id) as assessment_count
          FROM milestone_assessments ma
          JOIN performance_assessments pa ON ma.performance_assessment_id = pa.id
          JOIN session_notes sn ON pa.session_note_id = sn.id
          JOIN sessions s ON sn.session_id = s.id
          JOIN goals g ON pa.goal_id = g.id
          JOIN subgoals sb ON ma.milestone_id = sb.id
          WHERE s.client_id = ${clientId} AND ma.rating IS NOT NULL
          GROUP BY sb.id, sb.title, g.id, g.title
          HAVING COUNT(ma.id) > 1
        )
        SELECT * FROM milestone_progress
        ORDER BY improvement DESC, assessment_count DESC
        LIMIT 1
      `;
      
      const result = await sql.unsafe(query);
      
      if (result.length === 0) {
        return {
          answer: "This client doesn't have enough milestone assessments to measure improvement yet. We need at least two ratings for the same milestone.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      const milestone = result[0];
      
      return {
        answer: `The milestone showing the most improvement is "${milestone.subgoal_title}" under the goal "${milestone.goal_title}". The rating improved from ${milestone.min_rating} to ${milestone.max_rating}, a change of ${milestone.improvement} points. This milestone has been assessed ${milestone.assessment_count} times.`,
        data: milestone,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting milestone improvement:", error);
      throw new Error("Failed to retrieve milestone improvement");
    }
  }
  
  /**
   * Get completed subgoals for a client
   */
  private async getCompletedSubgoals(clientId: number): Promise<ClinicalQuestionResponse> {
    try {
      const query = `
        SELECT 
          sb.id,
          sb.title,
          sb.description,
          g.title as goal_title,
          sb.status
        FROM subgoals sb
        JOIN goals g ON sb.goal_id = g.id
        WHERE g.client_id = ${clientId} AND sb.status = 'completed'
      `;
      
      const result = await sql.unsafe(query);
      
      if (result.length === 0) {
        return {
          answer: "This client hasn't completed any subgoals yet.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      // Group subgoals by goal
      const subgoalsByGoal: Record<string, any[]> = {};
      for (const subgoal of result) {
        if (!subgoalsByGoal[subgoal.goal_title]) {
          subgoalsByGoal[subgoal.goal_title] = [];
        }
        subgoalsByGoal[subgoal.goal_title].push(subgoal);
      }
      
      // Format the response with OpenAI to make it more natural
      const subgoalData = JSON.stringify(subgoalsByGoal);
      const formattedResponse = await openaiService.createChatCompletion([
        {
          role: 'system',
          content: `You are a clinical assistant helping summarize therapy progress. Format the response in a natural, conversational way. The client has completed ${result.length} subgoals across ${Object.keys(subgoalsByGoal).length} goals.`
        },
        {
          role: 'user',
          content: `Summarize these completed subgoals for a client: ${subgoalData}`
        }
      ]);
      
      return {
        answer: formattedResponse,
        data: result,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting completed subgoals:", error);
      throw new Error("Failed to retrieve completed subgoals");
    }
  }
  
  /**
   * Get the average milestone score over time for a client
   */
  private async getAverageMilestoneScore(clientId: number): Promise<ClinicalQuestionResponse> {
    try {
      const query = `
        WITH monthly_scores AS (
          SELECT 
            TO_CHAR(s.session_date, 'YYYY-MM') as month,
            AVG(ma.rating) as avg_score,
            COUNT(ma.id) as assessment_count
          FROM milestone_assessments ma
          JOIN performance_assessments pa ON ma.performance_assessment_id = pa.id
          JOIN session_notes sn ON pa.session_note_id = sn.id
          JOIN sessions s ON sn.session_id = s.id
          WHERE s.client_id = ${clientId} AND ma.rating IS NOT NULL
          GROUP BY TO_CHAR(s.session_date, 'YYYY-MM')
          ORDER BY month
        )
        SELECT 
          month,
          avg_score,
          assessment_count,
          AVG(avg_score) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_avg
        FROM monthly_scores
      `;
      
      const result = await sql.unsafe(query);
      
      if (result.length === 0) {
        return {
          answer: "This client doesn't have any milestone scores recorded yet.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      // Calculate the overall average
      const totalAssessments = result.reduce((sum, month) => sum + month.assessment_count, 0);
      const weightedSum = result.reduce((sum, month) => sum + (month.avg_score * month.assessment_count), 0);
      const overallAverage = weightedSum / totalAssessments;
      
      // Format the response
      const scoreData = {
        monthlyScores: result,
        overallAverage: overallAverage,
        latestMonthScore: result[result.length - 1].avg_score,
        totalAssessments: totalAssessments,
        monthsTracked: result.length
      };
      
      // Format the response with OpenAI to make it more natural
      const formattedData = JSON.stringify(scoreData);
      const formattedResponse = await openaiService.createChatCompletion([
        {
          role: 'system',
          content: `You are a clinical assistant helping summarize therapy progress scores. Format the response in a natural, conversational way. The scores are on a scale of 1-5 where higher is better. Include trends over time if available.`
        },
        {
          role: 'user',
          content: `Summarize this client's average milestone scores over time: ${formattedData}`
        }
      ]);
      
      return {
        answer: formattedResponse,
        data: scoreData,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting average milestone score:", error);
      throw new Error("Failed to retrieve average milestone score");
    }
  }
  
  /**
   * Get the goal the client is making the most progress on
   */
  private async getMostProgressGoal(clientId: number): Promise<ClinicalQuestionResponse> {
    try {
      const query = `
        WITH goal_progress AS (
          SELECT 
            g.id,
            g.title,
            g.description,
            AVG(pa.rating) as avg_rating,
            COUNT(pa.id) as assessment_count,
            MAX(pa.rating) - MIN(pa.rating) as rating_improvement
          FROM performance_assessments pa
          JOIN session_notes sn ON pa.session_note_id = sn.id
          JOIN sessions s ON sn.session_id = s.id
          JOIN goals g ON pa.goal_id = g.id
          WHERE s.client_id = ${clientId} AND pa.rating IS NOT NULL
          GROUP BY g.id, g.title, g.description
          HAVING COUNT(pa.id) > 1
        )
        SELECT * FROM goal_progress
        ORDER BY rating_improvement DESC, avg_rating DESC, assessment_count DESC
        LIMIT 1
      `;
      
      const result = await sql.unsafe(query);
      
      if (result.length === 0) {
        return {
          answer: "This client doesn't have enough goal assessments to measure progress yet. We need at least two assessments for the same goal.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      const goal = result[0];
      
      return {
        answer: `The client is making the most progress on the goal "${goal.title}". This goal has shown an improvement of ${goal.rating_improvement.toFixed(1)} points in its rating, with an average rating of ${goal.avg_rating.toFixed(1)}. It has been assessed ${goal.assessment_count} times.`,
        data: goal,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting most progress goal:", error);
      throw new Error("Failed to retrieve most progress goal");
    }
  }
  
  /**
   * Get goals that haven't been updated in over a month
   */
  private async getOutdatedGoals(clientId: number): Promise<ClinicalQuestionResponse> {
    try {
      const query = `
        WITH latest_assessments AS (
          SELECT 
            pa.goal_id,
            MAX(s.session_date) as latest_assessment_date
          FROM performance_assessments pa
          JOIN session_notes sn ON pa.session_note_id = sn.id
          JOIN sessions s ON sn.session_id = s.id
          WHERE s.client_id = ${clientId}
          GROUP BY pa.goal_id
        )
        SELECT 
          g.id,
          g.title,
          g.description,
          la.latest_assessment_date,
          CURRENT_DATE - la.latest_assessment_date as days_since_update
        FROM goals g
        LEFT JOIN latest_assessments la ON g.id = la.goal_id
        WHERE g.client_id = ${clientId}
        AND (
          la.latest_assessment_date IS NULL OR 
          la.latest_assessment_date < CURRENT_DATE - INTERVAL '30 days'
        )
        ORDER BY la.latest_assessment_date ASC NULLS FIRST
      `;
      
      const result = await sql.unsafe(query);
      
      if (result.length === 0) {
        return {
          answer: "All of this client's goals have been updated within the last month.",
          data: [],
          query,
          confidence: 1.0
        };
      }
      
      // Format the response with OpenAI to make it more natural
      const goalData = JSON.stringify(result);
      const formattedResponse = await openaiService.createChatCompletion([
        {
          role: 'system',
          content: `You are a clinical assistant helping track therapy goals. Format the response in a natural, conversational way. Focus on which goals need attention and how long it's been since they were updated.`
        },
        {
          role: 'user',
          content: `Summarize these outdated goals for a client: ${goalData}`
        }
      ]);
      
      return {
        answer: formattedResponse,
        data: result,
        query,
        confidence: 1.0
      };
    } catch (error) {
      console.error("Error getting outdated goals:", error);
      throw new Error("Failed to retrieve outdated goals");
    }
  }
}

// Create a singleton instance
export const clinicalQuestionsService = new ClinicalQuestionsService();