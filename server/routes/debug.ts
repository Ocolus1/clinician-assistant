/**
 * Debug route registration for the Express application
 */

import { Express } from 'express';
import debugRouter from './debug-routes';

/**
 * Register debug routes with the Express application
 * @param app Express application instance
 */
export function registerDebugRoutes(app: Express): void {
  // Mount the router directly to the app
  app.use(debugRouter);
  console.log('Successfully registered debug API routes');
}