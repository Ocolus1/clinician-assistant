/**
 * Conversation Manager for Multi-turn Conversations
 * 
 * This module provides functionality for managing stateful conversations,
 * including reference resolution, context carryover, and handling
 * follow-up questions.
 */
import { QueryContext, ExtractedEntity, Message, ConversationMemory } from './types';

/**
 * Contains words that indicate the query may be referencing a previous subject
 */
const REFERENCE_TERMS = [
  'it', 'its', 'this', 'that', 'they', 'them', 'these', 'those', 'their',
  'he', 'him', 'his', 'she', 'her', 'hers'
];

/**
 * Contains phrases that indicate the query may be incomplete and using previous context
 */
const ELLIPSIS_PATTERNS = [
  /^(and|what about|how about)\b/i,
  /^(can you|could you|would you)\b/i,
  /^(is|are|was|were|do|does|did)\b/i,
];

/**
 * Subject mapping for common query types
 */
const SUBJECT_MAP: Record<string, string[]> = {
  'budget': ['budget', 'funds', 'money', 'allocation', 'spending', 'cost'],
  'progress': ['progress', 'goal', 'milestone', 'advancement', 'improvement'],
  'strategy': ['strategy', 'approach', 'technique', 'method', 'tactic'],
  'client': ['client', 'patient', 'person', 'individual', 'child', 'adult'],
  'session': ['session', 'appointment', 'meeting', 'visit', 'attendance'],
};

/**
 * Resolve references in a query using conversation history
 * Handles pronouns and implicit references
 */
export function resolveReferences(query: string, context: QueryContext): string {
  const { conversationHistory, conversationMemory } = context;
  if (!conversationHistory || conversationHistory.length === 0) return query;
  
  let resolvedQuery = query;
  const lastUserMessage = findLastUserMessage(conversationHistory);
  const lastAssistantMessage = findLastAssistantMessage(conversationHistory);
  
  if (!lastUserMessage || !lastAssistantMessage) return query;
  
  // Check if the query contains reference terms
  const hasReferenceTerms = REFERENCE_TERMS.some(term => 
    new RegExp(`\\b${term}\\b`, 'i').test(resolvedQuery)
  );
  
  if (hasReferenceTerms) {
    resolvedQuery = replacePronounReferences(
      resolvedQuery,
      lastAssistantMessage.content,
      lastUserMessage.content,
      conversationMemory
    );
  }
  
  // Check for ellipsis patterns (incomplete questions)
  const hasEllipsis = ELLIPSIS_PATTERNS.some(pattern => pattern.test(resolvedQuery));
  
  if (hasEllipsis) {
    resolvedQuery = expandEllipticalQuery(
      resolvedQuery,
      lastUserMessage.content,
      conversationMemory
    );
  }
  
  return resolvedQuery;
}

/**
 * Find the last user message in conversation history
 */
function findLastUserMessage(conversationHistory: Message[]): Message | undefined {
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    if (conversationHistory[i].role === 'user') {
      return conversationHistory[i];
    }
  }
  return undefined;
}

/**
 * Find the last assistant message in conversation history
 */
function findLastAssistantMessage(conversationHistory: Message[]): Message | undefined {
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    if (conversationHistory[i].role === 'assistant') {
      return conversationHistory[i];
    }
  }
  return undefined;
}

/**
 * Replace pronoun references with their likely referents
 */
function replacePronounReferences(
  query: string,
  assistantMessage: string,
  userMessage: string,
  memory?: ConversationMemory
): string {
  // Define potential referents based on previous messages and memory
  const potentialReferents: Record<string, string> = {};
  
  // Extract potential client references
  if (memory?.recentEntities) {
    const clientEntity = memory.recentEntities.find(e => e.type === 'ClientName' || e.type === 'ClientID');
    if (clientEntity && clientEntity.text) {
      potentialReferents['client'] = clientEntity.text;
    }
  }
  
  // Extract potential subject references from context carryover
  if (memory?.contextCarryover) {
    if (memory.contextCarryover.subject) {
      potentialReferents['subject'] = memory.contextCarryover.subject;
    }
    if (memory.contextCarryover.category) {
      potentialReferents['category'] = memory.contextCarryover.category;
    }
  }
  
  // Extract topic from previous messages
  if (memory?.lastTopic) {
    potentialReferents['topic'] = memory.lastTopic;
  }
  
  // Replace pronouns with their likely referents based on context
  return query.replace(/\b(it|this|that|they|them|these|those|their|he|him|his|she|her|hers)\b/gi, (match) => {
    const lowercaseMatch = match.toLowerCase();
    
    // Handle gender-specific pronouns
    if (['he', 'him', 'his'].includes(lowercaseMatch) && potentialReferents['client']) {
      return potentialReferents['client'];
    }
    
    if (['she', 'her', 'hers'].includes(lowercaseMatch) && potentialReferents['client']) {
      return potentialReferents['client'];
    }
    
    // Handle object pronouns
    if (['it', 'this', 'that'].includes(lowercaseMatch)) {
      if (potentialReferents['subject']) {
        return potentialReferents['subject'];
      } else if (potentialReferents['topic']) {
        return potentialReferents['topic'];
      }
    }
    
    // Handle plural pronouns
    if (['they', 'them', 'these', 'those', 'their'].includes(lowercaseMatch)) {
      if (potentialReferents['category']) {
        return potentialReferents['category'];
      }
    }
    
    // If no suitable referent is found, return the original pronoun
    return match;
  });
}

/**
 * Expand an elliptical query (incomplete question) using previous context
 */
function expandEllipticalQuery(
  query: string,
  previousUserQuery: string,
  memory?: ConversationMemory
): string {
  // Get the subject from previous query
  const subject = extractMainSubject(previousUserQuery, memory);
  if (!subject) return query;
  
  // Check if our query already contains the subject
  const subjectTerms = getTermsForSubject(subject);
  const containsSubjectAlready = subjectTerms.some(term => 
    new RegExp(`\\b${term}\\b`, 'i').test(query)
  );
  
  if (containsSubjectAlready) return query;
  
  // Handle different ellipsis patterns
  if (/^(and|what about|how about)\b/i.test(query)) {
    return `${query} for ${subject}`;
  }
  
  if (/^(can you|could you|would you)\b/i.test(query)) {
    return `${query} regarding ${subject}`;
  }
  
  if (/^(is|are|was|were|do|does|did)\b/i.test(query)) {
    return `${query} ${subject}`;
  }
  
  // Default expansion
  return `${subject} ${query}`;
}

/**
 * Extract the main subject from a query
 */
function extractMainSubject(query: string, memory?: ConversationMemory): string | null {
  // First check memory for explicit subject
  if (memory?.contextCarryover?.subject) {
    return memory.contextCarryover.subject;
  }
  
  // Then check for subject in the query
  const lowercaseQuery = query.toLowerCase();
  
  for (const [subject, terms] of Object.entries(SUBJECT_MAP)) {
    for (const term of terms) {
      if (lowercaseQuery.includes(term)) {
        return subject;
      }
    }
  }
  
  // If no subject is found, use topic from memory
  if (memory?.lastTopic) {
    return memory.lastTopic;
  }
  
  return null;
}

/**
 * Get related terms for a subject
 */
function getTermsForSubject(subject: string): string[] {
  return SUBJECT_MAP[subject] || [subject];
}

/**
 * Update conversation memory based on query and response
 */
export function updateConversationMemory(
  query: string,
  entities: ExtractedEntity[],
  topic: string | undefined,
  memory: ConversationMemory = {}
): ConversationMemory {
  const newMemory = { ...memory };
  
  // Update last query
  newMemory.lastQuery = query;
  
  // Update topic if available
  if (topic) {
    newMemory.lastTopic = topic;
  }
  
  // Update entities
  if (entities && entities.length > 0) {
    newMemory.recentEntities = entities;
    
    // Extract context carryover from entities
    const contextCarryover = newMemory.contextCarryover || {};
    
    // Process client entities
    const clientEntity = entities.find(e => e.type === 'ClientName' || e.type === 'ClientID');
    if (clientEntity) {
      contextCarryover.subject = clientEntity.text;
    }
    
    // Process category entities
    const categoryEntity = entities.find(e => e.type === 'Category');
    if (categoryEntity) {
      contextCarryover.category = categoryEntity.text;
    }
    
    newMemory.contextCarryover = contextCarryover;
  }
  
  return newMemory;
}

/**
 * Detect the topic from a query
 */
export function detectTopicFromQuery(query: string): string | undefined {
  const lowercaseQuery = query.toLowerCase();
  
  if (containsAny(lowercaseQuery, SUBJECT_MAP['budget'])) {
    return 'budget';
  }
  
  if (containsAny(lowercaseQuery, SUBJECT_MAP['progress'])) {
    return 'progress';
  }
  
  if (containsAny(lowercaseQuery, SUBJECT_MAP['strategy'])) {
    return 'strategy';
  }
  
  if (containsAny(lowercaseQuery, SUBJECT_MAP['client'])) {
    return 'client';
  }
  
  if (containsAny(lowercaseQuery, SUBJECT_MAP['session'])) {
    return 'session';
  }
  
  return undefined;
}

/**
 * Check if text contains any of the specified terms
 */
function containsAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term));
}

export default {
  resolveReferences,
  updateConversationMemory,
  detectTopicFromQuery
};