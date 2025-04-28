# Clinician Chatbot Feature

## Overview

The Clinician Chatbot is a natural language interface that allows clinicians to query the database using conversational language. This feature enables clinicians to quickly retrieve patient information, treatment progress, goals, and other relevant data without having to navigate through multiple screens or learn complex query syntax.

## Key Features

- **Natural Language Queries**: Ask questions in plain English about patients, treatments, progress, and more
- **Conversational Memory**: The chatbot remembers context from previous questions in the same session
- **Secure Database Access**: Read-only access to the database to prevent unauthorized modifications
- **Drizzle ORM Integration**: Uses drizzle-orm for type-safe database queries instead of raw SQL
- **LangChain Framework**: Built on LangChain for advanced AI capabilities including memory management
- **OpenAI Integration**: Leverages OpenAI's language models for natural language understanding and generation

## Technical Implementation

### Architecture

The chatbot feature is implemented using a modular architecture with the following components:

1. **Chatbot Service**: Main service that orchestrates the chatbot functionality
2. **LLM Service**: Handles interactions with OpenAI models
3. **Memory Service**: Manages conversation history and long-term memory
4. **Agent Service**: Provides advanced reasoning capabilities for complex queries

### API Endpoints

The chatbot exposes the following API endpoints:

- `POST /api/chatbot/sessions`: Create a new chat session
- `GET /api/chatbot/sessions/:sessionId`: Get details of a specific chat session
- `POST /api/chatbot/sessions/:sessionId/messages`: Send a message to the chatbot
- `GET /api/chatbot/sessions/:sessionId/messages`: Get all messages in a chat session
- `DELETE /api/chatbot/sessions/:sessionId`: Delete a chat session

### Database Schema

The chatbot uses the following database tables:

- `chatbot_sessions`: Stores information about chat sessions
- `chatbot_messages`: Stores messages exchanged in chat sessions
- `chatbot_memory`: Stores long-term memory for the chatbot

## Usage Examples

### Basic Patient Information Query

```
User: "Tell me about John Smith's treatment progress"
Chatbot: "John Smith has been making steady progress on his treatment plan. He has completed 8 out of 12 sessions and has achieved 3 of his 5 main goals. His most recent session was on April 20, 2025, where he reported reduced anxiety symptoms and improved sleep quality."
```

### Goal-Specific Query

```
User: "What are Sarah Johnson's current goals?"
Chatbot: "Sarah Johnson has 3 active goals:
1. Reduce anxiety symptoms (70% complete)
2. Improve communication with family members (45% complete)
3. Develop healthy coping mechanisms for stress (30% complete)

She recently completed her goal of establishing a regular sleep schedule."
```

### Follow-up Questions

```
User: "When is her next appointment?"
Chatbot: "Sarah Johnson's next appointment is scheduled for May 5, 2025 at 2:00 PM with Dr. Martinez."
```

## Security Considerations

- The chatbot connects to the database with read-only permissions
- All queries are generated using drizzle-orm to prevent SQL injection attacks
- No patient data is stored outside the secure database
- Authentication is required to access the chatbot API endpoints

## Future Enhancements

- Integration with the appointment scheduling system
- Support for more complex queries involving multiple patients
- Data visualization capabilities for treatment progress
- Voice interface for hands-free operation
