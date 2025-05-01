/**
 * Simplified Budget Data Service
 * 
 * This is a streamlined version of the budget data service with direct
 * fetch calls to diagnose API connectivity issues.
 */
import { BudgetItem, BudgetSettings, Session } from '@shared/schema';

export const simplifiedBudgetService = {
  /**
   * Fetch budget settings for a patient
   */
  async fetchBudgetSettings(patientId: number): Promise<BudgetSettings | null> {
    try {
      console.log(`Fetching budget settings for patient ${patientId}`);
      const response = await fetch(`/api/patients/${patientId}/budget-settings`);
      
      if (!response.ok) {
        console.error(`Error fetching budget settings: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.log(`Budget settings response:`, data);
      return data;
    } catch (error) {
      console.error('Error in fetchBudgetSettings:', error);
      return null;
    }
  },

  /**
   * Fetch all budget settings for a patient
   */
  async fetchAllBudgetSettings(patientId: number): Promise<BudgetSettings[]> {
    try {
      console.log(`Fetching all budget settings for patient ${patientId}`);
      const response = await fetch(`/api/patients/${patientId}/budget-settings?all=true`);
      
      if (!response.ok) {
        console.error(`Error fetching all budget settings: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`All budget settings response:`, data);
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('Error in fetchAllBudgetSettings:', error);
      return [];
    }
  },

  /**
   * Fetch budget items for a patient
   */
  async fetchBudgetItems(patientId: number): Promise<BudgetItem[]> {
    try {
      console.log(`Fetching budget items for patient ${patientId}`);
      const response = await fetch(`/api/patients/${patientId}/budget-items`);
      
      if (!response.ok) {
        console.error(`Error fetching budget items: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`Budget items response:`, data);
      return data;
    } catch (error) {
      console.error('Error in fetchBudgetItems:', error);
      return [];
    }
  },

  /**
   * Fetch sessions for a patient
   */
  async fetchSessions(patientId: number): Promise<Session[]> {
    try {
      console.log(`Fetching sessions for patient ${patientId}`);
      const response = await fetch(`/api/patients/${patientId}/sessions`);
      
      if (!response.ok) {
        console.error(`Error fetching sessions: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`Sessions response:`, data);
      return data;
    } catch (error) {
      console.error('Error in fetchSessions:', error);
      return [];
    }
  },

  /**
   * Run all tests in sequence
   */
  async runTests(patientId: number) {
    console.log('===== Testing Budget API Services =====');
    
    const settings = await this.fetchBudgetSettings(patientId);
    console.log('Budget settings test complete');
    
    const allSettings = await this.fetchAllBudgetSettings(patientId);
    console.log(`All budget settings test complete, received ${allSettings.length} settings`);
    
    const items = await this.fetchBudgetItems(patientId);
    console.log(`Budget items test complete, received ${items.length} items`);
    
    const sessions = await this.fetchSessions(patientId);
    console.log(`Sessions test complete, received ${sessions.length} sessions`);
    
    console.log('===== All Budget API Tests Complete =====');
    
    return {
      settings,
      allSettings,
      items,
      sessions
    };
  }
};
