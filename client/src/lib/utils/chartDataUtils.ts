import { BudgetItem } from '@shared/schema';
import { BubbleChartData } from '@/lib/agent/types';

/**
 * Category color mapping for consistent visualization
 */
export const categoryColors: Record<string, string> = {
  'Therapy': '#4C9AFF',
  'Therapy Services': '#4C9AFF',
  'Assessment': '#6554C0',
  'Equipment': '#00B8D9',
  'Travel': '#36B37E',
  'Support Coordination': '#FF5630',
  'Accommodation': '#FFAB00',
  'Community Access': '#00C7E6',
  'Other': '#6B778C',
  'Uncategorized': '#6B778C'
};

/**
 * Get color for a budget category
 */
export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return categoryColors['Uncategorized'];
  return categoryColors[category] || categoryColors['Uncategorized'];
}

/**
 * Calculate percent used of a budget item
 */
export function calculatePercentUsed(item: BudgetItem): number {
  // In a real implementation, this would calculate based on actual usage tracking
  // For now, we'll use a simplified approach based on a random percentage
  // This should be replaced with real usage data when available
  
  const basePercentage = 0.4; // 40% base usage
  const randomVariation = Math.random() * 0.3; // Random variation up to 30%
  
  return Math.min(100, Math.round((basePercentage + randomVariation) * 100));
}

/**
 * Transform budget items to bubble chart data format
 */
export function transformBudgetItemsToBubbleChart(
  budgetItems: BudgetItem[]
): BubbleChartData[] {
  return budgetItems.map(item => {
    const totalValue = item.unitPrice * item.quantity;
    const percentUsed = calculatePercentUsed(item);
    
    return {
      id: item.id,
      value: totalValue,
      label: item.name || item.description,
      category: item.category || 'Uncategorized',
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
  
  // Create hierarchical structure
  return {
    name: 'Budget',
    children: Object.entries(groupedByCategory).map(([category, items]) => ({
      name: category,
      color: getCategoryColor(category),
      children: items.map(item => ({
        name: item.label,
        value: item.value,
        color: item.color,
        percentUsed: item.percentUsed
      }))
    }))
  };
}