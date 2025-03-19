import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { processQuery } from '@/lib/agent/queryProcessor';
import type { 
  AgentContextType, 
  Message, 
  QueryContext, 
  AgentResponse, 
  Client, 
  ConversationMemory 
} from '@/lib/agent/types';

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
  // State for conversation and UI
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [queryConfidence, setQueryConfidence] = useState<number>(0);
  const [isAgentVisible, setIsAgentVisible] = useState<boolean>(false);
  const [isProcessingQuery, setIsProcessingQuery] = useState<boolean>(false);
  const [latestVisualization, setLatestVisualization] = useState<'BUBBLE_CHART' | 'PROGRESS_CHART' | 'COMBINED_INSIGHTS' | 'NONE'>('NONE');
  
  // Conversation memory for context retention across interactions
  const conversationMemoryRef = useRef<ConversationMemory>({
    lastQuery: undefined,
    lastTopic: undefined,
    recentEntities: [],
    activeFilters: {},
    contextCarryover: {}
  });

  // Toggle the agent visibility
  const toggleAgentVisibility = useCallback(() => {
    setIsAgentVisible(prev => !prev);
  }, []);

  // Clear the conversation history and memory
  const clearConversation = useCallback(() => {
    setConversationHistory([]);
    
    // Reset conversation memory
    conversationMemoryRef.current = {
      lastQuery: undefined,
      lastTopic: undefined,
      recentEntities: [],
      activeFilters: {},
      contextCarryover: {}
    };
  }, []);

  // Process a user query
  const handleProcessQuery = useCallback(async (query: string): Promise<AgentResponse> => {
    // Don't process empty queries
    if (!query.trim()) {
      return { content: 'I need a question to help you.', confidence: 0 };
    }

    setIsProcessingQuery(true);

    try {
      // Update memory with the new query
      conversationMemoryRef.current.lastQuery = query;
      
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
        conversationMemory: conversationMemoryRef.current
      };

      // Process the query
      const response = await processQuery(query, context);
      setQueryConfidence(response.confidence);

      // Set visualization hint if provided
      if (response.visualizationHint) {
        setLatestVisualization(response.visualizationHint);
      }
      
      // Update conversation memory if there are updates
      if (response.memoryUpdates) {
        conversationMemoryRef.current = {
          ...conversationMemoryRef.current,
          ...response.memoryUpdates
        };
      }

      // Add assistant response to conversation with enhanced metadata
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        confidence: response.confidence,
        data: response.data,
        suggestedFollowUps: response.suggestedFollowUps,
        entities: response.detectedEntities
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
      // Update conversation memory with client context
      if (conversationMemoryRef.current) {
        conversationMemoryRef.current.recentEntities = [
          ...(conversationMemoryRef.current.recentEntities || []),
          {
            text: activeClient.name,
            type: 'ClientName',
            value: activeClient.name,
            position: { start: 0, end: 0 } // Position not relevant for context changes
          }
        ];
        
        // Store client ID in contextCarryover for referencing in subsequent queries
        conversationMemoryRef.current.contextCarryover = {
          ...conversationMemoryRef.current.contextCarryover,
          subject: activeClient.name
        };
      }
      
      // Add client context message to conversation
      const clientUpdateMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I'm now focused on client: ${activeClient.name}. How can I help with this client?`,
        timestamp: new Date(),
        confidence: 1,
        entities: [
          {
            text: activeClient.name,
            type: 'ClientName',
            value: activeClient.name,
            position: { start: 0, end: 0 }
          }
        ]
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