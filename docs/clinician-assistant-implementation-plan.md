# Clinician Assistant Implementation Plan

This document outlines the comprehensive implementation plan for the Clinician Assistant chatbot module, which will allow clinicians to query the SQL database using natural language.

## Overview

The Clinician Assistant will be an AI-powered chatbot interface that allows clinicians to query the database using natural language. It will convert natural language queries into SQL, execute the queries, and present the results in a user-friendly format.

### Core Functionality

- Process natural language queries related to client data, therapy progress, and business metrics
- Generate and execute secure, read-only SQL queries
- Present query results in an easy-to-understand format
- Maintain conversation history and allow switching between conversations

### Query Flow

1. User Input (natural language) → 
2. LLM interprets intent →
3. LLM generates SQL query →
4. Run query against DB →
5. LLM summarizes results →
6. Return answer to user in natural language

## Phase 1: Infrastructure Setup

### 1.1 OpenAI Integration

- Install required dependencies:
  ```
  @langchain/openai
  langchain
  @langchain/community
  openai
  ```
- Create an API key management system for OpenAI
  - Implement secure storage for API keys
  - Add environment variable configuration
  - Create a key validation service
- Establish connection between app and OpenAI's API
  - Implement basic query/response functionality
  - Add error handling for API connection issues
  - Implement rate limiting and usage tracking

### 1.2 Database Connection for LLM

- Create a read-only service for database access
  - Implement connection pooling for efficient queries
  - Set up security restrictions to prevent destructive queries
  - Add query timeout handling
- Map database schema to LLM-friendly format
  - Extract table structures, relationships, and constraints
  - Generate human-readable descriptions of schema elements
  - Format schema information for inclusion in LLM context
- Implement SQL query generation and validation
  - Create a query generation service using LLM
  - Add validation to prevent SQL injection
  - Implement query optimization for better performance

### 1.3 Component Structure

- Create a new "Clinician Assistant" dashboard tile
  - Design the tile UI to match existing dashboard aesthetics
  - Implement click behavior to open the assistant interface
  - Add loading and error states
- Develop the chat interface component
  - Create a clean, intuitive chat UI
  - Implement message rendering for different message types
  - Add input area with appropriate controls
- Implement memory management for conversation history
  - Create a service to store and retrieve conversation history
  - Implement message threading and context management
  - Add pagination for long conversations

## Phase 2: Core LLM Integration

### 2.1 Prompt Engineering

- Design system prompts that include database schema
  - Create base prompt with role and capabilities
  - Include database schema in system context
  - Add examples of various query types
- Create templates for converting natural language to SQL
  - Design chain-of-thought prompts for SQL generation
  - Implement template variables for different query types
  - Add dynamic context insertion
- Set up guardrails to prevent harmful queries
  - Implement keyword filtering for destructive queries
  - Add pattern matching for potentially harmful queries
  - Create post-generation validation

### 2.2 Query Processing Pipeline

- Build the main flow
  - Implement natural language understanding component
  - Create SQL generation and execution service
  - Develop result formatting and summary generation
- Implement error handling for malformed queries
  - Add error detection for invalid SQL
  - Create user-friendly error messages
  - Implement fallback mechanisms for failures
- Add logging for debugging and improvement
  - Create a comprehensive logging system
  - Implement query success/failure tracking
  - Add performance metrics collection

### 2.3 LangChain Integration

- Implement conversation memory
  - Set up memory buffers for context retention
  - Implement summarization for long conversations
  - Add memory persistence across sessions
- Set up tools/agents for database interaction
  - Create custom tools for database operations
  - Implement agent logic for complex queries
  - Add tool selection based on query intent
- Configure chain for sequential processing
  - Set up the chain architecture
  - Implement chain execution and monitoring
  - Add fallback chains for error recovery

## Phase 3: UI Implementation

### 3.1 Chat Interface

- Design and implement the conversational UI
  - Create message bubbles with clear user/bot distinction
  - Implement typing indicators and loading states
  - Add support for formatted message content
- Add message history with timestamps
  - Implement message grouping by time
  - Add message status indicators
  - Create date separators for long conversations
- Include loading states for query processing
  - Add typing animations
  - Implement progress indicators for long-running queries
  - Create skeleton screens for loading states

### 3.2 Results Display

- Create components for displaying query results
  - Implement table view for tabular data
  - Create list view for simpler results
  - Add support for empty/null results
- Implement visualizations for numerical data
  - Add charts for trend data
  - Implement gauges for percentage metrics
  - Create comparison visualizations
- Add copy-to-clipboard functionality for results
  - Add buttons to copy results in different formats
  - Implement feedback for copy operations
  - Add export options for larger result sets

### 3.3 User Experience Enhancements

- Add suggested queries for quick access
  - Create a suggestion UI component
  - Implement context-aware suggestions
  - Add click-to-query functionality
- Implement error messages for failed queries
  - Design user-friendly error states
  - Add recovery suggestions for common errors
  - Implement retry mechanisms
- Add feedback mechanism for improving responses
  - Create thumbs up/down UI
  - Implement feedback collection service
  - Add follow-up questions for negative feedback

### 3.4 Conversation Management

- Implement conversation history storage and retrieval
  - Create database schema for conversations
  - Implement CRUD operations for conversations
  - Add metadata tracking for conversations
- Create a conversation selector UI
  - Design a clean conversation list component
  - Implement conversation switching
  - Add conversation search functionality
- Add functionality for new conversations
  - Create UI for starting fresh conversations
  - Implement clear conversation functionality
  - Add conversation archiving
- Enable resuming previous conversations
  - Implement conversation state restoration
  - Add context reloading for resumed conversations
  - Create "continue where we left off" functionality
- Implement conversation naming/labeling
  - Add UI for naming conversations
  - Create automatic naming suggestions
  - Implement conversation categorization

## Phase 4: Testing and Refinement

### 4.1 Testing

- Test with various query types across different tables
  - Create a test suite for common query patterns
  - Implement automated testing for query processing
  - Add integration tests for end-to-end functionality
- Check security to ensure no destructive queries can run
  - Conduct SQL injection testing
  - Test permission boundaries
  - Verify query safety mechanisms
- Validate result accuracy against direct database queries
  - Implement result comparison testing
  - Add regression tests for fixed issues
  - Create accuracy metrics

### 4.2 Performance Optimization

- Implement caching for repeated queries
  - Add result caching layer
  - Implement cache invalidation strategies
  - Create cache analytics for optimization
- Optimize SQL generation for complex queries
  - Refine prompt templates for better queries
  - Implement query simplification for complex natural language
  - Add query optimization suggestions
- Add rate limiting to prevent API abuse
  - Implement user-based rate limiting
  - Create adaptive throttling based on system load
  - Add usage monitoring and alerts

### 4.3 Refinement

- Improve prompt templates based on test results
  - Analyze failure cases and refine prompts
  - Add more examples for complex query types
  - Implement continuous prompt improvement
- Enhance error messaging and recovery
  - Refine error messages for clarity
  - Add more recovery options for common errors
  - Implement guided recovery for complex failures
- Add more helpful suggestions based on query patterns
  - Analyze common query patterns
  - Implement predictive suggestions
  - Add related query recommendations

## Implementation Details

### Backend Components

1. **OpenAI Service (`server/services/openaiService.ts`)**
   - Interface with OpenAI API
   - Handle API key management
   - Implement rate limiting and error handling

2. **SQL Query Generator (`server/services/sqlQueryGenerator.ts`)**
   - Convert natural language to SQL using LLM
   - Validate generated SQL for safety
   - Handle SQL execution and result processing

3. **Database Schema Provider (`server/services/schemaProvider.ts`)**
   - Extract and format database schema for LLM context
   - Keep schema information up-to-date
   - Provide table relationships for complex queries

4. **Conversation Service (`server/services/conversationService.ts`)**
   - Store and retrieve conversation history
   - Manage conversation metadata
   - Handle conversation switching and creation

5. **API Routes (`server/routes.ts` additions)**
   - Add endpoints for chat interactions
   - Create routes for schema information
   - Implement conversation management endpoints

### Frontend Components

1. **Clinician Assistant Tile (`client/src/components/dashboard/ClinicianAssistantTile.tsx`)**
   - Dashboard integration
   - Modal for chat interface
   - State management for the assistant

2. **Chat Interface (`client/src/components/assistant/ChatInterface.tsx`)**
   - Message display and input
   - History management
   - Loading states and error handling

3. **Conversation Selector (`client/src/components/assistant/ConversationSelector.tsx`)**
   - List of available conversations
   - New conversation button
   - Conversation switching functionality

4. **Results Display (`client/src/components/assistant/ResultsDisplay.tsx`)**
   - Format and display query results
   - Implement visualizations for data
   - Provide context for the displayed information

5. **Query Suggestions (`client/src/components/assistant/QuerySuggestions.tsx`)**
   - Display suggested queries
   - Handle suggestion selection
   - Update suggestions based on context

6. **Assistant Service (`client/src/lib/services/assistantService.ts`)**
   - API calls to backend services
   - Local state management
   - Error handling and retries

### Shared Components

1. **Types Definition (`shared/assistantTypes.ts`)**
   - Define interfaces for chat messages
   - Create types for query results
   - Establish shared constants

2. **Schema Documentation (`shared/databaseDocumentation.ts`)**
   - Human-readable descriptions of tables
   - Field explanations for context
   - Common query examples

## Technology Stack Additions

1. **OpenAI SDK**: For API integration with GPT models
2. **LangChain**: Framework for building LLM applications
3. **SQL Parser**: For validating generated SQL queries
4. **Data Visualization**: For displaying query results effectively

## Dependencies Required

```
@langchain/openai
langchain
@langchain/community
openai
sql-parser
```

## Timeline

- **Phase 1 (Infrastructure Setup)**: 1-2 weeks
- **Phase 2 (Core LLM Integration)**: 2-3 weeks
- **Phase 3 (UI Implementation)**: 2-3 weeks
- **Phase 4 (Testing and Refinement)**: 1-2 weeks

Total estimated time: 6-10 weeks depending on complexity and resource allocation