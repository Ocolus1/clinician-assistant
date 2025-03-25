# Speech Therapy Clinic Management System - Updated Development Guidelines

This document outlines additional guidelines and lessons learned from recent development experiences to supplement our existing development standards.

## Table of Contents

1. [Asset Management](#asset-management)
2. [Component Development Best Practices](#component-development-best-practices)
3. [UI Integration Approaches](#ui-integration-approaches)
4. [Development Workflow Improvements](#development-workflow-improvements)
5. [Data Integration Patterns](#data-integration-patterns)
6. [Client-Specific Implementation Patterns](#client-specific-implementation-patterns)
7. [Budget Component Architecture](#budget-component-architecture)
8. [Form Validation and Submission](#form-validation-and-submission)
9. [Agentic Assistant Implementation](#agentic-assistant-implementation)

## Asset Management

### Image and Icon Integration
- **SVG Over Bitmap**: Use SVG format for icons and logos whenever possible for better scaling and smaller file size
- **Inline SVG Components**: For critical UI elements like logos, prefer inline SVG components over image file references
- **Image Fallbacks**: Implement fallback strategies for images that may fail to load
- **Base64 Encoding**: Consider base64 encoding for small, essential assets to eliminate external dependencies
- **Asset Optimization**: Compress and optimize all images before deployment

### ✅ Good Example: Inline SVG Implementation
```tsx
function IgniteLogo({ size = 24, className }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.7102 4.00004H16.2L12.7001 11H15.2102L18.7102 4.00004Z" fill="currentColor"/>
      <path d="M22.9999 1L14.9999 16H8.99986L12.9999 8L8.99986 1H14.9999L22.9999 1Z" 
        stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 1V23H6V8L1 1Z" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
```

### ❌ Bad Example: Hardcoded Image Paths
```tsx
// Avoid: Hardcoded paths are brittle and may break
function AppLogo() {
  return <img src="/images/logo.png" alt="Logo" />;
}
```

### Public Directory Structure
- **Consistent Organization**: Organize public assets in logical subdirectories (images, icons, documents)
- **Path References**: Use relative paths with consistent base paths for all asset references
- **Asset Versioning**: Consider implementing a simple versioning strategy for frequently updated assets

## Component Development Best Practices

### Accessibility Compliance
- **Proper ARIA Attributes**: Always include appropriate ARIA attributes for custom components
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Screen Reader Support**: Test components with screen readers and fix accessibility issues
- **Component Validation**: Use accessibility linting tools to catch common issues early

### ✅ Good Example: Accessible Dialog
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* Always include a DialogTitle for screen reader accessibility */}
    <DialogTitle>Create New Budget Plan</DialogTitle>
    
    <DialogDescription>
      Create a new budget plan for this client's therapy services.
    </DialogDescription>
    
    {/* Dialog content */}
    <FormFields />
    
    <DialogFooter>
      <Button onClick={handleSubmit}>Create Plan</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Component Independence
- **Minimize Dependencies**: Reduce dependencies between components to prevent cascading issues
- **Interface-First Design**: Define clear component interfaces before implementation
- **Feature Isolation**: Keep feature-specific components in dedicated directories
- **Self-Contained Components**: Components should be self-contained with minimal external dependencies

### Error Handling
- **Graceful Degradation**: Components should gracefully handle missing or invalid props
- **Meaningful Error Messages**: Provide useful error messages for component failures
- **Error Boundaries**: Implement error boundaries to prevent entire application crashes
- **Fallback UI**: Design fallback UI for components that encounter errors

## UI Integration Approaches

### Implementation Strategies
- **Progressive Implementation**: Start with simple implementations and enhance incrementally
- **Direct Implementation vs. Referenced Assets**: Prefer direct code implementation (inline SVG) over external asset references for critical UI elements
- **Hybrid Approaches**: Use a mix of approaches based on the specific requirements and constraints
- **Consistency Within Features**: Maintain consistent implementation approaches within feature boundaries

### Theme Integration
- **Centralized Theme Variables**: Define color themes centrally rather than repeating color values
- **Design Token System**: Implement a design token system for consistent visual elements
- **Theme Switching Support**: Build components with theme switching capability from the start
- **Color Contrast Testing**: Ensure all color combinations meet accessibility contrast requirements

### ✅ Good Example: Themed Component
```tsx
// Using centralized theme variables
function ThemedButton({ children, variant = "primary" }) {
  // Map variant to theme variables
  const variantStyles = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white",
    secondary: "bg-secondary-100 hover:bg-secondary-200 text-secondary-900",
    danger: "bg-red-500 hover:bg-red-600 text-white"
  };
  
  return (
    <button className={`px-4 py-2 rounded-md ${variantStyles[variant]}`}>
      {children}
    </button>
  );
}
```

## Development Workflow Improvements

### Focused Iterations
- **Incremental Changes**: Make small, targeted changes and test thoroughly before moving on
- **Feature Slicing**: Break larger features into smaller, testable slices
- **Continuous Integration**: Integrate changes frequently to catch integration issues early
- **Pull Request Scope**: Keep pull requests focused on a single feature or bug fix

### Testing and Verification
- **Progressive Testing**: Test components in isolation before testing in the full application
- **Manual Testing Checklist**: Create a checklist for manual testing of UI components
- **Cross-Browser Testing**: Test components across different browsers and devices
- **Feedback Loop**: Establish a quick feedback loop for UI changes

### Debugging Strategies
- **Component Isolation**: Debug components in isolation using storybook or similar tools
- **Console Monitoring**: Pay close attention to console warnings and errors
- **Error Tracing**: Implement comprehensive error tracking for easier debugging
- **Version Comparison**: Compare behavior between working and non-working versions

### ✅ Good Example: Focused Testing Approach
```tsx
// Component test that focuses on a specific behavior
describe('BudgetItemRow', () => {
  it('should apply read-only styling when in read-only mode', () => {
    // Arrange
    const { getByLabelText } = render(
      <BudgetItemRow 
        item={sampleItem} 
        isReadOnly={true} 
      />
    );
    
    // Act
    const descriptionInput = getByLabelText('Description');
    
    // Assert
    expect(descriptionInput).toHaveAttribute('readonly');
    expect(descriptionInput).toHaveClass('bg-gray-100');
  });
});
```

## Data Integration Patterns

### Data Service Layer
- **Service Abstraction**: Create clear data access services rather than embedding data fetching in components
- **Consistent Error Handling**: Implement consistent error handling across all data services
- **Response Normalization**: Normalize API responses to match application data models
- **Request Deduplication**: Implement request deduplication for frequently called endpoints

### Type Safety
- **Strong Typing**: Use TypeScript interfaces for all data models
- **API Contract Enforcement**: Enforce API contracts through type checking
- **Runtime Type Validation**: Validate data at runtime with Zod or similar libraries
- **Type Guards**: Implement type guards for safe type narrowing

### ✅ Good Example: Data Service Layer
```tsx
// Data service for budget management
export const budgetService = {
  // Get all budget plans for a client
  async getClientBudgetPlans(clientId: number): Promise<BudgetPlan[]> {
    try {
      return await apiRequest('GET', `/api/clients/${clientId}/budget-plans`);
    } catch (error) {
      handleApiError(error, 'Failed to fetch budget plans');
      return [];
    }
  },
  
  // Create a new budget plan
  async createBudgetPlan(clientId: number, plan: InsertBudgetSettings): Promise<BudgetPlan> {
    try {
      return await apiRequest('POST', `/api/budget-settings`, {
        ...plan,
        clientId
      });
    } catch (error) {
      handleApiError(error, 'Failed to create budget plan');
      throw error;
    }
  }
};

// Using the service in a component
function BudgetPlansView({ clientId }) {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['/api/clients/budget-plans', clientId],
    queryFn: () => budgetService.getClientBudgetPlans(clientId)
  });
  
  // Component implementation...
}
```

## Agentic Assistant Implementation

### Architecture
- **Modular Query System**: Build a modular system for the agent to query different data sources
- **Context Awareness**: Implement context awareness for more relevant assistant responses
- **Response Templates**: Create structured response templates for different query types
- **Confidence Scoring**: Implement confidence scoring for assistant answers

### Data Access Patterns
- **Restricted Data Access**: Limit the agent's data access based on user permissions
- **Data Aggregation**: Implement data aggregation for complex queries
- **Caching Layer**: Create a caching layer for frequently accessed data
- **Request Batching**: Batch related requests to reduce API calls

### ✅ Good Example: Agent Query Handler
```tsx
// Agent query handler for budget analysis
export async function handleBudgetQuery(query: string, clientId: number): Promise<AgentResponse> {
  // Parse query intent
  const intent = await parseQueryIntent(query);
  
  switch (intent.type) {
    case 'BUDGET_REMAINING':
      // Fetch budget data
      const { activePlan, budgetItems } = await Promise.all([
        budgetService.getActivePlan(clientId),
        budgetService.getBudgetItems(clientId)
      ]);
      
      // Calculate remaining budget
      const totalAllocated = budgetItems.reduce((sum, item) => sum + item.allocated, 0);
      const totalSpent = budgetItems.reduce((sum, item) => sum + item.spent, 0);
      const remaining = activePlan.totalBudget - totalSpent;
      
      // Generate response
      return {
        type: 'BUDGET_ANALYSIS',
        confidence: 0.92,
        content: `The client has $${remaining.toFixed(2)} remaining out of a total budget of $${activePlan.totalBudget.toFixed(2)}.`,
        data: {
          totalBudget: activePlan.totalBudget,
          allocated: totalAllocated,
          spent: totalSpent,
          remaining
        }
      };
      
    case 'BUDGET_PROJECTION':
      // Implementation for budget projection query
      // ...
      
    default:
      return {
        type: 'UNKNOWN',
        confidence: 0.3,
        content: `I'm not sure how to answer questions about "${intent.topic}" yet. Would you like to know about budget remaining or budget projections?`
      };
  }
}
```

### Natural Language Processing
- **Domain-Specific Training**: Train models with speech therapy domain terminology
- **Intent Recognition**: Implement intent recognition for common therapy-related queries
- **Entity Extraction**: Extract key entities from user queries (client names, dates, etc.)
- **Contextual Understanding**: Maintain conversation context for follow-up questions

## Client-Specific Implementation Patterns

### Special Case Handling
- **Client-Specific Logic**: Implement special case handling for clients with unique requirements
- **ID-Based Variations**: Use client ID as a reliable identifier for applying special rules
- **Helper Functions**: Create helper functions that encapsulate client-specific logic to keep components clean
- **Config Parameters**: Pass configuration parameters to components rather than hardcoding special behaviors

### ✅ Good Example: Client-Specific Logic
```tsx
// Helper function that centralizes client-specific logic
function getClientBudget(clientId: number, defaultBudget: number): number {
  // Special case for specific clients
  if (clientId === 88) { // Radwan's ID
    return 12000; // Specific budget allocation for this client
  }
  
  // Default case for other clients
  return defaultBudget;
}

// Component using the helper function
function BudgetSummary({ clientId }: { clientId: number }) {
  // Use the helper function to get the correct budget amount
  const totalBudget = getClientBudget(clientId, 20000);
  
  return (
    <div className="budget-summary">
      <h3>Budget Summary</h3>
      <p>Total Allocated: ${formatCurrency(totalBudget)}</p>
      {/* Other budget information */}
    </div>
  );
}
```

### ❌ Bad Example: Hardcoded Special Cases
```tsx
// Avoid: Scattering client-specific logic throughout components
function BudgetDisplay({ clientId }: { clientId: number }) {
  // Bad: Hardcoded special cases inside components
  const budget = clientId === 88 ? 12000 : 20000;
  
  // More hardcoded special cases
  const maxSessions = clientId === 88 ? 80 : 100;
  const showSpecialWarning = clientId === 88;
  
  return (
    <div>
      <p>Budget: ${budget}</p>
      <p>Maximum Sessions: {maxSessions}</p>
      {showSpecialWarning && <Warning>Special rules apply</Warning>}
    </div>
  );
}
```

### Data Source Centralization
- **Centralized Configuration**: Store client-specific settings in a central location
- **Dynamic Loading**: Load client-specific configurations dynamically based on client ID
- **Default Fallbacks**: Provide sensible defaults for configuration values
- **Structure Consistency**: Maintain consistent data structure regardless of client-specific rules

## Budget Component Architecture

### Component Hierarchy
- **Consistent Navigation Flow**: Implement clear navigation patterns between list and detail views
- **Grid-to-Detail Pattern**: Use a grid-to-detail pattern for budget plans with consistent back navigation
- **Context Providers**: Wrap complex component hierarchies in dedicated context providers
- **Feature Containment**: Keep all budget-related components in a dedicated feature directory

### ✅ Good Example: Component Communication with Callbacks
```tsx
// Parent component managing view state
function BudgetPlanView({ clientId }: { clientId: number }) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  
  // Navigation callback for returning to grid view
  const handleBackToGrid = useCallback(() => {
    setSelectedPlanId(null);
  }, []);
  
  return (
    <div className="budget-plan-view">
      {selectedPlanId ? (
        <UnifiedBudgetManager 
          clientId={clientId}
          planId={selectedPlanId}
          onBackToGrid={handleBackToGrid} // Pass callback to child component
        />
      ) : (
        <EnhancedBudgetCardGrid
          clientId={clientId}
          onSelectPlan={setSelectedPlanId}
        />
      )}
    </div>
  );
}
```

### ❌ Bad Example: Inconsistent Navigation
```tsx
// Avoid: Handling navigation inconsistently
function BudgetComponent({ clientId }: { clientId: number }) {
  const [view, setView] = useState('grid');
  const [planId, setPlanId] = useState<number | null>(null);
  
  // Bad: Inconsistent navigation handlers
  function handleViewBudget(id: number) {
    setPlanId(id);
    setView('detail');
  }
  
  // Bad: Direct manipulation of window location
  function handleBack() {
    window.location.href = `/clients/${clientId}/profile?tab=budget`;
  }
  
  return (
    <div>
      {view === 'grid' ? (
        <BudgetGrid onSelect={handleViewBudget} />
      ) : (
        <BudgetDetail planId={planId} onBack={handleBack} />
      )}
    </div>
  );
}
```

### Context Management
- **State Isolation**: Keep budget form state isolated from other component states
- **Context Initialization**: Initialize context with sensible defaults
- **Provider Composition**: Compose multiple context providers for complex features
- **Consumer Patterns**: Use consistent patterns for consuming context data

## Form Validation and Submission

### Budget Validation Rules
- **Validate Against Real Data**: Validate budget items against real usage data, not just current form state
- **Rule Consistency**: Apply consistent validation rules across all budget-related forms
- **Edge Cases**: Handle edge cases such as zero values, undefined values, and maximum constraints
- **Validation Timing**: Perform validation at appropriate times (on blur, on change, on submit)

### ✅ Good Example: Comprehensive Validation
```tsx
// Validation function with comprehensive rules
function validateBudgetItem(
  item: BudgetItemFormData, 
  usedAmount: number, 
  totalBudget: number, 
  currentTotal: number
): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Validate quantity is positive
  if (item.quantity <= 0) {
    errors.quantity = "Quantity must be greater than zero";
  }
  
  // Validate unit price is positive
  if (item.unitPrice <= 0) {
    errors.unitPrice = "Unit price must be greater than zero";
  }
  
  // Calculate item total
  const itemTotal = item.quantity * item.unitPrice;
  
  // Validate against used amount
  if (itemTotal < usedAmount) {
    errors.quantity = `Cannot reduce below used amount of $${formatCurrency(usedAmount)}`;
  }
  
  // Validate against total budget constraint
  const newTotal = currentTotal - (item.originalTotal || 0) + itemTotal;
  if (newTotal > totalBudget) {
    errors.general = `Total budget of $${formatCurrency(totalBudget)} would be exceeded by $${formatCurrency(newTotal - totalBudget)}`;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
```

### ❌ Bad Example: Incomplete Validation
```tsx
// Avoid: Overly simplistic validation that misses edge cases
function validateBudget(items: BudgetItem[]): boolean {
  // Bad: Only validates total is positive
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  
  // Bad: Doesn't check against used amounts or budget constraints
  return total > 0;
}
```

### Form Submission Patterns
- **Multi-Stage Validation**: Implement client-side validation before API calls
- **Adaptive Submission**: Adapt form submission based on validation results
- **User Feedback**: Provide clear feedback during and after form submission
- **Error Recovery**: Implement error recovery strategies for failed submissions

### Navigation After Submission
- **Consistent Patterns**: Use consistent navigation patterns after form submission
- **Callback Props**: Pass callback functions from parent components for navigation after submission
- **Navigation Timing**: Add brief delays when navigating after async operations
- **Success Confirmation**: Provide visual confirmation of successful submissions before navigation