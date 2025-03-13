/**
 * This script deletes a specific client by ID
 */
import { db } from "./server/db";
import { clients } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const duplicateClientId = 53; // The 'Test 3' client without budget settings
    
    // Delete the client
    const result = await db
      .delete(clients)
      .where(eq(clients.id, duplicateClientId))
      .returning();
    
    console.log(`Deleted client with ID ${duplicateClientId}:`, result);
    
  } catch (error) {
    console.error("Error deleting client:", error);
  }
}

main().catch(console.error);