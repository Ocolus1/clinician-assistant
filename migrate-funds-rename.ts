
import { pool } from "./server/db";

async function migrateFundsColumn() {
  try {
    await pool.query(`
      ALTER TABLE clients 
      RENAME COLUMN available_funds TO ndis_funds;
    `);
    console.log('Successfully renamed funds column');
  } catch (error) {
    console.error('Error migrating funds column:', error);
  }
}

migrateFundsColumn();
