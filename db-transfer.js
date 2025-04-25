
const { Pool } = require('pg');

async function transferData() {
  // Source database connection
  const sourcePool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Oi1t3TqhZauw@ep-shy-boat-a44f1wqi.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  // Target database connection (Replit's PostgreSQL)
  const targetPool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // First get schema from source database
    const schemaResult = await sourcePool.query(`
      SELECT 
        table_name,
        array_agg(
          column_name || ' ' || data_type || 
          CASE 
            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
            ELSE ''
          END
        ) as columns
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name NOT IN ('assistant_settings', 'assistant_messages', 'assistant_conversations')
      GROUP BY table_name
    `);

    // Create tables in target database
    for (const table of schemaResult.rows) {
      const createTableSQL = `CREATE TABLE IF NOT EXISTS ${table.table_name} (${table.columns.join(', ')})`;
      await targetPool.query(createTableSQL);
      console.log(`Created table: ${table.table_name}`);
    }

    // Get list of tables
    const tablesResult = await sourcePool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name NOT IN ('assistant_settings', 'assistant_messages', 'assistant_conversations')
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('Tables to transfer:', tables);

    // Transfer each table
    for (const table of tables) {
      console.log(`Transferring table: ${table}`);
      
      // Get data from source
      const sourceData = await sourcePool.query(`SELECT * FROM ${table}`);
      
      if (sourceData.rows.length > 0) {
        // Generate column names
        const columns = Object.keys(sourceData.rows[0]);
        
        // Generate placeholders for values
        const valuePlaceholders = sourceData.rows.map((_, rowIndex) => 
          `(${columns.map((_, colIndex) => 
            `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
        ).join(', ');

        // Flatten values array
        const values = sourceData.rows.flatMap(row => 
          columns.map(col => row[col])
        );

        // Clear existing data
        await targetPool.query(`TRUNCATE TABLE ${table} CASCADE`);

        // Insert data if we have any
        if (values.length > 0) {
          const insertQuery = `
            INSERT INTO ${table} (${columns.join(', ')})
            VALUES ${valuePlaceholders}
          `;
          
          await targetPool.query(insertQuery, values);
          console.log(`✓ Transferred ${sourceData.rows.length} rows to ${table}`);
        }
      } else {
        console.log(`- Table ${table} is empty, skipping`);
      }
    }

    console.log('Data transfer completed successfully');
  } catch (error) {
    console.error('Error during transfer:', error);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

transferData();
