// Puppeteer-based test for ReactAgentService
// This script uses Puppeteer to test the agent through the web interface

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for test results
const TEST_RESULTS_DIR = path.join(__dirname, '../../temp');
const TEST_RESULTS_FILE = path.join(TEST_RESULTS_DIR, 'puppeteer_test_results.json');

// Make sure the temp directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// Test questions with real patient names
const testQuestions = [
  {
    category: "Goal & Milestone Tracking",
    question: "What goals is Radwan-563004 currently working on?",
    expectedKeywords: ["goal", "Radwan-563004"]
  },
  {
    category: "Strategy Insights",
    question: "What strategies were used most frequently with Radwan-475376?",
    expectedKeywords: ["strateg", "Radwan-475376"]
  },
  {
    category: "Session Engagement",
    question: "How many sessions has Radwan-768090 attended this month?",
    expectedKeywords: ["session", "Radwan-768090", "month"]
  },
  {
    category: "Report Generation",
    question: "What's Radwan-765193's progress summary across all goals?",
    expectedKeywords: ["progress", "goal", "Radwan-765193"]
  },
  {
    category: "Budget Tracking",
    question: "How much funding is left in Radwan-585666's budget plan?",
    expectedKeywords: ["budget", "fund", "Radwan-585666"]
  }
];

// Helper function to validate answer
function validateAnswer(answer, expectedKeywords) {
  const lowerAnswer = answer.toLowerCase();
  const foundKeywords = [];
  const missingKeywords = [];
  
  for (const keyword of expectedKeywords) {
    if (lowerAnswer.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }
  
  return {
    success: missingKeywords.length === 0,
    foundKeywords,
    missingKeywords
  };
}

// Helper function to log test results
function logTestResult(result) {
  console.log('\n' + '='.repeat(80));
  console.log(`CATEGORY: ${result.category}`);
  console.log(`QUESTION: ${result.question}`);
  console.log('-'.repeat(80));
  console.log(`ANSWER: ${result.answer}`);
  console.log('-'.repeat(80));
  console.log(`EXPECTED KEYWORDS: ${result.expectedKeywords.join(', ')}`);
  console.log(`FOUND KEYWORDS: ${result.foundKeywords.join(', ')}`);
  console.log(`MISSING KEYWORDS: ${result.missingKeywords.join(', ')}`);
  console.log('-'.repeat(80));
  console.log(`RESULT: ${result.success ? '✅ SUCCESS' : '❌ FAILURE'}`);
  console.log('='.repeat(80) + '\n');
}

// Helper function to save test results to a file
function saveTestResults(results) {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      successfulTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      successRate: ((results.filter(r => r.success).length / results.length) * 100).toFixed(2) + '%',
      results: results
    };
    
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(data, null, 2));
    console.log(`Test results saved to ${TEST_RESULTS_FILE}`);
  } catch (error) {
    console.error('Error saving test results:', error);
  }
}

// Main test function
async function runTests() {
  console.log('\n🧪 STARTING PUPPETEER AGENT TESTS 🧪\n');
  
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('Opening new page...');
    const page = await browser.newPage();
    
    // Navigate to the application
    console.log('Navigating to application...');
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Wait for the page to load
    await page.waitForSelector('body');
    
    console.log('Application loaded successfully');
    
    // Store test results
    const testResults = [];
    
    // Run each test question
    for (let i = 0; i < testQuestions.length; i++) {
      const test = testQuestions[i];
      console.log(`\nTest ${i + 1}/${testQuestions.length}: ${test.category} - "${test.question}"`);
      
      try {
        // Navigate to the chatbot page
        await page.goto('http://localhost:5000/chat', { waitUntil: 'networkidle2' });
        
        // Wait for the chat input to be available
        await page.waitForSelector('textarea[placeholder="Type your message..."]');
        
        // Check if we need to create a new chat session
        const newChatButton = await page.$('button:has-text("New Chat")');
        if (newChatButton) {
          console.log('Creating new chat session...');
          await newChatButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
        
        // Type the question
        console.log('Typing question...');
        await page.type('textarea[placeholder="Type your message..."]', test.question);
        
        // Send the question
        console.log('Sending question...');
        await page.click('button[type="submit"]');
        
        // Wait for the response
        console.log('Waiting for response...');
        await page.waitForFunction(
          'document.querySelectorAll(".chat-message").length > 1',
          { timeout: 60000 } // 60 seconds timeout
        );
        
        // Get the last message (the response)
        const responseElement = await page.evaluate(() => {
          const messages = document.querySelectorAll('.chat-message');
          return messages[messages.length - 1].textContent;
        });
        
        console.log('Response received');
        
        // Validate the answer
        const validation = validateAnswer(responseElement, test.expectedKeywords);
        
        // Create test result
        const result = {
          category: test.category,
          question: test.question,
          answer: responseElement,
          success: validation.success,
          expectedKeywords: test.expectedKeywords,
          foundKeywords: validation.foundKeywords,
          missingKeywords: validation.missingKeywords,
          timestamp: new Date().toISOString()
        };
        
        // Log and store the result
        logTestResult(result);
        testResults.push(result);
        
        // Take a screenshot of the result
        const screenshotPath = path.join(TEST_RESULTS_DIR, `test_${i + 1}_${test.category.replace(/\s+/g, '_').toLowerCase()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to ${screenshotPath}`);
        
      } catch (error) {
        console.error(`Error processing question "${test.question}":`, error);
        
        // Create failure result
        const result = {
          category: test.category,
          question: test.question,
          answer: `ERROR: ${error.message}`,
          success: false,
          expectedKeywords: test.expectedKeywords,
          foundKeywords: [],
          missingKeywords: test.expectedKeywords,
          timestamp: new Date().toISOString()
        };
        
        logTestResult(result);
        testResults.push(result);
        
        // Take a screenshot of the error
        const screenshotPath = path.join(TEST_RESULTS_DIR, `error_${i + 1}_${test.category.replace(/\s+/g, '_').toLowerCase()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Error screenshot saved to ${screenshotPath}`);
      }
    }
    
    // Print summary
    const successCount = testResults.filter(r => r.success).length;
    const failureCount = testResults.filter(r => !r.success).length;
    
    console.log('\n🧪 TEST SUMMARY 🧪');
    console.log(`Total Tests: ${testResults.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log(`Success Rate: ${((successCount / testResults.length) * 100).toFixed(2)}%\n`);
    
    // Save results to file
    saveTestResults(testResults);
    
    // Category breakdown
    console.log('\n📊 CATEGORY BREAKDOWN 📊');
    const categories = [...new Set(testResults.map(r => r.category))];
    for (const category of categories) {
      const categoryTests = testResults.filter(r => r.category === category);
      const categorySuccess = categoryTests.filter(r => r.success).length;
      const successRate = categoryTests.length > 0 
        ? ((categorySuccess / categoryTests.length) * 100).toFixed(2) 
        : '0.00';
      
      console.log(`${category}: ${categorySuccess}/${categoryTests.length} (${successRate}%)`);
    }
    
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Close the browser
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
