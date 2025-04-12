/**
 * Result Analysis Service
 * 
 * This service analyzes query results and determines the most appropriate
 * visualization types based on the data structure.
 */

import { QueryResult, VisualizationType } from '@shared/assistantTypes';

export class ResultAnalysisService {
  /**
   * Analyze the query result to determine the most appropriate visualization types
   */
  analyzeVisualization(result: QueryResult): VisualizationType[] {
    if (!result.columns.length || !result.rows.length) {
      return ['table']; // Default to table for empty results
    }
    
    const possibleVisualizations: VisualizationType[] = ['table']; // Table is always possible
    
    // Check if we have time series data (suitable for line chart)
    if (this.hasTimeSeriesPattern(result)) {
      possibleVisualizations.push('line');
    }
    
    // Check if we have categorical data with numeric values (suitable for bar chart)
    if (this.hasCategoricalData(result)) {
      possibleVisualizations.push('bar');
    }
    
    // Check if we have proportional data (suitable for pie chart)
    if (this.hasProportionalData(result)) {
      possibleVisualizations.push('pie');
    }
    
    return possibleVisualizations;
  }
  
  /**
   * Determine the default visualization type based on the data
   */
  getDefaultVisualization(result: QueryResult): VisualizationType {
    const possibleTypes = this.analyzeVisualization(result);
    
    // If only table is available, use that
    if (possibleTypes.length === 1) {
      return possibleTypes[0];
    }
    
    // Prefer more specialized visualizations when appropriate
    if (this.isIdealForLineChart(result) && possibleTypes.includes('line')) {
      return 'line';
    }
    
    if (this.isIdealForPieChart(result) && possibleTypes.includes('pie')) {
      return 'pie';
    }
    
    if (this.isIdealForBarChart(result) && possibleTypes.includes('bar')) {
      return 'bar';
    }
    
    // Default to table for complex data
    return 'table';
  }
  
  /**
   * Check if the data has a time series pattern
   * (Columns that look like dates/times, with sequential values)
   */
  private hasTimeSeriesPattern(result: QueryResult): boolean {
    // Look for date/time-like columns
    const dateColumns = result.columns.filter(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') ||
      col.toLowerCase().includes('day') ||
      col.toLowerCase().includes('month') ||
      col.toLowerCase().includes('year')
    );
    
    if (dateColumns.length === 0) {
      return false;
    }
    
    // Check if we have at least one numeric column alongside the date column
    const hasNumericValues = result.columns.some(col => {
      if (dateColumns.includes(col)) return false;
      return result.rows.some(row => typeof row[col] === 'number');
    });
    
    return hasNumericValues;
  }
  
  /**
   * Check if the data is ideal for a line chart
   * (Time series with clear trends)
   */
  private isIdealForLineChart(result: QueryResult): boolean {
    // More than 5 data points is good for a line chart
    if (result.rows.length < 5) {
      return false;
    }
    
    return this.hasTimeSeriesPattern(result);
  }
  
  /**
   * Check if the data has categorical data with numeric values
   * (String/category columns with corresponding numeric values)
   */
  private hasCategoricalData(result: QueryResult): boolean {
    // Need at least two columns, likely one for categories and one for values
    if (result.columns.length < 2) {
      return false;
    }
    
    // Check for mix of categorical and numeric columns
    const columnTypes = result.columns.map(col => {
      const values = result.rows.map(row => row[col]);
      const hasNumeric = values.some(val => typeof val === 'number');
      const hasStrings = values.some(val => typeof val === 'string');
      return { column: col, hasNumeric, hasStrings };
    });
    
    const hasCategories = columnTypes.some(col => col.hasStrings);
    const hasValues = columnTypes.some(col => col.hasNumeric);
    
    return hasCategories && hasValues;
  }
  
  /**
   * Check if the data is ideal for a bar chart
   * (Clear categorical data with distinct values)
   */
  private isIdealForBarChart(result: QueryResult): boolean {
    // Bar charts work well for a moderate number of categories
    if (result.rows.length > 15 || result.rows.length < 2) {
      return false;
    }
    
    return this.hasCategoricalData(result);
  }
  
  /**
   * Check if the data has proportional data
   * (Data that sums to a whole or represents parts of a whole)
   */
  private hasProportionalData(result: QueryResult): boolean {
    // Pie charts are good for 2-7 categories
    if (result.rows.length < 2 || result.rows.length > 7) {
      return false;
    }
    
    // Look for one categorical column and one numeric column
    if (result.columns.length < 2) {
      return false;
    }
    
    // Check if all values in a numeric column are positive (requirement for pie charts)
    return result.columns.some(valueCol => {
      const allPositive = result.rows.every(row => {
        const val = row[valueCol];
        return typeof val === 'number' && val >= 0;
      });
      
      // At least one value must be non-zero
      const hasNonZero = result.rows.some(row => {
        const val = row[valueCol];
        return typeof val === 'number' && val > 0;
      });
      
      return allPositive && hasNonZero;
    });
  }
  
  /**
   * Check if the data is ideal for a pie chart
   * (Small number of categories with proportional values)
   */
  private isIdealForPieChart(result: QueryResult): boolean {
    // Pie charts are best with 3-5 segments
    if (result.rows.length < 2 || result.rows.length > 5) {
      return false;
    }
    
    return this.hasProportionalData(result);
  }
}

export const resultAnalysisService = new ResultAnalysisService();