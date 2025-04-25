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
        throw new Error(
          "No API key available for Conversational Agent Service"
        );
      }

      if (model) {
        this.model = model;
      }

      // Initialize LLM for conversation
      this.llm = new ChatOpenAI({
        openAIApiKey: this.apiKey,
        modelName: this.model,
        temperature: this.temperature,
      });

      this.initialized = true;
      console.log(
        `Conversational Agent Service initialized with model: ${this.model}`
      );
    } catch (error) {
      console.error(
        "Failed to initialize Conversational Agent Service:",
        error
      );
      throw new Error("Failed to initialize Conversational Agent Service");
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
      throw new Error("Conversational Agent Service not initialized");
    }

    try {
      console.log(
        `Processing user message: "${messageContent.substring(0, 50)}..."`
      );

      // First, check if this query requires data processing via the agent
      const requiresDataProcessing = await this.requiresDataProcessing(
        messageContent
      );
      console.log(`Query requires data processing: ${requiresDataProcessing}`);

      // Convert messages to the format needed for context
      const formattedMessages = recentMessages.map((msg) => ({
        role: msg.role as MessageRole,
        content: msg.content,
      }));

      if (requiresDataProcessing) {
        console.log(
          "Query requires data processing, delegating to agent service"
        );

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
          console.error("Error in agent processing:", error);
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
      console.error("Error processing user message:", error);
      return `I'm having trouble processing your request. ${
        error.message || "Please try again or rephrase your question."
      }`;
    }
  }

  /**
   * Determine if a message requires data processing
   */
  private async requiresDataProcessing(message: string): Promise<boolean> {
    // Delegate to the existing agent's classification logic
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
      throw new Error("Conversational Agent Service not initialized");
    }

    try {
      // Get memory context to help with continuity
      const memoryContext = await memoryManagementService
        .getTieredMemoryContext(conversationId, userMessage, recentMessages)
        .then((result) => result.recentMemory || "");

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

Recent conversation context: ${
        memoryContext || "No recent context available."
      }`;

      // Prepare prompt for the transformation
      const response = await this.llm.invoke([
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `User asked: "${userMessage}"`,
        },
        {
          role: "assistant",
          content: `Raw agent response: ${rawAgentResponse}`,
        },
        {
          role: "user",
          content:
            "Please provide a polished, professional response that answers the user's question directly without showing your reasoning steps.",
        },
      ]);

      return response.content.toString();
    } catch (error) {
      console.error("Error transforming agent response:", error);
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
      recentMessages
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
