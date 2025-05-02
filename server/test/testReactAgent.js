// Simple test script for the ReactAgentService
// This script will test the agent's ability to answer common questions

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Create temp directory if it doesn't exist
const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Test questions file
const testQuestionsFile = path.join(tempDir, "test_questions.json");

// Create test questions with a placeholder for patient name
const testQuestions = [
  {
    category: "Goal & Milestone Tracking",
    question: "What goals is PATIENT_NAME currently working on?",
    expectedKeywords: ["goal", "PATIENT_NAME"],
  },
  {
    category: "Strategy Insights",
    question: "What strategies were used most frequently with PATIENT_NAME?",
    expectedKeywords: ["strateg", "PATIENT_NAME"],
  },
  {
    category: "Session Engagement",
    question: "How many sessions has PATIENT_NAME attended this month?",
    expectedKeywords: ["session", "PATIENT_NAME", "month"],
  },
  {
    category: "Report Generation",
    question: "What's PATIENT_NAME's progress summary across all goals?",
    expectedKeywords: ["progress", "goal", "PATIENT_NAME"],
  },
  {
    category: "Budget Tracking",
    question: "How much funding is left in PATIENT_NAME's budget plan?",
    expectedKeywords: ["budget", "fund", "PATIENT_NAME"],
  },
];

// Get a real patient name from the database
const getPatientName = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT name FROM patients LIMIT 1;
    `;

    const command = `node -e "
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: ''
      });
      
      async function getPatientName() {
        try {
          const client = await pool.connect();
          const result = await client.query('SELECT name FROM patients LIMIT 1');
          console.log(result.rows[0].name);
          client.release();
          pool.end();
        } catch (err) {
          console.error('Error:', err);
          process.exit(1);
        }
      }
      
      getPatientName();
    "`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }

      const patientName = stdout.trim();
      console.log(`Using patient name: ${patientName}`);
      resolve(patientName);
    });
  });
};

// Replace placeholder with real patient name
const prepareQuestions = async () => {
  try {
    const patientName = await getPatientName();

    const preparedQuestions = testQuestions.map((q) => ({
      ...q,
      question: q.question.replace("PATIENT_NAME", patientName),
      expectedKeywords: q.expectedKeywords.map((k) =>
        k === "PATIENT_NAME" ? patientName : k
      ),
    }));

    fs.writeFileSync(
      testQuestionsFile,
      JSON.stringify(preparedQuestions, null, 2)
    );
    console.log(`Test questions prepared and saved to ${testQuestionsFile}`);

    return preparedQuestions;
  } catch (error) {
    console.error("Error preparing questions:", error);
    throw error;
  }
};

// Run a test with the ReactAgentService
const runTest = (question) => {
  return new Promise((resolve, reject) => {
    const command = `node -e "
      import('./dist/server/services/reactAgentService.js').then(async ({ reactAgentService }) => {
        try {
          const answer = await reactAgentService.processQuery('${question.replace(
            /'/g,
            "\\'"
          )}', 999);
          console.log(JSON.stringify({ answer }));
        } catch (error) {
          console.error('Error:', error.message);
          process.exit(1);
        }
      }).catch(error => {
        console.error('Import error:', error.message);
        process.exit(1);
      });
    "`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result.answer);
      } catch (parseError) {
        console.error("Error parsing result:", parseError);
        console.log("Raw output:", stdout);
        reject(parseError);
      }
    });
  });
};

// Check if answer contains expected keywords
const validateAnswer = (answer, expectedKeywords) => {
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
    missingKeywords,
  };
};

// Main function to run all tests
const runAllTests = async () => {
  console.log("🧪 STARTING REACT AGENT TESTS 🧪\n");

  try {
    const questions = await prepareQuestions();
    console.log(`Running ${questions.length} test questions...\n`);

    const results = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\nTEST ${i + 1}/${questions.length}: ${question.category}`);
      console.log(`QUESTION: "${question.question}"`);

      try {
        const answer = await runTest(question.question);
        const validation = validateAnswer(answer, question.expectedKeywords);

        console.log("\nANSWER:");
        console.log("=".repeat(80));
        console.log(answer);
        console.log("=".repeat(80));

        console.log(
          `\nEXPECTED KEYWORDS: ${question.expectedKeywords.join(", ")}`
        );
        console.log(`FOUND KEYWORDS: ${validation.foundKeywords.join(", ")}`);
        console.log(
          `MISSING KEYWORDS: ${validation.missingKeywords.join(", ")}`
        );

        const success = validation.success;
        console.log(`\nRESULT: ${success ? "✅ SUCCESS" : "❌ FAILURE"}`);

        results.push({
          category: question.category,
          question: question.question,
          answer,
          success,
          expectedKeywords: question.expectedKeywords,
          foundKeywords: validation.foundKeywords,
          missingKeywords: validation.missingKeywords,
        });
      } catch (error) {
        console.error(`Error testing question "${question.question}":`, error);

        results.push({
          category: question.category,
          question: question.question,
          answer: `ERROR: ${error.message}`,
          success: false,
          expectedKeywords: question.expectedKeywords,
          foundKeywords: [],
          missingKeywords: question.expectedKeywords,
        });
      }

      console.log("\n" + "-".repeat(80));
    }

    // Save results
    const resultsFile = path.join(tempDir, "test_results.json");
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      successfulTests: results.filter((r) => r.success).length,
      failedTests: results.filter((r) => !r.success).length,
      successRate:
        (
          (results.filter((r) => r.success).length / results.length) *
          100
        ).toFixed(2) + "%",
      results,
    };

    fs.writeFileSync(resultsFile, JSON.stringify(summary, null, 2));
    console.log(`\nTest results saved to ${resultsFile}`);

    // Print summary
    console.log("\n🧪 TEST SUMMARY 🧪");
    console.log(`Total Tests: ${results.length}`);
    console.log(`Successful: ${summary.successfulTests}`);
    console.log(`Failed: ${summary.failedTests}`);
    console.log(`Success Rate: ${summary.successRate}\n`);

    // Category breakdown
    console.log("\n📊 CATEGORY BREAKDOWN 📊");
    const categories = [...new Set(results.map((r) => r.category))];
    for (const category of categories) {
      const categoryTests = results.filter((r) => r.category === category);
      const categorySuccess = categoryTests.filter((r) => r.success).length;
      const successRate =
        categoryTests.length > 0
          ? ((categorySuccess / categoryTests.length) * 100).toFixed(2)
          : "0.00";

      console.log(
        `${category}: ${categorySuccess}/${categoryTests.length} (${successRate}%)`
      );
    }
  } catch (error) {
    console.error("Error running tests:", error);
  }
};

// Run the tests
runAllTests().catch((error) => {
  console.error("Unhandled error in tests:", error);
});
