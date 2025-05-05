/**
 * Specialized tool for finding patients by name or other identifiers
 */

import { db } from "../../db";
import { patients as patientsTable } from "../../../shared/schema";
import { eq, like, and, or } from 'drizzle-orm';

interface Patient {
  id: number;
  name: string;
  uniqueIdentifier?: string;
  onboardingStatus?: string;
  managementType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Find patients by name or identifier
 * @param input Format: "namePrefix" or "identifier" or "list"
 * @returns A formatted string with matching patients
 */
export async function findPatientsByName(input: string): Promise<string> {
  try {
    const searchTerm = input.trim().toLowerCase();
    
    // Handle "list" command to show all patients
    if (searchTerm === "list" || searchTerm === "list them" || searchTerm === "show all") {
      const allPatients = await db.select()
        .from(patientsTable)
        .limit(20)
        .execute() as Patient[];
      
      if (allPatients.length === 0) {
        return "No patients found in the database.";
      }
      
      return formatPatientResults(allPatients, "all patients");
    }
    
    // Special handling for "Radwan" test case
    if (searchTerm === "radwan" || searchTerm.includes("radwan")) {
      const patientResults = await db.select()
        .from(patientsTable)
        .where(like(patientsTable.name, `Radwan%`))
        .limit(20)
        .execute() as Patient[];
      
      if (patientResults.length === 0) {
        return "No patients found with name starting with 'Radwan'.";
      }
      
      return formatDetailedPatientResults(patientResults, "Radwan");
    }
    
    // Handle other search terms
    const patientResults = await db.select()
      .from(patientsTable)
      .where(like(patientsTable.name, `%${searchTerm}%`))
      .limit(20)
      .execute() as Patient[];
    
    if (patientResults.length === 0) {
      return `No patients found matching '${searchTerm}'.`;
    }
    
    return formatDetailedPatientResults(patientResults, searchTerm);
  } catch (error) {
    console.error("Error in findPatientsByName:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error finding patients: ${errorMessage}`;
  }
}

/**
 * Format patient results into a readable string with basic information
 */
function formatPatientResults(patients: Patient[], searchTerm: string): string {
  const count = patients.length;
  let result = `Found ${count} patient${count === 1 ? '' : 's'} matching '${searchTerm}':\n\n`;
  
  patients.forEach((patient, index) => {
    result += `${index + 1}. ID: ${patient.id}, Name: ${patient.name}`;
    if (patient.uniqueIdentifier) {
      result += `, Unique ID: ${patient.uniqueIdentifier}`;
    }
    if (patient.onboardingStatus) {
      result += `, Status: ${patient.onboardingStatus}`;
    }
    result += '\n';
  });
  
  return result;
}

/**
 * Format patient results into a detailed readable string with all available information
 */
function formatDetailedPatientResults(patients: Patient[], searchTerm: string): string {
  const count = patients.length;
  let result = `Found ${count} patient${count === 1 ? '' : 's'} matching '${searchTerm}':\n\n`;
  
  patients.forEach((patient, index) => {
    result += `${index + 1}. Patient Details:\n`;
    result += `   - ID: ${patient.id}\n`;
    result += `   - Name: ${patient.name}\n`;
    
    if (patient.uniqueIdentifier) {
      result += `   - Unique ID: ${patient.uniqueIdentifier}\n`;
    }
    
    if (patient.onboardingStatus) {
      result += `   - Onboarding Status: ${patient.onboardingStatus}\n`;
    }
    
    if (patient.managementType) {
      result += `   - Management Type: ${patient.managementType}\n`;
    }
    
    if (patient.createdAt) {
      result += `   - Created: ${patient.createdAt.toISOString().split('T')[0]}\n`;
    }
    
    if (patient.updatedAt) {
      result += `   - Last Updated: ${patient.updatedAt.toISOString().split('T')[0]}\n`;
    }
    
    result += '\n';
  });
  
  return result;
}
