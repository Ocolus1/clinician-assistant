# Enhanced Patient Identification

This document describes the enhanced patient identification capabilities implemented in the clinician-facing chatbot.

## Overview

The clinician-facing chatbot has been enhanced to better identify and handle patient-related queries by utilizing multiple patient identifiers:

1. **Patient Name** (`name` field)
2. **Original Patient Name** (`original_name` field)
3. **Unique Patient Identifier** (`unique_identifier` field)

These enhancements improve the accuracy and quality of the chatbot's responses when clinicians ask questions about specific patients.

## Features

### Improved Entity Extraction

The entity extraction service now has enhanced capabilities to identify patient references in queries:

- **Name Recognition**: Improved pattern matching for patient names, including:
  - Full names (e.g., "John Smith")
  - Single names (e.g., "Sarah")
  - Names with middle components (e.g., "John Robert Smith")
  - Names with possessives (e.g., "John's progress")

- **Identifier Recognition**: Added support for detecting unique patient identifiers in various formats:
  - With # symbol (e.g., "#123456")
  - With ID keyword (e.g., "patient ID 123456")
  - Standalone 6-digit numbers (e.g., "123456")
  - With hyphen (e.g., "patient-123456")
  - Combined with names (e.g., "Radwan Smith-404924")

### Enhanced Patient Resolution

The patient resolution process has been improved to:

1. First attempt to resolve patients by their unique identifier
2. Fall back to name-based resolution if no match is found by identifier
3. Use both the `name` and `original_name` fields when searching by name
4. Handle edge cases like partial name matches more effectively

### Testing Framework

A comprehensive testing framework has been implemented to ensure the reliability of these enhancements:

- **Mock Entity Extraction**: A mock implementation for testing without requiring database connections
- **Enhanced Patient Identification Tests**: Specific tests for various name and identifier formats
- **Integration with Test Runner**: All tests are integrated into the main test runner

## Usage Examples

Clinicians can now query patient information in more natural ways:

```javascript
"Show me Sarah Johnson's goal progress"
"Find patient #123456"
"What's the status of John Smith's goals?"
"Look up patient 987654"
"Has Emma Wilson made progress on their goals?"
"Find patient-123456"
"Look up Radwan Smith-404924"
```

## Implementation Details

The implementation includes:

1. **Entity Extraction Service**: Enhanced to identify and extract patient identifiers
2. **Patient Queries Service**: Updated to leverage all three name-related fields
3. **Mock Services**: For testing without database dependencies

## Future Improvements

Potential future enhancements include:

- Fuzzy name matching for better handling of misspelled names
- Support for additional patient identifiers (e.g., email, phone)
- Machine learning-based entity extraction for more complex queries

## Related Documentation

- [Chatbot Testing](./chatbot-testing.md)
- [Changelog](./changelog.md)
