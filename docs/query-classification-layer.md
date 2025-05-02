# Query Classification Layer

## Overview

The Query Classification Layer is a middleware component that determines whether a user query requires database access or can be handled directly without accessing patient data. This enhancement improves the chatbot's responsiveness and user experience by providing immediate responses to conversational queries while still maintaining the ability to access patient data when necessary.

## Features

- **Intelligent Query Classification**: Automatically categorizes queries into three types:
  - **Conversational**: General chat, greetings, etc. that don't require database access
  - **Informational**: General medical or clinical questions that don't require patient-specific data
  - **Patient-Specific**: Queries that require access to patient data in the database

- **Optimized Response Flow**:
  - Conversational queries are answered directly using the LLM without database access
  - Informational queries use general medical knowledge without patient-specific data
  - Patient-specific queries go through the full entity extraction and database query pipeline

- **Performance Benefits**:
  - Reduced latency for simple conversational queries
  - Decreased database load for non-patient-specific queries
  - Improved user experience with faster response times

## Implementation Details

The Query Classification Service uses a two-stage approach:

1. **Fast Classification**: Uses regex patterns to quickly identify obvious conversational or patient-specific queries
2. **AI-Powered Classification**: For more complex queries, uses an LLM to determine the query type and whether database access is required

## Usage Examples

### Conversational Queries (No Database Access)

- "Hello"
- "Good morning"
- "Thank you"
- "How are you?"
- "What can you help me with?"

### Informational Queries (No Patient-Specific Data)

- "What are common symptoms of depression?"
- "How often should therapy sessions be scheduled?"
- "What are evidence-based practices for anxiety treatment?"
- "Can you explain cognitive behavioral therapy?"

### Patient-Specific Queries (Requires Database Access)

- "Show me patient-123456"
- "Look up Radwan Smith-404924"
- "What are John Doe's goals?"
- "When is Sarah's next session?"
- "How many patients do we have?"

## Technical Architecture

The Query Classification Service integrates with the Chatbot Service as a middleware layer:

1. User query is received by the Chatbot Service
2. Query Classification Service determines if database access is needed
3. Based on classification:
   - Conversational/Informational: Direct LLM response
   - Patient-Specific: Entity extraction and database query

## Future Enhancements

- Implement a feedback loop to improve classification accuracy over time
- Add user-specific customization based on query patterns
- Expand the range of informational responses with a dedicated knowledge base
