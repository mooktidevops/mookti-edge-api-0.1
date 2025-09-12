#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin_auth_service_1 = require("../src/services/admin-auth-service");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
async function initializeSuperAdmin() {
    console.log('Initializing super admin...');
    // Get credentials from environment or command line
    const email = process.argv[2] || process.env.SUPER_ADMIN_EMAIL;
    const password = process.argv[3] || process.env.SUPER_ADMIN_PASSWORD;
    if (!email || !password) {
        console.error('Usage: npm run init-admin <email> <password>');
        console.error('Or set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env.local');
        process.exit(1);
    }
    try {
        const success = await admin_auth_service_1.adminAuthService.initializeSuperAdmin(email, password);
        if (success) {
            console.log(`✅ Super admin created successfully for ${email}`);
            console.log('You can now log in to the admin dashboard with these credentials.');
        }
        else {
            console.log('❌ Failed to create super admin. An admin may already exist.');
        }
    }
    catch (error) {
        console.error('Error initializing super admin:', error);
        process.exit(1);
    }
    process.exit(0);
}
// Run the initialization
initializeSuperAdmin();
