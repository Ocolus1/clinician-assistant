# Allies to Caregivers Migration

## Overview

This document details the migration process from the `allies` table to the new `caregivers` table as part of the clinician-facing chatbot implementation. The migration is designed to improve AI interpretability of the database schema by using more descriptive and consistent table names.

## Migration Process

The migration process involves the following steps:

1. **Schema Migration**: Creating the new `caregivers` table with the appropriate structure
2. **Data Migration**: Transferring data from the `allies` table to the `caregivers` table
3. **Column Renaming**: Converting `client_id` to `patient_id` for consistency with other renamed tables

## Implementation Details

### Migration Scripts

Two new scripts have been created to handle the migration:

1. **migrate-allies-to-caregivers.js**: The main migration script that:
   - Checks if the `allies` table exists
   - Creates the `caregivers` table if it doesn't exist
   - Migrates data from `allies` to `caregivers`
   - Handles the case where the `allies` table doesn't exist by extracting data from `backup.sql`
   - Provides detailed logging of the migration process

2. **run-allies-migration.js**: A wrapper script that:
   - Sets up the environment
   - Runs the migration script
   - Handles errors and provides feedback

### Table Structure

The `caregivers` table maintains the same structure as the `allies` table with the following columns:

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| id | integer | Primary key identifier for each caregiver |
| patient_id | integer | Foreign key reference to the patient (renamed from client_id) |
| name | text | The name of the caregiver |
| relationship | text | The relationship between the caregiver and the patient |
| preferred_language | text | The preferred language of communication for the caregiver |
| email | text | Email address for contacting the caregiver |
| access_therapeutics | boolean | Whether the caregiver has access to therapeutic information |
| access_financials | boolean | Whether the caregiver has access to financial information |
| phone | text | Phone number for contacting the caregiver (nullable) |
| notes | text | Additional notes about the caregiver (nullable) |
| archived | boolean | Whether the caregiver record is archived |

## Running the Migration

To run the migration, execute the following command from the project root:

```bash
node server/scripts/run-allies-migration.js
```

The script will:
1. Connect to the database using the connection string in the environment variables
2. Check if the `allies` table exists
3. Create the `caregivers` table if needed
4. Migrate data from `allies` to `caregivers`
5. Provide detailed logging of the migration process

## Verification

After running the migration, you can verify that the data was migrated correctly by:

1. Checking the number of records in both tables (they should match)
2. Sampling records from both tables to ensure data integrity
3. Verifying that foreign key relationships are maintained

## Fallback Mechanism

If the `allies` table doesn't exist in the database, the migration script will attempt to extract the data from the `backup.sql` file. This ensures that the migration can be completed even if the database schema has already been partially updated.

## Post-Migration Steps

After the migration is complete, the following steps should be taken:

1. Update application code to reference the `caregivers` table instead of `allies`.
2. Update any foreign key references to the `allies` table.
3. Consider dropping the `allies` table once the migration is verified and the application is updated.

## Troubleshooting

If the migration fails, check the following:

1. Ensure the database connection string is correct.
2. Verify that the `allies` table exists or that the `backup.sql` file is accessible.
3. Check for any constraints that might prevent the migration (e.g., foreign key constraints).
4. Review the error messages in the console output for specific issues.
