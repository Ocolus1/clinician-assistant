// Common type definitions for budget management components

/**
 * Interface for budget catalog items
 */
export interface CatalogItem {
  id: number;
  itemCode: string;
  description: string;
  defaultUnitPrice: number;
  category: string | null;
  isActive: boolean | null;
}

/**
 * Interface for budget items displayed in the row component
 */
export interface RowBudgetItem {
  id?: number;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isNew?: boolean;
  name?: string; // Changed from string | null to string | undefined for form compatibility
  category?: string; // Changed from string | null to string | undefined for form compatibility
  budgetSettingsId?: number;
  clientId?: number;
}

/**
 * Interface for budget items in the database
 */
export interface BudgetItem {
  id: number;
  clientId: number;
  budgetSettingsId: number;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  name: string | null;
  category: string | null;
}