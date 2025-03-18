import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '@shared/schema';
import { 
  AgentContextType, 
  Message, 
  QueryContext, 
  AgentResponse
} from '@/lib/agent/types';
import { processQuery as processQueryRequest } from '@/lib/agent/queryProcessor';
import { useToast } from '@/hooks/use-toast';

// Create context
const AgentContext = createContext<AgentContextType | null>(null);

// Provider component
export function AgentProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Agent state
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [queryConfidence, setQueryConfidence] = useState<number>(0);
  const [isAgentVisible, setIsAgentVisible] = useState<boolean>(false);
  const [isProcessingQuery, setIsProcessingQuery] = useState<boolean>(false);
  const [latestVisualization, setLatestVisualization] = useState<'BUBBLE_CHART' | 'PROGRESS_CHART' | 'NONE'>('NONE');
  
  // Process a user query
  const processQuery = useCallback(async (query: string): Promise<AgentResponse> => {
    try {
      // Set processing state
      setIsProcessingQuery(true);
      
      // Add user message to history
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: query,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, userMessage]);
      
      // Prepare context for query processing
      const queryContext: QueryContext = {
        activeClientId: activeClient?.id,
        conversationHistory: [...conversationHistory, userMessage]
      };
      
      // Process the query
      const response = await processQueryRequest(query, queryContext);
      
      // Update confidence score
      setQueryConfidence(response.confidence);
      
      // Set visualization type if provided
      if (response.visualizationHint) {
        setLatestVisualization(response.visualizationHint);
      }
      
      // Add assistant response to history
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        confidence: response.confidence
      };
      
      setConversationHistory(prev => [...prev, assistantMessage]);
      
      return response;
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Add error message to history
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        confidence: 0.5
      };
      
      setConversationHistory(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Unable to process your request. Please try again.",
        variant: "destructive"
      });
      
      return {
        content: errorMessage.content,
        confidence: 0.5,
        visualizationHint: 'NONE'
      };
    } finally {
      setIsProcessingQuery(false);
    }
  }, [activeClient, conversationHistory, toast]);
  
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
  
  // Prepare context value
  const value = {
    conversationHistory,
    activeClient,
    queryConfidence,
    isAgentVisible,
    isProcessingQuery,
    latestVisualization,
    processQuery,
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

// Custom hook for using the agent context
export function useAgent() {
  const context = useContext(AgentContext);
  
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  
  return context;
}