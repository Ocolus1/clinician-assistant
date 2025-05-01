# Foreign Key Constraints Migration

## Overview

This document describes the missing foreign key constraints in the database and provides instructions for applying the migration script to add these constraints.

## Issue Description

During a code review, it was discovered that two important foreign key relationships were not properly enforced at the database level:

1. The relationship between `patients` and `documents` tables
2. The relationship between `patients` and `session_notes` tables

While these relationships were defined in the application code through the ORM (Drizzle), they were not enforced at the database level with actual foreign key constraints. This could potentially lead to:

- Orphaned records (documents or session notes without a valid patient)
- Data integrity issues when deleting patients
- Inconsistent data state between the application and database

## Solution

A migration script (`add-foreign-keys.sql`) has been created to add the missing foreign key constraints. The script:

1. Checks if the `documents` and `session_notes` tables exist
2. Checks if the `patient_id` column exists in each table (or renames `client_id` to `patient_id` if needed)
3. Adds foreign key constraints with `ON DELETE CASCADE` to ensure referential integrity
4. Verifies that the constraints were successfully added

## How to Apply the Migration

### Prerequisites

- PostgreSQL database connection
- Database user with ALTER TABLE privileges

### Application Steps

1. Connect to the database using psql or another PostgreSQL client
2. Run the migration script:

```bash
# Using psql command line
psql -U <username> -d <database_name> -f migrations/add-foreign-keys.sql

# Or from within psql
\i migrations/add-foreign-keys.sql
```

3. Verify the constraints were added by checking the database schema:

```sql
-- Check foreign key constraints for documents table
SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'documents';

-- Check foreign key constraints for session_notes table
SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'session_notes';
```

## Rollback Plan

If issues arise after applying the constraints, you can remove them with:

```sql
-- Remove foreign key constraint from documents table
ALTER TABLE documents DROP CONSTRAINT IF EXISTS fk_documents_patient;

-- Remove foreign key constraint from session_notes table
ALTER TABLE session_notes DROP CONSTRAINT IF EXISTS fk_session_notes_patient;
```

## Impact Analysis

### Positive Impacts

- Improved data integrity at the database level
- Automatic deletion of related documents and session notes when a patient is deleted
- Consistent data model between application code and database schema

### Potential Risks

- If there are existing orphaned records (documents or session notes without valid patient IDs), the migration will fail
- Applications that rely on being able to delete documents or session notes independently might be affected by the cascade delete behavior

## Verification Steps

After applying the migration:

1. Create a test patient
2. Create test documents and session notes linked to that patient
3. Verify that you can retrieve the documents and session notes by patient ID
4. Delete the test patient and verify that the related documents and session notes are also deleted
