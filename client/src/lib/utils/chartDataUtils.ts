import { BudgetItem } from '@shared/schema';
import { BubbleChartData } from '@/lib/agent/types';

/**
 * Category color mapping for consistent visualization
 */
export const categoryColors: Record<string, string> = {
  'Therapy': '#4F46E5', // Indigo
  'Assessment': '#0EA5E9', // Sky blue
  'Equipment': '#10B981', // Emerald
  'Travel': '#F59E0B', // Amber
  'Support': '#EC4899', // Pink
  'Other': '#6B7280', // Gray
  // Add more categories as needed
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
  // For now, we'll generate a random percentage
  // In a real app, this would come from actual usage data
  return Math.floor(Math.random() * 100);
}

/**
 * Transform budget items to bubble chart data format
 */
export function transformBudgetItemsToBubbleChart(
  budgetItems: BudgetItem[]
): BubbleChartData[] {
  return budgetItems.map(item => {
    const percentUsed = calculatePercentUsed(item);
    
    return {
      id: item.id,
      value: item.unitPrice * item.quantity,
      label: item.name || item.itemCode,
      category: item.category || 'Other',
      color: getCategoryColor(item.category),
      percentUsed
    };
  });
}

/**
 * Prepare data for bubble chart hierarchical structure
 */
export function prepareBubbleHierarchy(bubbleData: BubbleChartData[]): any {
  // Group by category
  const groupedByCategory = bubbleData.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, BubbleChartData[]>);

  // Create hierarchy
  return {
    name: 'budget',
    children: Object.keys(groupedByCategory).map(category => ({
      name: category,
      color: getCategoryColor(category),
      children: groupedByCategory[category].map(item => ({
        name: item.label,
        value: item.value,
        color: item.color,
        percentUsed: item.percentUsed
      }))
    }))
  };
}