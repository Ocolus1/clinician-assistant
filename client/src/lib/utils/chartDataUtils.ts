import { BudgetItem, BudgetSettings } from '@shared/schema';
import { BubbleChartData } from '../agent/types';

// Color palette for different budget categories
export const categoryColors: Record<string, string> = {
  'Therapy': '#3498db', // Blue
  'Assessment': '#2ecc71', // Green
  'Equipment': '#e74c3c', // Red
  'Travel': '#f39c12', // Orange
  'Accommodation': '#9b59b6', // Purple
  'Consumables': '#1abc9c', // Teal
  'Other': '#7f8c8d', // Gray
  'default': '#34495e' // Dark gray
};

/**
 * Get color for a budget category
 */
export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return categoryColors.default;
  return categoryColors[category] || categoryColors.default;
}

/**
 * Calculate percent used of a budget item
 */
export function calculatePercentUsed(item: BudgetItem): number {
  // In a real implementation, this would calculate based on actual usage
  // For now, use a random value between 0-100% for visualization
  return Math.min(100, Math.max(0, Math.floor(Math.random() * 100)));
}

/**
 * Transform budget items to bubble chart data format
 */
export function transformBudgetItemsToBubbleChart(
  budgetItems: BudgetItem[],
  spendingByCategory?: Record<string, number>
): BubbleChartData[] {
  if (!budgetItems?.length) return [];
  
  return budgetItems.map(item => {
    const category = item.category || 'Other';
    const value = item.unitPrice * item.quantity;
    
    // Calculate percent used, either from provided spending data or estimate
    let percentUsed = 0;
    if (spendingByCategory && spendingByCategory[category]) {
      // If we have spending data by category, distribute proportionally to item value
      const categorySpent = spendingByCategory[category];
      const categoryTotal = budgetItems
        .filter(i => (i.category || 'Other') === category)
        .reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
      
      if (categoryTotal > 0) {
        percentUsed = Math.min(100, (categorySpent / categoryTotal) * 100);
      }
    } else {
      percentUsed = calculatePercentUsed(item);
    }
    
    return {
      id: item.id,
      value,
      label: item.description,
      category,
      color: getCategoryColor(category),
      percentUsed
    };
  });
}

/**
 * Prepare data for bubble chart hierarchical structure
 */
export function prepareBubbleHierarchy(bubbleData: BubbleChartData[]): any {
  // Group by category
  const categorized = bubbleData.reduce((result: Record<string, BubbleChartData[]>, item) => {
    const category = item.category || 'Other';
    if (!result[category]) {
      result[category] = [];
    }
    result[category].push(item);
    return result;
  }, {});
  
  // Create hierarchy
  return {
    name: 'Budget',
    children: Object.entries(categorized).map(([category, items]) => ({
      name: category,
      color: getCategoryColor(category),
      children: items.map(item => ({
        name: item.label,
        value: item.value,
        color: item.color,
        percentUsed: item.percentUsed,
        id: item.id
      }))
    }))
  };
}