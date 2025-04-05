/**
 * Session API Verification Tool
 * 
 * This script checks if the client sessions API is correctly returning session notes
 * with product data to debug budget utilization display issues.
 * 
 * Usage: node verify-sessions-api.js <clientId>
 */

import fetch from 'node-fetch';
const clientId = process.argv[2];

if (!clientId) {
  console.error('Please provide a client ID as an argument');
  console.error('Usage: node verify-sessions-api.js <clientId>');
  process.exit(1);
}

async function checkSessionsAPI() {
  try {
    // Make the API request
    const response = await fetch(`http://localhost:5000/api/clients/${clientId}/sessions`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const sessions = await response.json();
    
    console.log(`Found ${sessions.length} sessions for client ${clientId}`);
    
    // Check for session notes and products
    const sessionsWithNotes = sessions.filter(s => s.sessionNote);
    console.log(`Sessions with notes: ${sessionsWithNotes.length}/${sessions.length}`);
    
    // Check for completed sessions
    const completedSessions = sessions.filter(s => s.status === 'completed');
    console.log(`Completed sessions: ${completedSessions.length}/${sessions.length}`);
    
    // Check for completed sessions with notes
    const completedWithNotes = completedSessions.filter(s => s.sessionNote);
    console.log(`Completed sessions with notes: ${completedWithNotes.length}/${completedSessions.length}`);
    
    // Check for products in session notes
    let totalProducts = 0;
    let sessionsWithProducts = 0;
    
    for (const session of sessionsWithNotes) {
      const note = session.sessionNote;
      let products = [];
      
      if (typeof note.products === 'string') {
        try {
          products = JSON.parse(note.products);
        } catch (e) {
          console.error(`Error parsing products JSON for session ${session.id}`);
        }
      } else if (Array.isArray(note.products)) {
        products = note.products;
      }
      
      if (products.length > 0) {
        sessionsWithProducts++;
        totalProducts += products.length;
        
        // Log product details
        console.log(`\nSession ${session.id} has ${products.length} products:`);
        for (const product of products) {
          console.log(`  - Code: ${product.itemCode || product.productCode}, Quantity: ${product.quantity || 1}, Unit Price: $${product.unitPrice || 0}`);
        }
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`Sessions with products: ${sessionsWithProducts}/${sessionsWithNotes.length}`);
    console.log(`Total products found: ${totalProducts}`);
    
  } catch (error) {
    console.error('Error checking sessions API:', error);
  }
}

checkSessionsAPI();