# API and Client-Side Testing Plan

## API Endpoint Testing

### Patient (formerly Client) Endpoints

- [ ] GET /patients - Retrieve all patients
- [ ] GET /patients/:id - Retrieve a specific patient
- [ ] POST /patients - Create a new patient
- [ ] PUT /patients/:id - Update a patient
- [ ] DELETE /patients/:id - Delete a patient

### Caregiver (formerly Ally) Endpoints

- [ ] GET /caregivers - Retrieve all caregivers
- [ ] GET /caregivers/:id - Retrieve a specific caregiver
- [ ] GET /caregivers/patient/:patientId - Retrieve caregivers for a patient
- [ ] POST /caregivers - Create a new caregiver
- [ ] PUT /caregivers/:id - Update a caregiver
- [ ] DELETE /caregivers/:id - Delete a caregiver

### Goal and Assessment Endpoints

- [ ] GET /goals/patient/:patientId - Retrieve goals for a patient
- [ ] GET /goals/:id - Retrieve a specific goal
- [ ] POST /goals - Create a new goal
- [ ] PUT /goals/:id - Update a goal
- [ ] DELETE /goals/:id - Delete a goal
- [ ] GET /goals/:id/assessments - Retrieve assessments for a goal
- [ ] POST /goals/:id/assessments - Create a new goal assessment

### Chatbot Endpoints

- [ ] POST /chatbot/sessions - Create a new chat session
- [ ] GET /chatbot/sessions/clinician/:clinicianId - Get all chat sessions for a clinician
- [ ] GET /chatbot/sessions/:sessionId - Get a specific chat session
- [ ] PUT /chatbot/sessions/:sessionId/rename - Rename a chat session
- [ ] DELETE /chatbot/sessions/:sessionId - Delete a chat session
- [ ] GET /chatbot/sessions/:sessionId/messages - Get all messages for a chat session
- [ ] POST /chatbot/sessions/:sessionId/messages - Send a message to the chatbot
- [ ] POST /chatbot/agent/query - Process a message using the agent
- [ ] GET /chatbot/sessions/:sessionId/summaries - Get summaries for a chat session
- [ ] POST /chatbot/sessions/:sessionId/summaries - Create a summary for a chat session
- [ ] POST /chatbot/sessions/:sessionId/memories/extract - Extract memories from a chat session
- [ ] GET /chatbot/memories/search - Search for relevant memories


## Client-Side Component Testing

### Patient-Related Components

- [ ] Patient list view
- [ ] Patient detail view
- [ ] Patient creation form
- [ ] Patient edit form

### Caregiver-Related Components

- [ ] Caregiver list view
- [ ] Caregiver detail view
- [ ] Caregiver creation form
- [ ] Caregiver edit form

### Goal and Assessment Components

- [ ] Goal list view
- [ ] Goal detail view
- [ ] Goal creation form
- [ ] Goal edit form
- [ ] Assessment creation form
- [ ] Assessment history view

### Chatbot Components

- [ ] Chat session list
- [ ] Chat interface
- [ ] Message history
- [ ] Memory extraction
- [ ] Summary view


## Data Migration Verification

- [ ] Verify all patient data migrated correctly
- [ ] Verify all caregiver data migrated correctly
- [ ] Verify all goal and assessment data migrated correctly
- [ ] Verify all session notes migrated correctly
- [ ] Verify all budget data migrated correctly


## Testing Method

For each endpoint and component:
1. Test with valid input data
2. Test with invalid input data
3. Verify error handling
4. Verify data consistency across the system


## Test Environment

- Use development environment with test database
- Create sample data for comprehensive testing
- Document any issues found during testing
