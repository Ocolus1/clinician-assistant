# Database Management Scripts

This document describes utility scripts for managing the database for testing purposes.

## Clear Database Script

The `clear-database.ts` script removes all client data from the database while preserving the schema and reference data (strategies and budget item catalog).

### Usage

```bash
npx tsx clear-database.ts
```

This script will:
1. Delete all records from all tables related to clients
2. Keep the database schema intact
3. Preserve reference data in the strategies and budget_item_catalog tables
4. Give you a clean slate to work with

⚠️ **WARNING**: This action is irreversible and will delete ALL client data from the database.

## Update Client Dates Script

The `update-client-dates.ts` script allows you to modify the creation date of a client and their budget plan for testing purposes.

### Usage

```bash
npx tsx update-client-dates.ts <clientId> [date]
```

#### Parameters:
- `clientId`: The ID of the client to update (required)
- `date`: The new creation date to set in ISO format (optional, defaults to January 4, 2025)

#### Examples:

Set client ID 100 to January 4, 2025:
```bash
npx tsx update-client-dates.ts 100
```

Set client ID 100 to a specific date:
```bash
npx tsx update-client-dates.ts 100 2025-02-15T10:30:00.000Z
```

## Workflow for Creating a Test Client

Here's a recommended workflow for setting up a clean test environment:

1. Clear the database:
   ```bash
   npx tsx clear-database.ts
   ```

2. Create a new client through the UI with all necessary data:
   - Complete the onboarding process
   - Add a budget plan
   - Add allies, goals, etc.

3. Update the client's creation date to a specific date for testing:
   ```bash
   npx tsx update-client-dates.ts <clientId> 2025-01-04T00:00:00.000Z
   ```

4. Create sessions with specific dates and products through the UI or API

This approach gives you a clean, controlled environment for testing with predictable dates and values.