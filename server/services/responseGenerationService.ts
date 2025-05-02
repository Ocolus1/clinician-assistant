import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

/**
 * ResponseGenerationService
 * 
 * Generates natural language responses for the clinician chatbot.
 * Uses LangChain and OpenAI to create conversational, empathetic responses.
 */
export class ResponseGenerationService {
  private model: ChatOpenAI;
  
  constructor() {
    // Initialize the OpenAI model
    this.model = new ChatOpenAI({
      temperature: 0.7,
      modelName: "gpt-3.5-turbo",
    });
  }
  
  /**
   * Generate a natural language response based on query and data
   * 
   * @param query - The original user query
   * @param queryType - The type of query (e.g., PATIENT_INFO, GOAL_PROGRESS)
   * @param data - The data retrieved from the database
   * @param conversationHistory - Previous messages for context
   * @returns A natural language response
   */
  async generateResponse(
    query: string,
    queryType: string,
    data: any,
    conversationHistory: string = ""
  ): Promise<string> {
    // If we have a pre-formatted response, use it directly
    if (data && data.formattedResponse && typeof data.formattedResponse === 'string') {
      return data.formattedResponse;
    }

    try {
      // Format the data as a string
      const dataString = JSON.stringify(data, null, 2);
      
      // Create a prompt template for generating a response
      const prompt = PromptTemplate.fromTemplate(
        `You are an AI assistant for clinicians, helping them access patient information.
        
        Conversation history:
        {history}
        
        The clinician asked: {query}
        
        The query type is: {queryType}
        
        The data retrieved is:
        {data}
        
        Generate a helpful, concise, and professional response based on this data.
        If the data is empty, indicate that no information was found.
        If the data is a list, summarize the key points.
        Always maintain a professional tone suitable for a clinical setting.`
      );
      
      // Create a chain for generating the response
      const chain = RunnableSequence.from([
        prompt,
        this.model,
        new StringOutputParser(),
      ]);
      
      // Generate the response
      const response = await chain.invoke({
        history: conversationHistory,
        query,
        queryType,
        data: dataString,
      });
      
      return response;
    } catch (error) {
      console.error("Error generating response:", error);
      return "I apologize, but I encountered an error generating a response. Please try again or contact support if the issue persists.";
    }
  }
  
  /**
   * Generate a response for when no data is found
   * 
   * @param query - The original user query
   * @param queryType - The type of query
   * @param entity - The entity that was not found (e.g., patient name)
   * @returns A helpful response explaining that no data was found
   */
  async generateNoDataResponse(
    query: string,
    queryType: string,
    entity?: string
  ): Promise<string> {
    try {
      const noDataPrompt = PromptTemplate.fromTemplate(`
        You are an AI assistant for clinicians, designed to provide helpful, accurate, and empathetic responses.
        
        The user asked: {query}
        
        However, no data was found ${entity ? `for ${entity}` : 'for this query'}.
        
        Generate a helpful, empathetic response that:
        1. Acknowledges that no data was found
        2. Suggests possible reasons (e.g., misspelled name, patient not in system)
        3. Offers alternative approaches
        4. Maintains a professional, helpful tone
        
        Your response:
      `);
      
      const noDataChain = RunnableSequence.from([
        noDataPrompt,
        this.model,
        new StringOutputParser(),
      ]);
      
      // Generate the response
      const response = await noDataChain.invoke({
        query,
        queryType,
        entity: entity || ""
      });
      
      return response;
    } catch (error) {
      console.error("Error generating no-data response:", error);
      return "I'm sorry, but I couldn't find any information for that query. Please check if the patient name is correct or try a different query.";
    }
  }
  
  /**
   * Generate a response for when the query is ambiguous
   * 
   * @param query - The original user query
   * @param possibleInterpretations - Possible interpretations of the query
   * @returns A response asking for clarification
   */
  async generateClarificationResponse(
    query: string,
    possibleInterpretations: string[]
  ): Promise<string> {
    try {
      const clarificationPrompt = PromptTemplate.fromTemplate(`
        You are an AI assistant for clinicians, designed to provide helpful, accurate, and empathetic responses.
        
        The user asked: {query}
        
        This query is ambiguous and could be interpreted in multiple ways:
        {interpretations}
        
        Generate a response that:
        1. Acknowledges the ambiguity
        2. Lists the possible interpretations
        3. Asks for clarification in a professional, helpful tone
        
        Your response:
      `);
      
      const interpretationsText = possibleInterpretations
        .map((interp, index) => `${index + 1}. ${interp}`)
        .join('\n');
      
      const clarificationChain = RunnableSequence.from([
        clarificationPrompt,
        this.model,
        new StringOutputParser(),
      ]);
      
      return await clarificationChain.invoke({
        query,
        interpretations: interpretationsText,
      });
    } catch (error) {
      console.error("Error generating clarification response:", error);
      return "I'm sorry, but your query is a bit ambiguous. Could you please provide more details or rephrase your question?";
    }
  }
  
  /**
   * Generate an error response when something goes wrong
   * 
   * @param errorType - The type of error that occurred
   * @returns A helpful error message
   */
  generateErrorResponse(errorType: string): string {
    switch (errorType) {
      case "NOT_FOUND":
        return "I'm sorry, but I couldn't find the information you requested. Please check if the patient name is spelled correctly or try a different query.";
      
      case "ACCESS_DENIED":
        return "I apologize, but you don't have permission to access this information. Please contact your system administrator if you believe this is an error.";
      
      case "INVALID_QUERY":
        return "I'm having trouble understanding your request. Could you please rephrase it or provide more details?";
      
      case "SERVER_ERROR":
        return "I apologize, but I encountered a technical issue while processing your request. Please try again later or contact technical support if the problem persists.";
      
      default:
        return "I apologize, but something went wrong while processing your request. Please try again or rephrase your question.";
    }
  }
  
  /**
   * Format patient goal progress data into a more readable format
   * 
   * @param progressData - Raw goal progress data
   * @returns Formatted goal progress data
   */
  formatGoalProgressData(progressData: any): string {
    if (!progressData || !Array.isArray(progressData) || progressData.length === 0) {
      return "No goal progress data available.";
    }
    
    let formattedData = "Goal Progress Summary:\n\n";
    
    progressData.forEach((goalData, index) => {
      const { goal, progress } = goalData;
      
      formattedData += `Goal ${index + 1}: ${goal.title}\n`;
      formattedData += `Description: ${goal.description || 'No description'}\n`;
      formattedData += `Status: ${goal.status || 'Unknown'}\n`;
      formattedData += `Importance: ${goal.importanceLevel || 'Not specified'}/5\n\n`;
      
      if (progress && progress.length > 0) {
        formattedData += "Progress Timeline:\n";
        
        progress.forEach((point: any, idx: number) => {
          const date = point.date ? new Date(point.date).toLocaleDateString() : 'Unknown date';
          formattedData += `- ${date}: Achievement level ${point.achievementLevel}/10`;
          if (point.notes) {
            formattedData += ` - ${point.notes}`;
          }
          formattedData += '\n';
        });
      } else {
        formattedData += "No progress data available for this goal.\n";
      }
      
      formattedData += '\n';
    });
    
    return formattedData;
  }
  
  /**
   * Format patient session data into a more readable format
   * 
   * @param sessionData - Raw session data
   * @returns Formatted session data
   */
  formatSessionData(sessionData: any): string {
    if (!sessionData || !Array.isArray(sessionData) || sessionData.length === 0) {
      return "No session data available.";
    }
    
    let formattedData = "Session History:\n\n";
    
    sessionData.forEach((session, index) => {
      const date = session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : 'Unknown date';
      const duration = session.duration ? `${session.duration} minutes` : 'Duration not specified';
      
      formattedData += `Session ${index + 1} (${date}):\n`;
      formattedData += `Title: ${session.title || 'No title'}\n`;
      formattedData += `Duration: ${duration}\n`;
      formattedData += `Status: ${session.status || 'Unknown'}\n`;
      
      if (session.description) {
        formattedData += `Description: ${session.description}\n`;
      }
      
      formattedData += '\n';
    });
    
    return formattedData;
  }
  
  /**
   * Format patient count data for better readability
   * 
   * @param data - The patient count data
   * @returns Formatted string with patient count information
   */
  formatPatientCountData(data: { totalPatients: number }): string {
    console.log("Formatting patient count data:", data);
    
    if (!data || typeof data.totalPatients !== 'number') {
      // Check if data.totalPatients is a string that can be converted to a number
      if (data && data.totalPatients && typeof data.totalPatients === 'string') {
        try {
          const count = parseInt(data.totalPatients, 10);
          if (!isNaN(count)) {
            const response = `Currently, we have a total of ${count} patient${count !== 1 ? 's' : ''} in our system.`;
            console.log("Formatted patient count response from string:", response);
            return response;
          }
        } catch (error) {
          console.error("Error parsing patient count:", error);
        }
      }
      
      console.log("Invalid patient count data:", data);
      return "I couldn't retrieve the patient count information at this time.";
    }

    const response = `Currently, we have a total of ${data.totalPatients} patient${data.totalPatients !== 1 ? 's' : ''} in our system.`;
    console.log("Formatted patient count response:", response);
    return response;
  }
}

// Export a singleton instance of the service
export const responseGenerationService = new ResponseGenerationService();
