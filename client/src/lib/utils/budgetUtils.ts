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
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    console.log("No sessions found for calculation");
    return 0;
  }

  let totalSpent = 0;

  try {
    // Loop through all sessions
    for (const session of sessions) {
      // Skip sessions that aren't completed - they shouldn't count toward budget usage
      if (session.status !== 'completed') {
        continue;
      }
      
      // Process products
      let products = [];
      
      // If the session has products property directly
      if (session.products && Array.isArray(session.products)) {
        products = session.products;
      }
      // If the session has a sessionNote property with products
      else if (session.sessionNote && session.sessionNote.products) {
        // Handle string JSON
        if (typeof session.sessionNote.products === 'string') {
          try {
            products = JSON.parse(session.sessionNote.products);
          } catch (e) {
            console.error('Error parsing session note products JSON:', e);
            products = [];
          }
        } 
        // Handle array
        else if (Array.isArray(session.sessionNote.products)) {
          products = session.sessionNote.products;
        }
      }
      
      // Calculate spent amount from products
      for (const product of products) {
        const quantity = Number(product.quantity) || 1;
        const unitPrice = Number(product.unitPrice) || 0;
        totalSpent += quantity * unitPrice;
      }
    }
    
    console.log(`Total spent calculated from completed sessions: $${totalSpent}`);
    return totalSpent;
  } catch (error) {
    console.error("Error calculating spent amount from sessions:", error);
    return 0;
  }
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
    console.error("No budget settings provided");
    return 0;
  }
  
  try {
    // Get the total budget amount
    const totalBudget = Number(budgetSettings.ndisFunds || 0);
    
    // Calculate spent amount
    const spentAmount = calculateSpentFromSessions(sessions);
    
    // Calculate remaining funds
    const remainingFunds = Math.max(0, totalBudget - spentAmount);
    
    console.log(`Budget calculation: 
      Total Budget: $${totalBudget}
      Spent Amount: $${spentAmount}
      Remaining Funds: $${remainingFunds}
    `);
    
    return remainingFunds;
  } catch (error) {
    console.error("Error calculating remaining funds:", error);
    return 0;
  }
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
    console.log("No budget items found for utilization calculation");
    return [];
  }

  if (!sessions || !Array.isArray(sessions)) {
    console.log("No sessions found for utilization calculation");
    sessions = [];
  }

  try {
    // Create a map of itemCode to used counts
    const itemUsage: Record<string, number> = {};
    
    // Process all session products
    for (const session of sessions) {
      // Skip sessions that aren't completed - they shouldn't count toward budget usage
      if (session.status !== 'completed') {
        continue;
      }
      
      // Get products from either session directly or session notes
      let products = [];
      
      // Try direct session products first
      if (session.products && Array.isArray(session.products)) {
        products = session.products;
      } 
      // Then try session note products
      else if (session.sessionNote && session.sessionNote.products) {
        // Handle string JSON
        if (typeof session.sessionNote.products === 'string') {
          try {
            products = JSON.parse(session.sessionNote.products);
          } catch (e) {
            console.error('Error parsing session note products JSON:', e);
            products = [];
          }
        } 
        // Handle array
        else if (Array.isArray(session.sessionNote.products)) {
          products = session.sessionNote.products;
        }
      }
      
      console.log(`Session ${session.id} has ${products.length} products`);
      
      // Add usage for each product
      for (const product of products) {
        const itemCode = product.itemCode || product.productCode;
        if (itemCode) {
          // Add the used quantity for this item code
          const quantity = Number(product.quantity) || 1;
          itemUsage[itemCode] = (itemUsage[itemCode] || 0) + quantity;
          console.log(`Added ${quantity} usage for product code ${itemCode}`);
        }
      }
    }
    
    // Enhance budget items with usage data
    return budgetItems.map(item => {
      // Get the used quantity for this item (or 0 if none found)
      const used = itemUsage[item.itemCode] || 0;
      const totalQuantity = Number(item.quantity) || 0;
      
      // Calculate rates and costs
      const utilizationRate = totalQuantity > 0 ? Math.min(1, used / totalQuantity) : 0;
      const remaining = Math.max(0, totalQuantity - used);
      
      const totalCost = totalQuantity * item.unitPrice;
      const usedCost = used * item.unitPrice;
      const remainingCost = remaining * item.unitPrice;
      
      // Determine statuses
      const isOverutilized = utilizationRate > 0.85;
      const isUnderutilized = utilizationRate < 0.4;
      
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (utilizationRate > 0.9) status = 'critical';
      else if (utilizationRate > 0.75 || utilizationRate < 0.3) status = 'warning';
      
      // Determine usage pattern based on session dates if available
      // For now, use a simple random assignment
      const patterns = ['accelerating', 'decelerating', 'steady', 'fluctuating'] as const;
      const usagePattern = patterns[(item.id * 17) % 4]; // Deterministic but varied
      
      // Return enhanced item
      return {
        ...item,
        used,
        remaining,
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
  } catch (error) {
    console.error("Error calculating budget item utilization:", error);
    return budgetItems.map(item => ({
      ...item,
      used: 0,
      remaining: item.quantity,
      utilizationRate: 0,
      totalCost: item.quantity * item.unitPrice,
      usedCost: 0,
      remainingCost: item.quantity * item.unitPrice,
      isOverutilized: false,
      isUnderutilized: true,
      status: 'normal' as const,
      usagePattern: 'steady' as const,
    }));
  }
}