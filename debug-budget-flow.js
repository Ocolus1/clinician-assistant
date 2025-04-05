/**
 * Budget Update Flow Debugging Script
 * 
 * This script helps trace the entire process of budget usage updates from
 * session creation to budget item usage calculations.
 * 
 * Usage: node debug-budget-flow.js <clientId> [options]
 * Options:
 *   --trace-all           Trace all budget updates for the client
 *   --trace-session=ID    Trace budget updates for a specific session
 *   --fix-data            Attempt to fix inconsistent product code data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright: '\x1b[1m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const clientId = parseInt(args[0]);
const options = {
  traceAll: args.includes('--trace-all'),
  traceSession: args.find(arg => arg.startsWith('--trace-session='))?.split('=')[1],
  fixData: args.includes('--fix-data')
};

// Validate arguments
if (!clientId || isNaN(clientId)) {
  console.log(`${colors.red}${colors.bright}Error: Client ID is required${colors.reset}`);
  console.log(`Usage: node debug-budget-flow.js <clientId> [options]`);
  process.exit(1);
}

// Main function
async function debugBudgetFlow() {
  console.log(`${colors.bright}${colors.blue}=== Budget Update Flow Debugger ===${colors.reset}`);
  console.log(`${colors.cyan}Analyzing budget flow for client ID: ${clientId}${colors.reset}`);
  
  try {
    // Step 1: Check client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      console.log(`${colors.red}Error: Client with ID ${clientId} not found${colors.reset}`);
      process.exit(1);
    }

    console.log(`${colors.green}Client found: ${client.name} (ID: ${client.id})${colors.reset}`);

    // Step 2: Get client's active budget plan
    const budgetPlan = await prisma.budgetPlan.findFirst({
      where: {
        clientId,
        status: 'active'
      }
    });

    if (!budgetPlan) {
      console.log(`${colors.yellow}Warning: No active budget plan found for client${colors.reset}`);
      process.exit(0);
    }

    console.log(`${colors.green}Active budget plan found: ${budgetPlan.title} (ID: ${budgetPlan.id})${colors.reset}`);

    // Step 3: Get budget items in the plan
    const budgetItems = await prisma.budgetItem.findMany({
      where: {
        budgetPlanId: budgetPlan.id
      }
    });

    if (budgetItems.length === 0) {
      console.log(`${colors.yellow}Warning: No budget items found in the active plan${colors.reset}`);
      process.exit(0);
    }

    console.log(`${colors.green}Found ${budgetItems.length} budget items in the plan${colors.reset}`);
    
    // Step 4: Print budget items details
    console.log(`\n${colors.bright}${colors.blue}=== Budget Items ===${colors.reset}`);
    budgetItems.forEach(item => {
      console.log(`${colors.cyan}Item: ${item.description}${colors.reset}`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Item Code: ${item.itemCode || '[MISSING]'}`);
      console.log(`  Quantity: ${item.quantity}`);
      console.log(`  Used Quantity: ${item.usedQuantity || 0}`);
      console.log(`  Unit Price: $${item.unitPrice}`);
      
      // Highlight missing item codes
      if (!item.itemCode) {
        console.log(`  ${colors.red}WARNING: This item is missing an item code and cannot be tracked!${colors.reset}`);
      }
      
      // Check for inconsistent data
      const usedQty = parseFloat(item.usedQuantity || 0);
      const totalQty = parseFloat(item.quantity || 0);
      if (usedQty > totalQty) {
        console.log(`  ${colors.red}WARNING: Used quantity (${usedQty}) exceeds total quantity (${totalQty})!${colors.reset}`);
      }
      
      console.log('');
    });

    // Step 5: Get all completed sessions for this client
    const sessions = await prisma.session.findMany({
      where: {
        clientId,
        status: options.traceAll ? undefined : 'completed'
      },
      include: {
        sessionNote: true
      },
      orderBy: {
        sessionDate: 'desc'
      }
    });

    if (sessions.length === 0) {
      console.log(`${colors.yellow}Warning: No completed sessions found for this client${colors.reset}`);
      process.exit(0);
    }

    console.log(`${colors.green}Found ${sessions.length} sessions for the client${colors.reset}`);
    console.log(`${colors.green}Completed sessions: ${sessions.filter(s => s.status === 'completed').length}${colors.reset}`);
    
    // Step 6: Analyze session products
    console.log(`\n${colors.bright}${colors.blue}=== Session Products Analysis ===${colors.reset}`);
    
    let totalSessionsWithProducts = 0;
    let totalProductsWithValidCodes = 0;
    let totalProductsWithInvalidCodes = 0;
    let totalProductsFound = 0;
    
    for (const session of sessions) {
      // Skip if we're only tracing a specific session
      if (options.traceSession && session.id.toString() !== options.traceSession) {
        continue;
      }
      
      console.log(`\n${colors.cyan}Session: ${session.title || 'Untitled'} (ID: ${session.id})${colors.reset}`);
      console.log(`  Date: ${new Date(session.sessionDate).toLocaleDateString()}`);
      console.log(`  Status: ${session.status}`);
      
      if (session.status !== 'completed') {
        console.log(`  ${colors.yellow}Note: This session is not marked as completed, so it won't affect budget usage${colors.reset}`);
      }
      
      if (!session.sessionNote) {
        console.log(`  ${colors.red}Warning: No session note found for this session${colors.reset}`);
        continue;
      }
      
      if (session.sessionNote.status !== 'completed') {
        console.log(`  ${colors.yellow}Session note status: ${session.sessionNote.status} (must be 'completed' to affect budget)${colors.reset}`);
      }
      
      // Parse products JSON
      let products = [];
      try {
        // Handle different formats of products data
        if (typeof session.sessionNote.products === 'string') {
          products = JSON.parse(session.sessionNote.products);
          
          // Handle case where products is an array wrapped in an array
          if (Array.isArray(products) && products.length === 1 && Array.isArray(products[0])) {
            products = products[0];
          }
        } else if (Array.isArray(session.sessionNote.products)) {
          products = session.sessionNote.products;
        }
      } catch (error) {
        console.log(`  ${colors.red}Error parsing products JSON: ${error.message}${colors.reset}`);
        continue;
      }
      
      if (!products || products.length === 0) {
        console.log('  No products in this session');
        continue;
      }
      
      totalSessionsWithProducts++;
      totalProductsFound += products.length;
      
      console.log(`  Found ${products.length} products in this session note:`);
      
      // Analyze each product
      for (const [index, product] of products.entries()) {
        console.log(`\n  ${colors.cyan}Product #${index + 1}:${colors.reset}`);
        console.log(`    Description: ${product.productDescription || product.name || '[Unnamed]'}`);
        
        // Show all possible code fields and check for mismatches
        const productCode = product.productCode || '[MISSING]';
        const itemCode = product.itemCode || '[MISSING]';
        const code = product.code || '[MISSING]';
        
        console.log(`    Product Code: ${productCode}`);
        console.log(`    Item Code: ${itemCode}`);
        console.log(`    Code: ${code}`);
        
        // Check if codes are consistent
        if (productCode !== '[MISSING]' && itemCode !== '[MISSING]' && productCode !== itemCode) {
          console.log(`    ${colors.red}WARNING: productCode and itemCode don't match!${colors.reset}`);
        }
        if (productCode !== '[MISSING]' && code !== '[MISSING]' && productCode !== code) {
          console.log(`    ${colors.red}WARNING: productCode and code don't match!${colors.reset}`);
        }
        if (itemCode !== '[MISSING]' && code !== '[MISSING]' && itemCode !== code) {
          console.log(`    ${colors.red}WARNING: itemCode and code don't match!${colors.reset}`);
        }
        
        // Determine the effective code
        const effectiveCode = product.itemCode || product.productCode || product.code;
        
        console.log(`    Quantity: ${product.quantity}`);
        console.log(`    Unit Price: $${product.unitPrice?.toFixed(2) || 'N/A'}`);
        console.log(`    Effective Code Used for Matching: ${effectiveCode || colors.red + '[MISSING]' + colors.reset}`);
        
        // Look for matching budget item
        const matchingBudgetItem = effectiveCode 
          ? budgetItems.find(item => item.itemCode === effectiveCode)
          : null;
        
        if (matchingBudgetItem) {
          console.log(`    ${colors.green}✓ Found matching budget item: ${matchingBudgetItem.description} (ID: ${matchingBudgetItem.id})${colors.reset}`);
          totalProductsWithValidCodes++;
        } else {
          console.log(`    ${colors.red}✗ No matching budget item found with code: ${effectiveCode || '[MISSING]'}${colors.reset}`);
          totalProductsWithInvalidCodes++;
          
          // If code is missing but we have a budget item ID, try to find it
          if (product.budgetItemId) {
            const budgetItem = budgetItems.find(item => item.id === product.budgetItemId);
            if (budgetItem) {
              console.log(`    ${colors.yellow}Found budget item by ID (${product.budgetItemId}): ${budgetItem.description}${colors.reset}`);
              console.log(`    ${colors.yellow}This item has code: ${budgetItem.itemCode || '[MISSING]'}, but this doesn't match product code${colors.reset}`);
            }
          }
        }
        
        // Fix data if option is enabled
        if (options.fixData && session.status === 'completed' && session.sessionNote.status === 'completed') {
          let isFixed = false;
          let fixDetails = '';
          
          // Only fix if there's a budgetItemId and it matches an actual budget item
          if (product.budgetItemId) {
            const targetBudgetItem = budgetItems.find(item => item.id === product.budgetItemId);
            if (targetBudgetItem && targetBudgetItem.itemCode) {
              // Check if any code fields match the budget item's code
              if (!product.productCode || !product.itemCode || !product.code ||
                  product.productCode !== targetBudgetItem.itemCode ||
                  product.itemCode !== targetBudgetItem.itemCode ||
                  product.code !== targetBudgetItem.itemCode) {
                
                // Update product object with the correct codes
                product.productCode = targetBudgetItem.itemCode;
                product.itemCode = targetBudgetItem.itemCode;
                product.code = targetBudgetItem.itemCode;
                isFixed = true;
                fixDetails = `Set all code fields to "${targetBudgetItem.itemCode}"`;
              }
            }
          }
          
          // If fixed, update products array for later saving
          if (isFixed) {
            console.log(`    ${colors.green}Fixed: ${fixDetails}${colors.reset}`);
            // Mark the outer products array as modified (will be saved later)
            products._modified = true;
          }
        }
      }
      
      // If fixing data and products were modified, update the session note
      if (options.fixData && products._modified) {
        delete products._modified;
        
        // Update the session note with fixed products
        try {
          console.log(`\n  ${colors.green}Updating session note with fixed product data...${colors.reset}`);
          await prisma.sessionNote.update({
            where: { id: session.sessionNote.id },
            data: {
              products: JSON.stringify(products)
            }
          });
          console.log(`  ${colors.green}✓ Successfully updated session note product data${colors.reset}`);
        } catch (error) {
          console.log(`  ${colors.red}Error updating session note: ${error.message}${colors.reset}`);
        }
      }
    }
    
    // Step 7: Summarize findings
    console.log(`\n${colors.bright}${colors.blue}=== Summary ===${colors.reset}`);
    console.log(`Total sessions with products: ${totalSessionsWithProducts}`);
    console.log(`Total products found: ${totalProductsFound}`);
    console.log(`Products with valid codes: ${totalProductsWithValidCodes}`);
    console.log(`Products with invalid codes: ${totalProductsWithInvalidCodes}`);
    
    const validPercentage = totalProductsFound > 0 ? 
      Math.round((totalProductsWithValidCodes / totalProductsFound) * 100) : 0;
      
    console.log(`\nCode validation rate: ${colors.bright}${validPercentage}%${colors.reset}`);
    
    if (validPercentage < 100) {
      console.log(`\n${colors.yellow}Recommendation: Some products have invalid or missing codes.${colors.reset}`);
      console.log(`${colors.yellow}To fix this issue, run this script with the --fix-data option.${colors.reset}`);
    } else if (totalProductsFound > 0) {
      console.log(`\n${colors.green}All products have valid codes that match budget items.${colors.reset}`);
    }
    
    console.log(`\n${colors.blue}Debugging complete.${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    console.log(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debugging script
debugBudgetFlow();