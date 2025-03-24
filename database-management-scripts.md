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

1. Updates the client's `createdAt` field to the specified date
2. Updates the associated budget settings' `createdAt` field to the same date
3. Logs information about the budget plan duration based on the new start date

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

# Delete the financial test client
npx tsx delete-financial-test-client.ts

# Manage (create or delete) the financial test client
npx tsx manage-financial-test-client.ts [create|delete]
```

### Financial Test Client Specifications:

- Creation date: January 18, 2025
- Total budget: $15,000
- 6 sessions with products valued at $1,250 each (total: $7,500)
- Plan expiry: November 12, 2025