# Button System Usage Guide

This guide explains how to use our standardized button system for the practice management software. Consistent button styling is crucial for providing a cohesive user experience throughout the application.

## Button Types

### Primary Buttons
For primary actions that should stand out to users (e.g. "Save", "Submit", "Add Session").

```jsx
// Using the CSS class directly
<button className="btn btn-primary">
  Save Changes
</button>

// Using shadcn Button component
<Button variant="primary">
  Save Changes
</Button>
```

### Secondary Buttons
For secondary actions that don't need as much emphasis (e.g. "Cancel", "View Details").

```jsx
// Using the CSS class directly
<button className="btn btn-secondary">
  Cancel
</button>

// Using shadcn Button component
<Button variant="secondary">
  Cancel
</Button>

// Or using outline variant which renders identically
<Button variant="outline">
  Cancel
</Button>
```

### Icon Buttons
For icon-only actions that don't need text labels.

```jsx
// Using the CSS class directly
<button className="btn btn-icon">
  <PlusIcon className="w-5 h-5" />
</button>

// Using shadcn Button component
<Button variant="ghost" size="icon">
  <PlusIcon className="w-5 h-5" />
</Button>

// Active state for icon buttons
<button className="btn btn-icon active">
  <HeartIcon className="w-5 h-5" />
</button>
```

### Icon with Text Buttons
For buttons that combine an icon with text label.

```jsx
// Using the CSS class directly
<button className="btn btn-primary btn-icon-text">
  <PlusIcon className="w-5 h-5" />
  <span>Add New</span>
</button>

// Using shadcn Button component
<Button variant="primary">
  <PlusIcon className="w-5 h-5 mr-2" />
  Add New
</Button>
```

### Danger Buttons
For destructive actions that should be used with caution (e.g. "Delete", "Remove").

```jsx
// Using the CSS class directly
<button className="btn btn-danger">
  Delete
</button>

// Using shadcn Button component
<Button variant="destructive">
  Delete
</Button>
```

## Button States

### Disabled State
For buttons that are not currently actionable.

```jsx
// Using the CSS class directly
<button className="btn btn-primary disabled" disabled>
  Submit
</button>

// Using shadcn Button component
<Button variant="primary" disabled>
  Submit
</Button>
```

### Loading State
For buttons that are processing an action.

```jsx
// Using the CSS class directly
<button className="btn btn-primary btn-loading">
  Saving...
</button>

// Using shadcn Button component with custom loading state
<Button variant="primary" disabled className={isLoading ? "btn-loading" : ""}>
  {isLoading ? "Saving..." : "Save"}
</Button>
```

## Button Sizes

```jsx
// Regular size (default)
<button className="btn btn-primary">
  Regular Button
</button>

// Small size
<button className="btn btn-primary btn-sm">
  Small Button
</button>

// Large size
<button className="btn btn-primary btn-lg">
  Large Button
</button>

// Using shadcn Button component
<Button variant="primary" size="default">Regular</Button>
<Button variant="primary" size="sm">Small</Button>
<Button variant="primary" size="lg">Large</Button>
```

## Full Width Buttons
For buttons that should span the full width of their container.

```jsx
// Using the CSS class directly
<button className="btn btn-primary btn-block">
  Create Account
</button>

// Using shadcn Button component
<Button variant="primary" className="w-full">
  Create Account
</Button>
```

## Button Groups
For grouping related buttons together.

```jsx
// Using the CSS class directly
<div className="btn-group">
  <button className="btn btn-secondary">Day</button>
  <button className="btn btn-secondary">Week</button>
  <button className="btn btn-secondary">Month</button>
</div>

// Using shadcn Button component
<div className="inline-flex">
  <Button variant="secondary" className="rounded-r-none">Day</Button>
  <Button variant="secondary" className="rounded-none border-x-0">Week</Button>
  <Button variant="secondary" className="rounded-l-none">Month</Button>
</div>
```

## Best Practices

1. **Use Primary Buttons Sparingly**: Limit to one primary button per section to avoid confusion.
2. **Consistent Labeling**: Use clear, concise, and consistent wording for button labels.
3. **Logical Ordering**: Place buttons in a logical order, with primary actions on the right in English/LTR interfaces.
4. **Accessibility**: Ensure buttons have sufficient contrast and are keyboard navigable.
5. **Icon Buttons**: Always provide tooltips for icon-only buttons.
6. **Text Case**: Use sentence case for button text (e.g., "Save changes" not "Save Changes").
7. **Responsive Sizing**: Consider how buttons will appear on different screen sizes.

## Color Reference

Our buttons use the following color variables:

- Primary Button: `--primary-blue-500` (#3A86FF)
- Primary Button Hover: `--primary-blue-700` (#2A69DD)
- Secondary Button Border: `--primary-blue-500` (#3A86FF)
- Secondary Button Hover: `--primary-blue-100` (#C7DDFF)
- Icon Button Active: `--primary-blue-500` (#3A86FF)
- Icon Button Inactive: `--gray-500` (#718096)
- Disabled Button: `--gray-300` (#CBD5E0)
- Disabled Text: `--gray-400` (#A0AEC0)

These color values are defined in our color system (`colors.css`) and should not be hardcoded.