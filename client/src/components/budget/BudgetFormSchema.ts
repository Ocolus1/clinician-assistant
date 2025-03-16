// Default constants for budget amounts
export const FIXED_BUDGET_AMOUNT = 20000;
export const AVAILABLE_FUNDS_AMOUNT = 20000;

// Budget plan categories and types
export const BUDGET_CATEGORIES = [
  "Core Support",
  "Capacity Building",
  "Transport",
  "Consumables",
  "Capital Supports",
  "Other"
] as const;

// Budget frequency options
export const BUDGET_FREQUENCIES = [
  "Annual",
  "Monthly",
  "Weekly",
  "Per Session"
] as const;

// Budget allocation types
export const ALLOCATION_TYPES = [
  "Fixed",
  "Hourly",
  "Per Unit"
] as const;