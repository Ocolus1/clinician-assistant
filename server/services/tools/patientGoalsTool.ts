/**
 * Specialized tool for retrieving goals for a specific patient
 */

import { db } from "../../db";
import { goals, subgoals, patients } from "../../../shared/schema";
import { eq, desc, like, and, or } from 'drizzle-orm';

interface Patient {
  id: number;
  name: string;
  uniqueIdentifier?: string;
  onboardingStatus?: string;
  managementType?: string;
}

interface Goal {
  id: number;
  patientId: number;
  title?: string;
  description?: string;
  importanceLevel?: string;
  status?: string;
  // Note: updatedAt doesn't exist in the schema, so we don't include it here
}

interface Subgoal {
  id: number;
  goalId: number;
  title?: string;
  status?: string;
}

/**
 * Retrieves goals for a specific patient
 * @param patientIdentifier The identifier of the patient (ID, name, or hyphenated format)
 * @returns A formatted string with the patient's goals
 */
export async function getPatientGoals(patientIdentifier: string): Promise<string> {
  try {
    // Parse the input to handle goal type filtering
    const parts = patientIdentifier.split(',').map(part => part.trim());
    const identifier = parts[0];
    const goalType = parts.length > 1 ? parts[1].toLowerCase() : null;
    
    // Find the patient using a comprehensive approach
    const patientData = await findPatient(identifier);
    
    if (!patientData) {
      return `No patient found matching "${identifier}".`;
    }
    
    const { patientId, patientName } = patientData;
    
    // Retrieve the patient's goals
    const patientGoals = await db.select()
      .from(goals)
      .where(eq(goals.patientId, patientId))
      // Use createdAt if available, otherwise just order by ID
      .orderBy(desc(goals.id))
      .execute() as Goal[];
    
    if (patientGoals.length === 0) {
      return `No goals found for patient ${patientName} (ID: ${patientId}).`;
    }
    
    // Filter goals by type if specified
    let filteredGoals = patientGoals;
    if (goalType) {
      filteredGoals = patientGoals.filter(goal => 
        goal.title?.toLowerCase().includes(goalType) || 
        goal.description?.toLowerCase().includes(goalType)
      );
      
      if (filteredGoals.length === 0) {
        return `No ${goalType} goals found for patient ${patientName} (ID: ${patientId}).`;
      }
    }
    
    // For each goal, retrieve its subgoals
    const goalsWithSubgoals = await Promise.all(
      filteredGoals.map(async (goal) => {
        const subgoalsList = await db.select()
          .from(subgoals)
          .where(eq(subgoals.goalId, goal.id))
          .execute() as Subgoal[];
        
        return {
          ...goal,
          subgoals: subgoalsList
        };
      })
    );
    
    // Format the results in a concise way
    let summary = `Found ${filteredGoals.length} goals for patient ${patientName} (ID: ${patientId}).`;
    if (goalType) {
      summary = `Found ${filteredGoals.length} ${goalType} goals for patient ${patientName} (ID: ${patientId}).`;
    }
    
    // Calculate goal completion statistics
    const completedGoals = goalsWithSubgoals.filter(goal => goal.status === 'completed').length;
    const inProgressGoals = goalsWithSubgoals.filter(goal => goal.status === 'in_progress').length;
    const notStartedGoals = goalsWithSubgoals.filter(goal => goal.status === 'not_started').length;
    
    const stats = `
Goal Status Summary:
- Completed: ${completedGoals} (${Math.round((completedGoals / filteredGoals.length) * 100)}%)
- In Progress: ${inProgressGoals} (${Math.round((inProgressGoals / filteredGoals.length) * 100)}%)
- Not Started: ${notStartedGoals} (${Math.round((notStartedGoals / filteredGoals.length) * 100)}%)
`;
    
    // For a small number of goals, show all details
    if (filteredGoals.length <= 5) {
      const formattedGoals = goalsWithSubgoals.map((goal) => {
        const subgoalStats = {
          total: goal.subgoals.length,
          completed: goal.subgoals.filter(sg => sg.status === 'completed').length,
          inProgress: goal.subgoals.filter(sg => sg.status === 'in_progress').length,
          notStarted: goal.subgoals.filter(sg => sg.status === 'not_started').length
        };
        
        return {
          id: goal.id,
          title: goal.title,
          status: goal.status,
          description: goal.description,
          progress: goal.subgoals.length > 0 
            ? `${Math.round((subgoalStats.completed / goal.subgoals.length) * 100)}%` 
            : 'N/A',
          subgoals: goal.subgoals.map(sg => ({
            id: sg.id,
            title: sg.title,
            status: sg.status
          })),
          subgoalStats
        };
      });
      
      return `${summary}${stats}\n\n${JSON.stringify(formattedGoals, null, 2)}`;
    }
    
    // For larger result sets, show a summary and the first few items
    const formattedGoals = goalsWithSubgoals.slice(0, 5).map((goal) => {
      const subgoalStats = {
        total: goal.subgoals.length,
        completed: goal.subgoals.filter(sg => sg.status === 'completed').length,
        inProgress: goal.subgoals.filter(sg => sg.status === 'in_progress').length,
        notStarted: goal.subgoals.filter(sg => sg.status === 'not_started').length
      };
      
      return {
        id: goal.id,
        title: goal.title,
        status: goal.status,
        description: goal.description,
        progress: goal.subgoals.length > 0 
          ? `${Math.round((subgoalStats.completed / goal.subgoals.length) * 100)}%` 
          : 'N/A',
        subgoals: goal.subgoals.map(sg => ({
          id: sg.id,
          title: sg.title,
          status: sg.status
        })),
        subgoalStats
      };
    });
    
    return `${summary}${stats}\n\nShowing first 5 goals:\n\n${JSON.stringify(formattedGoals, null, 2)}`;
    
  } catch (error) {
    console.error("Error retrieving patient goals:", error);
    return `Error retrieving goals: ${error instanceof Error ? error.message : String(error)}`;
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
