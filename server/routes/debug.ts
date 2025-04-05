/**
 * Debug route registration for the Express application
 */

import { Express } from 'express';
import debugRouter from './debug-routes';

export function registerDebugRoutes(app: Express): void {
  app.use(debugRouter);
  console.log('Successfully registered debug API routes');
}