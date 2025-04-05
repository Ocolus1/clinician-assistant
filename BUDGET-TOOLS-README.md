# Budget Tracking System Tools

This directory contains tools to help diagnose and fix issues with the budget tracking system. These tools connect directly to the database and provide detailed analysis and fixes for budget usage discrepancies.

## Tools Overview

### 1. Budget Diagnosis Tool (`budget-diagnosis.js`)

A focused tool for diagnosing budget tracking issues for a specific client.

```
Usage: node budget-diagnosis.js <clientId> [options]
Options:
  --fix         Attempt to fix identified issues
  --trace       Show detailed debug info during execution
  --verbose     Show all budget items and sessions (not just issues)

Example: node budget-diagnosis.js 88 --fix
```

### 2. Budget Usage Fixer (`budget-usage-fixer.js`)

A comprehensive tool for checking and fixing budget usage discrepancies across all clients.

```
Usage: node budget-usage-fixer.js [options]
Options:
  --fix-all      Fix discrepancies for all clients
  --client=ID    Only check/fix a specific client (by ID)
  --verbose      Show detailed output for all budget items

Example: node budget-usage-fixer.js --fix-all
```

## How Budget Tracking Works

The budget tracking system relies on several critical components working together:

1. **Budget Settings**: Each client can have an active budget plan (stored in `budget_settings` table)
2. **Budget Items**: Each budget plan contains items with quantities and codes (stored in `budget_items` table)
3. **Sessions**: Therapy sessions must be marked as "completed"
4. **Session Notes**: Each completed session can have notes with product usage
5. **Products**: Products in session notes must have codes that match budget item codes

For budget usage to be tracked correctly:

- Both the session AND session note must be marked as "completed"
- Products in session notes must have an itemCode/productCode field
- The product code must match a budget item code (case-insensitive)
- The product must have a valid quantity (defaults to 1 if missing)

## Common Issues

1. **Discrepancies**: Expected vs. actual budget usage doesn't match
2. **Missing Usage**: Budget items showing 0% usage despite completed sessions
3. **Incorrect Codes**: Product codes in sessions not matching budget item codes

## Troubleshooting Steps

1. Run `node budget-usage-fixer.js --client=<ID> --verbose` to see detailed budget usage
2. Check if all sessions are properly marked as "completed"
3. Verify that session notes contain properly formatted product codes
4. Run `node budget-usage-fixer.js --fix-all` to fix all discrepancies in the system

## Maintenance Recommendations

1. Run the budget-usage-fixer.js tool regularly (weekly/monthly) to ensure budget tracking accuracy
2. Monitor error logs for session completions and product usage updates
3. Ensure product codes in session notes consistently use the same format and case as budget item codes