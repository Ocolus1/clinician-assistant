/**
 * Debug Session Notes Retrieval
 * 
 * This script compares direct database queries with API results to 
 * diagnose why session notes are missing from API responses.
 */
import pg from 'pg';
import fetch from 'node-fetch';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const clientId = 88; // Hard-coded client ID for debugging

async function debugSessionNotes() {
  try {
    console.log(`=== DEBUGGING SESSION NOTES RETRIEVAL FOR CLIENT ${clientId} ===`);

    // 1. Direct DB query for sessions
    console.log('\n1. DIRECT DATABASE QUERY FOR SESSIONS:');
    const sessionsQuery = await pool.query(
      'SELECT * FROM sessions WHERE client_id = $1',
      [clientId]
    );
    console.log(`Found ${sessionsQuery.rows.length} sessions in database`);
    
    // Session IDs for further queries
    const sessionIds = sessionsQuery.rows.map(s => s.id);
    console.log(`Session IDs: ${sessionIds.join(', ')}`);

    // 2. Direct DB query for session notes
    console.log('\n2. DIRECT DATABASE QUERY FOR SESSION NOTES:');
    const notesQuery = await pool.query(
      `SELECT * FROM session_notes WHERE session_id IN (${sessionIds.join(',')})`,
      []
    );
    console.log(`Found ${notesQuery.rows.length} session notes in database`);
    
    // Print each session note
    notesQuery.rows.forEach(note => {
      console.log(`\nNote ID: ${note.id} for Session ID: ${note.session_id}`);
      console.log(`Status: ${note.status}`);
      console.log(`Has products: ${note.products ? 'YES' : 'NO'}`);
      
      // Try to parse products
      if (note.products) {
        try {
          const products = typeof note.products === 'string' ? 
            JSON.parse(note.products) : note.products;
          console.log(`Products parsed successfully: ${products.length} items`);
          if (products.length > 0) {
            console.log(`First product: ${JSON.stringify(products[0])}`);
          }
        } catch (e) {
          console.log(`Error parsing products: ${e.message}`);
          console.log(`Raw products value: ${note.products}`);
        }
      }
    });
    
    // 3. API call for client sessions
    console.log('\n3. API CALL FOR CLIENT SESSIONS:');
    const apiResponse = await fetch(`http://localhost:5000/api/clients/${clientId}/sessions`);
    
    if (!apiResponse.ok) {
      throw new Error(`API request failed with status ${apiResponse.status}`);
    }
    
    const sessionsFromApi = await apiResponse.json();
    console.log(`API returned ${sessionsFromApi.length} sessions`);
    
    // Check how many have session notes
    const notesInApi = sessionsFromApi.filter(s => s.note);
    console.log(`Sessions with notes in API response: ${notesInApi.length}/${sessionsFromApi.length}`);
    
    // Compare each session from API with DB
    console.log('\n4. COMPARING API SESSIONS WITH DATABASE:');
    for (const session of sessionsFromApi) {
      console.log(`\nSession ID: ${session.id} (${session.title})`);
      console.log(`Status: ${session.status}`);
      
      // Check if this session has a note in DB
      const dbNotes = notesQuery.rows.filter(note => note.session_id === session.id);
      console.log(`Database notes for this session: ${dbNotes.length}`);
      
      // Check if session has a note in API
      if (session.note) {
        console.log(`✅ Session has note in API response`);
        console.log(`  Note status: ${session.note.status}`);
        
        // Check if note has products
        if (session.note.products) {
          console.log(`  Products in note: ${typeof session.note.products === 'string' ? 
            JSON.parse(session.note.products).length : 
            session.note.products.length}`);
        }
      } else {
        console.log(`❌ Session missing note in API response`);
        
        // If DB has note but API doesn't, print details
        if (dbNotes.length > 0) {
          console.log(`ISSUE DETECTED: Session has ${dbNotes.length} note(s) in DB but none in API`);
          dbNotes.forEach(note => {
            console.log(`  Missing note ID: ${note.id}, status: ${note.status}`);
          });
        }
      }
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
  } catch (error) {
    console.error('Error debugging session notes:', error);
  } finally {
    await pool.end();
  }
}

debugSessionNotes();