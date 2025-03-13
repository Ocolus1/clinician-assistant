/**
 * This script updates a client's onboardingStatus to "complete" so it appears in the client list by default
 */
import { db } from "./server/db";
import { clients } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const clientId = 53; // Test 3 client ID
    
    // Update the client's onboardingStatus to "complete"
    const updatedClient = await db
      .update(clients)
      .set({ onboardingStatus: "complete" })
      .where(eq(clients.id, clientId))
      .returning();
    
    console.log(`Updated client ${clientId} onboardingStatus to "complete":`, updatedClient);
    
  } catch (error) {
    console.error("Error updating client:", error);
  }
}

main().catch(console.error);