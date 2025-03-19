import React, { createContext, useState, useCallback, useContext } from 'react';
import { Client } from '@shared/schema';
import { AgentContextType, Message, AgentResponse } from '@/lib/agent/types';
import { processQuery } from '@/lib/agent/queryProcessor';
import { v4 as uuidv4 } from 'uuid';

// Create context with default values
const AgentContext = createContext<AgentContextType>({
  conversationHistory: [],
  activeClient: null,
  queryConfidence: 0,
  isAgentVisible: false,
  isProcessingQuery: false,
  latestVisualization: 'NONE',
  
  processQuery: async () => ({ 
    content: '', 
    confidence: 0,
    visualizationHint: 'NONE'
  }),
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
  const [latestVisualization, setLatestVisualization] = useState<'BUBBLE_CHART' | 'PROGRESS_CHART' | 'NONE'>('NONE');

  // Process a query and update state
  const handleProcessQuery = useCallback(async (query: string): Promise<AgentResponse> => {
    try {
      // Create user message
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: query,
        timestamp: new Date(),
      };
      
      // Update conversation history with user message
      setConversationHistory(prev => [...prev, userMessage]);
      
      // Show processing state
      setIsProcessingQuery(true);
      
      // Create context for query processing
      const context = {
        activeClientId: activeClient?.id,
        conversationHistory,
      };
      
      // Process the query
      const response = await processQuery(query, context);
      
      // Create assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        confidence: response.confidence,
      };
      
      // Update conversation history with assistant message
      setConversationHistory(prev => [...prev, assistantMessage]);
      
      // Update confidence and visualization state
      setQueryConfidence(response.confidence);
      if (response.visualizationHint) {
        setLatestVisualization(response.visualizationHint);
      }
      
      return response;
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Create error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        confidence: 0.1,
      };
      
      // Update conversation history with error message
      setConversationHistory(prev => [...prev, errorMessage]);
      
      // Update confidence
      setQueryConfidence(0.1);
      
      return {
        content: 'Error processing query',
        confidence: 0.1,
        visualizationHint: 'NONE',
      };
    } finally {
      // End processing state
      setIsProcessingQuery(false);
    }
  }, [activeClient, conversationHistory]);

  // Set active client
  const handleSetActiveClient = useCallback((client: Client | null) => {
    setActiveClient(client);
  }, []);

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

  // Context value
  const value = {
    conversationHistory,
    activeClient,
    queryConfidence,
    isAgentVisible,
    isProcessingQuery,
    latestVisualization,
    
    processQuery: handleProcessQuery,
    setActiveClient: handleSetActiveClient,
    toggleAgentVisibility,
    clearConversation,
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
};

// Custom hook for using the agent context
export const useAgent = () => useContext(AgentContext);