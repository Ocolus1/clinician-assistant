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
 * Uses the actual usage data from the budget item
 */
export function calculatePercentUsed(item: BudgetItem): number {
  const usedQuantity = parseFloat(item.usedQuantity as any) || 0;
  const totalQuantity = parseFloat(item.quantity as any) || 0;
  
  if (totalQuantity === 0) return 0;
  
  const percentage = Math.round((usedQuantity / totalQuantity) * 100);
  console.log(`Budget item ${item.itemCode}: ${usedQuantity}/${totalQuantity} = ${percentage}%`);
  
  // Ensure we return a value between 0-100
  return Math.min(100, Math.max(0, percentage));
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