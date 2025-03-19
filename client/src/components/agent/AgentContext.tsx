import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { processQuery } from '@/lib/agent/queryProcessor';
import type { AgentContextType, Message, QueryContext, AgentResponse, Client } from '@/lib/agent/types';

// Create context with default values
const AgentContext = createContext<AgentContextType>({
  conversationHistory: [],
  activeClient: null,
  queryConfidence: 0,
  isAgentVisible: false,
  isProcessingQuery: false,
  latestVisualization: 'NONE',
  
  processQuery: async () => ({ content: '', confidence: 0 }),
  setActiveClient: () => {},
  toggleAgentVisibility: () => {},
  clearConversation: () => {},
});

// Provider component
export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [queryConfidence, setQueryConfidence] = useState<number>(0);
  const [isAgentVisible, setIsAgentVisible] = useState<boolean>(false);
  const [isProcessingQuery, setIsProcessingQuery] = useState<boolean>(false);
  const [latestVisualization, setLatestVisualization] = useState<'BUBBLE_CHART' | 'PROGRESS_CHART' | 'COMBINED_INSIGHTS' | 'NONE'>('NONE');

  // Toggle the agent visibility
  const toggleAgentVisibility = useCallback(() => {
    setIsAgentVisible(prev => !prev);
  }, []);

  // Clear the conversation history
  const clearConversation = useCallback(() => {
    setConversationHistory([]);
  }, []);

  // Process a user query
  const handleProcessQuery = useCallback(async (query: string): Promise<AgentResponse> => {
    // Don't process empty queries
    if (!query.trim()) {
      return { content: 'I need a question to help you.', confidence: 0 };
    }

    setIsProcessingQuery(true);

    try {
      // Add user message to conversation
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: query,
        timestamp: new Date(),
      };
      
      setConversationHistory(prev => [...prev, userMessage]);

      // Prepare context for query processing
      const context: QueryContext = {
        activeClientId: activeClient?.id,
        conversationHistory: [...conversationHistory, userMessage],
      };

      // Process the query
      const response = await processQuery(query, context);
      setQueryConfidence(response.confidence);

      // Set visualization hint if provided
      if (response.visualizationHint) {
        setLatestVisualization(response.visualizationHint);
      }

      // Add assistant response to conversation
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        confidence: response.confidence,
        data: response.data,
      };
      
      setConversationHistory(prev => [...prev, assistantMessage]);
      
      return response;
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Add error message to conversation
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        confidence: 0,
      };
      
      setConversationHistory(prev => [...prev, errorMessage]);
      
      return { 
        content: 'I encountered an error processing your request. Please try again.', 
        confidence: 0 
      };
    } finally {
      setIsProcessingQuery(false);
    }
  }, [activeClient, conversationHistory]);

  // Load initial conversation or perform setup on mount
  useEffect(() => {
    // Initialize the agent with a greeting if conversation is empty
    if (conversationHistory.length === 0) {
      const welcomeMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "Hello! I'm your therapy practice assistant. How can I help you today? You can ask me about budget plans, client progress, or therapy strategies.",
        timestamp: new Date(),
        confidence: 1,
      };
      
      setConversationHistory([welcomeMessage]);
    }
  }, []);

  // Update context when active client changes
  useEffect(() => {
    if (activeClient) {
      const clientUpdateMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I'm now focused on client: ${activeClient.name}. How can I help with this client?`,
        timestamp: new Date(),
        confidence: 1,
      };
      
      setConversationHistory(prev => [...prev, clientUpdateMessage]);
    }
  }, [activeClient]);

  // Context value
  const contextValue: AgentContextType = {
    conversationHistory,
    activeClient,
    queryConfidence, 
    isAgentVisible,
    isProcessingQuery,
    latestVisualization,
    
    processQuery: handleProcessQuery,
    setActiveClient,
    toggleAgentVisibility,
    clearConversation,
  };

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
};

// Hook for using the Agent context
export const useAgent = () => useContext(AgentContext);

export default AgentContext;