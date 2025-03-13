# Architecture Overview

## Overview

This repository contains a Speech Therapy Clinic Management System, a full-stack web application designed to help speech therapists manage their clients, sessions, goals, and budgets. The application follows a client-server architecture with a React frontend and a Node.js backend using Express.

## System Architecture

The system follows a modern web application architecture with the following components:

1. **Frontend**: React-based single-page application (SPA) with Tailwind CSS for styling and Shadcn UI components
2. **Backend**: Node.js with Express serving as the API server and handling server-side rendering
3. **Database**: PostgreSQL database (via NeonDB) for persistent storage
4. **ORM**: Drizzle ORM for database schema management and querying
5. **Bundling/Build**: Vite for frontend development and building, esbuild for backend bundling

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  React Frontend │<────>│  Express API    │<────>│  PostgreSQL DB  │
│  (Vite + SPA)   │      │  (Node.js)      │      │  (NeonDB)       │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Key Components

### Frontend

1. **Client Pages**: 
   - Dashboard (`/client/src/pages/Dashboard.tsx`)
   - Client List (`/client/src/pages/EnhancedClientList.tsx`)
   - Client Profile (`/client/src/pages/ClientProfile.tsx`)
   - Session Management (`/client/src/pages/Sessions.tsx`)
   - Onboarding Form (`/client/src/pages/OnboardingForm.tsx`)
   - Summary View (`/client/src/pages/Summary.tsx`)
   - Print Summary (`/client/src/pages/PrintSummary.tsx`)

2. **Routing**: Uses Wouter for client-side routing, with routes defined in `App.tsx`

3. **UI Components**: Extensive use of Radix UI primitives with Shadcn UI component library and Tailwind CSS for styling

4. **State Management**: 
   - React Query for server state management and data fetching
   - React Hook Form for form state management
   - Local component state with useState for UI state

5. **Custom Hooks**:
   - `use-toast.ts` for toast notifications
   - `use-mobile.tsx` for responsive design detection
   - `useSessionForm.ts` for session management form logic

### Backend

1. **API Server**: Express.js server defined in `server/index.ts`

2. **Routes**: API routes defined in `server/routes.ts`, following RESTful patterns

3. **Storage Layer**: Data access abstraction in `server/storage.ts` that interfaces with the database

4. **Database Connection**: Connection to NeonDB PostgreSQL via `server/db.ts`

### Database Schema

The database schema is defined in `shared/schema.ts` using Drizzle ORM and includes the following key tables:

1. **clients**: Stores client information including name, date of birth, contact information, and onboarding status
2. **allies**: Associates support persons (allies) with clients
3. **goals**: Tracks therapy goals for clients
4. **subgoals**: Breaks down goals into smaller, trackable elements
5. **sessions**: Records therapy sessions
6. **session_notes**: Stores detailed notes from therapy sessions
7. **budget_settings**: Manages client budget configuration
8. **budget_items**: Tracks individual budget line items
9. **budget_item_catalog**: Pre-defined catalog of budget items

### API Structure

The API follows a REST pattern with the following key endpoints (from `server/routes.ts`):

1. **Client Management**:
   - `GET /api/clients`: Retrieve all clients
   - `POST /api/clients`: Create a new client
   - `GET /api/clients/:id`: Get a specific client
   - `PUT /api/clients/:id`: Update a client
   - `DELETE /api/clients/:id`: Delete a client

2. **Session Management**:
   - `GET /api/sessions`: Get all sessions
   - `POST /api/sessions`: Create a new session
   - `GET /api/sessions/:id`: Get a specific session

3. **Goal Tracking**:
   - `GET /api/clients/:id/goals`: Get goals for a client
   - `POST /api/clients/:id/goals`: Add a goal for a client

4. **Budget Management**:
   - `GET /api/clients/:id/budget-settings`: Get budget settings for a client
   - `POST /api/clients/:id/budget-settings`: Set budget settings for a client
   - `GET /api/clients/:id/budget-items`: Get budget items for a client

## Data Flow

The application follows a typical data flow pattern for a modern web application:

1. **User Interaction** → React Component → API Request → Server Route Handler → Storage Layer → Database
2. **Database** → Storage Layer → Server Response → React Query Cache → React Component → UI Update

For form submission, the flow is:
1. Form Input → React Hook Form Validation → API Submission → Server Validation → Database Update → Response → UI Update (success/error)

Key data transformations:
- Client-side form validation with React Hook Form and Zod schema validation
- Server-side validation using the same shared Zod schemas
- Database access abstracted through the storage layer

## External Dependencies

### Frontend Dependencies

- **UI Framework**: React with Radix UI primitives and Shadcn UI components
- **Styling**: Tailwind CSS
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: TanStack React Query
- **Date Handling**: date-fns
- **Rich Text Editing**: TipTap

### Backend Dependencies

- **Server Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Database Client**: @neondatabase/serverless
- **Runtime**: Node.js with TypeScript (tsx for development)

## Deployment Strategy

The application is configured for deployment on:

1. **Replit**: Configuration in `.replit` for development and hosting
2. **Cloud Run**: The `.replit` file indicates Google Cloud Run as a deployment target

The deployment process involves:
1. Building the frontend with Vite (`npm run build`)
2. Bundling the backend with esbuild
3. Starting the production server (`npm run start`)

There are separate scripts for:
- Development: `npm run dev` (uses tsx for TypeScript execution)
- Production build: `npm run build`
- Production start: `npm run start`

Database migrations are managed through:
- Drizzle Kit for schema updates
- Custom migration scripts in the repository root

## Development Workflow

The development workflow is documented in `development_guidelines.md` and includes:

1. **Component Structure**: Follow single responsibility principle, keeping components under 200 lines
2. **State Management**: Use React Query for server state, React Hook Form for forms
3. **Data Fetching**: Centralized through the apiRequest utility
4. **Error Handling**: Comprehensive error handling with toast notifications

## Security Considerations

1. **Data Validation**: Shared Zod schemas between client and server ensure consistent validation
2. **API Security**: API endpoints validate permissions before performing operations
3. **Error Handling**: Errors are sanitized before being sent to the client

## Future Considerations

Based on the repository structure, potential future enhancements might include:

1. **Authentication**: Adding user authentication and role-based access control
2. **Real-time Updates**: Adding WebSocket support for real-time collaboration
3. **Offline Support**: Adding service workers for offline functionality
4. **Reporting**: Enhanced reporting and data visualization capabilities