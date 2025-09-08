// Test database connection and tables
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function testDatabase() {
  console.log('🔍 Testing Database Connection\n');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // 1. Test connection
    console.log('1. Testing connection...');
    const result = await sql`SELECT NOW()`;
    console.log('✅ Connected to database at:', result[0].now);
    
    // 2. Check existing tables
    console.log('\n2. Checking existing tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📋 Tables found:');
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    
    // 3. Check User table (capitalized)
    console.log('\n3. Checking User table...');
    const userCount = await sql`SELECT COUNT(*) as count FROM "User"`;
    console.log(`   Users in database: ${userCount[0].count}`);
    
    // 4. Check Chat table (capitalized)
    console.log('\n4. Checking Chat table...');
    const chatCount = await sql`SELECT COUNT(*) as count FROM "Chat"`;
    console.log(`   Chats in database: ${chatCount[0].count}`);
    
    // 5. Try to create a test user (if not exists)
    console.log('\n5. Creating test user...');
    const testUser = await sql`
      INSERT INTO "User" (id, email, password)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'dev@local.test',
        'dev-password-hash'
      )
      ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email
      RETURNING id, email
    `;
    console.log(`✅ Test user ready: ${testUser[0].email}`);
    
    // 6. Try to create a test chat
    console.log('\n6. Creating test chat...');
    const testChat = await sql`
      INSERT INTO "Chat" (id, "createdAt", title, "userId", visibility)
      VALUES (
        gen_random_uuid(),
        NOW(),
        'Test Chat',
        '00000000-0000-0000-0000-000000000001',
        'private'
      )
      RETURNING id, title
    `;
    console.log(`✅ Test chat created: ${testChat[0].id}`);
    
    console.log('\n✅ Database is working correctly!');
    console.log('   - Tables exist');
    console.log('   - Can insert data');
    console.log('   - Auth bypass should work with dev-user');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
  }
}

testDatabase();