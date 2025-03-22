/**
 * Budget Utility Functions
 * 
 * Helper functions for budget and fund utilization calculations
 */

/**
 * Calculates the total amount spent from session products
 * 
 * @param sessions Array of client sessions
 * @returns The total amount spent across all sessions
 */
export function calculateSpentFromSessions(sessions: any[]): number {
  if (!sessions || !Array.isArray(sessions)) {
    return 0;
  }

  // Track the total spent
  let totalSpent = 0;

  // Calculate total spent from session products
  for (const session of sessions) {
    // Get the session ID to fetch the associated session note
    const sessionId = session.id;
    
    // Check for products directly on the session (future implementation)
    if (session.products && Array.isArray(session.products)) {
      for (const product of session.products) {
        const quantity = product.quantity || 1;
        const unitPrice = parseFloat(product.unitPrice) || 0;
        totalSpent += quantity * unitPrice;
      }
      continue; // Skip to next session if we found products
    }
    
    // Look for the sessionNote field which might contain products
    if (session.sessionNote && session.sessionNote.products && Array.isArray(session.sessionNote.products)) {
      for (const product of session.sessionNote.products) {
        const quantity = product.quantity || 1;
        const unitPrice = parseFloat(product.unitPrice) || 0;
        totalSpent += quantity * unitPrice;
      }
    }
  }

  return totalSpent;
}

/**
 * Calculates the funds remaining from budget and sessions
 * 
 * @param budgetSettings The budget settings object with total budget
 * @param sessions Array of client sessions with products
 * @returns The remaining funds amount
 */
export function calculateRemainingFunds(budgetSettings: any, sessions: any[]): number {
  if (!budgetSettings) {
    return 0;
  }
  
  // Get total budget from settings
  const totalBudget = budgetSettings.ndisFunds ? parseFloat(budgetSettings.ndisFunds) : 0;
  
  // Calculate spent amount from sessions
  const totalSpent = calculateSpentFromSessions(sessions);
  
  // Calculate remaining funds
  return Math.max(0, totalBudget - totalSpent);
}

/**
 * Calculate actual utilization rates for budget items based on session products
 * 
 * @param budgetItems Array of budget items
 * @param sessions Array of client sessions with products
 * @returns Enhanced budget items with actual utilization data
 */
export function calculateBudgetItemUtilization(budgetItems: any[], sessions: any[]): any[] {
  if (!budgetItems || !Array.isArray(budgetItems) || budgetItems.length === 0) {
    return [];
  }
  
  // Create a map of item names/codes to track usage
  const itemUsage: Record<string, { used: number, total: number }> = {};
  
  // Initialize usage tracking for each budget item
  budgetItems.forEach(item => {
    const key = item.name || item.description || item.itemCode;
    if (key) {
      itemUsage[key] = { 
        used: 0, 
        total: parseFloat(item.quantity) || 0 
      };
    }
  });
  
  // Process all sessions to track product usage
  if (sessions && Array.isArray(sessions)) {
    sessions.forEach(session => {
      // Extract products from session
      const products: any[] = [];
      
      // Check for products directly on the session
      if (session.products && Array.isArray(session.products)) {
        products.push(...session.products);
      }
      
      // Check for products in session notes
      if (session.sessionNote && session.sessionNote.products && Array.isArray(session.sessionNote.products)) {
        products.push(...session.sessionNote.products);
      }
      
      // Update usage for each product
      products.forEach(product => {
        const key = product.name;
        if (key && itemUsage[key]) {
          itemUsage[key].used += parseFloat(product.quantity) || 0;
        }
      });
    });
  }
  
  // Update budget items with actual usage data
  return budgetItems.map(item => {
    const key = item.name || item.description || item.itemCode;
    const usage = itemUsage[key] || { used: 0, total: parseFloat(item.quantity) || 0 };
    
    // Calculate utilization rate
    const utilizationRate = usage.total > 0 ? Math.min(1, usage.used / usage.total) : 0;
    
    // Calculate costs
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const totalCost = usage.total * unitPrice;
    const usedCost = usage.used * unitPrice;
    const remainingCost = Math.max(0, totalCost - usedCost);
    
    // Determine status flags
    const isOverutilized = utilizationRate > 0.85;
    const isUnderutilized = utilizationRate < 0.4;
    
    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (utilizationRate > 0.9) status = 'critical';
    else if (utilizationRate > 0.75 || utilizationRate < 0.3) status = 'warning';
    
    // Most items will have steady usage pattern to start with
    const usagePattern = 'steady';
    
    return {
      ...item,
      used: usage.used,
      remaining: Math.max(0, usage.total - usage.used),
      utilizationRate,
      totalCost,
      usedCost,
      remainingCost,
      isOverutilized,
      isUnderutilized,
      status,
      usagePattern,
    };
  });
}