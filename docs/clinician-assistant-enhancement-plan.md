# Clinician Assistant Enhancement Plan

## Overview

This document outlines our plan to enhance the Clinician Assistant by addressing various edge cases, improving query capabilities, and ensuring adaptability to future schema changes. The goal is to create a more robust system that can handle complex questions and provide accurate answers while maintaining data integrity.

## Current Limitations & Edge Cases

### 1. Single-Query Constraint
The assistant is currently limited to generating and executing only one SQL query per question. This constrains its ability to:
- Gather information spread across multiple tables
- Resolve ambiguous references
- Provide complete answers to complex questions

### 2. Schema Interpretation Issues
- Table and column names lack semantic context for the AI
- No mapping between business concepts and technical schema
- Difficulty interpreting domain-specific terminology

### 3. Additional Edge Cases
- **Temporal Reasoning**: Limited ability to handle time-based analysis
- **Ambiguous Entity References**: Struggles with imprecise entity references
- **Complex Joins**: Sub-optimal queries when joining 3+ tables
- **Aggregate Functions**: Challenges with statistical analysis
- **Schema Evolution**: No adaptive mechanism for schema changes
- **Query Performance**: No awareness of optimization techniques
- **Partial Information**: Cannot request additional clarification

## Enhancement Plan

### Phase 1: Schema Annotation & Business Context

#### Schema Metadata Layer
Create a metadata layer that enriches the database schema with business context:

```typescript
export const schemaMetadata = {
  tables: {
    clients: {
      description: "Therapy clients receiving services",
      businessTerms: ["patient", "customer", "client"],
      conceptMappings: {
        "client identifier": ["name", "unique_identifier"],
        "contact information": ["contact_email", "contact_phone"]
      }
    },
    sessions: {
      description: "Therapy service sessions with clients",
      businessTerms: ["appointment", "visit", "service", "sales"],
      conceptMappings: {
        "revenue": "duration", // In this domain, duration might relate to billable time
        "sales": "status='completed'" // Completed sessions count as sales
      }
    },
    // Additional tables...
  }
};
```

#### Schema Change Protocol
Implement a protocol for schema evolution:

1. **Schema Versioning**: Track schema versions with schema hash
2. **Change Detection**: Automatic detection of schema changes
3. **Metadata Update Process**: Clear guidelines for updating schema metadata
4. **Change Documentation**: Template for documenting schema changes
5. **Compatibility Checking**: Verification that templates remain valid

### Phase 2: Multi-Step Query System

Enhance the query execution framework to support multiple interdependent queries:

#### Query Chain Architecture
```typescript
interface QueryStep {
  purpose: string;
  query: string;
  dependsOn: string[];
  results?: any[];
}

interface QueryChain {
  steps: QueryStep[];
  maxSteps: number;
  currentStep: number;
  finalResults?: any;
}
```

#### Implementation Strategy
1. **Dynamic Chain Length**: Allow the agent to determine necessary query steps
2. **Query Planning**: Pre-plan queries before execution
3. **Context Preservation**: Maintain context between query steps
4. **Result Aggregation**: Combine results from multiple queries
5. **Maximum Step Limit**: Prevent infinite chains (5-7 queries max)

### Phase 3: Query Templates for Common Questions

Based on a curated list of common questions, develop parameterized query templates:

#### Template Structure
```typescript
interface QueryTemplate {
  id: string;
  questionPatterns: string[];
  sqlTemplate: string;
  requiredParameters: string[];
  optionalParameters: Record<string, any>;
  resultProcessor: (results: any[]) => any;
}
```

#### Template Categories
- **Entity Identification**: Finding specific entities
- **Count/Aggregation**: Counting or summarizing entities
- **Relationship Queries**: Exploring entity relationships
- **Temporal Analysis**: Time-based data analysis
- **Status Reports**: Current status of entities
- **Comparison Queries**: Comparing different entities/periods

#### Template Selection Process
1. Check if question matches known patterns
2. Extract parameters from the question
3. Apply parameters to the template
4. Execute the query
5. Process results through the template's processor

### Phase 4: Error Handling & Fallback Strategies

Implement robust error handling and fallback mechanisms:

#### Error Categories
- **Schema Mismatch**: Table/column not found
- **Data Type Issues**: Type conversion errors
- **Constraint Violations**: Logical constraints not satisfied
- **Empty Results**: Valid query but no matching data
- **Performance Issues**: Query timeout or excessive resource usage

#### Fallback Strategies
- **Entity Search Relaxation**: Broaden search criteria
- **Simplified Queries**: Fall back to simpler query versions
- **Suggestion Generation**: Provide alternative questions
- **Template Switching**: Try alternative templates
- **Clarification Request**: Identify missing information

### Phase 5: Integration & Deployment

Bring all enhancements together into a cohesive system:

1. **Schema Annotation**: Deploy enriched schema metadata
2. **Multi-Query Engine**: Implement the query chain architecture
3. **Template System**: Deploy the template-based system
4. **Error Handling**: Integrate robust error handling
5. **Testing**: Verify with the common question list
6. **Monitoring**: Track success rates and performance

## Schema Evolution Guide

### Guidelines for Future Schema Changes

To ensure that schema changes don't disrupt the assistant's capabilities:

1. **Document First Approach**: 
   Before modifying the database schema, document the changes in a standardized template

2. **Update Schema Metadata**:
   ```typescript
   // When adding a new table
   schemaMetadata.tables.newTable = {
     description: "Clear description of business purpose",
     businessTerms: ["synonym1", "synonym2"],
     conceptMappings: { /* business concept mappings */ }
   };
   
   // When adding a column
   schemaMetadata.tables.existingTable.columns.newColumn = {
     description: "Purpose of this column",
     businessTerms: ["term1", "term2"]
   };
   ```

3. **Review Templates**:
   Identify and update query templates that might be affected by the schema change

4. **Test Common Questions**:
   Verify that common questions still produce correct results

5. **Versioning**:
   Update the schema version number

### Schema Change Documentation Template

```markdown
## Schema Change Documentation

### Change Details
- **Date**: YYYY-MM-DD
- **Developer**: Name
- **Change Type**: [New Table/New Column/Modified Table/etc]
- **Description**: Brief description of the change

### Technical Details
- **Tables Affected**: [table names]
- **Columns Added/Modified**: [column details]
- **Constraints/Indexes**: [any constraints or indexes]

### Business Context
- **Business Purpose**: Why this change is needed
- **Terminology**: New business terms introduced
- **Concept Mappings**: How business concepts map to the schema

### Template Impact
- **Templates Affected**: [template IDs]
- **New Template Needs**: [any new templates required]

### Testing
- **Test Questions**: List of questions to verify functionality
- **Test Results**: Summary of test outcomes
```

## Next Steps

1. **Gather Common Questions**: Compile a comprehensive list of common user questions
2. **Prioritize Enhancements**: Determine which enhancements provide the most immediate value
3. **Develop Proof of Concept**: Implement key enhancements in a controlled environment
4. **Incremental Deployment**: Roll out enhancements in phases
5. **Continuous Monitoring**: Track performance and adapt as needed

By following this plan, we can significantly enhance the Clinician Assistant's capabilities while ensuring resilience to future schema changes.