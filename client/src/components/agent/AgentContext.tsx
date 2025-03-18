import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { processQuery } from '@/lib/agent/queryProcessor';
import { Message, AgentResponse, AgentContextType } from '@/lib/agent/types';
import { Client } from '@shared/schema';

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

// Agent provider component
export function AgentProvider({ children }: { children: ReactNode }) {
  // State management
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [queryConfidence, setQueryConfidence] = useState<number>(0);
  const [isAgentVisible, setIsAgentVisible] = useState<boolean>(false);
  const [isProcessingQuery, setIsProcessingQuery] = useState<boolean>(false);
  const [latestVisualization, setLatestVisualization] = useState<'BUBBLE_CHART' | 'PROGRESS_CHART' | 'NONE'>('NONE');

  // Toggle agent visibility
  const toggleAgentVisibility = useCallback(() => {
    setIsAgentVisible(prev => !prev);
  }, []);

  // Clear conversation history
  const clearConversation = useCallback(() => {
    setConversationHistory([]);
    setQueryConfidence(0);
    setLatestVisualization('NONE');
  }, []);

  // Process a query and update state
  const processUserQuery = useCallback(async (query: string): Promise<AgentResponse> => {
    setIsProcessingQuery(true);
    
    // Add user message to history
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    
    setConversationHistory(prev => [...prev, userMessage]);
    
    try {
      // Get context for query processing
      const context = {
        activeClientId: activeClient?.id,
        conversationHistory
      };
      
      // Process the query
      const response = await processQuery(query, context);
      
      // Add assistant response to history
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        confidence: response.confidence
      };
      
      setConversationHistory(prev => [...prev, assistantMessage]);
      setQueryConfidence(response.confidence);
      
      // Update visualization state if the response includes visualization hint
      if (response.visualizationHint) {
        setLatestVisualization(response.visualizationHint);
      }
      
      return response;
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Add error message to history
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
        confidence: 0
      };
      
      setConversationHistory(prev => [...prev, errorMessage]);
      setQueryConfidence(0);
      
      return {
        content: errorMessage.content,
        confidence: 0
      };
    } finally {
      setIsProcessingQuery(false);
    }
  }, [activeClient, conversationHistory]);

  // Context value
  const value: AgentContextType = {
    conversationHistory,
    activeClient,
    queryConfidence,
    isAgentVisible,
    isProcessingQuery,
    latestVisualization,
    processQuery: processUserQuery,
    setActiveClient,
    toggleAgentVisibility,
    clearConversation
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
}

// Hook for using the agent context
export function useAgent() {
  const context = useContext(AgentContext);
  
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  
  return context;
}

// Export index for easier imports
export * from './AgentBubble';
export * from './AgentPanel';
export * from './AgentVisualization';