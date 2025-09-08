import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Create the Neon SQL client
const sql = neon(process.env.DATABASE_URL!);

// Create the Drizzle instance with schema
export const db = drizzle(sql, { schema });

// Export schema for convenience
export * from './schema';