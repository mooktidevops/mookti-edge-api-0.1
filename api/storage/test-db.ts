import '../../lib/polyfills';
import { db, user } from '../../src/lib/db';
import { sql } from 'drizzle-orm';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    // Test basic database connection
    const result = await db.execute(sql`SELECT current_timestamp as time, version() as version`);
    
    // Count users
    const userCount = await db.select({ count: sql`count(*)` }).from(user);
    
    // Get all tables
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    return new Response(JSON.stringify({
      status: 'connected',
      database: {
        time: result.rows[0]?.time,
        version: result.rows[0]?.version,
      },
      tables: tables.rows.map(r => r.table_name),
      userCount: userCount[0]?.count || 0,
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Database test error:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}