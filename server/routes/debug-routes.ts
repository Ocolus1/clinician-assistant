/**
 * Debug routes for budget flow analysis
 * These endpoints help analyze and debug budget tracking issues
 */

import { Router } from 'express';
import { storage } from '../storage';

// Type definitions to solve type errors
interface BudgetPlan {
  id: number;
  status: string;
}

interface BudgetItem {
  id: number;
  description: string;
  itemCode: string;
}

interface SessionNote {
  id: number;
  sessionId: number;
  status: string;
  products: any;
}

const debugRouter = Router();

// Get detailed debug information about the budget tracking flow for a client
// Support both paths for compatibility
debugRouter.get(['/api/debug/budget-flow/:clientId', '/api/debug/budget/:clientId'], async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    
    // Step 1: Get the client
    const client = await storage.getClient(clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Step 2: Get the client's active budget plan
    // Use getBudgetItems to get all budget items, then group by plan
    const allBudgetItems = await storage.getBudgetItemsByClient(clientId);
    
    // Extract unique budget settings IDs (using budgetSettingsId instead of budgetPlanId)
    const budgetSettingsIds = Array.from(new Set(allBudgetItems.map(item => item.budgetSettingsId)));
    
    // Simulate budgetPlans array from budget items
    const budgetPlans = budgetSettingsIds.map(settingsId => {
      const itemsForPlan = allBudgetItems.filter(item => item.budgetSettingsId === settingsId);
      const firstItem = itemsForPlan[0];
      return {
        id: settingsId, // Use settings ID as plan ID
        clientId: clientId,
        title: `Budget Plan ${settingsId}`,
        status: 'active', // We'll assume the plan with items is active
        totalBudget: itemsForPlan.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
      };
    });
    
    const activeBudgetPlan = budgetPlans.find(plan => plan.status === 'active');
    
    if (!activeBudgetPlan) {
      return res.status(404).json({ 
        error: 'No active budget plan found',
        client: client,
        budgetPlans: budgetPlans
      });
    }
    
    // Step 3: Get budget items for the active plan
    // Filter the already retrieved budget items for this plan
    const budgetItems = allBudgetItems.filter(item => item.budgetSettingsId === activeBudgetPlan.id);
    
    // Step 4: Get all sessions for the client
    const sessions = await storage.getSessionsByClient(clientId);
    
    // Step 5: Get session notes for all sessions
    const sessionNotesPromises = sessions.map(session => {
      // Use available method getSessionNoteBySessionId instead of getSessionNotesBySession
      return storage.getSessionNoteBySessionId(session.id)
        .then(note => note ? [note] : []);
    });
    const sessionNotesArrays = await Promise.all(sessionNotesPromises);
    
    // Flatten and map session notes to their respective sessions
    const sessionNotes = sessionNotesArrays.flat();
    const sessionsWithNotes = sessions.map(session => {
      const notes = sessionNotes.filter(note => note.sessionId === session.id);
      return {
        ...session,
        notes: notes
      };
    });
    
    // Step 6: Analyze sessions with products
    const sessionsWithProducts = sessionsWithNotes.filter(session => 
      session.notes.some(note => {
        if (!note.products) return false;
        
        try {
          // Handle both string and array formats
          const products = typeof note.products === 'string' 
            ? JSON.parse(note.products) 
            : note.products;
            
          return Array.isArray(products) && products.length > 0;
        } catch (e) {
          return false;
        }
      })
    );
    
    // Step 7: Extract and analyze all products
    const productAnalysis = {
      totalProducts: 0,
      productsWithValidCodes: 0,
      productsWithoutCodes: 0,
      productCodeMismatches: 0,
      productsByCodeField: {
        productCode: 0,
        itemCode: 0,
        code: 0
      },
      completedSessions: sessionsWithNotes.filter(s => s.status === 'completed').length,
      completedSessionsWithCompleteNotes: sessionsWithNotes.filter(s => 
        s.status === 'completed' && s.notes.some(n => n.status === 'completed')
      ).length
    };
    
    // Analyze each session in detail
    const detailedSessions = sessionsWithProducts.map(session => {
      const sessionDetail = {
        id: session.id,
        title: session.title,
        status: session.status,
        sessionDate: session.sessionDate,
        products: [] as any[]
      };
      
      // Process all notes
      session.notes.forEach(note => {
        if (!note.products) return;
        
        try {
          // Parse products (handle both string and array formats)
          let products = typeof note.products === 'string' 
            ? JSON.parse(note.products) 
            : note.products;
            
          // Handle nested arrays - sometimes we get [[ product1, product2 ]]
          if (Array.isArray(products) && products.length === 1 && Array.isArray(products[0])) {
            products = products[0];
          }
          
          if (!Array.isArray(products)) {
            products = [];
          }
          
          // Process each product
          products.forEach((product: any) => {
            productAnalysis.totalProducts++;
            
            // Check which code fields are present
            if (product.productCode) productAnalysis.productsByCodeField.productCode++;
            if (product.itemCode) productAnalysis.productsByCodeField.itemCode++;
            if (product.code) productAnalysis.productsByCodeField.code++;
            
            // Check if any code field is present
            const hasAnyCode = Boolean(product.productCode || product.itemCode || product.code);
            if (!hasAnyCode) {
              productAnalysis.productsWithoutCodes++;
            }
            
            // Check for mismatches between code fields
            const hasCodeMismatch = (
              (product.productCode && product.itemCode && product.productCode !== product.itemCode) ||
              (product.productCode && product.code && product.productCode !== product.code) ||
              (product.itemCode && product.code && product.itemCode !== product.code)
            );
            
            if (hasCodeMismatch) {
              productAnalysis.productCodeMismatches++;
            }
            
            // Find matching budget item
            const effectiveCode = product.itemCode || product.productCode || product.code;
            const matchingBudgetItem = effectiveCode 
              ? budgetItems.find(item => item.itemCode === effectiveCode)
              : null;
              
            if (matchingBudgetItem) {
              productAnalysis.productsWithValidCodes++;
            }
            
            // Add product details to session
            sessionDetail.products.push({
              description: product.productDescription || product.name || 'Unnamed product',
              productCode: product.productCode,
              itemCode: product.itemCode,
              code: product.code,
              effectiveCode,
              quantity: product.quantity,
              unitPrice: product.unitPrice,
              budgetItemId: product.budgetItemId,
              matchingItemId: matchingBudgetItem?.id,
              matchingItemName: matchingBudgetItem?.description,
              hasValidCode: Boolean(matchingBudgetItem),
              codesMismatched: hasCodeMismatch
            });
          });
        } catch (error) {
          console.error('Error processing products:', error);
        }
      });
      
      return sessionDetail;
    });
    
    // Return comprehensive debug data
    res.json({
      client,
      budgetPlan: activeBudgetPlan,
      budgetItems,
      statistics: {
        totalSessions: sessions.length,
        sessionsWithProducts: sessionsWithProducts.length,
        ...productAnalysis
      },
      sessions: detailedSessions,
      recommendations: generateRecommendations(productAnalysis, budgetItems)
    });
  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Fix missing or mismatched product codes in completed sessions
debugRouter.post('/api/debug/fix-product-codes/:clientId', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    
    // Get client's active budget plan
    // Use getBudgetItems to get all budget items, then group by plan
    const allBudgetItems = await storage.getBudgetItemsByClient(clientId);
    
    // Extract unique budget settings IDs (using budgetSettingsId instead of budgetPlanId)
    const budgetSettingsIds = Array.from(new Set(allBudgetItems.map(item => item.budgetSettingsId)));
    
    // Simulate budgetPlans array from budget items
    const budgetPlans = budgetSettingsIds.map(settingsId => {
      const itemsForPlan = allBudgetItems.filter(item => item.budgetSettingsId === settingsId);
      return {
        id: settingsId, // Use settings ID as plan ID
        clientId: clientId,
        title: `Budget Plan ${settingsId}`,
        status: 'active', // We'll assume the plan with items is active
        totalBudget: itemsForPlan.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
      };
    });
    
    const activePlan = budgetPlans.find(plan => plan.status === 'active');
    
    if (!activePlan) {
      return res.status(404).json({ error: 'No active budget plan found' });
    }
    
    // Get budget items
    const budgetItems = allBudgetItems.filter(item => item.budgetSettingsId === activePlan.id);
    
    // Get all completed sessions
    const sessions = await storage.getSessionsByClient(clientId);
    const completedSessions = sessions.filter(s => s.status === 'completed');
    
    const fixResults = {
      sessionsProcessed: 0,
      productsFixed: 0,
      productsAlreadyCorrect: 0,
      errors: [] as string[]
    };
    
    // Process each completed session
    for (const session of completedSessions) {
      try {
        // Get session note
        const note = await storage.getSessionNoteBySessionId(session.id);
        const notes = note ? [note] : [];
        
        for (const note of notes) {
          if (note.status !== 'completed' || !note.products) continue;
          
          let productsModified = false;
          let products;
          
          try {
            // Parse products
            products = typeof note.products === 'string' 
              ? JSON.parse(note.products) 
              : note.products;
              
            // Handle nested arrays
            if (Array.isArray(products) && products.length === 1 && Array.isArray(products[0])) {
              products = products[0];
            }
            
            if (!Array.isArray(products)) continue;
            
            // Process each product to fix codes
            for (const product of products) {
              // Skip if no budget item ID
              if (!product.budgetItemId) continue;
              
              // Find matching budget item by ID
              const budgetItem = budgetItems.find(item => item.id === product.budgetItemId);
              
              if (budgetItem && budgetItem.itemCode) {
                const shouldFix = (
                  !product.productCode || 
                  !product.itemCode || 
                  !product.code ||
                  product.productCode !== budgetItem.itemCode ||
                  product.itemCode !== budgetItem.itemCode ||
                  product.code !== budgetItem.itemCode
                );
                
                if (shouldFix) {
                  // Fix all code fields
                  product.productCode = budgetItem.itemCode;
                  product.itemCode = budgetItem.itemCode;
                  product.code = budgetItem.itemCode;
                  productsModified = true;
                  fixResults.productsFixed++;
                } else {
                  fixResults.productsAlreadyCorrect++;
                }
              }
            }
            
            // Update session note if products were modified
            if (productsModified) {
              await storage.updateSessionNote(note.id, {
                ...note,
                products: JSON.stringify(products)
              });
            }
            
            fixResults.sessionsProcessed++;
          } catch (error) {
            fixResults.errors.push(`Error processing session ${session.id}: ${error.message}`);
          }
        }
      } catch (error) {
        fixResults.errors.push(`Error processing session ${session.id}: ${error.message}`);
      }
    }
    
    // Return results
    res.json({
      success: true,
      ...fixResults
    });
  } catch (error) {
    console.error('Fix API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generate recommendations based on the analysis
function generateRecommendations(analysis: any, budgetItems: any[]) {
  const recommendations = [];
  
  // Check if some products have no codes
  if (analysis.productsWithoutCodes > 0) {
    recommendations.push({
      type: 'error',
      message: `${analysis.productsWithoutCodes} products are missing all code fields (productCode, itemCode, and code).`,
      action: 'Run the fix-product-codes endpoint to attempt automatic repair.'
    });
  }
  
  // Check if we have mismatched codes
  if (analysis.productCodeMismatches > 0) {
    recommendations.push({
      type: 'warning',
      message: `${analysis.productCodeMismatches} products have inconsistent code fields (productCode, itemCode, and code don't match).`,
      action: 'Run the fix-product-codes endpoint to standardize all code fields.'
    });
  }
  
  // Check which code field is most reliable
  const codeFields = analysis.productsByCodeField;
  const mostReliableField = Object.keys(codeFields).reduce((a, b) => 
    codeFields[a] > codeFields[b] ? a : b
  );
  
  recommendations.push({
    type: 'info',
    message: `"${mostReliableField}" is the most reliable code field (present in ${codeFields[mostReliableField]} out of ${analysis.totalProducts} products).`,
    action: 'Ensure the server primarily uses this field for matching budget items.'
  });
  
  // Check if we have budget items without codes
  const budgetItemsWithoutCodes = budgetItems.filter(item => !item.itemCode).length;
  if (budgetItemsWithoutCodes > 0) {
    recommendations.push({
      type: 'error',
      message: `${budgetItemsWithoutCodes} budget items are missing an itemCode and cannot be tracked.`,
      action: 'Update these budget items with valid item codes.'
    });
  }
  
  // Check if completion rates make sense
  if (analysis.completedSessions > 0 && analysis.completedSessions !== analysis.completedSessionsWithCompleteNotes) {
    recommendations.push({
      type: 'warning',
      message: `${analysis.completedSessions - analysis.completedSessionsWithCompleteNotes} completed sessions have notes that are not marked as completed.`,
      action: 'Verify session note status for completed sessions and update as needed.'
    });
  }
  
  return recommendations;
}

// Add a direct endpoint to get session notes with products for a client
debugRouter.get('/api/debug/clients/:clientId/session-notes-with-products', async (req, res) => {
  console.log(`GET /api/debug/clients/${req.params.clientId}/session-notes-with-products - Retrieving session notes with products`);
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client ID" });
    }
    
    // First get all sessions for this client
    const sessions = await storage.getSessionsByClient(clientId);
    console.log(`Found ${sessions.length} sessions for client ${clientId}`);
    
    // Then get notes for all these sessions
    const sessionIds = sessions.map(session => session.id);
    
    // If no sessions, return empty array
    if (sessionIds.length === 0) {
      return res.json([]);
    }
    
    // Get session notes for all sessions
    const notes = [];
    for (const sessionId of sessionIds) {
      try {
        const sessionNote = await storage.getSessionNoteBySessionId(sessionId);
        if (sessionNote) {
          // Process products field if it exists and is a string
          if (sessionNote.products && typeof sessionNote.products === 'string') {
            try {
              sessionNote.products = JSON.parse(sessionNote.products);
            } catch (e) {
              console.error(`Error parsing products for session note ${sessionNote.id}:`, e);
              sessionNote.products = [];
            }
          }
          notes.push(sessionNote);
        }
      } catch (e) {
        console.error(`Error fetching session note for session ${sessionId}:`, e);
      }
    }
    
    console.log(`Found ${notes.length} session notes with products for client ${clientId}`);
    
    // Return the processed notes
    res.json(notes);
  } catch (error) {
    console.error(`Error retrieving session notes with products for client ${req.params.clientId}:`, error);
    res.status(500).json({ error: "Failed to retrieve session notes with products" });
  }
});

export default debugRouter;