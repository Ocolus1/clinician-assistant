# Speech Therapy Clinic Management System - Development Guidelines

This document outlines the development standards and best practices for our Speech Therapy Clinic Management application. Following these guidelines will ensure consistent, maintainable, and performant code.

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [State Management](#state-management)
3. [Performance Optimization](#performance-optimization)
4. [Page Structure Organization](#page-structure-organization)
5. [File Naming and Organization](#file-naming-and-organization)
6. [Form Implementation](#form-implementation)
7. [Data Fetching](#data-fetching)
8. [Code Style](#code-style)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)
10. [Examples](#examples)

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
- **Consider Zustand**: For complex forms and state that spans multiple components

### Rules for State Management
1. Keep state as close as possible to where it's used
2. Avoid prop drilling beyond 2 levels (use context or state management)
3. Use controlled components for form inputs
4. Memoize expensive calculations with `useMemo` and `useCallback`

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

### Form Organization
- Extract complex forms into their own components
- Break large forms into logical sections
- Use React Hook Form for form management
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

### State Management Problems
- Check for prop drilling and refactor to use context or state management
- Verify that form state is properly initialized
- Look for race conditions in asynchronous state updates

### Component Structure Issues
- Identify components that are too large or have too many responsibilities
- Check for deeply nested component hierarchies
- Look for duplicate code that could be extracted into shared components

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

By following these guidelines, you'll create a more maintainable, performant, and collaborative codebase that's easier to extend and debug.