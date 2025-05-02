/**
 * Specialized tool for retrieving information about expiring budgets
 */

import { db } from "../../db";
import { patients, budgetSettings } from "../../../shared/schema";
import { eq, desc, like, and, or, gte, lte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

interface Patient {
  id: number;
  name: string;
  uniqueIdentifier?: string;
  onboardingStatus?: string;
  managementType?: string;
}

interface BudgetSetting {
  id: number;
  patientId: number;
  planSerialNumber?: string;
  planCode?: string;
  isActive?: boolean;
  ndisFunds?: number;
  endOfPlan?: string;
  createdAt?: Date;
  type?: string;
  category?: string;
}

/**
 * Retrieves information about expiring budgets
 * @param input Format: "timeframe" where timeframe is optional (e.g., "next_month", "next_3_months", "next_year")
 * @returns A formatted string with information about expiring budgets
 */
export async function getExpiringBudgets(input: string): Promise<string> {
  try {
    // Parse the input
    const timeframe = input.trim().toLowerCase();
    
    // Calculate date range based on timeframe
    const now = new Date();
    let endDate = new Date();
    
    if (timeframe.includes("week")) {
      endDate.setDate(now.getDate() + 7);
    } else if (timeframe.includes("2_week") || timeframe.includes("two_week")) {
      endDate.setDate(now.getDate() + 14);
    } else if (timeframe.includes("3_month") || timeframe.includes("three_month") || timeframe.includes("quarter")) {
      endDate.setMonth(now.getMonth() + 3);
    } else if (timeframe.includes("6_month") || timeframe.includes("six_month") || timeframe.includes("half_year")) {
      endDate.setMonth(now.getMonth() + 6);
    } else if (timeframe.includes("year")) {
      endDate.setFullYear(now.getFullYear() + 1);
    } else {
      // Default to next month if not specified
      endDate.setMonth(now.getMonth() + 1);
    }
    
    // Format dates for SQL query
    const nowStr = now.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Query for budgets expiring in the specified timeframe
    const expiringBudgets = await db.select({
      budgetId: budgetSettings.id,
      patientId: budgetSettings.patientId,
      endOfPlan: budgetSettings.endOfPlan,
      ndisFunds: budgetSettings.ndisFunds,
      planCode: budgetSettings.planCode
    })
    .from(budgetSettings)
    .where(and(
      gte(budgetSettings.endOfPlan, nowStr),
      lte(budgetSettings.endOfPlan, endDateStr),
      eq(budgetSettings.isActive, true)
    ))
    .orderBy(asc(budgetSettings.endOfPlan))
    .execute();
    
    if (expiringBudgets.length === 0) {
      return `No budgets found expiring between now and ${endDateStr}.`;
    }
    
    // Get patient details for the expiring budgets
    const patientIds = [...new Set(expiringBudgets.map(budget => budget.patientId))];
    const patientDetails = await db.select()
      .from(patients)
      .where(inArray(patients.id, patientIds))
      .execute() as Patient[];
    
    // Create a map of patient IDs to names for easier lookup
    const patientMap = new Map<number, string>();
    patientDetails.forEach(patient => {
      patientMap.set(patient.id, patient.name);
    });
    
    // Format the response
    let response = `Patients with budgets expiring between now and ${endDateStr}:\n\n`;
    
    expiringBudgets.forEach(budget => {
      const patientName = patientMap.get(budget.patientId) || `Patient ID: ${budget.patientId}`;
      const endOfPlan = budget.endOfPlan ? new Date(budget.endOfPlan).toISOString().split('T')[0] : 'Unknown';
      const funds = budget.ndisFunds ? `$${budget.ndisFunds.toFixed(2)}` : 'Unknown';
      const planCode = budget.planCode || 'N/A';
      
      response += `- ${patientName}\n`;
      response += `  Expiration Date: ${endOfPlan}\n`;
      response += `  Budget Amount: ${funds}\n`;
      response += `  Plan Code: ${planCode}\n\n`;
    });
    
    return response;
  } catch (error) {
    console.error("Error in getExpiringBudgets:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error retrieving expiring budgets: ${errorMessage}`;
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
  
  // No patient found
  return null;
}

// Import missing functions
import { asc, inArray } from 'drizzle-orm';
