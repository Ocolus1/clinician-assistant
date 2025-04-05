/**
 * Direct Database Check for Client Session Notes
 * 
 * This script queries the database directly to verify session notes and product data 
 * for a specific client.
 * 
 * Usage: node check-client-session-notes.js <clientId>
 */
import pg from 'pg';
const { Pool } = pg;

// Create a new database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const clientId = process.argv[2];

if (!clientId) {
  console.error('Please provide a client ID as an argument');
  console.error('Usage: node check-client-session-notes.js <clientId>');
  process.exit(1);
}

async function checkDatabase() {
  try {
    console.log(`Checking database for client ID ${clientId}`);

    // Get client info
    const clientResult = await pool.query(
      'SELECT * FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      console.error(`No client found with ID ${clientId}`);
      process.exit(1);
    }

    const client = clientResult.rows[0];
    console.log(`Found client: ${client.name} (ID: ${client.id})`);

    // Get all sessions for this client
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE client_id = $1',
      [clientId]
    );

    console.log(`Found ${sessionResult.rows.length} sessions for client ${clientId}`);

    // Get all session notes for this client
    const sessionNoteResult = await pool.query(
      'SELECT * FROM session_notes WHERE client_id = $1',
      [clientId]
    );

    console.log(`Found ${sessionNoteResult.rows.length} session notes for client ${clientId}`);

    // For each session, check if it has a session note
    for (const session of sessionResult.rows) {
      console.log(`\nSession ${session.id} (${session.title}) - Status: ${session.status}`);
      
      const notes = sessionNoteResult.rows.filter(note => note.session_id === session.id);
      
      if (notes.length === 0) {
        console.log(`  No session note found for this session`);
      } else {
        for (const note of notes) {
          console.log(`  Session Note ${note.id} - Status: ${note.status}`);
          
          if (note.products) {
            try {
              let products;
              if (typeof note.products === 'string') {
                products = JSON.parse(note.products);
              } else if (Array.isArray(note.products)) {
                products = note.products;
              } else {
                console.log(`  Products in unexpected format: ${typeof note.products}`);
                continue;
              }
              
              console.log(`  Products: ${products.length} items`);
              
              // Display product details
              for (const product of products) {
                const itemCode = product.itemCode || product.productCode;
                console.log(`    - Product Code: ${itemCode}, Quantity: ${product.quantity}, Unit Price: $${product.unitPrice}`);
              }
            } catch (e) {
              console.error(`  Error parsing products: ${e.message}`);
              console.log(`  Raw products value: ${note.products}`);
            }
          } else {
            console.log(`  No products in this session note`);
          }
        }
      }
    }

    // Get budget items for this client
    const budgetItemResult = await pool.query(
      'SELECT * FROM budget_items WHERE client_id = $1',
      [clientId]
    );

    console.log(`\nFound ${budgetItemResult.rows.length} budget items for client ${clientId}`);

    // Display budget item details and usage
    for (const item of budgetItemResult.rows) {
      const percentUsed = ((item.used_quantity || 0) / item.quantity) * 100;
      console.log(`  - Item Code: ${item.item_code}, Description: ${item.description}`);
      console.log(`    Quantity: ${item.used_quantity || 0}/${item.quantity} (${percentUsed.toFixed(2)}%)`);
      console.log(`    Unit Price: $${item.unit_price}, Cost: $${(item.used_quantity || 0) * item.unit_price}`);
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();