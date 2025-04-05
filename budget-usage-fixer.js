/**
 * Budget Usage Fixer and Validator
 * 
 * This script identifies and fixes discrepancies between expected and actual budget usage
 * across all clients in the system. It can be run periodically to ensure budget utilization
 * reporting is accurate.
 * 
 * Usage: node budget-usage-fixer.js [options]
 * Options:
 *   --fix-all      Fix discrepancies for all clients
 *   --client=ID    Only check/fix a specific client (by ID)
 *   --verbose      Show detailed output for all budget items
 */

import pg from 'pg';
const { Pool } = pg;

// ANSI color codes for formatted output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright: '\x1b[1m',
  reset: '\x1b[0m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  fixAll: args.includes('--fix-all'),
  verbose: args.includes('--verbose'),
  clientId: null
};

// Check for client ID argument
const clientArg = args.find(arg => arg.startsWith('--client='));
if (clientArg) {
  options.clientId = parseInt(clientArg.split('=')[1], 10);
}

// Database connection
let pool;

async function main() {
  console.log(`${colors.bright}${colors.blue}===== Budget Usage Fixer and Validator =====\n${colors.reset}`);
  
  // Initialize database connection
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log(`${colors.green}✓ Connected to database${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error connecting to database:${colors.reset}`, error);
    process.exit(1);
  }
  
  try {
    // Get list of clients to process
    let clients;
    
    if (options.clientId) {
      // Process only the specified client
      const result = await pool.query('SELECT id, name FROM clients WHERE id = $1', [options.clientId]);
      clients = result.rows;
      
      if (clients.length === 0) {
        console.log(`${colors.red}Error: Client with ID ${options.clientId} not found${colors.reset}`);
        process.exit(1);
      }
    } else {
      // Process all clients
      const result = await pool.query('SELECT id, name FROM clients ORDER BY id');
      clients = result.rows;
      
      console.log(`${colors.cyan}Found ${clients.length} clients in the system${colors.reset}`);
    }
    
    // Track overall stats
    const stats = {
      clientsProcessed: 0,
      clientsWithActivePlans: 0,
      totalDiscrepancies: 0,
      itemsFixed: 0
    };
    
    // Process each client
    for (const client of clients) {
      await processClient(client, stats, options.fixAll);
      stats.clientsProcessed++;
    }
    
    // Print summary
    console.log(`\n${colors.bright}${colors.blue}===== Summary =====\n${colors.reset}`);
    console.log(`${colors.cyan}Clients processed: ${stats.clientsProcessed}${colors.reset}`);
    console.log(`${colors.cyan}Clients with active budget plans: ${stats.clientsWithActivePlans}${colors.reset}`);
    console.log(`${colors.cyan}Total discrepancies found: ${stats.totalDiscrepancies}${colors.reset}`);
    
    if (options.fixAll) {
      console.log(`${colors.green}Total budget items fixed: ${stats.itemsFixed}${colors.reset}`);
    } else if (stats.totalDiscrepancies > 0) {
      console.log(`${colors.yellow}Run with --fix-all to correct all discrepancies${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Error during processing:${colors.reset}`, error);
  } finally {
    await pool.end();
  }
}

async function processClient(client, stats, shouldFix) {
  console.log(`\n${colors.cyan}Processing client: ${client.name} (ID: ${client.id})${colors.reset}`);
  
  // Find active budget plan for this client
  const budgetSettings = await findActiveBudgetSettings(client.id);
  
  if (!budgetSettings) {
    console.log(`  ${colors.yellow}No active budget plan found${colors.reset}`);
    return;
  }
  
  stats.clientsWithActivePlans++;
  console.log(`  ${colors.green}Found active budget plan (ID: ${budgetSettings.id})${colors.reset}`);
  
  // Get budget items
  const budgetItems = await getBudgetItems(client.id, budgetSettings.id);
  
  if (budgetItems.length === 0) {
    console.log(`  ${colors.yellow}No budget items found${colors.reset}`);
    return;
  }
  
  console.log(`  ${colors.green}Found ${budgetItems.length} budget items${colors.reset}`);
  
  // Get completed session notes with products
  const sessionNotes = await getSessionNotesWithProducts(client.id);
  
  if (sessionNotes.length === 0) {
    console.log(`  ${colors.yellow}No completed session notes with products found${colors.reset}`);
    return;
  }
  
  console.log(`  ${colors.green}Found ${sessionNotes.length} session notes with products${colors.reset}`);
  
  // Calculate expected usage
  const expectedUsage = calculateExpectedUsage(budgetItems, sessionNotes);
  
  // Find discrepancies
  const discrepancies = findDiscrepancies(expectedUsage);
  
  if (discrepancies.length === 0) {
    console.log(`  ${colors.green}✓ All budget items have correct usage values${colors.reset}`);
    
    // Calculate and display utilization
    displayUtilization(budgetItems);
    
    return;
  }
  
  // Show discrepancies
  console.log(`  ${colors.yellow}Found ${discrepancies.length} budget items with usage discrepancies:${colors.reset}`);
  
  for (const item of discrepancies) {
    console.log(`    ${colors.red}Item ${item.id} (${item.code}): Expected ${item.expectedUsed}, Actual ${item.actualUsed}, Diff ${item.discrepancy}${colors.reset}`);
    stats.totalDiscrepancies++;
  }
  
  // Fix if requested
  if (shouldFix) {
    const fixed = await fixDiscrepancies(discrepancies);
    console.log(`  ${colors.green}✓ Fixed ${fixed} budget items${colors.reset}`);
    stats.itemsFixed += fixed;
    
    // Calculate and display utilization
    displayUtilization(await getBudgetItems(client.id, budgetSettings.id));
  }
}

async function findActiveBudgetSettings(clientId) {
  const result = await pool.query(
    'SELECT * FROM budget_settings WHERE client_id = $1 AND is_active = true',
    [clientId]
  );
  return result.rows[0];
}

async function getBudgetItems(clientId, budgetSettingsId) {
  const result = await pool.query(
    'SELECT * FROM budget_items WHERE client_id = $1 AND budget_settings_id = $2',
    [clientId, budgetSettingsId]
  );
  return result.rows;
}

async function getSessionNotesWithProducts(clientId) {
  const result = await pool.query(`
    SELECT n.*, s.status as session_status
    FROM session_notes n
    JOIN sessions s ON n.session_id = s.id
    WHERE n.client_id = $1 
    AND n.status = 'completed'
    AND s.status = 'completed'
    AND n.products IS NOT NULL
  `, [clientId]);
  
  return result.rows;
}

function calculateExpectedUsage(budgetItems, sessionNotes) {
  // Map to track expected usage
  const expectedUsage = new Map();
  
  // Initialize with all budget items
  for (const item of budgetItems) {
    const itemCode = item.item_code.trim().toLowerCase();
    expectedUsage.set(item.id, {
      id: item.id,
      code: itemCode,
      description: item.description,
      expectedUsed: 0,
      actualUsed: Number(item.used_quantity) || 0,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0
    });
  }
  
  // Create a map of item codes to item IDs for faster lookup
  const itemCodeMap = new Map();
  for (const item of budgetItems) {
    itemCodeMap.set(item.item_code.trim().toLowerCase(), item.id);
  }
  
  // Process each session note
  for (const note of sessionNotes) {
    try {
      // Skip if not completed
      if (note.status !== 'completed' || note.session_status !== 'completed') {
        continue;
      }
      
      // Parse products
      let products = [];
      if (typeof note.products === 'string') {
        products = JSON.parse(note.products);
      } else if (Array.isArray(note.products)) {
        products = note.products;
      } else if (note.products && typeof note.products === 'object') {
        products = [note.products];
      }
      
      // Skip if no products
      if (products.length === 0) continue;
      
      // Add usage for each product
      for (const product of products) {
        // Get product code (try multiple field names)
        const productCode = (product.itemCode || product.productCode || product.code || '').toString().trim().toLowerCase();
        if (!productCode) continue;
        
        // Get quantity
        const quantity = Number(product.quantity) || 1;
        
        // Find matching budget item
        const itemId = itemCodeMap.get(productCode);
        if (itemId && expectedUsage.has(itemId)) {
          const item = expectedUsage.get(itemId);
          item.expectedUsed += quantity;
        }
      }
    } catch (error) {
      console.error(`  ${colors.red}Error processing session note ${note.id}:${colors.reset}`, error);
    }
  }
  
  return Array.from(expectedUsage.values());
}

function findDiscrepancies(expectedUsage) {
  const discrepancies = [];
  
  for (const item of expectedUsage) {
    item.discrepancy = item.expectedUsed - item.actualUsed;
    
    if (item.discrepancy !== 0) {
      discrepancies.push(item);
    }
  }
  
  return discrepancies;
}

async function fixDiscrepancies(discrepancies) {
  let fixedCount = 0;
  
  for (const item of discrepancies) {
    try {
      await pool.query(
        'UPDATE budget_items SET used_quantity = $1 WHERE id = $2',
        [item.expectedUsed, item.id]
      );
      fixedCount++;
    } catch (error) {
      console.error(`  ${colors.red}Error fixing budget item ${item.id}:${colors.reset}`, error);
    }
  }
  
  return fixedCount;
}

function displayUtilization(budgetItems) {
  // Calculate overall utilization
  let totalQuantity = 0;
  let totalUsed = 0;
  let totalCost = 0;
  let totalUsedCost = 0;
  
  for (const item of budgetItems) {
    const quantity = Number(item.quantity) || 0;
    const usedQuantity = Number(item.used_quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    
    totalQuantity += quantity;
    totalUsed += usedQuantity;
    totalCost += (quantity * unitPrice);
    totalUsedCost += (usedQuantity * unitPrice);
  }
  
  const quantityUtilization = totalQuantity > 0 ? (totalUsed / totalQuantity) * 100 : 0;
  const costUtilization = totalCost > 0 ? (totalUsedCost / totalCost) * 100 : 0;
  
  console.log(`  ${colors.cyan}Budget Utilization:${colors.reset}`);
  console.log(`    Quantity: ${totalUsed}/${totalQuantity} (${quantityUtilization.toFixed(2)}%)${colors.reset}`);
  console.log(`    Cost: $${totalUsedCost.toFixed(2)}/$${totalCost.toFixed(2)} (${costUtilization.toFixed(2)}%)${colors.reset}`);
  
  // Display individual item utilization if verbose
  if (options.verbose) {
    console.log(`\n  ${colors.cyan}Individual Item Utilization:${colors.reset}`);
    console.log(`  ${colors.white}-----------------------------------------------------------------------------------------${colors.reset}`);
    console.log(`  ${colors.bright}${colors.white}ID    | Code       | Description                  | Used/Total    | Utilization${colors.reset}`);
    console.log(`  ${colors.white}-----------------------------------------------------------------------------------------${colors.reset}`);
    
    for (const item of budgetItems) {
      const quantity = Number(item.quantity) || 0;
      const usedQuantity = Number(item.used_quantity) || 0;
      const utilization = quantity > 0 ? (usedQuantity / quantity) * 100 : 0;
      
      // Color based on utilization
      let itemColor = colors.green;
      if (utilization === 0) {
        itemColor = colors.red;
      } else if (utilization < 50) {
        itemColor = colors.yellow;
      }
      
      const code = item.item_code || '';
      const description = item.description || '';
      console.log(`  ${itemColor}${item.id.toString().padEnd(5)} | ${code.padEnd(10)} | ${description.substring(0, 25).padEnd(25)} | ${usedQuantity}/${quantity.toString().padEnd(10)} | ${utilization.toFixed(2)}%${colors.reset}`);
    }
    
    console.log(`  ${colors.white}-----------------------------------------------------------------------------------------${colors.reset}`);
  }
}

// Start the script
main();