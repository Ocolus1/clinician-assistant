/**
 * Simple test for MySQL to PostgreSQL LIMIT clause conversion
 */

// Test a MySQL-style LIMIT clause and convert it to PostgreSQL format
function sanitizeQuery(query) {
  console.log("Original query:", query);
  let sanitized = query;
  
  // Fix potential syntax issues with LIMIT clause (ensure PostgreSQL format)
  // Check for incorrect LIMIT formats like "LIMIT 10,20" (MySQL style) or "LIMIT 100;"
  const limitRegex = /\bLIMIT\s+(\d+)(?:\s*,\s*(\d+))?(?:;)?/i;
  if (limitRegex.test(sanitized)) {
    // Convert MySQL style LIMIT clause to PostgreSQL format or remove trailing semicolon
    sanitized = sanitized.replace(limitRegex, (match, p1, p2) => {
      if (p2) {
        // Convert MySQL style "LIMIT offset, limit" to PostgreSQL "LIMIT limit OFFSET offset"
        console.log(`Converting MySQL LIMIT ${p1}, ${p2} to PostgreSQL format`);
        return `LIMIT ${p2} OFFSET ${p1}`;
      }
      // Remove any trailing semicolon after LIMIT
      return `LIMIT ${p1}`;
    });
  }
  
  console.log("Sanitized query:", sanitized);
  return sanitized;
}

// Test cases
const testCases = [
  "SELECT * FROM clients LIMIT 100", // Standard format (already correct)
  "SELECT * FROM clients LIMIT 10, 20", // MySQL style format (needs conversion)
  "SELECT * FROM clients LIMIT 100;", // With semicolon (needs cleaning)
  "SELECT * FROM clients LIMIT 0,5" // MySQL style without space (needs conversion)
];

// Run tests
console.log("==== LIMIT Clause Conversion Tests ====");
for (let i = 0; i < testCases.length; i++) {
  console.log(`\nTest ${i+1}:`);
  const sanitized = sanitizeQuery(testCases[i]);
  
  // Verify PostgreSQL format
  const limitMatch = sanitized.match(/\bLIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
  if (limitMatch) {
    console.log("✅ Converted to valid PostgreSQL format:", limitMatch[0]);
  } else {
    console.log("❌ Failed to convert to PostgreSQL format");
  }
}