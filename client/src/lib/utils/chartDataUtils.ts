import { BudgetItem } from '@shared/schema';
import { BubbleChartData } from '../agent/types';

/**
 * Category color mapping for consistent visualization
 */
export const categoryColors: Record<string, string> = {
  'Speech Therapy': '#3498db', // Blue
  'Occupational Therapy': '#2ecc71', // Green
  'Physical Therapy': '#e74c3c', // Red
  'Behavioral Therapy': '#9b59b6', // Purple
  'Assessment': '#f1c40f', // Yellow
  'Equipment': '#e67e22', // Orange
  'Consumables': '#1abc9c', // Teal
  'Transportation': '#34495e', // Dark Blue
  'Other': '#95a5a6', // Gray
};

/**
 * Get color for a budget category
 */
export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return categoryColors['Other'];
  return categoryColors[category] || categoryColors['Other'];
}

/**
 * Calculate percent used of a budget item
 * In a real app, this would use actual usage data
 */
export function calculatePercentUsed(item: BudgetItem): number {
  // In production this would use actual usage data from DB
  // For now, use a random value between 0-100% for demonstration
  return Math.floor(Math.random() * 100);
}

/**
 * Transform budget items to bubble chart data format
 */
export function transformBudgetItemsToBubbleChart(
  budgetItems: BudgetItem[],
  totalBudget: number
): BubbleChartData[] {
  // Group items by category
  const categorizedItems: Record<string, BudgetItem[]> = {};
  
  budgetItems.forEach(item => {
    const category = item.category || 'Other';
    if (!categorizedItems[category]) {
      categorizedItems[category] = [];
    }
    categorizedItems[category].push(item);
  });
  
  // Transform to bubble chart data
  const bubbleData: BubbleChartData[] = [];
  
  Object.entries(categorizedItems).forEach(([category, items]) => {
    items.forEach(item => {
      const value = item.unitPrice * item.quantity;
      const percentUsed = calculatePercentUsed(item);
      
      bubbleData.push({
        id: item.id,
        label: item.description,
        value,
        category,
        color: getCategoryColor(category),
        percentUsed,
      });
    });
  });
  
  return bubbleData;
}

/**
 * Prepare data for bubble chart hierarchical structure
 */
export function prepareBubbleHierarchy(bubbleData: BubbleChartData[]): any {
  // Group items by category
  const categories: Record<string, any> = {};
  
  bubbleData.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = {
        name: item.category,
        color: item.color,
        children: [],
      };
    }
    
    categories[item.category].children.push({
      name: item.label,
      value: item.value,
      percentUsed: item.percentUsed,
      color: item.color,
    });
  });
  
  // Create hierarchical structure
  return {
    name: 'budget',
    color: '#cccccc',
    children: Object.values(categories),
  };
}