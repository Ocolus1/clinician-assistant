/**
 * Manage Financial Test Client
 * 
 * This script provides a command-line interface to create or delete
 * the financial test client used for fund utilization testing.
 */
import createFinancialTestClient from './create-financial-test-client';
import deleteFinancialTestClient from './delete-financial-test-client';

const action = process.argv[2]?.toLowerCase();

async function main() {
  if (action === 'create') {
    console.log("Creating financial test client...");
    await createFinancialTestClient();
    console.log("Financial test client created successfully!");
  } 
  else if (action === 'delete') {
    console.log("Deleting financial test client...");
    await deleteFinancialTestClient();
    console.log("Financial test client deleted successfully!");
  }
  else {
    console.log(`
    Usage: npm run ts-node manage-financial-test-client.ts [create|delete]
    
    Commands:
      create   Creates a new financial test client with:
               - Name: Test Financial Report
               - Creation date: January 18, 2025
               - Total budget: $15,000
               - 6 sessions with products valued at $1,250 each
               - Plan expiry: November 12, 2025
    
      delete   Deletes the financial test client and all associated data
    `);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });