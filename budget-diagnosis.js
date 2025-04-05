/**
 * Budget Tracking System Diagnosis Tool
 * 
 * This script provides a comprehensive analysis of the budget tracking system,
 * identifying issues with budget item usage calculations and fixing problems
 * in the data that prevent proper budget utilization reporting.
 * 
 * Usage: node budget-diagnosis.js <clientId> [options]
 * Options:
 *   --fix         Attempt to fix identified issues
 *   --trace       Show detailed debug info during execution
 *   --verbose     Show all budget items and sessions (not just issues)
 */

import pg from 'pg';
const { Pool } = pg;
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
const clientId = args[0] ? parseInt(args[0], 10) : null;
const options = {
  fix: args.includes('--fix'),
  trace: args.includes('--trace'),
  verbose: args.includes('--verbose')
};

// Database connection
let pool;

async function main() {
  if (!clientId) {
    console.log(`${colors.bright}${colors.yellow}Usage: node budget-diagnosis.js <clientId> [options]${colors.reset}`);
    console.log(`Options:`);
    console.log(`  --fix         Attempt to fix identified issues`);
    console.log(`  --trace       Show detailed debug info during execution`);
    console.log(`  --verbose     Show all budget items and sessions (not just issues)`);
    console.log(`\nExample: node budget-diagnosis.js 88 --fix`);
    process.exit(1);
  }
  
  // Initialize database connection
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log(`${colors.bright}${colors.green}✓ Connected to database${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error connecting to database:${colors.reset}`, error);
    process.exit(1);
  }
  
  try {
    await diagnoseClientBudget(clientId);
  } catch (error) {
    console.error(`${colors.red}Error during budget diagnosis:${colors.reset}`, error);
  } finally {
    await pool.end();
  }
}

async function diagnoseClientBudget(clientId) {
  console.log(`\n${colors.bright}${colors.blue}===== Budget Tracking System Diagnosis =====\n${colors.reset}`);
  
  // Step 1: Verify client exists
  const client = await findClient(clientId);
  if (!client) {
    console.log(`${colors.red}Error: Client with ID ${clientId} not found${colors.reset}`);
    return;
  }
  
  console.log(`${colors.green}Client found: ${client.name} (ID: ${client.id})${colors.reset}`);
  
  // Step 2: Check for active budget plan
  const budgetSettings = await findActiveBudgetSettings(clientId);
  if (!budgetSettings) {
    console.log(`${colors.yellow}No active budget settings found for client${colors.reset}`);
    return;
  }
  
  console.log(`${colors.green}Active budget settings found: ID ${budgetSettings.id} with $${budgetSettings.ndis_funds}${colors.reset}`);
  
  // Step 3: Examine budget items
  const budgetItems = await getBudgetItems(clientId, budgetSettings.id);
  if (budgetItems.length === 0) {
    console.log(`${colors.yellow}No budget items found for this client${colors.reset}`);
    return;
  }
  
  console.log(`${colors.green}Found ${budgetItems.length} budget items${colors.reset}`);
  
  // Step 4: Find completed sessions and their products
  const sessions = await getCompletedSessions(clientId);
  if (sessions.length === 0) {
    console.log(`${colors.yellow}No completed sessions found for this client${colors.reset}`);
    return;
  }
  
  console.log(`${colors.green}Found ${sessions.length} completed sessions${colors.reset}`);
  
  // Step 5: Find session notes with products
  const sessionNotes = await getSessionNotesWithProducts(clientId);
  
  console.log(`${colors.green}Found ${sessionNotes.length} session notes with products${colors.reset}`);
  
  // Step 6: Analyze product codes and budget items
  await analyzeProductCodes(budgetItems, sessionNotes);
  
  // Step 7: Calculate expected budget usage
  await calculateExpectedUsage(budgetItems, sessionNotes);
  
  // Step 8: Verify current budget usage values
  await verifyActualUsage(budgetItems);
  
  // Step 9: Fix issues if requested
  if (options.fix) {
    await fixBudgetIssues(budgetItems, sessionNotes);
  }
}

async function findClient(clientId) {
  const result = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
  return result.rows[0];
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

async function getCompletedSessions(clientId) {
  const result = await pool.query(
    'SELECT * FROM sessions WHERE client_id = $1 AND status = $2',
    [clientId, 'completed']
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

async function analyzeProductCodes(budgetItems, sessionNotes) {
  console.log(`\n${colors.bright}${colors.blue}=== Product Code Analysis ===${colors.reset}`);
  
  // Extract all product codes from budget items
  const budgetItemCodes = new Set(budgetItems.map(item => item.item_code.trim().toLowerCase()));
  
  if (options.verbose) {
    console.log(`\n${colors.cyan}Available budget item codes:${colors.reset}`);
    console.log(Array.from(budgetItemCodes).join(', '));
  }
  
  // Track issues found
  let issuesFound = false;
  
  // Analyze each session note's products
  for (const note of sessionNotes) {
    try {
      // Parse products if they're stored as JSON
      let products = [];
      if (note.products) {
        if (typeof note.products === 'string') {
          products = JSON.parse(note.products);
        } else if (Array.isArray(note.products)) {
          products = note.products;
        } else if (typeof note.products === 'object') {
          products = [note.products];
        }
      }
      
      // Skip if no products to process
      if (products.length === 0) {
        if (options.trace) {
          console.log(`${colors.yellow}Session note ${note.id} has no products${colors.reset}`);
        }
        continue;
      }
      
      // Check each product for code match with budget items
      for (const product of products) {
        // Handle various field name possibilities
        const productCode = (product.itemCode || product.productCode || product.code || '').toString().trim().toLowerCase();
        
        if (!productCode) {
          console.log(`${colors.red}Session note ${note.id} has product with missing code:${colors.reset}`, product);
          issuesFound = true;
          continue;
        }
        
        const found = budgetItemCodes.has(productCode);
        
        if (!found) {
          console.log(`${colors.red}Session note ${note.id} has product with code "${productCode}" that doesn't match any budget item${colors.reset}`);
          issuesFound = true;
        } else if (options.trace) {
          console.log(`${colors.green}Session note ${note.id} has product with matching code "${productCode}"${colors.reset}`);
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error analyzing products for session note ${note.id}:${colors.reset}`, error);
      console.log(`Raw products value:`, note.products);
      issuesFound = true;
    }
  }
  
  if (!issuesFound) {
    console.log(`${colors.green}✓ All product codes in session notes match budget items${colors.reset}`);
  }
}

async function calculateExpectedUsage(budgetItems, sessionNotes) {
  console.log(`\n${colors.bright}${colors.blue}=== Expected Budget Usage ===${colors.reset}`);
  
  // Create a map of item codes to expected usage
  const expectedUsage = {};
  
  // Initialize with all budget items
  for (const item of budgetItems) {
    const itemCode = item.item_code.trim().toLowerCase();
    expectedUsage[itemCode] = {
      itemId: item.id,
      itemCode,
      description: item.description,
      totalQuantity: Number(item.quantity) || 0,
      expectedUsed: 0,
      actualUsed: Number(item.used_quantity) || 0,
      unitPrice: Number(item.unit_price) || 0
    };
  }
  
  // Process each session note's products
  for (const note of sessionNotes) {
    try {
      // Skip if session or note not completed
      if (note.status !== 'completed' || note.session_status !== 'completed') {
        if (options.trace) {
          console.log(`${colors.yellow}Skipping session note ${note.id}: note status=${note.status}, session status=${note.session_status}${colors.reset}`);
        }
        continue;
      }
      
      // Parse products if they're stored as JSON
      let products = [];
      if (note.products) {
        if (typeof note.products === 'string') {
          products = JSON.parse(note.products);
        } else if (Array.isArray(note.products)) {
          products = note.products;
        } else if (typeof note.products === 'object') {
          products = [note.products];
        }
      }
      
      // Skip if no products to process
      if (products.length === 0) continue;
      
      // Add usage for each product
      for (const product of products) {
        // Try multiple product code fields
        const productCode = (product.itemCode || product.productCode || product.code || '').toString().trim().toLowerCase();
        if (!productCode) continue;
        
        // Get quantity (default to 1 if not specified)
        const quantity = Number(product.quantity) || 1;
        
        // Update expected usage if we have a matching budget item
        if (expectedUsage[productCode]) {
          expectedUsage[productCode].expectedUsed += quantity;
          if (options.trace) {
            console.log(`${colors.green}Added ${quantity} to expected usage for ${productCode} from session note ${note.id}${colors.reset}`);
          }
        } else if (options.trace) {
          console.log(`${colors.yellow}No matching budget item for product code ${productCode} in session note ${note.id}${colors.reset}`);
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error calculating expected usage for session note ${note.id}:${colors.reset}`, error);
    }
  }
  
  // Display expected vs actual usage
  console.log(`\n${colors.cyan}Budget Item Usage Analysis:${colors.reset}`);
  console.log(`${colors.white}------------------------------------------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bright}${colors.white}ID    | Code       | Description                  | Expected | Actual | Discrepancy${colors.reset}`);
  console.log(`${colors.white}------------------------------------------------------------------------------------------------${colors.reset}`);
  
  let hasDiscrepancies = false;
  
  for (const itemCode in expectedUsage) {
    const item = expectedUsage[itemCode];
    const discrepancy = item.expectedUsed - item.actualUsed;
    
    // Only show items with discrepancies or if verbose mode is on
    if (discrepancy !== 0 || options.verbose) {
      const textColor = discrepancy !== 0 ? colors.red : colors.green;
      console.log(`${textColor}${item.itemId.toString().padEnd(5)} | ${itemCode.padEnd(10)} | ${item.description.substring(0, 25).padEnd(25)} | ${item.expectedUsed.toString().padEnd(8)} | ${item.actualUsed.toString().padEnd(6)} | ${discrepancy}${colors.reset}`);
      
      if (discrepancy !== 0) {
        hasDiscrepancies = true;
      }
    }
  }
  
  console.log(`${colors.white}------------------------------------------------------------------------------------------------${colors.reset}`);
  
  if (!hasDiscrepancies) {
    console.log(`${colors.green}✓ All budget items have correct usage values${colors.reset}`);
  } else {
    console.log(`${colors.yellow}! Discrepancies found between expected and actual budget usage${colors.reset}`);
  }
  
  return expectedUsage;
}

async function verifyActualUsage(budgetItems) {
  console.log(`\n${colors.bright}${colors.blue}=== Budget Usage Verification ===${colors.reset}`);
  
  // Check if any budget items have usage
  const anyUsage = budgetItems.some(item => item.used_quantity > 0);
  
  if (!anyUsage) {
    console.log(`${colors.yellow}! None of the budget items show any usage (all are 0)${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.green}✓ Some budget items have usage recorded${colors.reset}`);
  return true;
}

async function fixBudgetIssues(budgetItems, sessionNotes) {
  console.log(`\n${colors.bright}${colors.blue}=== Fixing Budget Issues ===${colors.reset}`);
  
  // Calculate the correct expected usage
  const expectedUsage = {};
  
  // Initialize with all budget items
  for (const item of budgetItems) {
    const itemCode = item.item_code.trim().toLowerCase();
    expectedUsage[itemCode] = {
      itemId: item.id,
      expectedUsed: 0,
    };
  }
  
  // Process each session note's products
  for (const note of sessionNotes) {
    try {
      // Skip if session or note not completed
      if (note.status !== 'completed' || note.session_status !== 'completed') {
        continue;
      }
      
      // Parse products if they're stored as JSON
      let products = [];
      if (note.products) {
        if (typeof note.products === 'string') {
          products = JSON.parse(note.products);
        } else if (Array.isArray(note.products)) {
          products = note.products;
        } else if (typeof note.products === 'object') {
          products = [note.products];
        }
      }
      
      // Skip if no products to process
      if (products.length === 0) continue;
      
      // Add usage for each product
      for (const product of products) {
        // Try multiple product code fields
        const productCode = (product.itemCode || product.productCode || product.code || '').toString().trim().toLowerCase();
        if (!productCode) continue;
        
        // Get quantity (default to 1 if not specified)
        const quantity = Number(product.quantity) || 1;
        
        // Update expected usage if we have a matching budget item
        if (expectedUsage[productCode]) {
          expectedUsage[productCode].expectedUsed += quantity;
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error processing session note ${note.id}:${colors.reset}`, error);
    }
  }
  
  // Now update the budget items with correct usage values
  let updatedItems = 0;
  
  for (const itemCode in expectedUsage) {
    const { itemId, expectedUsed } = expectedUsage[itemCode];
    
    // Find the corresponding budget item
    const budgetItem = budgetItems.find(item => item.id === itemId);
    
    if (!budgetItem) continue;
    
    // Only update if there's a discrepancy
    if (Number(budgetItem.used_quantity) !== expectedUsed) {
      try {
        console.log(`${colors.cyan}Updating budget item ${itemId} (${itemCode}): ${budgetItem.used_quantity} -> ${expectedUsed}${colors.reset}`);
        
        // Update the budget item
        await pool.query(
          'UPDATE budget_items SET used_quantity = $1 WHERE id = $2',
          [expectedUsed, itemId]
        );
        
        updatedItems++;
      } catch (error) {
        console.error(`${colors.red}Error updating budget item ${itemId}:${colors.reset}`, error);
      }
    }
  }
  
  console.log(`${colors.green}✓ Updated ${updatedItems} budget items with correct usage values${colors.reset}`);
}

// Start the script
main();