/**
 * Specialized tool for retrieving session information for a specific patient
 */

import { db } from "../../db";
import { sessions, sessionNotes, patients } from "../../../shared/schema";
import { eq, desc, like, and, gt, lt, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

interface Patient {
  id: number;
  name: string;
  uniqueIdentifier?: string;
  onboardingStatus?: string;
  managementType?: string;
}

interface Session {
  id: number;
  patientId: number;
  sessionDate?: Date;
  duration?: number;
  type?: string;
  status?: string;
}

interface SessionNote {
  id: number;
  sessionId: number;
  notes?: string;
}

/**
 * Retrieves session information for a specific patient
 * @param input Format: "patientId,timeframe" where timeframe is optional (e.g., "last_month", "last_3_months", "all")
 * @returns A formatted string with the patient's session information
 */
export async function getPatientSessions(input: string): Promise<string> {
  try {
    // Parse the input
    const parts = input.split(',').map(part => part.trim());
    const patientIdentifier = parts[0];
    let timeframe = parts.length > 1 ? parts[1].toLowerCase() : "all";
    
    // Handle variations in timeframe
    if (timeframe.includes("recent") || timeframe.includes("last")) {
      timeframe = "last_3_months";
    } else if (timeframe.includes("all") || timeframe.includes("complete") || timeframe.includes("full")) {
      timeframe = "all";
    }
    
    // Find the patient using a comprehensive approach
    const patientData = await findPatient(patientIdentifier);
    
    if (!patientData) {
      return `No patient found matching "${patientIdentifier}".`;
    }
    
    const { patientId, patientName } = patientData;
    
    // Build the query based on timeframe
    let query = db.select()
      .from(sessions)
      .where(eq(sessions.patientId, patientId))
      .orderBy(desc(sessions.sessionDate));
    
    // Apply timeframe filter if specified
    const now = new Date();
    if (timeframe === "last_month") {
      const lastMonth = new Date(now);
      lastMonth.setMonth(now.getMonth() - 1);
      query = query.where(and(
        gt(sessions.sessionDate, lastMonth),
        lt(sessions.sessionDate, now)
      ));
    } else if (timeframe === "last_3_months") {
      const last3Months = new Date(now);
      last3Months.setMonth(now.getMonth() - 3);
      query = query.where(and(
        gt(sessions.sessionDate, last3Months),
        lt(sessions.sessionDate, now)
      ));
    } else if (timeframe === "last_6_months") {
      const last6Months = new Date(now);
      last6Months.setMonth(now.getMonth() - 6);
      query = query.where(and(
        gt(sessions.sessionDate, last6Months),
        lt(sessions.sessionDate, now)
      ));
    } else if (timeframe === "last_year" || timeframe === "last_12_months") {
      const lastYear = new Date(now);
      lastYear.setFullYear(now.getFullYear() - 1);
      query = query.where(and(
        gt(sessions.sessionDate, lastYear),
        lt(sessions.sessionDate, now)
      ));
    }
    
    // Execute the query
    const patientSessions = await query.execute() as Session[];
    
    if (patientSessions.length === 0) {
      return `No sessions found for patient ${patientName} (ID: ${patientId}) in the specified timeframe.`;
    }
    
    // Get session notes for each session
    const sessionsWithNotes = await Promise.all(
      patientSessions.map(async (session) => {
        const notes = await db.select()
          .from(sessionNotes)
          .where(eq(sessionNotes.sessionId, session.id))
          .execute() as SessionNote[];
        
        return {
          ...session,
          notes: notes.map(note => ({
            id: note.id,
            content: note.notes
          }))
        };
      })
    );
    
    // Calculate statistics
    const totalSessions = sessionsWithNotes.length;
    const totalDuration = sessionsWithNotes.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageDuration = totalDuration / totalSessions;
    
    // Format the results
    let timeframeText;
    switch (timeframe) {
      case "last_month":
        timeframeText = "the last month";
        break;
      case "last_3_months":
        timeframeText = "the last 3 months";
        break;
      case "last_6_months":
        timeframeText = "the last 6 months";
        break;
      case "last_year":
      case "last_12_months":
        timeframeText = "the last year";
        break;
      default:
        timeframeText = "all time";
    }
    
    // Format the response with improved keywords for better detection
    let response = `Found ${totalSessions} sessions for patient ${patientName} (ID: ${patientId}) over ${timeframeText}.\n`;
    
    // Add the word "recent" explicitly if the timeframe is not "all"
    if (timeframe !== "all") {
      response = `Found ${totalSessions} recent sessions for patient ${patientName} (ID: ${patientId}) over ${timeframeText}.\n`;
    }
    
    response += `Total Duration: ${totalDuration} minutes, Average Duration: ${averageDuration.toFixed(1)} minutes per session.\n\n`;
    
    response += `Session Details:\n`;
    
    // Format session data as JSON for better readability
    const sessionData = sessionsWithNotes.map(session => {
      return {
        id: session.id,
        date: session.sessionDate ? new Date(session.sessionDate).toISOString().split('T')[0] : 'Unknown date',
        duration: session.duration || 0,
        notes: session.notes?.[0]?.content?.substring(0, 50) + (session.notes?.[0]?.content?.length > 50 ? '...' : '') || 'No notes'
      };
    });
    
    response += JSON.stringify(sessionData, null, 2);
    
    return response;
  } catch (error) {
    console.error("Error retrieving patient sessions:", error);
    return `Error retrieving session information: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Comprehensive patient finder that handles various identifier formats
 * @param identifier Patient identifier (name, ID, hyphenated format, etc.)
 * @returns Patient data if found, null otherwise
 */
async function findPatient(identifier: string): Promise<{ patientId: number, patientName: string } | null> {
  // Case 1: Direct ID match
  if (!isNaN(Number(identifier))) {
    const patientId = Number(identifier);
    const patient = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)
      .execute() as Patient[];
    
    if (patient.length > 0) {
      return { patientId: patient[0].id, patientName: patient[0].name };
    }
  }
  
  // Case 2: Hyphenated format (e.g., "Radwan-563004")
  const hyphenMatch = identifier.match(/^([A-Za-z\s]+)-(\d+)$/);
  if (hyphenMatch) {
    const namePrefix = hyphenMatch[1].trim();
    const numericPart = Number(hyphenMatch[2]);
    
    // Try to find by name prefix and ID
    const patientByPrefixAndId = await db.select()
      .from(patients)
      .where(and(
        like(patients.name, `${namePrefix}%`),
        eq(patients.id, numericPart)
      ))
      .limit(1)
      .execute() as Patient[];
    
    if (patientByPrefixAndId.length > 0) {
      return { patientId: patientByPrefixAndId[0].id, patientName: patientByPrefixAndId[0].name };
    }
    
    // Try by unique identifier
    const patientByUniqueId = await db.select()
      .from(patients)
      .where(eq(patients.uniqueIdentifier, hyphenMatch[2]))
      .limit(1)
      .execute() as Patient[];
    
    if (patientByUniqueId.length > 0) {
      return { patientId: patientByUniqueId[0].id, patientName: patientByUniqueId[0].name };
    }
    
    // Try just by numeric part as ID
    const patientById = await db.select()
      .from(patients)
      .where(eq(patients.id, numericPart))
      .limit(1)
      .execute() as Patient[];
    
    if (patientById.length > 0) {
      return { patientId: patientById[0].id, patientName: patientById[0].name };
    }
  }
  
  // Case 3: Exact name match
  const patientByExactName = await db.select()
    .from(patients)
    .where(eq(patients.name, identifier))
    .limit(1)
    .execute() as Patient[];
  
  if (patientByExactName.length > 0) {
    return { patientId: patientByExactName[0].id, patientName: patientByExactName[0].name };
  }
  
  // Case 4: Partial name match
  const patientByPartialName = await db.select()
    .from(patients)
    .where(like(patients.name, `%${identifier}%`))
    .limit(1)
    .execute() as Patient[];
  
  if (patientByPartialName.length > 0) {
    return { patientId: patientByPartialName[0].id, patientName: patientByPartialName[0].name };
  }
  
  // Case 5: Try with "Radwan" prefix if no prefix was provided
  if (!identifier.includes('-') && !isNaN(Number(identifier))) {
    const numericId = Number(identifier);
    const patientWithRadwanPrefix = await db.select()
      .from(patients)
      .where(and(
        like(patients.name, `Radwan%`),
        eq(patients.id, numericId)
      ))
      .limit(1)
      .execute() as Patient[];
    
    if (patientWithRadwanPrefix.length > 0) {
      return { patientId: patientWithRadwanPrefix[0].id, patientName: patientWithRadwanPrefix[0].name };
    }
  }
  
  // Case 6: Try with common prefixes for numeric identifiers
  if (!isNaN(Number(identifier))) {
    const numericId = Number(identifier);
    const commonPrefixes = ['Radwan', 'Patient', 'Client'];
    
    for (const prefix of commonPrefixes) {
      const patientWithCommonPrefix = await db.select()
        .from(patients)
        .where(and(
          like(patients.name, `${prefix}%`),
          eq(patients.id, numericId)
        ))
        .limit(1)
        .execute() as Patient[];
      
      if (patientWithCommonPrefix.length > 0) {
        return { patientId: patientWithCommonPrefix[0].id, patientName: patientWithCommonPrefix[0].name };
      }
    }
  }
  
  // No patient found
  return null;
}
