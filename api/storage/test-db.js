"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../../lib/polyfills");
const db_1 = require("../../src/lib/db");
const drizzle_orm_1 = require("drizzle-orm");
exports.config = {
    runtime: 'edge',
};
async function handler(request) {
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
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT current_timestamp as time, version() as version`);
        // Count users
        const userCount = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(db_1.user);
        // Get all tables
        const tables = await db_1.db.execute((0, drizzle_orm_1.sql) `
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
    }
    catch (error) {
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
