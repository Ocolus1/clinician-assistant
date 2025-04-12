# Data Visualization for Clinician Assistant

## Overview
This document outlines the plan for implementing data visualization capabilities for SQL query results in the Clinician Assistant. The visualization component will automatically detect appropriate chart types based on the query results and present them to users alongside traditional tabular data.

## Requirements
- Detect appropriate visualization types based on query result structure
- Support multiple visualization types (tables, bar charts, line charts, pie charts)
- Handle both numeric and categorical data appropriately
- Provide a clean, user-friendly interface for viewing results
- Allow toggling between visualization types where applicable

## Implementation Plan

### Phase 1: Result Analysis Service
1. Create a `resultAnalysisService.ts` to analyze query results and determine appropriate visualization types
2. Implement detection logic for various data patterns:
   - Time series data for line charts
   - Categorical comparisons for bar charts
   - Proportional data for pie charts
   - Complex data for tables

### Phase 2: Visualization Components
1. Create a flexible `QueryResultVisualizer.tsx` component to handle different result types
2. Implement specialized visualization components:
   - `DataTable.tsx` for tabular results
   - `BarChartVisualizer.tsx` for categorical data
   - `LineChartVisualizer.tsx` for time series data
   - `PieChartVisualizer.tsx` for proportional data
3. Add controls for switching between visualization types

### Phase 3: UI Integration
1. Update `MessageBubble.tsx` to incorporate visualizations for query results
2. Add visualization toggle controls in chat interface
3. Implement responsive design for visualizations in different screen sizes

## Technical Approach
- Leverage existing React Query infrastructure for data fetching
- Use recharts or nivo libraries for chart rendering
- Implement clean type definitions for visualization props
- Maintain accessibility standards for all visualizations

## Success Criteria
- Query results automatically visualized with appropriate chart types
- Users can toggle between different visualization types
- Visualizations are responsive and readable on all device sizes
- System gracefully handles edge cases (empty results, error states)