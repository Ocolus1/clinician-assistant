/**
 * Simplified Budget Data Service
 * 
 * This is a streamlined version of the budget data service with direct
 * fetch calls to diagnose API connectivity issues.
 */
import { BudgetItem, BudgetSettings, Session } from '@shared/schema';

export const simplifiedBudgetService = {
  /**
   * Fetch budget settings for a client
   */
  async fetchBudgetSettings(clientId: number): Promise<BudgetSettings | null> {
    try {
      console.log(`Fetching budget settings for client ${clientId}`);
      const response = await fetch(`/api/clients/${clientId}/budget-settings`);
      
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
   * Fetch all budget settings for a client
   */
  async fetchAllBudgetSettings(clientId: number): Promise<BudgetSettings[]> {
    try {
      console.log(`Fetching all budget settings for client ${clientId}`);
      const response = await fetch(`/api/clients/${clientId}/budget-settings?all=true`);
      
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
   * Fetch budget items for a client
   */
  async fetchBudgetItems(clientId: number): Promise<BudgetItem[]> {
    try {
      console.log(`Fetching budget items for client ${clientId}`);
      const response = await fetch(`/api/clients/${clientId}/budget-items`);
      
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
   * Fetch sessions for a client
   */
  async fetchSessions(clientId: number): Promise<Session[]> {
    try {
      console.log(`Fetching sessions for client ${clientId}`);
      const response = await fetch(`/api/clients/${clientId}/sessions`);
      
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
  async runTests(clientId: number) {
    console.log('===== Testing Budget API Services =====');
    
    const settings = await this.fetchBudgetSettings(clientId);
    console.log('Budget settings test complete');
    
    const allSettings = await this.fetchAllBudgetSettings(clientId);
    console.log(`All budget settings test complete, received ${allSettings.length} settings`);
    
    const items = await this.fetchBudgetItems(clientId);
    console.log(`Budget items test complete, received ${items.length} items`);
    
    const sessions = await this.fetchSessions(clientId);
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