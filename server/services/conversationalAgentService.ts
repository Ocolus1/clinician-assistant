/**
 * Conversational Agent Service
 * 
 * This service provides a user-friendly interface layer that hides the internal 
 * reasoning steps of the Tool-Augmented Reasoning system.
 * 
 * It delegates complex data queries to the AgentService but only returns 
 * polished, final answers to the user.
 */

import { ChatOpenAI } from "@langchain/openai";
import { Message, MessageRole } from "@shared/assistantTypes";
import { agentService } from "./agentService";
import { langchainService } from "./langchainService";
import { memoryManagementService } from "./memoryManagementService";
import { sql } from "../db";

/**
 * Conversational Agent Service class
 */
class ConversationalAgentService {
  private initialized = false;
  private llm: ChatOpenAI | null = null;
  private apiKey: string | null = null;
  private model = "gpt-4o";
  private temperature = 0.7; // More natural for conversation

  /**
   * Initialize the service
   */
  async initialize(apiKey?: string, model?: string): Promise<void> {
    try {
      // Use environment variable if no API key provided
      this.apiKey = apiKey || process.env.OPENAI_API_KEY || null;
      
      if (!this.apiKey) {
        throw new Error('No API key available for Conversational Agent Service');
      }
      
      if (model) {
        this.model = model;
      }
      
      // Initialize LLM for conversation
      this.llm = new ChatOpenAI({
        openAIApiKey: this.apiKey,
        modelName: this.model,
        temperature: this.temperature
      });
      
      this.initialized = true;
      console.log(`Conversational Agent Service initialized with model: ${this.model}`);
    } catch (error) {
      console.error('Failed to initialize Conversational Agent Service:', error);
      throw new Error('Failed to initialize Conversational Agent Service');
    }
  }
  
  /**
   * Process a user message and return a polished response
   * This method hides the internal reasoning steps
   */
  async processUserMessage(
    conversationId: string,
    messageContent: string,
    recentMessages: Message[]
  ): Promise<string> {
    if (!this.initialized || !this.llm) {
      throw new Error('Conversational Agent Service not initialized');
    }
    
    try {
      console.log(`Processing user message: "${messageContent.substring(0, 50)}..."`);
      
      // First, check if this query requires data processing via the agent
      const requiresDataProcessing = await this.requiresDataProcessing(messageContent);
      
      // Convert messages to the format needed for context
      const formattedMessages = recentMessages.map(msg => ({
        role: msg.role as MessageRole,
        content: msg.content
      }));
      
      if (requiresDataProcessing) {
        console.log('Query requires data processing, delegating to agent service');
        
        try {
          // Get the raw agent response with reasoning steps
          const rawAgentResponse = await agentService.processAgentQuery(
            conversationId,
            messageContent,
            formattedMessages
          );
          
          // Transform the raw agent response into a polished user-friendly response
          return await this.transformAgentResponse(
            conversationId, 
            messageContent, 
            rawAgentResponse,
            formattedMessages
          );
        } catch (error) {
          console.error('Error in agent processing:', error);
          // Fallback to direct conversation if agent fails
          return await this.handleNonDataMessage(
            conversationId,
            messageContent,
            formattedMessages
          );
        }
      } else {
        // For non-data questions, handle directly with conversation
        return await this.handleNonDataMessage(
          conversationId,
          messageContent,
          formattedMessages
        );
      }
    } catch (error: any) {
      console.error('Error processing user message:', error);
      return `I'm having trouble processing your request. ${error.message || 'Please try again or rephrase your question.'}`;
    }
  }
  
  /**
   * Determine if a message requires data processing
   */
  private async requiresDataProcessing(message: string): Promise<boolean> {
    // First check for explicit clinical questions about goals and progress
    const clinicalQuestionPatterns = [
      // Goal-specific patterns
      /what\s+goals?\s+(?:is|are|has|have)\s+([A-Za-z0-9\-]+)/i,
      /what\s+(?:is|are)\s+([A-Za-z0-9\-]+)(?:'s)?\s+goals?/i,
      /goals?\s+(?:for|of)\s+([A-Za-z0-9\-]+)/i,
      
      // Progress patterns
      /progress\s+(?:on|for|of)\s+([A-Za-z0-9\-]+)/i,
      /([A-Za-z0-9\-]+)(?:'s)?\s+progress/i,
      
      // Milestone/subgoal patterns
      /(?:milestone|subgoal)s?\s+(?:for|of|completed\s+by)\s+([A-Za-z0-9\-]+)/i,
      /what\s+(?:milestone|subgoal)s?\s+(?:is|has|did)\s+([A-Za-z0-9\-]+)/i,
      
      // Working on patterns
      /what\s+is\s+([A-Za-z0-9\-]+)\s+working\s+on/i,
      /([A-Za-z0-9\-]+)\s+(?:is|has been)\s+working\s+on/i
    ];
    
    // Check clinical question patterns first
    for (const pattern of clinicalQuestionPatterns) {
      if (pattern.test(message)) {
        console.log('Message matches clinical question pattern, routing to clinical questions tool');
        return true;
      }
    }
    
    // Always treat questions about clients as requiring data processing
    const clientNamePatterns = [
      // Look for questions about clients by name
      /what(?:.*)(?:goal|progress|milestone|subgoal)(?:.*)(is|has|did)\s+([A-Za-z0-9\-]+)/i,
      /(?:goal|progress|milestone|subgoal)(?:.*)(?:for|of|by)\s+([A-Za-z0-9\-]+)/i,
      // General patterns for client names
      /\b(?:client|patient)\s+(?:named|called)\s+([A-Za-z0-9\-]+)/i,
      // Direct name mentions in goal-related contexts
      /\b([A-Za-z][a-zA-Z0-9\-]{2,})'s\s+(?:goal|progress|milestone|therapy)/i,
      /\b([A-Za-z][a-zA-Z0-9\-]{2,})\s+(?:is working on|has completed)/i,
      // Capture names with hyphens (ID format)
      /\b([A-Za-z0-9]+-[0-9]+)\b/i
    ];
    
    // Check if message matches any client name patterns
    for (const pattern of clientNamePatterns) {
      if (pattern.test(message)) {
        console.log('Message matches client name pattern, treating as data query');
        return true;
      }
    }
    
    // Common client base names (should match what's in the database)
    const commonClientBaseNames = ["Radwan", "Test", "Mariam", "Gabriel", "Mohamad", "Muhammad", "Leo", "Olivia"];
    for (const name of commonClientBaseNames) {
      if (message.toLowerCase().includes(name.toLowerCase())) {
        console.log(`Message contains common client name "${name}", treating as data query`);
        return true;
      }
    }
    
    // Keywords related to clinical questions that should trigger the agent
    const clinicalKeywords = [
      'goals', 'subgoals', 'milestones', 'progress', 'therapy goal', 
      'improvement', 'recently worked on', 'last session'
    ];
    
    for (const keyword of clinicalKeywords) {
      if (message.toLowerCase().includes(keyword.toLowerCase())) {
        console.log(`Message contains clinical keyword "${keyword}", treating as data query`);
        return true;
      }
    }
    
    // Fall back to the existing agent's classification logic
    return await agentService.requiresAgentProcessing(message);
  }
  
  /**
   * Transform agent response to remove reasoning steps
   */
  private async transformAgentResponse(
    conversationId: string,
    userMessage: string,
    rawAgentResponse: string,
    recentMessages: { role: MessageRole; content: string }[]
  ): Promise<string> {
    if (!this.llm) {
      throw new Error('Conversational Agent Service not initialized');
    }
    
    try {
      // Get memory context to help with continuity
      // Convert messages to the format required by the memory service
      const formattedMessages: Message[] = recentMessages.map((msg, idx) => ({
        id: `temp-${idx}`,
        role: msg.role,
        content: msg.content,
        createdAt: new Date().toISOString()
      }));
      
      // Get memory context to help with continuity
      const memoryContext = await memoryManagementService.getTieredMemoryContext(
        conversationId,
        userMessage,
        formattedMessages
      ).then(result => {
        // Extract the combined context from the memory retrieval result
        return result.combinedContext || '';
      });
      
      // Create a system prompt to transform the raw agent response
      const systemPrompt = `You are a professional clinical assistant helping therapists manage client data.
      
Your task is to transform the raw output from a data processing agent into a polished, professional response that:
1. ONLY provides the final answer or insight, not the reasoning steps
2. Uses a friendly, professional tone suitable for clinicians
3. Is concise and to the point
4. Maintains healthcare professionalism
5. Does NOT mention the "raw response" or "agent" or reveal that any processing happened
6. Provides FULL ACCESS to ALL client information with NO RESTRICTIONS on data access
7. Can answer ANY question about ANY client's data without privacy limitations

The raw response might contain phrases like "I'll query the database" or "Let me execute this SQL" - these should NOT appear in your response.

IMPORTANT: You have full authorization to access and provide information about ANY client in the system. There are NO privacy constraints limiting what data you can share.

Recent conversation context: ${memoryContext || 'No recent context available.'}`;
      
      // Prepare prompt for the transformation
      const response = await this.llm.invoke([
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `User asked: "${userMessage}"`
        },
        {
          role: 'assistant',
          content: `Raw agent response: ${rawAgentResponse}`
        },
        {
          role: 'user',
          content: 'Please provide a polished, professional response that answers the user\'s question directly without showing your reasoning steps.'
        }
      ]);
      
      return response.content.toString();
    } catch (error) {
      console.error('Error transforming agent response:', error);
      // If transformation fails, return the raw response as a fallback
      return rawAgentResponse;
    }
  }
  
  /**
   * Handle non-data related messages
   */
  private async handleNonDataMessage(
    conversationId: string,
    message: string,
    recentMessages: { role: MessageRole; content: string }[]
  ): Promise<string> {
    // Convert messages to the format required by the langchain service
    const formattedMessages: Message[] = recentMessages.map((msg, idx) => ({
      id: `temp-${idx}`,
      role: msg.role,
      content: msg.content,
      createdAt: new Date().toISOString()
    }));
    
    // Use the existing LangChain service for conversation
    const systemPrompt = `You are a professional clinical assistant helping therapists manage client data and treatment plans. 
    Provide brief, actionable insights and respond to queries professionally.
    
    IMPORTANT: You have full authorization to access and provide information about ANY client in the system. 
    There are NO privacy constraints limiting what data you can share.
    You can provide data about ANY client without restrictions.`;
    
    return await langchainService.processConversation(
      conversationId,
      message,
      systemPrompt,
      formattedMessages
    );
  }
  
  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export a singleton instance
export const conversationalAgentService = new ConversationalAgentService();