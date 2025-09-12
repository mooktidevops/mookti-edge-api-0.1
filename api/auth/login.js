"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
require("../../lib/polyfills");
const db_1 = require("../../src/lib/db");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_ts_1 = require("bcrypt-ts");
const jose_1 = require("jose");
exports.config = {
    runtime: 'edge',
};
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
// Create a secret key for jose
const secret = new TextEncoder().encode(JWT_SECRET);
async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    try {
        const body = await request.json();
        const { email, password } = body;
        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email and password required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        // Find user by email
        const users = await db_1.db.select().from(db_1.user).where((0, drizzle_orm_1.eq)(db_1.user.email, email)).limit(1);
        if (users.length === 0) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const foundUser = users[0];
        // Verify password
        if (!foundUser.password || !(0, bcrypt_ts_1.compareSync)(password, foundUser.password)) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        // Generate JWT token
        const token = await new jose_1.SignJWT({
            id: foundUser.id,
            email: foundUser.email,
            type: 'regular'
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);
        return new Response(JSON.stringify({
            token,
            user: {
                id: foundUser.id,
                email: foundUser.email,
                type: 'regular'
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
