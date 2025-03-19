import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AgentContextType, AgentResponse, Message, QueryContext } from '@/lib/agent/types';
import { processQuery } from '@/lib/agent/queryProcessor';
import { Client } from '@shared/schema';

// Create the context
const AgentContext = createContext<AgentContextType | null>(null);

// Custom hook to access the context
export function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}

interface AgentProviderProps {
  children: React.ReactNode;
}

// Provider component
export function AgentProvider({ children }: AgentProviderProps) {
  // State
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [queryConfidence, setQueryConfidence] = useState<number>(0);
  const [isAgentVisible, setIsAgentVisible] = useState<boolean>(false);
  const [isProcessingQuery, setIsProcessingQuery] = useState<boolean>(false);
  const [latestVisualization, setLatestVisualization] = useState<'BUBBLE_CHART' | 'PROGRESS_CHART' | 'NONE'>('NONE');
  
  // Process a query
  const processUserQuery = useCallback(async (query: string): Promise<AgentResponse> => {
    try {
      setIsProcessingQuery(true);
      
      // Add user message to history
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: query,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, userMessage]);
      
      // Create context for query processing
      const queryContext: QueryContext = {
        activeClientId: activeClient?.id,
        conversationHistory
      };
      
      // Process the query
      const response = await processQuery(query, queryContext);
      
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
      
      // Update visualization if provided
      if (response.visualizationHint) {
        setLatestVisualization(response.visualizationHint);
      }
      
      return response;
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Add error response to history
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error while processing your query. Please try again.`,
        timestamp: new Date(),
        confidence: 0.3
      };
      
      setConversationHistory(prev => [...prev, errorMessage]);
      setQueryConfidence(0.3);
      
      return {
        content: errorMessage.content,
        confidence: 0.3,
        visualizationHint: 'NONE'
      };
    } finally {
      setIsProcessingQuery(false);
    }
  }, [activeClient, conversationHistory]);
  
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
  
  // Create context value
  const contextValue: AgentContextType = {
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
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}