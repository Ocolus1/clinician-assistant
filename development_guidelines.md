# Speech Therapy Clinic Management System - Development Guidelines

This document outlines the development standards and best practices for our Speech Therapy Clinic Management application. Following these guidelines will ensure consistent, maintainable, and performant code.

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [State Management](#state-management) 
3. [Complex State Management](#complex-state-management)
4. [Feature Management Patterns](#feature-management-patterns)
5. [Concurrency Handling](#concurrency-handling)
6. [Data Integrity](#data-integrity)
7. [Performance Optimization](#performance-optimization)
8. [Page Structure Organization](#page-structure-organization)
9. [File Naming and Organization](#file-naming-and-organization)
10. [Form Implementation](#form-implementation)
11. [Rich Text Management](#rich-text-management) *(New)*
12. [Schema Changes and Data Evolution](#schema-changes-and-data-evolution)
13. [Data Fetching](#data-fetching)
14. [Code Style](#code-style)
15. [Testing](#testing)
16. [User Experience Considerations](#user-experience-considerations)
17. [Troubleshooting Common Issues](#troubleshooting-common-issues)
18. [Examples](#examples)

## Component Architecture

### Component Size and Responsibility
- **Single Responsibility Principle**: Each component should do one thing well
- **Size Limit**: Keep components under 150-200 lines of code
- **Functionality Split**: When a component grows beyond the size limit, split it into multiple smaller components
- **Separation of Concerns**: Separate display logic from business logic

### ✅ Good Example
```tsx
// ClientHeader.tsx - Focused on displaying client header information
export function ClientHeader({ client }: { client: Client }) {
  return (
    <header className="flex justify-between items-center p-4 border-b">
      <h1 className="text-2xl font-bold">{client.name}</h1>
      <ClientStatusBadge status={client.status} />
    </header>
  );
}

// ClientActions.tsx - Focused on client-related actions
export function ClientActions({ clientId }: { clientId: number }) {
  return (
    <div className="flex gap-2">
      <Button onClick={() => navigate(`/clients/${clientId}/edit`)}>Edit</Button>
      <Button onClick={() => navigate(`/clients/${clientId}/sessions/new`)}>New Session</Button>
    </div>
  );
}
```

### ❌ Bad Example
```tsx
// Avoid: Component doing too many things
function ClientHeaderWithActionsAndStatusAndMetrics({ client, metrics }) {
  // Too many responsibilities in one component
  // Display header, show status, render actions, calculate and show metrics
}
```

### Component Composition
- Use composition over inheritance
- Create small, reusable components that can be composed together
- Pass children props for flexible layouts

## State Management

### Local vs. Global State
- **Local Component State**: Use for UI-specific state that doesn't affect other components
- **React Query**: Use for server state (data fetching, caching, synchronization)
- **Context API**: Use for theme, authentication, and other app-wide concerns
- **Feature-Specific Context**: Create dedicated context providers for complex features (e.g., budget management, session notes)
- **Consider Zustand**: For complex forms and state that spans multiple components

### Rules for State Management
1. Keep state as close as possible to where it's used
2. Avoid prop drilling beyond 2 levels (use context or state management)
3. Use controlled components for form inputs
4. Memoize expensive calculations with `useMemo` and `useCallback`
5. Establish clear ownership of shared state to prevent conflicts

### State Hierarchy Design
- **Feature Boundaries**: Define clear boundaries between feature states
- **State Dependencies**: Document dependencies between related states
- **State Synchronization**: Plan how related states should stay in sync
- **Derived State**: Prefer computing derived state over storing redundant state

### Handling Special States
- **Read-Only Mode**: Implement consistent patterns for read-only states across components
- **Loading States**: Manage loading states predictably across component trees
- **Error States**: Propagate and handle errors consistently
- **Empty States**: Design meaningful empty state representations

### ✅ Good Example: Feature-specific Context
```tsx
// BudgetFeatureContext.tsx
export interface BudgetFeatureContextType {
  // State
  activePlan: BudgetSettings | null;
  isReadOnly: boolean;
  operationInProgress: boolean;
  
  // Operations
  createPlan: (planData: InsertBudgetSettings) => Promise<BudgetSettings>;
  updatePlan: (planId: number, planData: Partial<InsertBudgetSettings>) => Promise<BudgetSettings>;
  activatePlan: (planId: number) => Promise<void>;
  
  // Utilities
  calculateRemaining: () => number;
  validateAllocation: (amount: number) => boolean;
}

export const BudgetFeatureContext = createContext<BudgetFeatureContextType | null>(null);

export function BudgetFeatureProvider({ children, clientId }: { children: ReactNode; clientId: number }) {
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState(false);
  
  // Fetch active plan and determine read-only state
  const { data: activePlan } = useQuery({
    queryKey: ['/api/budget-settings/active', clientId],
    queryFn: () => apiRequest('GET', `/api/budget-settings/active/${clientId}`),
  });
  
  // Logic to determine if current plan should be read-only
  useEffect(() => {
    setIsReadOnly(someCondition);
  }, [activePlan]);
  
  // Provide context value with both state and operations
  const value = {
    activePlan,
    isReadOnly,
    operationInProgress,
    createPlan: async (planData) => {
      setOperationInProgress(true);
      try {
        // Implementation
      } finally {
        setOperationInProgress(false);
      }
    },
    // Other operations...
  };
  
  return (
    <BudgetFeatureContext.Provider value={value}>
      {children}
    </BudgetFeatureContext.Provider>
  );
}

// Custom hook for consuming the context
export function useBudgetFeature() {
  const context = useContext(BudgetFeatureContext);
  if (!context) {
    throw new Error('useBudgetFeature must be used within a BudgetFeatureProvider');
  }
  return context;
}
```

## Feature Management Patterns

### Feature Context Architecture
- **Feature Module Organization**: Group related components, contexts, and utilities in feature-specific directories
- **Context Composition**: Compose feature contexts as needed, with clear hierarchy and dependencies
- **Feature-Level State**: Keep feature-specific state isolated and encapsulated
- **Interface-Driven Development**: Define clear interfaces for feature contexts before implementation

### Feature State Management
- **Entity State Relationships**: Define clear relationships between different entity states
- **Special States Handling**: Implement consistent patterns for special states like read-only mode
- **State Derivation**: Use derived state for computed properties rather than storing redundant state
- **Permission-Based Rendering**: Render UI elements based on user permissions and feature state

### ✅ Good Example: Budget Feature Directory Structure
```
/components
  /budget
    /index.ts                      // Public API exports
    /BudgetFeatureContext.tsx      // Feature-wide context and state
    /UnifiedBudgetManager.tsx      // Main component for managing budgets
    /BudgetPlansView.tsx           // Component for viewing budget plans
    /BudgetCatalogSelector.tsx     // Component for selecting catalog items
    /BudgetItemRow.tsx             // Component for individual budget items
    /dialogs
      /CreateBudgetPlanDialog.tsx  // Dialog for creating new budget plans
      /ActivatePlanDialog.tsx      // Dialog for activating a plan
    /utils
      /budgetCalculations.ts       // Budget-specific utility functions
```

### ✅ Good Example: Feature with Read-Only State Pattern
```tsx
// Budget feature implementation with read-only state handling

// 1. Central Context Definition
export interface BudgetFeatureState {
  activePlan: BudgetPlan | null;
  isReadOnly: boolean;
  readOnlyReason: string | null;
}

// 2. Feature Provider with State Derivation
export function BudgetFeatureProvider({ clientId, children }) {
  // Fetch necessary data
  const { data: plans } = useQuery({
    queryKey: ['/api/budget-plans', clientId],
    queryFn: () => apiRequest('GET', `/api/clients/${clientId}/budget-plans`)
  });
  
  // Derive read-only state
  const [activeState, setActiveState] = useState<BudgetFeatureState>({
    activePlan: null,
    isReadOnly: false,
    readOnlyReason: null
  });
  
  // Update state based on fetched data
  useEffect(() => {
    if (!plans) return;
    
    const activePlan = plans.find(p => p.isActive);
    const currentPlanId = parseInt(new URLSearchParams(window.location.search).get('planId') || '0');
    const currentPlan = currentPlanId ? plans.find(p => p.id === currentPlanId) : activePlan;
    
    // Determine if the current view should be read-only
    const isReadOnly = currentPlan ? (
      !currentPlan.isActive || 
      currentPlan.isArchived || 
      currentPlan.endDate < new Date()
    ) : false;
    
    // Set the reason for read-only state
    let readOnlyReason = null;
    if (isReadOnly && currentPlan) {
      if (currentPlan.isArchived) {
        readOnlyReason = "This plan is archived and cannot be modified.";
      } else if (currentPlan.endDate < new Date()) {
        readOnlyReason = "This plan has expired and cannot be modified.";
      } else if (!currentPlan.isActive) {
        readOnlyReason = "Only the active plan can be modified. Activate this plan to make changes.";
      }
    }
    
    setActiveState({
      activePlan: currentPlan || null,
      isReadOnly,
      readOnlyReason
    });
  }, [plans]);
  
  // 3. Feature Operations
  const activatePlan = async (planId: number) => {
    // Implementation...
  };
  
  const createNewItem = async (item: BudgetItem) => {
    // Check read-only state before operations
    if (activeState.isReadOnly) {
      toast.error("Cannot add items to a read-only budget plan.");
      return null;
    }
    
    // Implementation...
  };
  
  // 4. Provide context
  return (
    <BudgetFeatureContext.Provider value={{
      ...activeState,
      activatePlan,
      createNewItem,
      // Other operations...
    }}>
      {children}
      
      {/* 5. Global Feature UI Elements */}
      {activeState.isReadOnly && activeState.readOnlyReason && (
        <div className="sticky bottom-4 mx-auto max-w-md">
          <Alert variant="warning" className="border shadow-md">
            <LockIcon className="h-4 w-4 mr-2" />
            <AlertTitle>Read-Only Mode</AlertTitle>
            <AlertDescription>{activeState.readOnlyReason}</AlertDescription>
          </Alert>
        </div>
      )}
    </BudgetFeatureContext.Provider>
  );
}

// 6. Consumer Components
function BudgetItemForm() {
  const { isReadOnly } = useBudgetFeature();
  
  return (
    <Form>
      <FormField
        label="Item Description"
        render={({ field }) => (
          <Input {...field} readOnly={isReadOnly} />
        )}
      />
      
      <Button type="submit" disabled={isReadOnly}>
        {isReadOnly ? (
          <>
            <LockIcon className="h-4 w-4 mr-2" />
            Read Only
          </>
        ) : "Save Item"}
      </Button>
    </Form>
  );
}
```

### Feature Lifecycle Management
- **Feature Initialization**: Implement clear initialization patterns for features
- **Feature Cleanup**: Ensure proper cleanup when features are unmounted
- **Cross-Feature Communication**: Define clear interfaces for communication between features
- **Feature Configuration**: Allow features to be configured based on application needs

## Complex State Management

### Centralized State for Complex Features
- **Use Dedicated Feature Context**: Create a context provider for complex features with interdependent components
- **Single Source of Truth**: Define a clear owner for each piece of state
- **State Normalization**: Structure state objects to avoid duplication and simplify updates
- **Immutable Updates**: Use immutable patterns for all state updates

### State Synchronization
- **Predictable Data Flow**: Design unidirectional data flows with clear entry/exit points
- **Staged Operations**: Break multi-entity operations into distinct stages with clear progress tracking
- **Optimistic Updates**: Update UI optimistically but maintain revert capability
- **State Machine Patterns**: Consider using finite state machines for complex workflows
- **Tracking In-Flight Operations**: Maintain flags for operations in progress to prevent duplicate submissions

### ✅ Good Example
```tsx
// Feature context with dedicated state management
export const BudgetFeatureProvider = ({ children, clientId }) => {
  // Central state management
  const [state, dispatch] = useReducer(budgetReducer, initialBudgetState);
  const [operationStatus, setOperationStatus] = useState({
    creatingPlan: false,
    updatingPlan: false,
    activatingPlan: false
  });
  
  // Create a complete transaction-like operation
  const createBudgetPlan = async (planData) => {
    // Prevent duplicate operations
    if (operationStatus.creatingPlan) return;
    
    try {
      // Set operation in progress
      setOperationStatus(prev => ({ ...prev, creatingPlan: true }));
      
      // Dispatch intent
      dispatch({ type: 'CREATE_PLAN_STARTED', payload: planData });
      
      // API call
      const newPlan = await apiRequest('POST', '/api/budget-settings', {
        ...planData,
        clientId
      });
      
      // Create items in sequence if needed
      if (planData.items?.length) {
        const itemPromises = planData.items.map(item => 
          apiRequest('POST', '/api/budget-items', {
            ...item,
            budgetSettingsId: newPlan.id,
            clientId
          })
        );
        await Promise.all(itemPromises);
      }
      
      // Update local state with complete result
      dispatch({ type: 'CREATE_PLAN_SUCCEEDED', payload: newPlan });
      
      return newPlan;
    } catch (error) {
      // Handle error and update state accordingly
      dispatch({ type: 'CREATE_PLAN_FAILED', payload: error });
      throw error;
    } finally {
      // Always clear operation status
      setOperationStatus(prev => ({ ...prev, creatingPlan: false }));
    }
  };
  
  // Provide all operations and state via context
  return (
    <BudgetFeatureContext.Provider value={{
      ...state,
      operationStatus,
      createBudgetPlan,
      // Other operations...
    }}>
      {children}
    </BudgetFeatureContext.Provider>
  );
};
```

### ✅ Good Example
```tsx
// Using React Query for server state
function ClientList() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => apiRequest('GET', '/api/clients')
  });
  
  // Local UI state
  const [filterText, setFilterText] = useState('');
  
  // Derived state with memoization
  const filteredClients = useMemo(() => {
    return clients?.filter(client => 
      client.name.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [clients, filterText]);

  return (
    <div>
      <input 
        type="text" 
        value={filterText} 
        onChange={e => setFilterText(e.target.value)} 
        placeholder="Filter clients..." 
      />
      {isLoading ? <Spinner /> : <ClientTable clients={filteredClients} />}
    </div>
  );
}
```

## Performance Optimization

### Rendering Optimization
- Use `React.memo()` for components that render frequently with the same props
- Implement virtualization for long lists (react-window or react-virtualized)
- Use the `useCallback` hook for event handlers passed to child components
- Avoid anonymous functions in render methods when possible

### Code Splitting
- Use dynamic imports for large components and routes
- Implement lazy loading for modals and dialogs
- Split code by feature or route

```tsx
// Lazy loading a modal component
const SessionFormModal = React.lazy(() => import('./SessionFormModal'));

function Sessions() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowModal(true)}>New Session</Button>
      
      {showModal && (
        <Suspense fallback={<Spinner />}>
          <SessionFormModal 
            open={showModal} 
            onOpenChange={setShowModal} 
          />
        </Suspense>
      )}
    </>
  );
}
```

### Progressive Loading
- Load data only when needed
- Implement pagination for large data sets
- Use skeleton loaders during data fetching

## Page Structure Organization

### Page Component Hierarchy
1. **Top-Level Page Component**: Minimal logic, mainly composition
2. **Section Components**: Major sections of the page
3. **Feature Components**: Specific features within sections
4. **UI Components**: Reusable UI elements

### Maximum Nesting Depth
- Limit component nesting to 3-4 levels maximum
- Extract deeply nested components into separate components

### ✅ Good Example
```tsx
// ClientProfilePage.tsx
export default function ClientProfilePage() {
  // Page-level data fetching
  return (
    <AppLayout>
      <ClientProfileHeader />
      <ClientProfileTabs />
    </AppLayout>
  );
}

// ClientProfileTabs.tsx
function ClientProfileTabs() {
  // Tab management
  return (
    <Tabs defaultValue="info">
      <TabsList>
        <TabsTrigger value="info">Personal Info</TabsTrigger>
        <TabsTrigger value="goals">Goals</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
      </TabsList>
      
      <TabsContent value="info">
        <ClientPersonalInfoSection />
      </TabsContent>
      
      <TabsContent value="goals">
        <ClientGoalsSection />
      </TabsContent>
      
      <TabsContent value="budget">
        <ClientBudgetSection />
      </TabsContent>
    </Tabs>
  );
}
```

### Avoiding Deeply Nested Components
- **Extract Complex UI Parts**: Pull out repeated or complex UI elements into separate components
- **Use Composition**: Pass children props for flexible layouts
- **Flatten Component Trees**: Avoid unnecessary intermediate components

### ❌ Bad Example (Avoid)
```tsx
<Page>
  <Section>
    <Container>
      <Row>
        <Column>
          <Card>
            <CardHeader>
              <CardTitle>
                <Text>Title</Text>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Form>
                <FormField>
                  <Input />
                </FormField>
              </Form>
            </CardBody>
          </Card>
        </Column>
      </Row>
    </Container>
  </Section>
</Page>
```

### ✅ Good Example (Flattened)
```tsx
<Page>
  <PageSection>
    <Card title="Title">
      <SimpleForm>
        <Input label="Name" />
      </SimpleForm>
    </Card>
  </PageSection>
</Page>
```

## Concurrency Handling

### Transaction-Like Operations
- **Atomic Operations**: Design operations that modify multiple entities to be atomic (all succeed or all fail)
- **Two-Phase Commit Pattern**: For critical operations, implement a preparation phase followed by a commit phase
- **Rollback Mechanism**: Prepare for failures by implementing rollback capabilities

### Race Conditions
- **Operation Flags**: Use flags to track in-flight operations and prevent duplicate submissions
- **Debounce and Throttle**: Apply debounce to form submissions and throttle to repeated actions
- **Sequential Processing**: Process dependent operations sequentially rather than in parallel

### ✅ Good Example
```tsx
// Handling race conditions in form submission
function BudgetPlanForm({ onSubmit }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (data) => {
    // Prevent duplicate submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      // Perform submission logic
      await onSubmit(data);
    } catch (error) {
      console.error("Submission failed:", error);
      // Handle error appropriately
    } finally {
      // Always reset submission state
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button 
        type="submit" 
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </Form>
  );
}
```

### State Synchronization
- **Consistent Ordering**: Establish a fixed order for operations that affect multiple entities
- **State Machine**: Use state machines for complex workflows to ensure valid state transitions
- **Centralized Orchestration**: Use a central coordinator for operations that span multiple components

### ✅ Good Example
```tsx
// Sequential processing for dependent operations
async function activateBudgetPlan(planId) {
  try {
    // Step 1: Find any currently active plans
    const activePlan = await fetchActivePlan();
    
    // Step 2: If an active plan exists, deactivate it first
    if (activePlan) {
      await deactivatePlan(activePlan.id);
      
      // Wait for deactivation to complete (could add polling or confirmation)
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Step 3: Only after deactivation, activate the new plan
    await activatePlan(planId);
    
    // Success notification
    toast.success("Plan activated successfully");
    
  } catch (error) {
    // Comprehensive error handling
    console.error("Plan activation failed:", error);
    toast.error(`Failed to activate plan: ${error.message}`);
  }
}
```

## Data Integrity

### Transactional Operations
- **Backend Transactions**: Use database transactions for operations affecting multiple tables
- **API Consistency**: Design APIs to maintain data consistency across related entities
- **Data Relationships**: Clearly define and enforce relationships between data entities

### Data Validation
- **Multi-Level Validation**: Implement validation at UI, API, and database levels
- **Consistent Schemas**: Share validation schemas between frontend and backend
- **Type Safety**: Use TypeScript's type system to prevent inconsistencies

### ✅ Good Example
```tsx
// Shared validation schema
export const budgetPlanSchema = z.object({
  clientId: z.number(),
  planCode: z.string().min(3),
  availableFunds: z.number().positive(),
  isActive: z.boolean().optional().default(false),
  endOfPlan: z.string().nullable()
});

// Frontend validation
function BudgetPlanForm() {
  const form = useForm({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      clientId: client.id,
      planCode: "",
      availableFunds: 0,
      isActive: false,
      endOfPlan: null
    }
  });
  
  // Form submission with typed data
  const onSubmit = (data: z.infer<typeof budgetPlanSchema>) => {
    // Submit validated data
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}

// Backend validation
app.post('/api/budget-settings', async (req, res) => {
  try {
    // Validate with the same schema
    const validated = budgetPlanSchema.parse(req.body);
    const result = await storage.createBudgetSettings(validated);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});
```

### Error Handling and Recovery
- **Graceful Degradation**: Design features to work partially when errors occur
- **Detailed Error Information**: Provide specific error messages to aid debugging
- **Automatic Retry**: Implement retry logic for transient failures

### Data Consistency Patterns
- **Optimistic vs. Pessimistic Updates**: Choose appropriate update patterns based on feature criticality
- **Immutable Data Structures**: Use immutable patterns to prevent unintended side effects
- **Version Control**: Track data versions to detect conflicts

## File Naming and Organization

### File Structure
Organize by feature, not by file type:

```
/client
  /src
    /components
      /sessions
        SessionList.tsx
        SessionCard.tsx
        SessionForm.tsx
        /dialogs
          GoalSelectionDialog.tsx
          MilestoneSelectionDialog.tsx
          ProductSelectionDialog.tsx
      /clients
        ClientList.tsx
        ClientCard.tsx
      /ui
        Button.tsx
        Card.tsx
    /pages
      Sessions.tsx
      ClientProfile.tsx
    /hooks
      useSessionForm.tsx
      useClientData.tsx
    /lib
      utils.ts
      apiClient.ts
```

### Naming Conventions
- **Pages**: Use PascalCase, descriptive names (e.g., `ClientProfile.tsx`)
- **Components**: Use PascalCase, descriptive of functionality (e.g., `SessionCard.tsx`)
- **Hooks**: Use camelCase with `use` prefix (e.g., `useSessionForm.ts`)
- **Utilities**: Use camelCase (e.g., `formatDate.ts`)
- **Context**: Use PascalCase with `Context` suffix (e.g., `SessionContext.tsx`)

### Module Organization
- Group related components in the same directory
- Keep component files small and focused
- Use index.ts files to export multiple components from a directory

## Form Implementation

### Form Architecture
- **Component Structure**: Extract complex forms into their own components
- **Logical Sections**: Break large forms into logical, self-contained sections
- **State Management**: Use React Hook Form for form management
- **Form Context**: For complex forms spanning multiple components, create a dedicated FormContext
- **Read-Only State**: Implement consistent patterns for handling read-only form states

### Complex Form Patterns
- **Multi-Step Forms**: Use a wrapper component to manage form steps and navigation
- **Conditional Form Fields**: Implement conditional visibility/validation based on form state
- **Form Section Components**: Create reusable form section components with consistent interfaces
- **Validation Propagation**: Ensure validation errors are visible and accessible across form components

### Form State Management
- **Form Context Isolation**: Isolate different forms' contexts to prevent state interference
- **Form Reset Patterns**: Implement consistent patterns for form resets and initializations
- **Derived Form State**: Calculate derived state from form values when needed
- **Dirty State Tracking**: Track form modification state to prompt confirmation before navigating away

### ✅ Good Example: Conditional Form Fields with Read-Only State
```tsx
// BudgetItemForm.tsx
function BudgetItemForm({ isReadOnly }) {
  const form = useForm({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      quantity: 1,
      unitPrice: 0
    }
  });
  
  // Watch form values for conditional logic
  const itemCode = form.watch("itemCode");
  const quantity = form.watch("quantity");
  
  // Calculate a derived value (total)
  const total = useMemo(() => {
    const price = form.watch("unitPrice") || 0;
    const qty = quantity || 0;
    return price * qty;
  }, [form, quantity]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="itemCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Code</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isReadOnly}
              >
                {/* Select options */}
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Show description field only when item code is selected */}
        {itemCode && (
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <Input {...field} readOnly={isReadOnly} />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Quantity</FormLabel>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  readOnly={isReadOnly}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Unit Price</FormLabel>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  readOnly={isReadOnly}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="mt-4 text-right">
          <p className="text-sm text-muted-foreground">Total: {formatCurrency(total)}</p>
        </div>
        
        <div className="mt-6 flex justify-end">
          {isReadOnly ? (
            <Badge variant="outline" className="flex items-center gap-1">
              <LockIcon className="h-3 w-3" />
              <span>Read Only</span>
            </Badge>
          ) : (
            <Button type="submit">Save Item</Button>
          )}
        </div>
      </form>
    </Form>
  );
}
```

### ✅ Good Example: Form Context for Complex Forms
```tsx
// BudgetFormContext.tsx
interface BudgetFormContextType {
  // Form state
  isReadOnly: boolean;
  isDirty: boolean;
  
  // Form actions
  resetForm: () => void;
  submitForm: () => void;
  
  // Form utilities
  calculateTotal: () => number;
  validateItem: (item: BudgetItem) => boolean;
}

const BudgetFormContext = createContext<BudgetFormContextType | null>(null);

export function BudgetFormProvider({ children, initialData, isReadOnly = false }) {
  // Form setup with React Hook Form
  const form = useForm({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: initialData || {
      planName: "",
      startDate: new Date(),
      endDate: null,
      totalBudget: 0,
      items: []
    }
  });
  
  // Track form state
  const isDirty = form.formState.isDirty;
  
  // Form actions
  const resetForm = useCallback(() => {
    form.reset();
  }, [form]);
  
  const submitForm = useCallback(() => {
    form.handleSubmit(onSubmit)();
  }, [form, onSubmit]);
  
  // Form utilities
  const calculateTotal = useCallback(() => {
    const items = form.getValues("items") || [];
    return items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  }, [form]);
  
  const validateItem = useCallback((item: BudgetItem) => {
    // Custom validation logic
    return item.quantity > 0 && item.unitPrice > 0;
  }, []);
  
  // Context value
  const value = {
    isReadOnly,
    isDirty,
    resetForm,
    submitForm,
    calculateTotal,
    validateItem,
    form // Expose form if needed
  };
  
  return (
    <BudgetFormContext.Provider value={value}>
      {children}
    </BudgetFormContext.Provider>
  );
}

// Custom hook
export function useBudgetForm() {
  const context = useContext(BudgetFormContext);
  if (!context) {
    throw new Error("useBudgetForm must be used within a BudgetFormProvider");
  }
  return context;
}
```

### Form Validation Strategies
- **Progressive Validation**: Validate fields as users interact with them
- **Cross-Field Validation**: Implement validation that depends on multiple field values 
- **Async Validation**: Validate against server data when necessary
- **Validation Groups**: Group related validations for complex business rules
- **Contextual Validation**: Apply different validation rules based on form context or state

### Form Error Handling
- **Visible Errors**: Ensure validation errors are clearly visible
- **Actionable Errors**: Provide guidance on how to fix validation errors
- **Error Grouping**: Group related errors for better user experience
- **Error Recovery**: Help users recover from form errors easily
- Validate with Zod schemas

### Multi-Step Forms
- Use a wizard pattern for complex forms
- Maintain form state separately from UI state
- Save progress between steps when appropriate

### Modal Forms
- Keep modal logic separate from form logic
- Extract dialogs into separate components
- Load data progressively based on user interaction

### ✅ Good Example
```tsx
// SessionForm.tsx - Main form container

## Schema Changes and Data Evolution

### Schema Evolution Process
- **Document All Schema Changes**: Maintain a record of all schema changes with update dates
- **Sync Frontend and Backend**: Update all schema references across the codebase when making schema changes
- **Migration Planning**: Plan both data and code migrations for schema changes
- **Form Validation Updates**: Always update all form validation schemas to match database schema changes

### Field Renaming Guidelines
- **Update All References**: When renaming fields (e.g., `availableFunds` to `ndisFunds`), search globally and update all references
- **Check Form Schema Modifications**: Pay special attention to form validation schemas using `.omit()` or `.extend()`
- **Run Form Validation Tests**: Verify all forms work correctly after schema changes
- **Monitor Console Errors**: Watch for schema validation errors in console after changes

### ✅ Good Example
```tsx
// Before schema change in schema.ts:
export const clients = pgTable("clients", {
  // ...other fields
  availableFunds: numeric("available_funds").notNull().$type<number>().default(0),
});

// After schema change in schema.ts:
export const clients = pgTable("clients", {
  // ...other fields
  ndisFunds: numeric("ndis_funds").notNull().$type<number>().default(0),
});

// Before schema change in ClientForm.tsx:
const modifiedClientSchema = insertClientSchema
  .omit({ availableFunds: true })
  .extend({
    name: z.string().min(1, { message: "Client name is required" }),
    // Other validations
  });

// After schema change in ClientForm.tsx:
const modifiedClientSchema = insertClientSchema
  .omit({ ndisFunds: true }) // Updated field name here
  .extend({
    name: z.string().min(1, { message: "Client name is required" }),
    // Other validations
  });
```

### Schema Change Checklist
1. **Update Schema Definition**: Modify fields in the schema.ts file first
2. **Update Database**: Run migrations or direct schema updates
3. **Update Form Validation**: Update all form validation schemas
4. **Update API Routes**: Ensure API routes handle new field names
5. **Update UI Components**: Update any UI components that display or interact with changed fields
6. **Test Workflows**: Test all affected user workflows end-to-end
export function SessionForm({ clientId, onComplete }) {
  const [step, setStep] = useState(0);
  const formMethods = useForm({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: { clientId }
  });
  
  return (
    <Form {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(onComplete)}>
        {step === 0 && <SessionDetailsStep onNext={() => setStep(1)} />}
        {step === 1 && <GoalsSelectionStep onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <NotesStep onSubmit={formMethods.handleSubmit(onComplete)} onBack={() => setStep(1)} />}
      </form>
    </Form>
  );
}

// SessionDetailsStep.tsx - Extracted step component
function SessionDetailsStep({ onNext }) {
  // Step-specific form fields
  return (
    <div>
      <FormField name="title" label="Session Title" />
      <FormField name="date" label="Session Date" />
      <Button onClick={onNext}>Next</Button>
    </div>
  );
}
```

## Data Fetching

### React Query Best Practices
- Use meaningful query keys that reflect the data hierarchy
- Implement proper cache invalidation after mutations
- Use prefetching for anticipated data needs
- Handle loading and error states consistently

### API Request Structure
- Centralize API requests in a dedicated module
- Use typed request and response models
- Handle errors consistently

### ✅ Good Example
```tsx
// In queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// In component
function ClientSessions({ clientId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/clients', clientId, 'sessions'], 
    queryFn: () => apiRequest('GET', `/api/clients/${clientId}/sessions`)
  });
  
  const mutation = useMutation({
    mutationFn: (newSession) => apiRequest('POST', `/api/sessions`, newSession),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'sessions'] });
      toast.success("Session created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create session: ${error.message}`);
    }
  });
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorAlert error={error} />;
  
  return (
    <div>
      <SessionList sessions={data} />
      <Button onClick={() => mutation.mutate(newSession)}>
        Add Session
      </Button>
    </div>
  );
}
```

## Code Style

### TypeScript Best Practices
- Use explicit type annotations for function parameters and return values
- Create interfaces for component props
- Use type inference where appropriate
- Prefer interfaces for public APIs and types for internal usage

### Formatting and Linting
- Use consistent formatting throughout the codebase
- Follow the project's ESLint and Prettier configurations
- Format code before committing changes

## Troubleshooting Common Issues

### Performance Issues
- Check for unnecessary re-renders using React DevTools
- Look for missing dependency arrays in useEffect, useMemo, or useCallback
- Ensure proper memoization of expensive calculations
- Verify that large lists are properly virtualized
- Check form re-renders caused by frequent state updates

### State Management Problems
- **Context Interference**: Check for nested contexts that might interfere with each other 
- **Form Context Isolation**: Verify form contexts are properly isolated to prevent state interference
- **Read-Only State Propagation**: Ensure read-only state is consistently propagated to all components
- **Race Conditions**: Look for race conditions in asynchronous state updates
- **Initial State Handling**: Verify that form state is properly initialized with defaultValues
- **State Reset Issues**: Check for incomplete state resets when switching between entities

### Component Rendering Issues
- **Conditional Rendering Bugs**: Check complex conditional rendering logic for edge cases
- **Form Components Not Updating**: Verify form field components are correctly watching form state
- **Component Unmounting During Data Fetch**: Ensure components handle unmounting during async operations
- **Missing Key Props**: Check that list items have appropriate key props to prevent re-render issues
- **Ref Stability**: Ensure refs are stable across renders when needed

### Form Implementation Issues
- **Field Control Issues**: Verify that form fields are properly connected to form control
- **Validation Timing**: Check validation timing for fields with interdependencies
- **Form Reset Logic**: Ensure form reset logic resets all fields and derived state
- **Formik vs. React Hook Form**: Ensure consistent form library usage across components
- **Controlled vs. Uncontrolled**: Verify consistent approach to controlled/uncontrolled components

### Data Flow Problems
- **Data Transformation Inconsistency**: Check for inconsistent data transformation between API and UI
- **Missing Query Invalidation**: Verify that mutations properly invalidate related queries
- **Stale Data**: Look for components using stale data due to missing refetching
- **Error Handling Gaps**: Ensure comprehensive error handling in data fetching operations

### ✅ Good Example: Debugging Context Issues
```tsx
// Problem: Components not updating when context values change
// Solution: Check for missing dependencies in context provider

// Before: Missing dependency in context provider
function BudgetFeatureProvider({ clientId, children }) {
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Fetch active plan
  const { data: activePlan } = useQuery({
    queryKey: ['/api/budget-settings/active', clientId],
    queryFn: () => apiRequest('GET', `/api/budget-settings/active/${clientId}`)
  });
  
  // BUG: Missing dependency on activePlan
  useEffect(() => {
    // Determine if current view should be read-only
    setIsReadOnly(checkReadOnlyCondition());
  }, [clientId]); // Missing activePlan dependency!
  
  return (
    <BudgetFeatureContext.Provider value={{ activePlan, isReadOnly }}>
      {children}
    </BudgetFeatureContext.Provider>
  );
}

// After: Fixed dependency array
function BudgetFeatureProvider({ clientId, children }) {
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Fetch active plan
  const { data: activePlan } = useQuery({
    queryKey: ['/api/budget-settings/active', clientId],
    queryFn: () => apiRequest('GET', `/api/budget-settings/active/${clientId}`)
  });
  
  // Fixed: Added activePlan to dependency array
  useEffect(() => {
    // Determine if current view should be read-only based on active plan
    setIsReadOnly(activePlan ? checkReadOnlyCondition(activePlan) : false);
  }, [clientId, activePlan]); // Added activePlan dependency
  
  return (
    <BudgetFeatureContext.Provider value={{ activePlan, isReadOnly }}>
      {children}
    </BudgetFeatureContext.Provider>
  );
}
```

### Complex Form Debugging
- **Form Value Watching**: Use form.watch() to debug form values during development
- **State Logging**: Add strategic console logs for complex state transitions
- **React DevTools**: Use React DevTools to inspect component props and state
- **Isolation Testing**: Test problematic components in isolation
- **Step-by-Step Execution**: Debug complex operations by breaking them into smaller steps

## Examples

### Before and After: Complex Form Refactoring

#### ❌ Before: Monolithic Form Component
```tsx
// Large, complex form component with many responsibilities
function IntegratedSessionForm({ clientId }) {
  // 200+ lines of code with multiple concerns:
  // - Form state management
  // - Multiple dialogs
  // - Data fetching for clients, goals, products
  // - Complex validation logic
  // - Multiple form sections
  // - Error handling
  // - Submission logic
}
```

#### ✅ After: Modular Form Architecture
```tsx
// Main container - minimal logic
function IntegratedSessionForm({ clientId }) {
  return (
    <SessionFormProvider clientId={clientId}>
      <SessionFormLayout />
    </SessionFormProvider>
  );
}

// Form layout - focuses on structure
function SessionFormLayout() {
  const { currentStep } = useSessionFormContext();
  
  return (
    <div>
      <FormStepper currentStep={currentStep} />
      <SessionFormStepContent />
      <SessionFormActions />
    </div>
  );
}

// Step content - conditionally renders the current step
function SessionFormStepContent() {
  const { currentStep } = useSessionFormContext();
  
  switch (currentStep) {
    case 0: return <SessionDetailsStep />;
    case 1: return <GoalSelectionStep />;
    case 2: return <ProductSelectionStep />;
    case 3: return <NotesStep />;
    default: return null;
  }
}

// Individual step component - focused on one part of the form
function GoalSelectionStep() {
  const { clientId, selectedGoals, addGoal, removeGoal } = useSessionFormContext();
  const { data: goals } = useQuery({
    queryKey: ['/api/clients', clientId, 'goals'],
    queryFn: () => apiRequest('GET', `/api/clients/${clientId}/goals`)
  });
  
  return (
    <div>
      <h2>Select Goals</h2>
      <GoalList 
        goals={goals} 
        selectedGoals={selectedGoals}
        onSelect={addGoal}
        onRemove={removeGoal}
      />
    </div>
  );
}

// Dialog components in separate files
// GoalSelectionDialog.tsx
export function GoalSelectionDialog({ open, onOpenChange, onSelectGoal }) {
  // Dialog-specific logic and UI
}
```

## Testing

### Test Coverage Strategy
- **Component Testing**: Write tests for reusable components to verify their functionality in isolation
- **Integration Testing**: Test interactions between components, especially for complex features
- **API Testing**: Verify that API endpoints handle valid and invalid inputs correctly
- **End-to-End Testing**: Test critical user flows from start to finish

### Test-Driven Development
- **Write Tests First**: For complex features, write tests before implementation to clarify requirements
- **Incremental Testing**: Add tests as features evolve
- **Regression Testing**: Ensure that new changes don't break existing functionality

### Testing Complex Features
- **State Transition Testing**: Verify that complex workflows transition correctly between states
- **Boundary Testing**: Test edge cases and boundary conditions, especially for numeric inputs
- **Error Path Testing**: Verify that features handle errors gracefully
- **Concurrency Testing**: Test features under concurrent usage conditions

### ✅ Good Example
```tsx
// Testing a budget plan feature with complex state transitions
describe('BudgetPlanManager', () => {
  // Setup test data
  const testClient = { id: 1, name: 'Test Client' };
  const testPlan = { clientId: 1, planCode: 'TEST-001', availableFunds: 5000 };
  
  // Reset state between tests
  beforeEach(() => {
    // Reset test database or mock state
  });
  
  test('creates a new budget plan successfully', async () => {
    const result = await createBudgetPlan(testPlan);
    
    expect(result).toHaveProperty('id');
    expect(result.planCode).toBe('TEST-001');
    expect(result.availableFunds).toBe(5000);
  });
  
  test('prevents creating duplicate plan codes', async () => {
    // First create a plan
    await createBudgetPlan(testPlan);
    
    // Try to create another plan with the same code
    await expect(createBudgetPlan(testPlan))
      .rejects
      .toThrow('Plan code already exists');
  });
  
  test('activates a plan and deactivates others', async () => {
    // Create two plans
    const plan1 = await createBudgetPlan({ ...testPlan, planCode: 'TEST-001' });
    const plan2 = await createBudgetPlan({ ...testPlan, planCode: 'TEST-002' });
    
    // Activate plan 1
    await activateBudgetPlan(plan1.id);
    
    // Verify plan 1 is active
    const activePlan1 = await getBudgetPlan(plan1.id);
    expect(activePlan1.isActive).toBe(true);
    
    // Activate plan 2
    await activateBudgetPlan(plan2.id);
    
    // Verify plan 1 is now inactive
    const inactivePlan1 = await getBudgetPlan(plan1.id);
    expect(inactivePlan1.isActive).toBe(false);
    
    // Verify plan 2 is active
    const activePlan2 = await getBudgetPlan(plan2.id);
    expect(activePlan2.isActive).toBe(true);
  });
  
  test('handles concurrent operations properly', async () => {
    // Create a plan
    const plan = await createBudgetPlan(testPlan);
    
    // Simulate concurrent activation attempts
    const results = await Promise.allSettled([
      activateBudgetPlan(plan.id),
      activateBudgetPlan(plan.id)
    ]);
    
    // Verify one succeeded and one failed or was ignored
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    expect(succeeded).toBe(1);
  });
});
```

## User Experience Considerations

### State Visualization Patterns
- **Read-Only State Indicators**: Use consistent visual indicators for read-only states (lock icons, badges)
- **Warning Banners**: Add clear warning banners for important state information (e.g., "This plan is read-only")
- **Status Badges**: Use color-coded badges to show item status (active, archived, pending)
- **Visual Hierarchies**: Establish clear visual hierarchies for primary, secondary, and tertiary actions

### Feedback for Complex Operations
- **Progress Indicators**: Show progress for multi-step operations
- **Success/Error Messaging**: Provide clear feedback on operation outcomes
- **Confirmation Dialogs**: Request confirmation for destructive or significant actions
- **Toast Notifications**: Use toast notifications for non-blocking feedback
- **Form Validation Feedback**: Provide immediate and clear validation feedback
- **Loading States**: Implement consistent loading states across the application

### Accessibility and Usability
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Focus Management**: Manage focus correctly, especially in modal workflows
- **Error Recovery**: Make it easy for users to recover from errors
- **Consistent Patterns**: Use consistent UI patterns for similar operations
- **Adaptive Design**: Ensure the UI adapts appropriately to different screen sizes

### ✅ Good Example: Read-Only State Visualization
```tsx
function BudgetPlanSummary({ plan, isReadOnly }) {
  return (
    <Card className={cn(
      "border p-4",
      isReadOnly && "border-amber-300 bg-amber-50"
    )}>
      {isReadOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100 p-2 text-amber-800">
          <LockIcon className="h-4 w-4" />
          <span className="text-sm font-medium">This budget plan is read-only. Create a new plan to make changes.</span>
        </div>
      )}
      
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-medium">{plan.planName}</h3>
          <p className="text-sm text-muted-foreground">
            Created on {format(new Date(plan.createdAt), 'PPP')}
          </p>
        </div>
        
        <Badge variant={plan.isActive ? "success" : "outline"} className="h-fit">
          {plan.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
      
      <div className="mt-4">
        <h4 className="text-sm font-medium">Total Budget</h4>
        <p className="text-2xl font-bold">{formatCurrency(plan.totalBudget)}</p>
      </div>
      
      <div className="mt-4 flex justify-end gap-2">
        {isReadOnly ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <LockIcon className="h-3 w-3" />
            <span>Read Only</span>
          </div>
        ) : (
          <>
            <Button variant="outline" size="sm">Edit</Button>
            {!plan.isActive && (
              <Button size="sm">Activate Plan</Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
```

### ✅ Good Example: Form Validation Feedback
```tsx
function BudgetItemForm() {
  const form = useForm({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: { quantity: 1, unitPrice: 0 }
  });
  
  // Derived validation
  const quantityValue = form.watch("quantity");
  const unitPriceValue = form.watch("unitPrice");
  const totalValue = (quantityValue || 0) * (unitPriceValue || 0);
  const remainingBudget = useBudgetFeature().calculateRemaining();
  const isOverBudget = totalValue > remainingBudget;
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {isOverBudget && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Budget Exceeded</AlertTitle>
            <AlertDescription>
              This item would exceed your available budget by {formatCurrency(totalValue - remainingBudget)}.
              Please adjust the quantity or unit price.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Form fields... */}
        
        <div className="mt-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Total Cost</p>
            <p className={cn(
              "text-lg font-bold",
              isOverBudget ? "text-destructive" : "text-foreground"
            )}>
              {formatCurrency(totalValue)}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium">Remaining Budget</p>
            <p className={cn(
              "text-lg font-bold",
              remainingBudget - totalValue < 0 ? "text-destructive" : "text-foreground"
            )}>
              {formatCurrency(remainingBudget - totalValue)}
            </p>
          </div>
        </div>
        
        <Button 
          type="submit" 
          className="mt-4 w-full"
          disabled={isOverBudget || form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving..." : "Save Item"}
        </Button>
      </form>
    </Form>
  );
}
```

### User Guidance
- **Contextual Help**: Provide contextual help for complex features
- **Empty States**: Design helpful empty states that guide users to the next action
- **Incremental Disclosure**: Progressively reveal complexity as users need it
- **Consistent Terminology**: Use consistent terminology throughout the application
- **Informative Errors**: Provide actionable error messages that help users recover
- **Loading States**: Display appropriate loading states during async operations

### State Visualization
- **Visual Cues**: Use colors, icons, and animations to indicate state
- **Consistent Status Indicators**: Maintain consistent visual language for status
- **Transition Animations**: Use animations to illustrate state transitions

### ✅ Good Example
```tsx
function BudgetPlanActivation({ plan, onActivate }) {
  const [isActivating, setIsActivating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const handleActivationRequest = () => {
    setShowConfirmation(true);
  };
  
  const handleConfirmedActivation = async () => {
    setIsActivating(true);
    setShowConfirmation(false);
    
    try {
      await onActivate(plan.id);
      toast({
        title: "Plan Activated",
        description: `${plan.planCode} is now your active budget plan.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  };
  
  return (
    <>
      <Button 
        onClick={handleActivationRequest}
        disabled={isActivating || plan.isActive}
        variant={plan.isActive ? "outline" : "default"}
      >
        {plan.isActive ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Active
          </>
        ) : isActivating ? (
          <>
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Activating...
          </>
        ) : (
          "Set as Active"
        )}
      </Button>
      
      <ConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title="Activate Budget Plan"
        description={`
          This will set ${plan.planCode} as your active budget plan. 
          Any currently active plan will be deactivated. Continue?
        `}
        onConfirm={handleConfirmedActivation}
      />
    </>
  );
}
```

### Error Prevention
- **Contextual Validation**: Validate inputs in context (e.g., budget items against available funds)
- **Guided Workflows**: Guide users through complex processes with wizards or stepped interfaces
- **Preventing Destructive Actions**: Implement safeguards against accidental data loss

### Accessibility and Inclusivity
- **Keyboard Navigation**: Ensure all interactions are accessible via keyboard
- **Screen Reader Support**: Add appropriate ARIA labels and roles
- **Color Contrast**: Maintain adequate color contrast for all visual elements
- **Responsive Design**: Ensure functionality works across device sizes

By following these guidelines, you'll create a more maintainable, performant, and collaborative codebase that's easier to extend and debug. Most importantly, you'll deliver a more reliable and satisfying user experience, especially for complex features like budget management.