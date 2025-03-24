# Database Management Scripts

This document describes the utility scripts available for managing the database during development and testing.

## Clear Database

The `clear-database.ts` script allows you to clear all client data from the database while preserving the schema and reference data (strategies and budget item catalog).

### Usage:

```bash
npx tsx clear-database.ts
```

### What it does:

1. Deletes all records from the following tables in this order (to respect foreign key constraints):
   - milestone_assessments
   - performance_assessments
   - session_notes
   - sessions
   - subgoals
   - goals
   - budget_items
   - budget_settings
   - allies
   - clients

2. Preserves reference data:
   - strategies (therapy strategies)
   - budget_item_catalog (product catalog items)

### Safety Features:

- Uses transactions to ensure atomicity (all-or-nothing operations)
- Follows correct order of deletions to avoid foreign key constraint errors
- Logs progress and results

## Update Client Dates

The `update-client-dates.ts` script allows you to modify the creation date of a client and their associated budget plan. This is useful for testing date-based functionality like fund utilization timelines, plan expiration alerts, etc.

### Usage:

```bash
npx tsx update-client-dates.ts <clientId> [date]
```

### Parameters:

- `clientId`: The ID of the client to update
- `date` (optional): The new creation date in ISO format. If not provided, defaults to January 4, 2025.

### Example:

```bash
npx tsx update-client-dates.ts 72 2025-01-15T00:00:00.000Z
```

### What it does:

1. Verifies the client exists in the database
2. Updates the associated budget settings' `createdAt` field to the specified date
3. Logs information about the budget plan duration based on the new start date and end date

### Safety Features:

- Uses transactions to ensure atomicity
- Validates client existence before performing updates
- Provides detailed logging of operations performed

## Financial Test Client

The system includes scripts to manage a special "financial test client" with predefined budget and session data:

- `create-financial-test-client.ts`: Creates a client with specific financial data for testing
- `delete-financial-test-client.ts`: Removes the test client and all associated data
- `manage-financial-test-client.ts`: Command-line interface to create or delete the financial test client

### Usage:

```bash
# Create the financial test client
npx tsx create-financial-test-client.ts

# Update the client's creation date (recommended after creation)
npx tsx update-client-dates.ts <clientId> [date]

# Delete the financial test client
npx tsx delete-financial-test-client.ts

# Manage (create or delete) the financial test client
npx tsx manage-financial-test-client.ts [create|delete]
```

### Financial Test Client Specifications:

- Creation date: January 4, 2025 (after running update-client-dates.ts)
- Total budget: $15,000
- 6 sessions with products valued at $1,250 each (total: $7,500)
- Plan expiry: November 12, 2025
- Budget duration: 312 days

### Implementation Notes:

Due to schema differences between the code definition and the actual database structure, the `create-financial-test-client.ts` script:

1. Uses direct SQL queries to insert session notes, bypassing schema validation
2. Sets appropriate values for all required fields (mood ratings, focus, cooperation, etc.)
3. Properly formats JSON products data to calculate financial metrics
4. Can be followed by `update-client-dates.ts` to set a specific creation date (defaults to Jan 4, 2025)

This approach ensures consistent test data even when the schema in code and database differ slightly.

## Schema Discrepancies

There are some known discrepancies between the schema defined in `shared/schema.ts` and the actual database structure. These include:

### Session Notes Table

The schema in code includes:
- `displaySessionId`: This column doesn't exist in the actual database table.

When working with the database directly, be aware of these differences and use the SQL describe command to check the actual table structure:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'session_notes';
```

For scripts that need to bypass schema validation, you can use:
1. Direct SQL queries with `pool.query()` to avoid schema validation
2. The `db.execute()` method instead of higher-level Drizzle ORM functions
3. Create separate schema objects that match the actual database structure

Always test with a small dataset before running on production data.