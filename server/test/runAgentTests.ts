#!/usr/bin/env ts-node
/**
 * Test Runner for ReactAgentService
 * 
 * This script runs the comprehensive tests for the ReactAgentService
 * and its ability to answer common questions using the new tools.
 */

import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

// Path for test results
const TEST_RESULTS_DIR = path.join(__dirname, '../../temp');
const TEST_RESULTS_FILE = path.join(TEST_RESULTS_DIR, 'agent_test_results.json');

// Make sure the temp directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

console.log('🧪 ReactAgentService Test Runner 🧪');
console.log('===================================\n');

try {
  console.log('Running comprehensive agent tools tests...\n');
  
  // Run the comprehensive tests
  execSync('npx ts-node ./server/test/agentToolsTest.ts', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  // Check if test results exist
  if (fs.existsSync(TEST_RESULTS_FILE)) {
    const results = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf-8'));
    
    console.log('\n📝 Test Results Summary 📝');
    console.log(`Total Tests: ${results.totalTests}`);
    console.log(`Success Rate: ${results.successRate}`);
    
    // Check if we need to improve the agent
    if (parseFloat(results.successRate) < 80) {
      console.log('\n⚠️ Warning: Success rate is below 80%. Consider improving the agent tools.');
      
      // List failed tests
      console.log('\nFailed Tests:');
      results.results.filter((r: any) => !r.success).forEach((test: any, index: number) => {
        console.log(`${index + 1}. ${test.category}: "${test.question}"`);
        console.log(`   Missing keywords: ${test.missingKeywords.join(', ')}`);
      });
    } else {
      console.log('\n✅ Success rate is good! The agent is performing well.');
    }
  }
  
} catch (error) {
  console.error('Error running tests:', error);
  process.exit(1);
}
