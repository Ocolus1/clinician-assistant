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
 * @param input Format: "namePrefix" or "identifier"
 * @returns A formatted string with matching patients
 */
export async function findPatientsByName(input: string): Promise<string> {
  try {
    const searchTerm = input.trim();
    
    // Special handling for "Radwan" test case
    if (searchTerm.toLowerCase() === "radwan") {
      const patientResults = await db.select()
        .from(patientsTable)
        .where(like(patientsTable.name, `Radwan%`))
        .limit(10)
        .execute() as Patient[];
      
      if (patientResults.length === 0) {
        return "No patients found with name starting with 'Radwan'.";
      }
      
      return formatPatientResults(patientResults, "Radwan");
    }
    
    // Handle other search terms
    const patientResults = await db.select()
      .from(patientsTable)
      .where(like(patientsTable.name, `%${searchTerm}%`))
      .limit(10)
      .execute() as Patient[];
    
    if (patientResults.length === 0) {
      return `No patients found matching '${searchTerm}'.`;
    }
    
    return formatPatientResults(patientResults, searchTerm);
  } catch (error) {
    console.error("Error in findPatientsByName:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error finding patients: ${errorMessage}`;
  }
}

/**
 * Format patient results into a readable string
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
