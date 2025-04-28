# Border Styles Usage Guide

This guide outlines how to use the border styles system in our practice management software application.

## Card Borders

Cards use our standard border style with subtle, light borders and shadows:

```jsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Basic card with standard borders
<Card>
  <CardHeader>
    <CardTitle>Client Overview</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content goes here...</p>
  </CardContent>
</Card>
```

## Input Field Borders

Input elements have standardized borders with focused states:

```jsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Standard input
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="Enter client name" />
</div>

// Input with error state (use data-state="error")
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    placeholder="Enter email address" 
    data-state="error" 
  />
  <p className="text-sm text-error-500">Please enter a valid email address</p>
</div>
```

## Dividers/Separators

Use separators to divide content within the same card:

```jsx
import { Separator } from "@/components/ui/separator";

<div className="space-y-6">
  <section>
    <h3>Personal Information</h3>
    <p>Content for personal information...</p>
  </section>
  <Separator />
  <section>
    <h3>Contact Information</h3>
    <p>Content for contact information...</p>
  </section>
</div>
```

## Table Borders

Tables have consistent styling with horizontal borders:

```jsx
import { 
  Table, TableHeader, TableRow, TableHead, 
  TableBody, TableCell, TableCaption 
} from "@/components/ui/table";

<Table>
  <TableCaption>List of appointments</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Client</TableHead>
      <TableHead>Date</TableHead>
      <TableHead>Time</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Smith</TableCell>
      <TableCell>2023-09-15</TableCell>
      <TableCell>10:00 AM</TableCell>
      <TableCell>Confirmed</TableCell>
    </TableRow>
    {/* Add status indicator to row */}
    <TableRow data-status="active">
      <TableCell>Amy Johnson</TableCell>
      <TableCell>2023-09-15</TableCell>
      <TableCell>11:00 AM</TableCell>
      <TableCell>Confirmed</TableCell>
    </TableRow>
    <TableRow data-status="pending">
      <TableCell>David Williams</TableCell>
      <TableCell>2023-09-15</TableCell>
      <TableCell>1:00 PM</TableCell>
      <TableCell>Pending</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Status Indicators

Use status cards to display content with status indicators:

```jsx
import { StatusCard, StatusBadge } from "@/components/ui/status-card";

// Active status card
<StatusCard status="active">
  <div className="p-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-medium">Session #1234</h3>
      <StatusBadge status="active" />
    </div>
    <p className="mt-2">Session details here...</p>
  </div>
</StatusCard>

// Pending status card
<StatusCard status="pending">
  <div className="p-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-medium">Session #5678</h3>
      <StatusBadge status="pending" />
    </div>
    <p className="mt-2">Session details here...</p>
  </div>
</StatusCard>

// Inactive status card
<StatusCard status="inactive">
  <div className="p-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-medium">Session #9012</h3>
      <StatusBadge status="inactive" />
    </div>
    <p className="mt-2">Session details here...</p>
  </div>
</StatusCard>
```

## Tab Borders

Tabs have a subtle inactive border with a prominent active border:

```jsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="sessions">Sessions</TabsTrigger>
    <TabsTrigger value="goals">Goals</TabsTrigger>
    <TabsTrigger value="reports">Reports</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <p>Overview content here...</p>
  </TabsContent>
  <TabsContent value="sessions">
    <p>Sessions content here...</p>
  </TabsContent>
  <TabsContent value="goals">
    <p>Goals content here...</p>
  </TabsContent>
  <TabsContent value="reports">
    <p>Reports content here...</p>
  </TabsContent>
</Tabs>
```

## Direct Usage of Border Styles

You can also directly utilize the border styles in your custom components:

```jsx
import { borderStyles } from "@/lib/border-styles";

<div className={`
  ${borderStyles.card.border}
  ${borderStyles.card.radius}
  ${borderStyles.card.shadow}
  p-4
`}>
  <h3>Custom Component</h3>
  <p>Content here...</p>
</div>
```