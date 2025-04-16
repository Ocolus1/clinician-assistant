/**
 * Result Analysis Service
 * 
 * This service analyzes SQL query results to determine the most appropriate
 * visualization types based on data structure and content.
 */

import { QueryResult, VisualizationType } from '@shared/assistantTypes';

class ResultAnalysisService {
  /**
   * Analyze a SQL query result and determine suitable visualization types
   */
  analyzeVisualization(data: QueryResult): VisualizationType[] {
    // Table visualization is always available
    const visualizations: VisualizationType[] = ['table'];
    
    // If we don't have enough data, just return table
    if (!data || !data.rows || data.rows.length === 0 || data.columns.length < 2) {
      return visualizations;
    }
    
    // Special handling for budget data - check for specific column names
    const isBudgetData = this.detectBudgetData(data);
    if (isBudgetData) {
      console.log('Budget data detected!');
      // Always show bar charts for budget comparisons
      visualizations.push('bar');
      
      // Add pie chart if there are only a few categories (good for proportion visualization)
      if (data.rows.length <= 10) {
        visualizations.push('pie');
      }
      
      return visualizations;
    }
    
    // Analyze the data structure to determine suitable visualizations
    const { 
      hasDateColumn, 
      hasCategoricalColumn, 
      hasNumericColumns,
      rowCount, 
      columnCount 
    } = this.analyzeDataStructure(data);
    
    // Bar charts are good for categorical data with numeric values
    if (hasCategoricalColumn && hasNumericColumns && rowCount <= 20) {
      visualizations.push('bar');
    }
    
    // Line charts are good for time series or ordered data
    if (hasDateColumn && hasNumericColumns) {
      visualizations.push('line');
    } else if (hasCategoricalColumn && hasNumericColumns && rowCount > 5 && rowCount <= 50) {
      // Line charts can also work for categorical data with enough points
      visualizations.push('line');
    }
    
    // Pie charts work best for a small number of categories with a single metric
    if (hasCategoricalColumn && hasNumericColumns && rowCount >= 2 && rowCount <= 10) {
      visualizations.push('pie');
    }
    
    return visualizations;
  }
  
  /**
   * Detect if the data appears to be budget-related
   */
  private detectBudgetData(data: QueryResult): boolean {
    // Check query text for budget-related keywords
    if (data.metadata?.queryText) {
      const query = data.metadata.queryText.toLowerCase();
      if (query.includes('budget') || 
          query.includes('utilization') || 
          query.includes('spent') || 
          query.includes('allocated')) {
        return true;
      }
    }
    
    // Check column names for budget-related terms
    const budgetColumns = ['budget', 'spent', 'utilized', 'allocated', 'utilization', 'percentage'];
    for (const column of data.columns) {
      const colLower = column.toLowerCase();
      for (const term of budgetColumns) {
        if (colLower.includes(term)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Get the default (recommended) visualization for the data
   */
  getDefaultVisualization(data: QueryResult): VisualizationType {
    // Get all possible visualizations
    const visualizations = this.analyzeVisualization(data);
    
    // Table is the universal fallback
    if (visualizations.length === 1) {
      return 'table';
    }
    
    // Check for query hints in the SQL that might suggest a visualization
    const queryHints = this.analyzeQueryForHints(data);
    if (queryHints && visualizations.includes(queryHints)) {
      return queryHints;
    }
    
    // Otherwise apply some heuristics to choose the best visualization
    
    // Check if this looks like time series data
    if (this.isLikelyTimeSeries(data) && visualizations.includes('line')) {
      return 'line';
    }
    
    // For small sets of categories with a single metric, pie charts are good
    if (this.isGoodForPieChart(data) && visualizations.includes('pie')) {
      return 'pie';
    }
    
    // Bar charts are good for comparing categories
    if (visualizations.includes('bar')) {
      return 'bar';
    }
    
    // Line charts are good for trends
    if (visualizations.includes('line')) {
      return 'line';
    }
    
    // Default to table if no better visualization found
    return 'table';
  }
  
  /**
   * Analyze the query text for hints about visualization
   */
  private analyzeQueryForHints(data: QueryResult): VisualizationType | null {
    if (!data.metadata?.queryText) {
      return null;
    }
    
    const queryText = data.metadata.queryText.toLowerCase();
    
    // Look for hints in the query
    if (queryText.includes('count') && queryText.includes('group by')) {
      if (queryText.includes('date') || queryText.includes('month') || queryText.includes('year')) {
        return 'line';
      }
      return 'bar';
    }
    
    // Detect budget utilization queries
    if ((queryText.includes('budget') || queryText.includes('utilization') || queryText.includes('utilized')) && 
        (queryText.includes('percentage') || queryText.includes('sum'))) {
      
      // For budget data with just a few categories, use pie chart
      if (data.rows.length <= 5) {
        return 'pie';
      }
      // Otherwise bar chart is better for comparison
      return 'bar';
    }
    
    // Queries that calculate percentages or distributions may work well as pie charts
    if ((queryText.includes('percent') || queryText.includes('ratio') || queryText.includes('proportion'))
        && queryText.includes('group by')) {
      return 'pie';
    }
    
    return null;
  }
  
  /**
   * Analyze the data structure for visualization decision-making
   */
  private analyzeDataStructure(data: QueryResult) {
    const rows = data.rows;
    const columns = data.columns;
    const rowCount = rows.length;
    const columnCount = columns.length;
    
    let hasDateColumn = false;
    let hasCategoricalColumn = false;
    let hasNumericColumns = false;
    
    // Sample rows to check (look at 10% of the data up to 10 rows)
    const sampleSize = Math.min(10, Math.max(3, Math.ceil(rowCount * 0.1)));
    const sampleRows = rows.slice(0, sampleSize);
    
    // Analyze each column
    for (const column of columns) {
      // Check for date columns
      const dateIndicators = ['date', 'time', 'day', 'month', 'year', 'period'];
      if (dateIndicators.some(i => column.toLowerCase().includes(i))) {
        // Test if values look like dates
        const sampleValue = rows[0][column];
        if (typeof sampleValue === 'string') {
          try {
            const date = new Date(sampleValue);
            if (!isNaN(date.getTime())) {
              hasDateColumn = true;
              continue;
            }
          } catch (e) {
            // Not a date, continue checking
          }
        }
      }
      
      // Count numeric values in this column
      let numericCount = 0;
      let uniqueValues = new Set();
      
      for (const row of sampleRows) {
        const value = row[column];
        uniqueValues.add(value);
        
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
          numericCount++;
        }
      }
      
      // If most values are numbers, it's a numeric column
      if (numericCount / sampleSize > 0.7) {
        hasNumericColumns = true;
      } 
      // If the column has relatively few unique values compared to sample size,
      // it might be categorical
      else if (uniqueValues.size <= Math.min(20, sampleSize * 0.8)) {
        hasCategoricalColumn = true;
      }
    }
    
    return {
      hasDateColumn,
      hasCategoricalColumn,
      hasNumericColumns,
      rowCount,
      columnCount
    };
  }
  
  /**
   * Check if data is likely to be a time series
   */
  private isLikelyTimeSeries(data: QueryResult): boolean {
    // Check for date columns first
    const dateIndicators = ['date', 'time', 'day', 'month', 'year', 'period'];
    for (const column of data.columns) {
      if (dateIndicators.some(i => column.toLowerCase().includes(i))) {
        // Test first value to see if it's a date
        const sampleValue = data.rows[0][column];
        try {
          const date = new Date(sampleValue);
          if (!isNaN(date.getTime())) {
            return true;
          }
        } catch (e) {
          // Not a date, continue checking
        }
      }
    }
    
    return false;
  }
  
  /**
   * Check if data is good for a pie chart visualization
   */
  private isGoodForPieChart(data: QueryResult): boolean {
    // Good pie chart data has a small number of categories with a consistent metric
    
    // Need at least 2 rows to make a pie chart meaningful
    if (data.rows.length < 2 || data.rows.length > 10) {
      return false;
    }
    
    // Need at least two columns (one categorical, one numeric)
    if (data.columns.length < 2) {
      return false;
    }
    
    // Check for a numeric column
    let numericColumn = '';
    for (const column of data.columns) {
      let numericCount = 0;
      for (let i = 0; i < Math.min(5, data.rows.length); i++) {
        const val = data.rows[i][column];
        if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
          numericCount++;
        }
      }
      
      if (numericCount / Math.min(5, data.rows.length) > 0.7) {
        numericColumn = column;
        break;
      }
    }
    
    return numericColumn !== '';
  }
}

// Create a singleton instance
export const resultAnalysisService = new ResultAnalysisService();