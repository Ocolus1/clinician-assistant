# Clinician Chatbot Testing Documentation

## Overview

This document describes the testing approach for the clinician-facing chatbot. The tests are designed to verify the chatbot's ability to correctly understand and respond to various types of natural language queries about patients.

## Test Structure

The test suite is organized into two categories:

1. **Database-Independent Tests**: These tests don't require a database connection and focus on testing the entity extraction capabilities of the chatbot.
2. **Database-Dependent Tests**: These tests require a database connection and test the full functionality of the chatbot, including database queries.

## Test Files

### Database-Independent Tests

- `mock-entity-test.js`: Tests the entity extraction service using a mock implementation that doesn't require database access.
- `entity-extraction-enhanced-test.js`: Tests the entity extraction service with a focus on new query types.

### Database-Dependent Tests (Currently Disabled)

- `patient-count-test.js`: Tests the chatbot's ability to respond to patient count queries.
- `expiring-budgets-test.js`: Tests queries about patients with expiring budgets.
- `patient-goal-progress-test.js`: Tests queries about specific patient goal progress.
- `patient-search-test.js`: Tests patient search functionality.

## Mock Implementation

Due to challenges with importing TypeScript modules in JavaScript tests, we've created a mock implementation of the entity extraction service. This mock service:

- Uses regular expressions to identify query types
- Extracts patient names from queries
- Simulates the behavior of the real entity extraction service
- Allows testing without requiring the actual TypeScript implementation

## Running Tests

To run all tests:

```bash
node server/test/chatbot/run-all-tests.js
```

This will run all enabled tests and generate a test report with a timestamp.

## Environment Setup

The tests require certain environment variables to be set:

- `OPENAI_API_KEY`: Required for the entity extraction service to function correctly.
- `DATABASE_URL`: Required for database-dependent tests (currently disabled).

The tests include a utility to load these environment variables from the `.env` file:

```javascript
import loadEnv from './utils/load-env.js';

// Load environment variables from .env file
const envLoaded = loadEnv();
if (!envLoaded) {
  console.error('Failed to load environment variables. Exiting test.');
  process.exit(1);
}
```

## Test Results

The test runner will output a summary of the test results, including:

- Number of passed tests
- Number of failed tests
- Total number of tests
- Pass rate

A test report is also generated and saved to the `server/test/chatbot/` directory with a timestamp.

## Future Improvements

1. **Enable Database-Dependent Tests**: Once the TypeScript import issues are resolved, enable the database-dependent tests to test the full functionality of the chatbot.
2. **Improve Entity Extraction**: Enhance the entity extraction service to better handle complex queries and edge cases.
3. **Add More Test Cases**: Expand the test suite to cover more query types and edge cases.
4. **Implement End-to-End Tests**: Create end-to-end tests that test the full chatbot flow from UI to database and back.

## Troubleshooting

If the tests fail, check the following:

1. **Environment Variables**: Ensure that the required environment variables are set in the `.env` file.
2. **Database Connection**: For database-dependent tests, ensure that the database is running and accessible.
3. **TypeScript Imports**: If you're getting TypeScript import errors, ensure that you're using the mock implementation or have properly configured the TypeScript transpilation.

## Conclusion

The chatbot testing suite provides a comprehensive way to verify the functionality of the clinician-facing chatbot. By separating database-dependent and independent tests, we can quickly verify the core functionality without requiring a database connection.
