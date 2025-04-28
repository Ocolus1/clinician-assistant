import { OpenAI } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set");
  process.exit(1);
}

// Create OpenAI model instances
export const openaiModel = new OpenAI({
  modelName: "gpt-4o",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export const chatModel = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Create a prompt template for SQL generation
export const sqlPromptTemplate = PromptTemplate.fromTemplate(`
You are a SQL expert. Given the following database schema and a question, 
write a SQL query that answers the question.

Database Schema:
{schema}

Question: {question}

SQL Query:
`);

// Create a chain for generating SQL queries
export const sqlChain = RunnableSequence.from([
  sqlPromptTemplate,
  openaiModel,
]);

// Create a prompt template for natural language responses
export const responsePromptTemplate = PromptTemplate.fromTemplate(`
You are a helpful assistant for clinicians. Given the following database query result and question,
provide a natural language response that answers the question in a conversational and empathetic tone.
Be concise but thorough.

Question: {question}

Database Result: {result}

Response:
`);

// Create a chain for generating natural language responses
export const responseChain = RunnableSequence.from([
  responsePromptTemplate,
  chatModel,
]);

// Export a function to generate SQL from a question
export async function generateSqlFromQuestion(schema: string, question: string): Promise<string> {
  try {
    return await sqlChain.invoke({
      schema,
      question,
    });
  } catch (error) {
    console.error("Error generating SQL:", error);
    throw new Error("Failed to generate SQL query");
  }
}

// Export a function to generate a response from a question and result
export async function generateResponseFromResult(question: string, result: any): Promise<string> {
  try {
    const response = await responseChain.invoke({
      question,
      result: JSON.stringify(result),
    });
    
    // Handle different response types from LangChain
    if (typeof response === 'string') {
      return response;
    } else if (response && typeof response === 'object') {
      // Handle AIMessage or BaseMessage objects
      if ('content' in response) {
        const content = response.content;
        if (typeof content === 'string') {
          return content;
        } else if (Array.isArray(content)) {
          // Handle complex message content
          return content.map(item => {
            if (typeof item === 'string') {
              return item;
            } else if (item && typeof item === 'object') {
              // Handle different types of MessageContentComplex
              if ('type' in item && item.type === 'text' && 'text' in item) {
                return item.text;
              }
              // For other types (like image URLs), just return a placeholder
              return '[Content of type: ' + (item.type || 'unknown') + ']';
            }
            return '';
          }).join(' ');
        }
      }
      // Fallback to stringifying the object
      return JSON.stringify(response);
    }
    
    // Final fallback
    return "Unable to process response";
  } catch (error) {
    console.error("Error generating response:", error);
    throw new Error("Failed to generate response");
  }
}
