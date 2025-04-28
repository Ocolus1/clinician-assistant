# Foreign Key Relationships

This document outlines the foreign key relationships established in the database as part of the schema migration process.

## Overview

Foreign key constraints ensure referential integrity between tables. They prevent orphaned records and ensure that relationships between tables are properly maintained.

## Established Foreign Key Relationships

The following foreign key relationships have been established in the database:

| Table Name | Column Name | References Table | References Column |
|------------|-------------|------------------|-------------------|
| caregivers | patient_id | patients | id |
| patient_clinicians | patient_id | patients | id |
| patient_clinicians | clinician_id | clinicians | id |
| goals | patient_id | patients | id |
| subgoals | goal_id | goals | id |
| goal_assessments | goal_id | goals | id |
| goal_assessments | session_note_id | session_notes | id |
| sessions | patient_id | patients | id |
| session_notes | session_id | sessions | id |
| milestone_assessments | goal_assessment_id | goal_assessments | id |
| chat_memories | chat_session_id | chat_sessions | id |
| chat_messages | chat_session_id | chat_sessions | id |
| chat_sessions | clinician_id | clinicians | id |
| chat_summaries | chat_session_id | chat_sessions | id |
| query_logs | chat_message_id | chat_messages | id |

## Database Schema Diagram

```
patients
  ↑
  |
  +--- caregivers (patient_id)
  |
  +--- patient_clinicians (patient_id)
  |     |
  |     +--- clinicians (clinician_id)
  |
  +--- goals (patient_id)
  |     |
  |     +--- subgoals (goal_id)
  |     |
  |     +--- goal_assessments (goal_id)
  |           |
  |           +--- milestone_assessments (goal_assessment_id)
  |
  +--- sessions (patient_id)
        |
        +--- session_notes (session_id)
              |
              +--- goal_assessments (session_note_id)

chat_sessions
  |
  +--- chat_memories (chat_session_id)
  |
  +--- chat_messages (chat_session_id)
  |     |
  |     +--- query_logs (chat_message_id)
  |
  +--- chat_summaries (chat_session_id)
  |
  +--- clinicians (clinician_id)
```

## Benefits

The addition of these foreign key constraints provides several benefits:

1. **Data Integrity**: Ensures that no orphaned records can exist in the database
2. **Referential Integrity**: Guarantees that relationships between tables are valid
3. **Cascading Operations**: When a parent record is deleted, related child records are automatically deleted (ON DELETE CASCADE)
4. **Join Performance**: Improves the performance of joins between tables
5. **Schema Documentation**: Provides clear documentation of the relationships between tables

## Implementation

These foreign key constraints were added using the following scripts:

1. `server/migrations/add-primary-keys.cjs`: Added primary key constraints to all tables
2. `server/migrations/add-foreign-keys.cjs`: Added foreign key constraints between related tables
3. `server/migrations/fix-orphaned-records.cjs`: Fixed orphaned records that would violate foreign key constraints

The scripts first check if the constraints already exist, then add them if they don't. They also handle any data integrity issues that might arise during the process.
