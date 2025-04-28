import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { clinicians } from "../schema";

// Chat sessions table for tracking conversations
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  clinicianId: integer("clinician_id").notNull().references(() => clinicians.id),
  title: text("title").notNull().default("New Chat"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  metadata: jsonb("metadata"),
});

// Chat messages table for storing conversation history
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chatSessionId: integer("chat_session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Query logs table for tracking database queries made by the chatbot
export const queryLogs = pgTable("query_logs", {
  id: serial("id").primaryKey(),
  chatMessageId: integer("chat_message_id").references(() => chatMessages.id, { onDelete: "cascade" }),
  queryText: text("query_text").notNull(),
  executionTime: integer("execution_time"), // in milliseconds
  resultCount: integer("result_count"),
  error: text("error"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Chat memories table for storing long-term memories
export const chatMemories = pgTable("chat_memories", {
  id: serial("id").primaryKey(),
  chatSessionId: integer("chat_session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: text("embedding"), // Store vector embedding for similarity search
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat summaries table for storing conversation summaries
export const chatSummaries = pgTable("chat_summaries", {
  id: serial("id").primaryKey(),
  chatSessionId: integer("chat_session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  messageRange: text("message_range").notNull(), // e.g., "1-50"
  createdAt: timestamp("created_at").defaultNow(),
});

// AI agent configuration table
export const aiAgentConfig = pgTable("ai_agent_config", {
  id: serial("id").primaryKey(),
  modelName: text("model_name").notNull().default("gpt-4o"),
  temperature: numeric("temperature").notNull().default("0.7").$type<number>(),
  maxTokens: integer("max_tokens").notNull().default(2000),
  systemPrompt: text("system_prompt"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Create insert schemas
export const insertChatSessionSchema = createInsertSchema(chatSessions)
  .omit({ id: true, startTime: true, endTime: true, metadata: true })
  .extend({
    title: z.string().min(1, { message: "Title is required" }),
  });

export const insertChatMessageSchema = createInsertSchema(chatMessages)
  .omit({ id: true, timestamp: true })
  .extend({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1, { message: "Content is required" }),
  });

export const insertQueryLogSchema = createInsertSchema(queryLogs)
  .omit({ id: true, timestamp: true });

export const insertChatMemorySchema = createInsertSchema(chatMemories)
  .omit({ id: true, createdAt: true });

export const insertChatSummarySchema = createInsertSchema(chatSummaries)
  .omit({ id: true, createdAt: true });

export const insertAiAgentConfigSchema = createInsertSchema(aiAgentConfig)
  .omit({ id: true, createdAt: true, updatedAt: true, isActive: true })
  .extend({
    modelName: z.string().min(1, { message: "Model name is required" }),
    temperature: z.coerce.number().min(0).max(1),
    maxTokens: z.coerce.number().min(1),
  });

// Define types for selects
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type QueryLog = typeof queryLogs.$inferSelect;
export type ChatMemory = typeof chatMemories.$inferSelect;
export type ChatSummary = typeof chatSummaries.$inferSelect;
export type AiAgentConfig = typeof aiAgentConfig.$inferSelect;

// Define types for inserts
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertQueryLog = z.infer<typeof insertQueryLogSchema>;
export type InsertChatMemory = z.infer<typeof insertChatMemorySchema>;
export type InsertChatSummary = z.infer<typeof insertChatSummarySchema>;
export type InsertAiAgentConfig = z.infer<typeof insertAiAgentConfigSchema>;
