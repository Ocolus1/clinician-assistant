/**
 * Drizzle ORM Connection Module
 * 
 * This module provides a connection to the PostgreSQL database
 * using Drizzle ORM.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from './db';
import * as schema from '../shared/schema';

// Create a Drizzle ORM instance
export const db = drizzle(sql, { schema });