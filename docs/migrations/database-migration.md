# Database Migration Documentation

## Overview

This document describes the database migration process for the clinician-assistant application. The migration involved renaming tables and columns for better AI interpretability, transferring data from the old schema to the new schema, and ensuring data integrity throughout the process.

## Schema Changes

### Tables Renamed

- `clients` → `patients`
- `allies` → `caregivers`
- `client_clinicians` → `patient_clinicians`
- `performance_assessments` → `goal_assessments`

### Columns Renamed

- `client_id` → `patient_id` (across multiple tables)
- `ally_id` → `caregiver_id` (across multiple tables)
- `priority` → `importance_level` (in the `goals` table)
- `rating` → `achievement_level` (in the `goal_assessments` table)
- `performance_assessment_id` → `goal_assessment_id` (in the `milestone_assessments` table)

## Migration Scripts

### Schema Migration

The `schema-rename-migration.sql` script handles the renaming of tables and columns:

```sql
-- Rename tables
ALTER TABLE IF EXISTS clients RENAME TO patients;
ALTER TABLE IF EXISTS allies RENAME TO caregivers;
ALTER TABLE IF EXISTS client_clinicians RENAME TO patient_clinicians;
ALTER TABLE IF EXISTS performance_assessments RENAME TO goal_assessments;

-- Rename columns in patient_clinicians
ALTER TABLE IF EXISTS patient_clinicians RENAME COLUMN client_id TO patient_id;

-- Rename columns in caregivers
ALTER TABLE IF EXISTS caregivers RENAME COLUMN client_id TO patient_id;

-- Rename columns in sessions
ALTER TABLE IF EXISTS sessions RENAME COLUMN client_id TO patient_id;

-- Rename columns in goals
ALTER TABLE IF EXISTS goals RENAME COLUMN client_id TO patient_id;
ALTER TABLE IF EXISTS goals RENAME COLUMN priority TO importance_level;

-- Rename columns in goal_assessments
ALTER TABLE IF EXISTS goal_assessments RENAME COLUMN rating TO achievement_level;

-- Rename columns in milestone_assessments
ALTER TABLE IF EXISTS milestone_assessments RENAME COLUMN performance_assessment_id TO goal_assessment_id;
```

### Data Migration

The data migration process involved:

1. **Initial Data Transfer**: Using the `data-migration.cjs` script to transfer data from backup tables to the new schema tables.
2. **Data Integrity Validation**: Using the `check-goals-table.cjs` script to verify the structure and content of the goals table.
3. **Comprehensive Data Migration**: Using the `comprehensive-data-migration.cjs` script to fix data integrity issues, restore missing goals, and ensure proper foreign key relationships.
4. **Goals Data Import**: Using the `import-goals-from-backup.cjs` script to extract and import the original goals data from the backup.sql file, replacing placeholder goals with the real data.
5. **Primary Key Addition**: Using the `add-primary-keys.cjs` script to add primary key constraints to all tables.
6. **Foreign Key Addition**: Using the `add-foreign-keys.cjs` script to add foreign key constraints between related tables.
7. **Orphaned Record Fix**: Using the `fix-orphaned-records.cjs` script to identify and fix orphaned records that violated foreign key constraints.

## Challenges and Solutions

### Challenge 1: Missing Goals

The goal_assessments table contained references to goals that didn't exist in the goals table.

**Solution**: 
1. Initially created placeholder goals for missing IDs to maintain referential integrity
2. Later extracted and imported the original goals data from the backup.sql file (94 goals)
3. Preserved the placeholder goals for any IDs that weren't in the backup file

### Challenge 2: Foreign Key Constraints

The milestone_assessments table had a foreign key constraint referencing the old performance_assessments table.

**Solution**: Updated the foreign key constraint to reference the new goal_assessments table.

### Challenge 3: Sequence Management

When inserting goals with specific IDs, we needed to manage the sequence to avoid conflicts.

**Solution**: Used PostgreSQL's `setval` function to set the sequence to the maximum existing ID before inserting new records.

### Challenge 4: Extracting Data from Backup

We needed to extract the original goals data from the backup.sql file.

**Solution**: Created a script that:
1. Reads the backup.sql file line by line
2. Identifies the COPY section for the goals table
3. Parses the tab-delimited data format
4. Maps the old column names to the new ones (client_id → patient_id, priority → importance_level)
5. Imports the data while preserving the original IDs

### Challenge 5: Missing Primary and Foreign Keys

The database tables lacked primary key and foreign key constraints, which are essential for maintaining data integrity and proper relationships between tables.

**Solution**: Created scripts to:
1. Add primary key constraints to all tables on their 'id' columns
2. Add foreign key constraints between related tables (e.g., caregivers.patient_id → patients.id)
3. Identify and fix orphaned records that would violate foreign key constraints
4. Verify that all constraints were properly added

The following foreign key relationships were established:
- `caregivers.patient_id` → `patients.id`
- `patient_clinicians.patient_id` → `patients.id`
- `patient_clinicians.clinician_id` → `clinicians.id`
- `goals.patient_id` → `patients.id`
- `subgoals.goal_id` → `goals.id`
- `goal_assessments.goal_id` → `goals.id`
- `goal_assessments.session_note_id` → `session_notes.id`
- `sessions.patient_id` → `patients.id`
- `session_notes.session_id` → `sessions.id`
- `milestone_assessments.goal_assessment_id` → `goal_assessments.id`

## Verification Steps

To verify the migration was successful, we:

1. Checked row counts in all affected tables
2. Verified foreign key relationships between tables
3. Ensured all goal_assessments reference valid goals
4. Confirmed that all milestone_assessments reference valid goal_assessments

## Future Considerations

1. **Application Code Updates**: All references to the old table and column names in the application code have been updated.
2. **API Endpoint Testing**: API endpoints have been tested to ensure they work with the new schema.
3. **TypeScript Type Updates**: TypeScript types have been updated to reflect the new schema.

## Conclusion

The database migration was successfully completed, with all tables and columns renamed according to the new schema. Data integrity was maintained throughout the process, and all foreign key relationships were properly updated.
