#!/usr/bin/env node

import { adminAuthService } from '../src/services/admin-auth-service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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
    const success = await adminAuthService.initializeSuperAdmin(email, password);
    
    if (success) {
      console.log(`✅ Super admin created successfully for ${email}`);
      console.log('You can now log in to the admin dashboard with these credentials.');
    } else {
      console.log('❌ Failed to create super admin. An admin may already exist.');
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the initialization
initializeSuperAdmin();