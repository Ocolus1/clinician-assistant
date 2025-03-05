// Border style definitions for consistent styling across the application

export const borderStyles = {
  card: {
    border: "border border-gray-200", // #E2E8F0
    radius: "rounded-lg", // 8px
    shadow: "shadow-sm", // 0 2px 4px rgba(0, 0, 0, 0.05)
  },
  input: {
    border: "border border-gray-300", // #CBD5E0
    radius: "rounded-md", // 6px
    focus: "focus:border-primary-blue-500 focus:border-2 outline-none", // #3A86FF
    error: "border-error-500", // #F56565
  },
  divider: {
    border: "border-gray-100", // #EDF2F7
    spacing: "my-4", // 16px margin above and below
  },
  table: {
    border: "border border-gray-200", // #E2E8F0
    header: "border-b border-gray-300", // #CBD5E0
    row: "border-b border-gray-100", // #EDF2F7
  },
  status: {
    active: "border-l-[4px] border-l-success-500", // #48BB78
    pending: "border-l-[4px] border-l-primary-blue-500", // #3A86FF
    inactive: "border-l-[4px] border-l-error-500", // #F56565
  },
  tab: {
    active: "border-b-[3px] border-b-primary-blue-500", // #3A86FF
    inactive: "border-b border-b-gray-200", // #E2E8F0
  }
};